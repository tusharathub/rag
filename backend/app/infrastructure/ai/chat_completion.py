import logging
from typing import AsyncGenerator, List, Optional
from openai import AsyncOpenAI

from app.core.config import settings
from app.interfaces.ai.services import IChatCompletionService

logger = logging.getLogger(__name__)


class BaseOpenAICompatibleProvider(IChatCompletionService):
    """Base provider class for OpenAI-compatible chat completion services."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY or "dummy-key-for-local"
        self.base_url = base_url
        self.model_name = model_name or settings.LLM_MODEL or "gpt-4o-mini"
        
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)

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


class OpenAIChatCompletionService(BaseOpenAICompatibleProvider):
    """Native OpenAI API Provider (gpt-4o, gpt-4o-mini)."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        key = api_key or settings.OPENAI_API_KEY
        model = model_name or settings.LLM_MODEL or "gpt-4o-mini"
        super().__init__(api_key=key, base_url=None, model_name=model)


class OpenRouterChatCompletionService(BaseOpenAICompatibleProvider):
    """OpenRouter Multi-Model Unified Gateway Provider."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        key = api_key or settings.OPENROUTER_API_KEY or settings.OPENAI_API_KEY
        base = settings.OPENROUTER_BASE_URL
        model = model_name or settings.LLM_MODEL or "nvidia/nemotron-3-ultra-550b-a55b:free"
        super().__init__(api_key=key, base_url=base, model_name=model)


class GroqChatCompletionService(BaseOpenAICompatibleProvider):
    """Groq Ultra-Fast LLaMA 3 & Mixtral Provider."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        key = api_key or settings.GROQ_API_KEY
        base = "https://api.groq.com/openai/v1"
        model = model_name or settings.LLM_MODEL or "llama3-70b-8192"
        super().__init__(api_key=key, base_url=base, model_name=model)


class CustomLLMChatCompletionService(BaseOpenAICompatibleProvider):
    """Self-Hosted / Local LLM Provider (Ollama, LocalAI, vLLM, LM Studio)."""

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, model_name: Optional[str] = None):
        base = base_url or settings.LLM_BASE_URL or "http://localhost:11434/v1"
        key = api_key or "local-key"
        model = model_name or settings.LLM_MODEL or "llama3:8b"
        super().__init__(api_key=key, base_url=base, model_name=model)


class LLMProviderFactory:
    """Factory class to dynamically instantiate LLM Providers based on configuration."""

    @staticmethod
    def create_provider(provider_type: Optional[str] = None) -> IChatCompletionService:
        provider = (provider_type or settings.LLM_PROVIDER or "openrouter").lower().strip()
        
        logger.info(f"Instantiating LLM Provider: {provider}")
        
        if provider == "openrouter":
            return OpenRouterChatCompletionService()
        elif provider == "openai":
            return OpenAIChatCompletionService()
        elif provider == "groq":
            return GroqChatCompletionService()
        elif provider in ["custom", "ollama", "localai", "vllm"]:
            return CustomLLMChatCompletionService()
        else:
            # Automatic heuristic detection based on API key prefix or settings
            if settings.OPENROUTER_API_KEY or (settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-or-")):
                return OpenRouterChatCompletionService()
            elif settings.LLM_BASE_URL:
                return CustomLLMChatCompletionService()
            else:
                return OpenAIChatCompletionService()
