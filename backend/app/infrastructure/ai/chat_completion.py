import logging
from typing import AsyncGenerator, List, Optional
from openai import AsyncOpenAI

from app.core.config import settings
from app.interfaces.ai.services import IChatCompletionService

logger = logging.getLogger(__name__)


class OpenAIChatCompletionService(IChatCompletionService):
    """Concrete implementation of IChatCompletionService using OpenAI AsyncOpenAI."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model_name = model_name or settings.LLM_MODEL or "gpt-4o-mini"
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    def _assemble_messages(self, system_prompt: str, history: List[dict], user_message: str) -> List[dict]:
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})
        return messages

    async def generate_response(
        self, 
        system_prompt: str, 
        history: List[dict], 
        user_message: str
    ) -> str:
        if not self.client:
            raise ValueError("OpenAI API key not configured.")
        
        messages = self._assemble_messages(system_prompt, history, user_message)
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,  # type: ignore
            temperature=0.2,
        )
        return response.choices[0].message.content or ""

    async def stream_response(
        self, 
        system_prompt: str, 
        history: List[dict], 
        user_message: str
    ) -> AsyncGenerator[str, None]:
        if not self.client:
            raise ValueError("OpenAI API key not configured.")
        
        messages = self._assemble_messages(system_prompt, history, user_message)
        response_stream = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,  # type: ignore
            temperature=0.2,
            stream=True,
        )
        
        async for chunk in response_stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
