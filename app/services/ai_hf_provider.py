"""Hugging Face AI Model Provider Service.

Provides unified interface for Hugging Face Inference API / InferenceClient:
- Chat completions using instruction-tuned open-source models (e.g., Qwen/Qwen2.5-7B-Instruct)
- Token-by-token streaming chat completions
- Dense vector embeddings using sentence-transformers (e.g. all-MiniLM-L6-v2)
- Offline resilience and graceful fallback detection
"""

import logging
from typing import AsyncGenerator, Generator, List, Optional
from huggingface_hub import InferenceClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class HuggingFaceProvider:
    """Encapsulates interaction with Hugging Face Inference API."""

    def __init__(
        self,
        api_token: Optional[str] = None,
        model_id: Optional[str] = None,
        embedding_model_id: Optional[str] = None,
    ):
        self.api_token = api_token if api_token is not None else settings.HUGGINGFACE_API_TOKEN
        self.model_id = model_id or settings.HUGGINGFACE_MODEL_ID
        self.embedding_model_id = embedding_model_id or settings.HUGGINGFACE_EMBEDDING_MODEL_ID
        self._client: Optional[InferenceClient] = None

    @property
    def client(self) -> Optional[InferenceClient]:
        if not self.api_token:
            return None
        if self._client is None:
            self._client = InferenceClient(
                model=self.model_id,
                token=self.api_token,
            )
        return self._client

    def is_configured(self) -> bool:
        """Check if a valid Hugging Face API token is present."""
        return bool(self.api_token and self.api_token.strip())

    def chat_completion(
        self,
        messages: List[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> Optional[str]:
        """Generate a complete chat response via Hugging Face Inference API."""
        if not self.is_configured() or self.client is None:
            logger.info("Hugging Face API token not configured; proceeding to fallback engine.")
            return None

        try:
            response = self.client.chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            if response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content
                return content.strip() if content else None
            return None
        except Exception as exc:
            logger.warning(
                "Hugging Face chat completion failed: %s. Falling back to deterministic engine.",
                exc,
            )
            return None

    def stream_chat_completion(
        self,
        messages: List[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> Generator[str, None, None]:
        """Stream chunks from Hugging Face Inference API."""
        if not self.is_configured() or self.client is None:
            logger.info("Hugging Face API token not configured; cannot stream from HF.")
            return

        try:
            stream = self.client.chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
        except Exception as exc:
            logger.warning(
                "Hugging Face streaming failed: %s.",
                exc,
            )
            return

    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate 384-dimensional dense vector embeddings for RAG retrieval."""
        if not self.is_configured() or self.client is None:
            return None

        try:
            # feature_extraction returns array-like embeddings
            result = self.client.feature_extraction(
                text=text,
                model=self.embedding_model_id,
            )
            if isinstance(result, list):
                # If nested list (e.g. [[0.1, 0.2...]]), take the first element
                if len(result) > 0 and isinstance(result[0], list):
                    return [float(x) for x in result[0]]
                return [float(x) for x in result]
            # In case numpy array or similar is returned
            if hasattr(result, "tolist"):
                arr = result.tolist()
                if len(arr) > 0 and isinstance(arr[0], list):
                    return [float(x) for x in arr[0]]
                return [float(x) for x in arr]
            return None
        except Exception as exc:
            logger.warning("Hugging Face embedding extraction failed: %s", exc)
            return None


# Global singleton instance
hf_provider = HuggingFaceProvider()
