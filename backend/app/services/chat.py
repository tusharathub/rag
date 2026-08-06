import asyncio
import logging
import uuid
import tiktoken
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Any, Optional

from app.domain.models.chat import (
    ChatMessageDomain,
    ChatMessageSourceDomain,
    ChatSessionDomain,
    MessageRole
)
from app.interfaces.ai.services import IChatCompletionService
from app.interfaces.db.repositories import IChatRepository
from app.interfaces.ai.services import IRetrievalService
from app.utils.prompt import PromptBuilder

logger = logging.getLogger(__name__)

# Model pricing maps per 1,000,000 tokens (USD)
MODEL_PRICING = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 5.00, "output": 15.00},
    "default": {"input": 0.15, "output": 0.60}
}


class ChatService:
    """Production chat orchestrator handling streaming, persistence, token metrics, and retry mechanics."""

    def __init__(
        self,
        chat_repository: IChatRepository,
        retrieval_service: IRetrievalService,
        llm_service: IChatCompletionService,
        model_name: str = "gpt-4o-mini"
    ):
        self.repository = chat_repository
        self.retrieval_service = retrieval_service
        self.llm_service = llm_service
        self.model_name = model_name
        self.prompt_builder = PromptBuilder(model_name=model_name)
        
        try:
            self.encoder = tiktoken.encoding_for_model(model_name)
        except Exception:
            self.encoder = tiktoken.get_encoding("cl100k_base")

    def _estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculates USD cost based on token counts and model pricing."""
        pricing = MODEL_PRICING.get(self.model_name, MODEL_PRICING["default"])
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost

    async def _execute_with_retry(self, func, *args, retries: int = 3, backoff: float = 2.0, **kwargs):
        """Helper to invoke asynchronous functions with exponential backoff."""
        delay = 0.5
        for attempt in range(retries):
            try:
                # If we're calling a generator generator, return it directly
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == retries - 1:
                    logger.error(f"Execution failed after {retries} attempts: {e}")
                    raise e
                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
                delay *= backoff

    async def stream_chat(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        organization_id: uuid.UUID, # acts as collection_id
        message_content: str,
        limit: int = 5,
        use_mmr: bool = False,
        lambda_val: float = 0.5
    ) -> AsyncGenerator[str, None]:
        """Orchestrates RAG context search, formats prompt, streams response, and logs telemetry."""
        # 1. Fetch or create chat session
        session = await self.repository.get_session(session_id)
        if not session:
            session = ChatSessionDomain(
                id=session_id,
                title=message_content[:30] + "..." if len(message_content) > 30 else message_content,
                user_id=user_id,
                organization_id=organization_id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                messages=[]
            )
            await self.repository.create_session(session)

        # 2. Retrieve authorized and deduplicated context
        retrieved_chunks = await self.retrieval_service.retrieve_context(
            query=message_content,
            collection_id=organization_id,
            user_id=user_id,
            limit=limit,
            use_mmr=use_mmr,
            lambda_val=lambda_val
        )

        # 3. Format previous messages into prompt history format
        chat_history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in session.messages
        ]

        # 4. Construct final prompt
        messages = self.prompt_builder.assemble_final_prompt(
            user_question=message_content,
            chunks=[item[0] for item in retrieved_chunks],
            chat_history=chat_history
        )

        # 5. Calculate input tokens and save user message metadata
        input_token_count = sum(len(self.encoder.encode(msg["content"])) for msg in messages)
        
        # Save user message to database
        user_message_id = uuid.uuid4()
        user_msg = ChatMessageDomain(
            id=user_message_id,
            chat_session_id=session_id,
            role=MessageRole.USER,
            content=message_content,
            created_at=datetime.now(timezone.utc),
            sources=[]
        )
        await self.repository.save_message(user_msg)

        # 6. Call LLM Streaming Service with retry mechanism
        logger.info(f"Initiating streaming completion for session {session_id}")
        system_prompt = messages[0]["content"]
        user_message_str = messages[-1]["content"]
        # History format expected by completion service (excluding system prompt at index 0)
        history_msgs = messages[1:-1]

        # Get stream generator with retry logic
        stream_generator = await self._execute_with_retry(
            self.llm_service.stream_response,
            system_prompt,
            history_msgs,
            user_message_str
        )

        # 7. Iterate stream, yield to client, and capture tokens
        full_response_parts = []
        try:
            async for token in stream_generator:
                full_response_parts.append(token)
                yield token
        except Exception as e:
            logger.error(f"Error during stream generation: {e}")
            yield f"\n[Generation Error: {e}]"
            raise e

        # 8. Post-generation aggregation, metadata logging, and persistence
        assistant_response = "".join(full_response_parts)
        output_token_count = len(self.encoder.encode(assistant_response))
        cost = self._estimate_cost(input_token_count, output_token_count)

        logger.info(
            f"Generation completed. Input tokens: {input_token_count}, "
            f"Output tokens: {output_token_count}, Cost: ${cost:.6f}"
        )

        # 9. Format sources/citations metadata
        sources = [
            ChatMessageSourceDomain(
                id=uuid.uuid4(),
                chat_message_id=session_id,  # Associate with session/msg
                document_chunk_id=chunk.id,
                relevance_score=score,
                document_name=chunk.metadata.get("original_filename") or chunk.metadata.get("section_path") or "Document"
            )
            for chunk, score in retrieved_chunks
        ]

        # 10. Persist assistant message
        assistant_message_id = uuid.uuid4()
        assistant_msg = ChatMessageDomain(
            id=assistant_message_id,
            chat_session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=assistant_response,
            created_at=datetime.now(timezone.utc),
            sources=sources
        )
        
        # Save to Postgres via repository
        await self.repository.save_message(assistant_msg)
