import logging


logger = logging.getLogger("ai-service.text_chunker")


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
    max_chunks: int = 10000
) -> list:
    """
    Safely split text into chunks.

    Output format:
    {
        "chunkIndex": int,
        "chunkText": str,
        "charStart": int,
        "charEnd": int,
        "textLength": int
    }
    """

    if text is None:
        return []

    text = str(text).strip()

    if not text:
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")

    if chunk_overlap < 0:
        raise ValueError("chunk_overlap must not be negative")

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks = []
    chunk_index = 0
    start = 0
    text_length = len(text)

    logger.info(
        "Start chunking text. text_length=%s, chunk_size=%s, chunk_overlap=%s, max_chunks=%s",
        text_length,
        chunk_size,
        chunk_overlap,
        max_chunks
    )

    while start < text_length:
        if chunk_index >= max_chunks:
            raise ValueError(
                f"Too many chunks generated. "
                f"text_length={text_length}, chunk_size={chunk_size}, "
                f"chunk_overlap={chunk_overlap}, max_chunks={max_chunks}. "
                f"Possible chunking loop or Gemini output is too large."
            )

        hard_end = min(start + chunk_size, text_length)
        end = hard_end

        # Only try natural break if we are not at the end
        if hard_end < text_length:
            # Do not accept a break point too close to start
            min_break_position = start + int(chunk_size * 0.5)

            paragraph_break = text.rfind("\n\n", start, hard_end)
            line_break = text.rfind("\n", start, hard_end)
            sentence_break = text.rfind(". ", start, hard_end)
            space_break = text.rfind(" ", start, hard_end)

            candidates = []

            if paragraph_break >= min_break_position:
                candidates.append(paragraph_break)

            if line_break >= min_break_position:
                candidates.append(line_break)

            if sentence_break >= min_break_position:
                candidates.append(sentence_break + 1)

            if space_break >= min_break_position:
                candidates.append(space_break)

            if candidates:
                end = max(candidates)

        # Safety: never allow end <= start
        if end <= start:
            end = hard_end

        if end <= start:
            # Extreme safety fallback
            end = min(start + chunk_size, text_length)

        chunk_raw = text[start:end]
        chunk_str = chunk_raw.strip()

        if chunk_str:
            chunks.append({
                "chunkIndex": chunk_index,
                "chunkText": chunk_str,
                "charStart": start,
                "charEnd": end,
                "textLength": len(chunk_str)
            })
            chunk_index += 1

        if end >= text_length:
            break

        next_start = end - chunk_overlap

        # Critical safety: start must always move forward
        if next_start <= start:
            next_start = start + 1

        start = next_start

    logger.info("Chunking completed. chunk_count=%s", len(chunks))

    return chunks