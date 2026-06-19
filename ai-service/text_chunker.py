import logging
import re

logger = logging.getLogger("ai-service.text_chunker")

def chunk_text(
    text: str,
    file_type: str = "",
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
    max_chunks: int = 10000
) -> list:
    """
    Dispatcher for chunking logic based on file type.
    """
    file_type = (file_type or "").lower()
    if file_type in ["xls", "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]:
        return chunk_excel(text)
    elif file_type in ["ppt", "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint"]:
        return chunk_pptx(text, chunk_size, chunk_overlap, max_chunks)
    else:
        return chunk_text_sliding_window(text, chunk_size, chunk_overlap, max_chunks)


def chunk_excel(text: str, max_rows=50, max_chars=1500) -> list:
    """
    Excel table-aware chunking. Zero-overlap for rows, always repeats header.
    Expects markers: <<<SHEET:name>>>, <<<HEADER>>>, <<<ROW:n>>>
    """
    chunks = []
    chunk_index = 0
    sheets = text.split("<<<SHEET:")
    
    for sheet_data in sheets:
        if not sheet_data.strip():
            continue
            
        parts = sheet_data.split(">>>\n", 1)
        if len(parts) < 2:
            parts = sheet_data.split(">>>", 1)
        if len(parts) < 2:
            continue
            
        sheet_name = parts[0].strip()
        sheet_content = parts[1]
        
        header_parts = sheet_content.split("<<<HEADER>>>\n")
        if len(header_parts) < 2:
            header_parts = sheet_content.split("<<<HEADER>>>")
            
        header = ""
        rows_content = sheet_content
        if len(header_parts) > 1:
            header_and_rows = header_parts[1].split("<<<ROW:", 1)
            header = header_and_rows[0].strip()
            rows_content = "<<<ROW:" + header_and_rows[1] if len(header_and_rows) > 1 else ""
            
        row_blocks = rows_content.split("<<<ROW:")
        
        current_chunk_rows = []
        current_char_count = 0
        start_row_num = None
        end_row_num = None
        
        def push_chunk():
            nonlocal chunk_index, current_chunk_rows, start_row_num, end_row_num, current_char_count
            if not current_chunk_rows:
                return
            
            chunk_text_parts = [f"[Sheet: {sheet_name}]"]
            if header:
                chunk_text_parts.append(header)
            chunk_text_parts.extend(current_chunk_rows)
            chunk_text_str = "\n\n".join(chunk_text_parts)
            
            chunks.append({
                "chunkIndex": chunk_index,
                "chunkText": chunk_text_str.strip(),
                "charStart": 0,
                "charEnd": 0,
                "textLength": len(chunk_text_str),
                "sheetName": sheet_name,
                "rowStart": start_row_num,
                "rowEnd": end_row_num
            })
            chunk_index += 1
            current_chunk_rows = []
            current_char_count = 0
            start_row_num = None
            end_row_num = None

        for row_block in row_blocks:
            if not row_block.strip():
                continue
            r_parts = row_block.split(">>>\n", 1)
            if len(r_parts) < 2:
                r_parts = row_block.split(">>>", 1)
            if len(r_parts) < 2:
                continue
                
            row_num_str = r_parts[0].strip()
            if not row_num_str.isdigit():
                continue
                
            row_num = int(row_num_str)
            row_text = r_parts[1].strip()
            
            if start_row_num is None:
                start_row_num = row_num
            end_row_num = row_num
            
            if current_char_count > 0 and (current_char_count + len(row_text) > max_chars):
                end_row_num = row_num - 1
                push_chunk()
                start_row_num = row_num
                end_row_num = row_num
                
            current_chunk_rows.append(row_text)
            current_char_count += len(row_text)
            
            if len(current_chunk_rows) >= max_rows:
                push_chunk()
                
        if current_chunk_rows:
            push_chunk()
            
    return chunks


def chunk_pptx(text: str, chunk_size=1000, chunk_overlap=150, max_chunks=10000) -> list:
    """
    Parses slide markers, chunks text, and assigns metadata.
    """
    marker_pattern = re.compile(r"<<<SLIDE_START:(\d+)\|TYPE:([A-Z]+)>>>\n?")
    
    clean_text = ""
    slide_mapping = [] 
    
    last_end = 0
    for match in marker_pattern.finditer(text):
        clean_text += text[last_end:match.start()]
        slide_num = int(match.group(1))
        slide_type = match.group(2)
        slide_mapping.append((len(clean_text), slide_num, slide_type))
        last_end = match.end()
    
    clean_text += text[last_end:]
    
    chunks = chunk_text_sliding_window(clean_text, chunk_size, chunk_overlap, max_chunks)
    
    for chunk in chunks:
        c_start = chunk["charStart"]
        c_end = chunk["charEnd"]
        
        start_slide = None
        end_slide = None
        types_in_chunk = set()
        
        for i, (pos, s_num, s_type) in enumerate(slide_mapping):
            if pos <= c_start:
                start_slide = s_num
                types_in_chunk.clear() 
                types_in_chunk.add(s_type)
            elif c_start < pos < c_end:
                types_in_chunk.add(s_type)
                end_slide = s_num
                
        if end_slide is None:
            end_slide = start_slide
            
        chunk["slideStart"] = start_slide
        chunk["slideEnd"] = end_slide
        
        if len(types_in_chunk) > 1:
            chunk["slideType"] = "MIXED"
        elif len(types_in_chunk) == 1:
            chunk["slideType"] = list(types_in_chunk)[0]
        else:
            chunk["slideType"] = "TEXT"
            
    return chunks


def chunk_text_sliding_window(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
    max_chunks: int = 10000
    ) -> list:
    """
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
    