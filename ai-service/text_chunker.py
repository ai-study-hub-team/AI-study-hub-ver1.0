def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> list:
    """
    Splits text into smaller chunks of approximately `chunk_size` characters, 
    with an overlap of `chunk_overlap` characters.
    It prefers splitting at paragraph (\n\n) or sentence (. ) boundaries.
    """
    if not text or not text.strip():
        return []

    chunks = []
    chunk_index = 0
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        
        # If we're not at the end of the text, try to find a natural breaking point
        if end < text_length:
            # 1. Try to break at a paragraph (double newline)
            break_idx = text.rfind('\n\n', start, end)
            
            # 2. If no paragraph break, try single newline
            if break_idx == -1 or break_idx <= start:
                break_idx = text.rfind('\n', start, end)
                
            # 3. If no newline, try end of sentence
            if break_idx == -1 or break_idx <= start:
                break_idx = text.rfind('. ', start, end)
                if break_idx != -1:
                    break_idx += 1 # include the period
                    
            # 4. If no sentence end, try space
            if break_idx == -1 or break_idx <= start:
                break_idx = text.rfind(' ', start, end)
                
            # If we found a good break point, update `end`
            if break_idx != -1 and break_idx > start:
                end = break_idx
        else:
            end = text_length

        chunk_str = text[start:end].strip()
        
        # Only add non-empty chunks
        if chunk_str:
            chunks.append({
                "chunkIndex": chunk_index,
                "chunkText": chunk_str,
                "charStart": start,
                "charEnd": start + len(chunk_str),
                "textLength": len(chunk_str)
            })
            chunk_index += 1

        if end >= text_length:
            break

        # Calculate next start position with overlap
        start = end - chunk_overlap
        
        # Try to start at a word boundary to avoid cutting words
        if start > 0:
            space_idx = text.find(' ', start, end)
            if space_idx != -1:
                start = space_idx + 1
                
    return chunks
