import logging
import json
import re
from fastapi import HTTPException
from typing import List, Tuple
from schemas.quiz_schema import QuizRequest, QuizResponse, QuizChunk
from schemas.usage_schema import UsageResponse
from gemini_usage import extract_usage
from settings import GEMINI_MODEL

logger = logging.getLogger("ai-service.quiz")

def get_gemini_client():
    from google import genai
    from settings import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=GEMINI_API_KEY)

def extract_json_from_gemini_response(text: str) -> dict:
    if not text or not text.strip():
        raise HTTPException(status_code=500, detail="Gemini returned empty response")

    cleaned = text.strip()

    # Remove markdown code fences if Gemini returns ```json ... ```
    cleaned = cleaned.replace("```json", "")
    cleaned = cleaned.replace("```", "")
    cleaned = cleaned.strip()

    # Try to extract the JSON object from the response
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        logger.error(f"Failed to parse JSON from text: {text}")
        raise HTTPException(status_code=500, detail="Gemini response does not contain valid JSON object")

    json_text = match.group(0)

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        logger.error(f"JSONDecodeError: {str(e)} for text: {json_text}")
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON from Gemini: {str(e)}"
        )

def validate_quiz_data(quiz_data: dict, question_count: int) -> dict:
    if not isinstance(quiz_data, dict):
        raise HTTPException(status_code=500, detail="Quiz response must be a JSON object")

    title = quiz_data.get("title")
    if not title or not isinstance(title, str):
        quiz_data["title"] = "Quiz từ tài liệu"

    questions = quiz_data.get("questions")

    if not isinstance(questions, list) or len(questions) == 0:
        raise HTTPException(status_code=500, detail="Quiz response missing questions")

    # If Gemini returns more questions than requested, keep only requested amount
    if len(questions) > question_count:
        logger.warning(f"Gemini returned {len(questions)} questions, trimming to {question_count}.")
    elif len(questions) < question_count:
        logger.warning(f"Gemini returned only {len(questions)} questions, requested {question_count}.")

    questions = questions[:question_count]

    for question_index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            raise HTTPException(status_code=500, detail=f"Question {question_index} must be an object")

        question_text = question.get("questionText")
        if not question_text or not isinstance(question_text, str):
            raise HTTPException(status_code=500, detail=f"Question {question_index} missing questionText")

        explanation = question.get("explanation")
        if not explanation or not isinstance(explanation, str):
            raise HTTPException(status_code=500, detail=f"Question {question_index} missing explanation")

        options = question.get("options")
        if not isinstance(options, list) or len(options) != 4:
            raise HTTPException(
                status_code=500,
                detail=f"Question {question_index} must have exactly 4 options"
            )

        correct_count = 0

        for option_index, option in enumerate(options, start=1):
            if not isinstance(option, dict):
                raise HTTPException(
                    status_code=500,
                    detail=f"Question {question_index}, option {option_index} must be an object"
                )

            option_text = option.get("optionText")
            if not option_text or not isinstance(option_text, str):
                raise HTTPException(
                    status_code=500,
                    detail=f"Question {question_index}, option {option_index} missing optionText"
                )

            is_correct = option.get("isCorrect")
            if not isinstance(is_correct, bool):
                raise HTTPException(
                    status_code=500,
                    detail=f"Question {question_index}, option {option_index} isCorrect must be boolean"
                )

            if is_correct is True:
                correct_count += 1

        if correct_count != 1:
            raise HTTPException(
                status_code=500,
                detail=f"Question {question_index} must have exactly 1 correct option"
            )

    quiz_data["questions"] = questions
    return quiz_data


