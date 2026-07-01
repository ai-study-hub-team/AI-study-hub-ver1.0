"""
gemini_usage.py
───────────────
Reusable helper to extract Gemini token usage metadata from a
GenerateContentResponse. Used by Chat, Summary, and Quiz services.

Token counts come DIRECTLY from response.usage_metadata — no local estimation.
"""

import logging
from schemas.usage_schema import UsageResponse

logger = logging.getLogger("ai-service.usage")


def extract_usage(response) -> UsageResponse:
    """
    Extract token usage from a Gemini GenerateContentResponse.

    Returns UsageResponse with zero values if usage_metadata is missing,
    rather than raising an exception.

    Args:
        response: The GenerateContentResponse object from client.models.generate_content()

    Returns:
        UsageResponse with promptTokens, completionTokens, and totalTokens
    """
    try:
        usage = getattr(response, "usage_metadata", None)
        if usage is None:
            logger.warning("usage_metadata is None on Gemini response — returning zeros.")
            return UsageResponse()

        prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
        completion_tokens = getattr(usage, "candidates_token_count", 0) or 0
        total_tokens = getattr(usage, "total_token_count", 0) or 0

        logger.info(
            f"Gemini Token Usage — "
            f"Prompt Tokens: {prompt_tokens}, "
            f"Completion Tokens: {completion_tokens}, "
            f"Total Tokens: {total_tokens}"
        )

        return UsageResponse(
            promptTokens=prompt_tokens,
            completionTokens=completion_tokens,
            totalTokens=total_tokens,
        )
    except Exception as e:
        logger.warning(f"Failed to extract usage_metadata: {e} — returning zeros.")
        return UsageResponse()
