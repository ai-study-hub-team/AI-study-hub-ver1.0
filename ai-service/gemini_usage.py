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


def extract_usage(response, call_context: str = "unknown") -> UsageResponse:
    """
    Extract token usage from a Gemini GenerateContentResponse.

    Returns UsageResponse with zero values if usage_metadata is missing,
    rather than raising an exception. Logs a strong warning/error so
    developers know when token tracking has silently failed.

    Args:
        response:     The GenerateContentResponse object from client.models.generate_content()
        call_context: A short label describing which Gemini call this is
                      (e.g. "chat-planner", "generate-answer", "summary"),
                      used in log messages to make debugging easier.

    Returns:
        UsageResponse with promptTokens, completionTokens, and totalTokens
    """
    try:
        usage = getattr(response, "usage_metadata", None)
        if usage is None:
            # ── STRONG WARNING: usage_metadata is missing entirely ──────────
            # This should not happen under normal circumstances. It may mean:
            #   - The google-genai SDK version changed its response structure.
            #   - The Gemini API returned an unexpected payload.
            # Token tracking for this call will be LOST.
            logger.error(
                f"[TokenTracking][{call_context}] usage_metadata is None on Gemini response. "
                f"Token usage for this call CANNOT be recorded. "
                f"Check google-genai SDK version and Gemini API response structure."
            )
            return UsageResponse()

        prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
        completion_tokens = getattr(usage, "candidates_token_count", 0) or 0
        total_tokens = getattr(usage, "total_token_count", 0) or 0

        # ── STRONG WARNING: all token counts are 0 after a real call ────────
        # This is suspicious — Gemini always bills at least some prompt tokens.
        # May indicate SDK structural change or API error was silently swallowed.
        if total_tokens == 0:
            logger.error(
                f"[TokenTracking][{call_context}] total_token_count is 0 after a real Gemini call. "
                f"prompt_token_count={prompt_tokens}, candidates_token_count={completion_tokens}. "
                f"Token tracking may have silently failed — verify google-genai SDK compatibility."
            )
        else:
            logger.info(
                f"[TokenTracking][{call_context}] "
                f"prompt={prompt_tokens}, completion={completion_tokens}, total={total_tokens}"
            )

        return UsageResponse(
            promptTokens=prompt_tokens,
            completionTokens=completion_tokens,
            totalTokens=total_tokens,
        )
    except Exception as e:
        # ── STRONG WARNING: extraction itself crashed ────────────────────────
        logger.error(
            f"[TokenTracking][{call_context}] Exception while extracting usage_metadata: {e}. "
            f"Token usage for this call CANNOT be recorded. Returning zeros as safe fallback.",
            exc_info=True,
        )
        return UsageResponse()