def build_quiz_prompt(text: str, question_count: int, difficulty: str, quiz_type: str, document_title: str = None) -> str:
    instruction = (
        "Bạn là một chuyên gia tạo đề thi trắc nghiệm.\n"
        f"Nhiệm vụ: Tạo ra {question_count} câu hỏi trắc nghiệm từ nội dung tài liệu.\n"
        f"Độ khó: {difficulty}\n"
        f"Loại: {quiz_type}\n\n"
        "Quy tắc BẮT BUỘC:\n"
        "1. Trả về DUY NHẤT một JSON object hợp lệ theo chuẩn (không chứa markdown fences như ```json).\n"
        "2. Toàn bộ nội dung bằng TIẾNG VIỆT.\n"
        "3. Chỉ sử dụng kiến thức có trong tài liệu, không tự bịa thêm.\n"
        "4. Không hỏi chi tiết vụn vặt không quan trọng.\n"
        "5. Mỗi câu hỏi phải có chính xác 4 lựa chọn (options).\n"
        "6. Mỗi câu hỏi chỉ có DUY NHẤT 1 lựa chọn đúng (isCorrect = true).\n"
        "7. Mỗi câu hỏi phải có lời giải thích (explanation) rõ ràng.\n\n"
        "Format JSON bắt buộc:\n"
        "{\n"
        '  "title": "Quiz về tài liệu",\n'
        '  "questions": [\n'
        "    {\n"
        '      "questionText": "Câu hỏi...",\n'
        '      "explanation": "Giải thích vì sao đáp án đúng...",\n'
        '      "options": [\n'
        '        { "optionText": "Đáp án A", "isCorrect": true },\n'
        '        { "optionText": "Đáp án B", "isCorrect": false },\n'
        '        { "optionText": "Đáp án C", "isCorrect": false },\n'
        '        { "optionText": "Đáp án D", "isCorrect": false }\n'
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n"
    )

    title_part = f"Tiêu đề tài liệu: {document_title}\n" if document_title else ""
    prompt = f"{instruction}\n\n{title_part}\n=== NỘI DUNG TÀI LIỆU ===\n{text}"
    return prompt

def call_gemini_quiz(prompt: str) -> Tuple[str, UsageResponse]:
    try:
        client = get_gemini_client()
        from google.genai import types
        config = types.GenerateContentConfig(
            temperature=0.3
        )
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config
        )
        
        if not response.text:
            raise HTTPException(status_code=500, detail="Gemini returned empty text response.")
            
        return response.text, extract_usage(response)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error calling Gemini for quiz: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi gọi mô hình AI: {str(e)}")

def split_chunks_by_loop(chunks: List[QuizChunk], group_size: int = 35) -> List[List[QuizChunk]]:
    groups = []
    for i in range(0, len(chunks), group_size):
        groups.append(chunks[i:i + group_size])
    return groups

def direct_quiz(request: QuizRequest, valid_chunks: List[QuizChunk]) -> QuizResponse:
    logger.info(f"[DIRECT QUIZ] Starting for documentId: {request.documentId}")
    text_to_process = "\n\n".join([chunk.chunkText for chunk in valid_chunks])
    
    prompt = build_quiz_prompt(
        text=text_to_process,
        question_count=request.questionCount,
        difficulty=request.difficulty,
        quiz_type=request.quizType,
        document_title=request.documentTitle
    )
    
    # Retry logic
    max_retries = 2
    total_usage = UsageResponse(promptTokens=0, completionTokens=0, totalTokens=0)
    for attempt in range(max_retries):
        try:
            gemini_text, attempt_usage = call_gemini_quiz(prompt)
            total_usage.promptTokens += attempt_usage.promptTokens
            total_usage.completionTokens += attempt_usage.completionTokens
            total_usage.totalTokens += attempt_usage.totalTokens
            quiz_data = extract_json_from_gemini_response(gemini_text)
            quiz_data = validate_quiz_data(quiz_data, request.questionCount)
            logger.info(f"Successfully generated {len(quiz_data['questions'])} questions on attempt {attempt + 1}")
            return QuizResponse(**quiz_data, usage=total_usage)
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logger.error(f"Failed to generate quiz after {max_retries} attempts")
                raise e
            prompt += "\n\nYour previous response was invalid JSON. Return only valid JSON following the exact schema. Do not include markdown or explanations."

