import logging
from fastapi import HTTPException
from typing import List
from schemas.summary_schema import SummaryRequest, SummaryChunk, SummaryResponse
from settings import GEMINI_MODEL

logger = logging.getLogger("ai-service.summary")

def get_gemini_client():
    from google import genai
    from settings import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=GEMINI_API_KEY)

def validate_summary_type(summary_type: str) -> str:
    if not summary_type:
        return "DETAILED"
    stype = summary_type.upper()
    if stype not in ["SHORT", "DETAILED", "BULLET_POINTS"]:
        return "DETAILED"
    return stype

def build_summary_prompt(text: str, summary_type: str, document_title: str = None, is_final: bool = False) -> str:
    # Build System Instruction part
    instruction = (
        "Bạn là một trợ lý AI thông minh chuyên tóm tắt tài liệu.\n"
        "Quy tắc bắt buộc:\n"
        "1. CHỈ dựa vào nội dung tài liệu được cung cấp dưới đây để tóm tắt.\n"
        "2. KHÔNG tự bịa thêm thông tin, số liệu, hoặc kiến thức bên ngoài.\n"
        "3. Nếu tài liệu không chứa đủ thông tin, hãy nói rõ là tài liệu không đủ thông tin.\n"
        "4. TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT.\n"
        "5. KHÔNG nhắc đến các từ khóa kỹ thuật như: chunk, group, partChunk, partSummary, map-reduce, token, Gemini, AI, prompt.\n"
    )

    if summary_type == "SHORT":
        instruction += "6. Yêu cầu tóm tắt: Trình bày cực kỳ ngắn gọn, khoảng 1-2 đoạn văn. Tập trung vào ý chính quan trọng nhất.\n"
    elif summary_type == "BULLET_POINTS":
        instruction += "6. Yêu cầu tóm tắt: Tóm tắt dưới dạng các gạch đầu dòng (bullet points). Mỗi gạch đầu dòng ngắn gọn, rõ ràng, dễ hiểu.\n"
    else: # DETAILED
        instruction += "6. Yêu cầu tóm tắt: Tóm tắt chi tiết, đầy đủ các ý chính. Hãy chia thành các mục/đoạn rõ ràng, có tiêu đề phụ nếu cần thiết.\n"

    title_part = f"Tiêu đề tài liệu: {document_title}\n" if document_title else ""
    
    context_type = "BẢN TÓM TẮT CỦA CÁC PHẦN TRƯỚC" if is_final else "NỘI DUNG TÀI LIỆU"

    prompt = f"{instruction}\n\n{title_part}\n=== {context_type} ===\n{text}\n\n=== YÊU CẦU ===\nHãy tóm tắt nội dung trên theo đúng quy tắc đã nêu."
    
    return prompt

def call_gemini_summary(prompt: str) -> str:
    try:
        client = get_gemini_client()
        from google.genai import types
        config = types.GenerateContentConfig(
            temperature=0.3 # Lower temperature for summarization to keep it grounded
        )
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config
        )
        
        if not response.text:
            logger.error("Gemini returned empty text response.")
            raise HTTPException(status_code=500, detail="Gemini returned empty summary text.")
            
        return response.text
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error calling Gemini for summary: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi gọi mô hình AI: {str(e)}")

def split_chunks_by_loop(chunks: List[SummaryChunk], group_size: int = 35) -> List[List[SummaryChunk]]:
    groups = []
    for i in range(0, len(chunks), group_size):
        groups.append(chunks[i:i + group_size])
    return groups

def direct_summary(request: SummaryRequest, valid_chunks: List[SummaryChunk]) -> str:
    logger.info(f"[DIRECT SUMMARY] Starting direct summary for documentId: {request.documentId}")
    
    text_to_summarize = "\n\n".join([chunk.chunkText for chunk in valid_chunks])
    
    prompt = build_summary_prompt(
        text=text_to_summarize, 
        summary_type=request.summaryType, 
        document_title=request.documentTitle, 
        is_final=False
    )
    
    return call_gemini_summary(prompt)

def map_reduce_summary(request: SummaryRequest, valid_chunks: List[SummaryChunk]) -> str:
    groups = split_chunks_by_loop(valid_chunks, group_size=35)
    num_groups = len(groups)
    logger.info(f"[MAP REDUCE SUMMARY] DocumentId: {request.documentId}. Total chunks: {len(valid_chunks)}. Split into {num_groups} groups.")
    
    part_summaries = []
    
    # 1. Summarize each part
    for i, group in enumerate(groups):
        logger.info(f"Summarizing group {i+1}/{num_groups} (contains {len(group)} chunks)...")
        
        text_to_summarize = "\n\n".join([chunk.chunkText for chunk in group])
        prompt = build_summary_prompt(
            text=text_to_summarize,
            summary_type=request.summaryType,
            document_title=f"{request.documentTitle} (Phần {i+1}/{num_groups})" if request.documentTitle else f"Phần {i+1}/{num_groups}",
            is_final=False
        )
        
        part_summary = call_gemini_summary(prompt)
        part_summaries.append(part_summary)
        
    # 2. Final summary from part summaries
    logger.info(f"[MAP REDUCE SUMMARY] Starting final synthesis for documentId: {request.documentId}")
    
    combined_parts_text = "\n\n---\n\n".join([f"Tóm tắt phần {i+1}:\n{summary}" for i, summary in enumerate(part_summaries)])
    
    final_prompt = build_summary_prompt(
        text=combined_parts_text,
        summary_type=request.summaryType,
        document_title=request.documentTitle,
        is_final=True
    )
    
    return call_gemini_summary(final_prompt)

def process_summary_request(request: SummaryRequest) -> SummaryResponse:
    # 1. Validate chunks
    if not request.chunks:
        logger.error(f"Empty chunks provided for documentId: {request.documentId}")
        raise HTTPException(status_code=400, detail="Danh sách chunks trống.")
        
    # Filter empty texts and sort by index
    valid_chunks = [c for c in request.chunks if c.chunkText and str(c.chunkText).strip()]
    if not valid_chunks:
        logger.error(f"No valid chunks with text found for documentId: {request.documentId}")
        raise HTTPException(status_code=400, detail="Không có chunk nào chứa văn bản hợp lệ.")
        
    valid_chunks.sort(key=lambda x: x.chunkIndex)
    
    # 2. Validate SummaryType
    request.summaryType = validate_summary_type(request.summaryType)
    
    # Logging request details
    logger.info(
        f"Processing summary request -> documentId: {request.documentId}, "
        f"summaryType: {request.summaryType}, "
        f"len(valid_chunks): {len(valid_chunks)}, "
        f"totalChunks: {request.totalChunks}, "
        f"totalTextLength: {request.totalTextLength}"
    )
    
    # 3. Decision Mode
    if len(valid_chunks) <= 40:
        logger.info(f"Mode: DIRECT (len <= 40)")
        final_summary = direct_summary(request, valid_chunks)
    else:
        logger.info(f"Mode: MAP_REDUCE (len > 40)")
        final_summary = map_reduce_summary(request, valid_chunks)
        
    logger.info(f"Summary successfully generated for documentId: {request.documentId}")
    return SummaryResponse(summaryText=final_summary)
