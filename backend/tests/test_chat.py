import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from app.domain.models.chat import ChatSessionDomain, ChatMessageDomain, MessageRole
from app.domain.models.document import DocumentChunkDomain
from app.services.chat import ChatService


# Simple mock generator to simulate LLM stream yield
async def mock_stream_response(system_prompt, history, user_message):
    yield "Hello "
    yield "world"
    yield "!"


@pytest.mark.asyncio
async def test_chat_cost_estimation():
    repo_mock = MagicMock()
    retrieval_mock = MagicMock()
    llm_mock = MagicMock()
    
    service = ChatService(repo_mock, retrieval_mock, llm_mock, model_name="gpt-4o-mini")
    
    # Input tokens: 10,000, Output tokens: 5,000
    # gpt-4o-mini price: input $0.15/1M, output $0.60/1M
    # Input cost: 10k * (0.15/1M) = 0.0015
    # Output cost: 5k * (0.60/1M) = 0.003
    # Total: 0.0045
    cost = service._estimate_cost(10000, 5000)
    assert abs(cost - 0.0045) < 1e-6


@pytest.mark.asyncio
async def test_chat_service_retry_mechanism():
    repo_mock = MagicMock()
    retrieval_mock = MagicMock()
    llm_mock = MagicMock()
    
    service = ChatService(repo_mock, retrieval_mock, llm_mock)
    
    call_count = 0
    
    async def failing_async_func():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ValueError("API Timeout")
        return "Success"

    result = await service._execute_with_retry(failing_async_func, retries=3, backoff=0.01)
    assert result == "Success"
    assert call_count == 3


@pytest.mark.asyncio
async def test_stream_chat_pipeline():
    session_id = uuid.uuid4()
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()
    
    # 1. Mock DB / Repository calls
    repo_mock = AsyncMock()
    
    # Mock get_session to return an existing session
    existing_session = ChatSessionDomain(
        id=session_id,
        title="Hi",
        user_id=user_id,
        organization_id=org_id,
        created_at=MagicMock(),
        updated_at=MagicMock(),
        messages=[]
    )
    repo_mock.get_session.return_value = existing_session

    # 2. Mock Retrieval
    retrieval_mock = AsyncMock()
    chunk = DocumentChunkDomain(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        content="Grounding context facts.",
        chunk_index=0,
        page_number=1,
        metadata={"original_filename": "info.pdf"}
    )
    retrieval_mock.retrieve_context.return_value = [(chunk, 0.95)]

    # 3. Mock LLM completion
    llm_mock = MagicMock()
    llm_mock.stream_response = mock_stream_response

    # Initialize Service
    service = ChatService(repo_mock, retrieval_mock, llm_mock)

    # Trigger Stream Generation
    stream = service.stream_chat(
        session_id=session_id,
        user_id=user_id,
        organization_id=org_id,
        message_content="Hello LLM"
    )

    tokens = []
    async for tok in stream:
        tokens.append(tok)

    # Assert yielded fragments are received
    assert tokens == ["Hello ", "world", "!"]

    # Verify save_message was called for:
    # 1. The user's query ("Hello LLM")
    # 2. The assistant's response ("Hello world!")
    assert repo_mock.save_message.call_count == 2
    
    # Extract args of the saved messages
    saved_calls = repo_mock.save_message.call_args_list
    user_msg_saved = saved_calls[0][0][0]
    assistant_msg_saved = saved_calls[1][0][0]
    
    assert user_msg_saved.role == MessageRole.USER
    assert user_msg_saved.content == "Hello LLM"
    
    assert assistant_msg_saved.role == MessageRole.ASSISTANT
    assert assistant_msg_saved.content == "Hello world!"
    assert len(assistant_msg_saved.sources) == 1
    assert assistant_msg_saved.sources[0].document_chunk_id == chunk.id
    assert assistant_msg_saved.sources[0].relevance_score == 0.95