def map_reduce_quiz(request: QuizRequest, valid_chunks: List[QuizChunk]) -> QuizResponse:
    groups = split_chunks_by_loop(valid_chunks, group_size=35)
    num_groups = len(groups)
    logger.info(f"[MAP REDUCE QUIZ] DocumentId: {request.documentId}. Total chunks: {len(valid_chunks)}. Split into {num_groups} groups.")
    
    # Summarize all chunks first to get a condensed context, then generate quiz from that context
    # This prevents the final prompt from being too large, and since we need holistic questions, a summary works well.
    from summary_service import build_summary_prompt, call_gemini_summary
    
    total_usage = UsageResponse(promptTokens=0, completionTokens=0, totalTokens=0)
    part_summaries = []
    for i, group in enumerate(groups):
        logger.info(f"Summarizing group {i+1}/{num_groups} for quiz generation...")
        text_to_summarize = "\n\n".join([chunk.chunkText for chunk in group])
        prompt = build_summary_prompt(
            text=text_to_summarize,
            summary_type="DETAILED",
            document_title=f"Phần {i+1}/{num_groups}",
            is_final=False
        )
        summary_text, summary_usage = call_gemini_summary(prompt)
        part_summaries.append(summary_text)
        total_usage.promptTokens += summary_usage.promptTokens
        total_usage.completionTokens += summary_usage.completionTokens
        total_usage.totalTokens += summary_usage.totalTokens
        
    combined_parts_text = "\n\n---\n\n".join([f"Phần {i+1}:\n{summary}" for i, summary in enumerate(part_summaries)])
    
    logger.info(f"[MAP REDUCE QUIZ] Starting final quiz generation for documentId: {request.documentId}")
    
    quiz_prompt = build_quiz_prompt(
        text=combined_parts_text,
        question_count=request.questionCount,
        difficulty=request.difficulty,
        quiz_type=request.quizType,
        document_title=request.documentTitle
    )
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            gemini_text, attempt_usage = call_gemini_quiz(quiz_prompt)
            total_usage.promptTokens += attempt_usage.promptTokens
            total_usage.completionTokens += attempt_usage.completionTokens
            total_usage.totalTokens += attempt_usage.totalTokens
            quiz_data = extract_json_from_gemini_response(gemini_text)
            quiz_data = validate_quiz_data(quiz_data, request.questionCount)
            logger.info(f"Successfully generated {len(quiz_data['questions'])} questions on attempt {attempt + 1}")
            return QuizResponse(**quiz_data, usage=total_usage)
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logger.error(f"Failed to generate quiz after {max_retries} attempts")
                raise e
            quiz_prompt += "\n\nYour previous response was invalid JSON. Return only valid JSON following the exact schema. Do not include markdown or explanations."

def process_quiz_request(request: QuizRequest) -> QuizResponse:
    if not request.chunks:
        logger.error(f"Empty chunks provided for documentId: {request.documentId}")
        raise HTTPException(status_code=400, detail="Danh sách chunks trống.")
        
    valid_chunks = [c for c in request.chunks if c.chunkText and str(c.chunkText).strip()]
    if not valid_chunks:
        logger.error(f"No valid chunks with text found for documentId: {request.documentId}")
        raise HTTPException(status_code=400, detail="Không có chunk nào chứa văn bản hợp lệ.")
        
    valid_chunks.sort(key=lambda x: x.chunkIndex)
    
    logger.info(
        f"Processing quiz request -> documentId: {request.documentId}, "
        f"questionCount: {request.questionCount}, "
        f"len(valid_chunks): {len(valid_chunks)}, "
        f"difficulty: {request.difficulty}"
    )
    
    if len(valid_chunks) <= 40:
        logger.info(f"Mode quiz: DIRECT")
        return direct_quiz(request, valid_chunks)
    else:
        logger.info(f"Mode quiz: MAP_REDUCE")
        return map_reduce_quiz(request, valid_chunks)
