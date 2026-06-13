import logging
import os
import time
from google import genai
from settings import GEMINI_API_KEY, GEMINI_MODEL
import random
from google.genai import errors
logger = logging.getLogger("ai-service.text_extractor")

IMAGE_PROMPT = """Bạn hãy phân tích bức ảnh này và trả về kết quả bằng tiếng Việt theo cấu trúc sau:
- Tổng quan nội dung ảnh
- Văn bản xuất hiện trong ảnh nếu có
- Mô tả chi tiết ảnh/sơ đồ/slide/bài học nếu có
- Ý nghĩa học tập của ảnh
- English keywords hỗ trợ semantic search

Nếu ảnh không rõ hoặc không có chữ, không được bịa. Hãy mô tả đúng những gì thấy được."""

VIDEO_PROMPT = """Bạn hãy phân tích video này và trả về kết quả bằng tiếng Việt theo cấu trúc sau:
- Tóm tắt video
- Nội dung theo mốc thời gian nếu Gemini xác định được
- Văn bản/slide xuất hiện trong video nếu có
- Nội dung âm thanh/giọng nói nếu nghe được
- Mô tả cảnh/hành động/đối tượng
- English keywords hỗ trợ semantic search

Nếu âm thanh hoặc hình ảnh không rõ thì ghi rõ [không nghe rõ] hoặc [không nhìn rõ], không được bịa."""

AUDIO_PROMPT = """Bạn hãy phân tích file âm thanh này và trả về kết quả bằng tiếng Việt theo cấu trúc sau:
- Tóm tắt nội dung audio
- Transcript hoặc nội dung nghe được
- Các ý chính
- English keywords hỗ trợ semantic search

Nếu không nghe rõ thì ghi rõ [không nghe rõ]."""

def get_gemini_client():
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=GEMINI_API_KEY)

def guess_media_mime_type(file_path: str, file_type: str) -> str:
    file_type = file_type.lower().strip()
    if '/' in file_type and (file_type.startswith('image/') or file_type.startswith('video/') or file_type.startswith('audio/')):
        return file_type
        
    _, ext = os.path.splitext(file_path)
    ext = ext.lower().strip('.')
    
    mapping = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'mp3': 'audio/mp3',
        'wav': 'audio/wav',
        'm4a': 'audio/x-m4a',
        'ogg': 'audio/ogg'
    }
    
    if ext in mapping:
        return mapping[ext]
        
    import mimetypes
    guessed, _ = mimetypes.guess_type(file_path)
    if guessed and (guessed.startswith('image/') or guessed.startswith('video/') or guessed.startswith('audio/')):
        return guessed
        
    if ext in ['png', 'jpg', 'jpeg', 'webp', 'gif']:
        return 'image/jpeg'
    elif ext in ['mp4', 'mov', 'avi', 'mkv']:
        return 'video/mp4'
    elif ext in ['mp3', 'wav', 'm4a', 'ogg']:
        return 'audio/mp3'
        
    return file_type

def wait_for_gemini_file_active(
    client,
    uploaded_file,
    timeout_seconds: int = 180,
    poll_interval_seconds: int = 2,
    max_get_retries: int = 8
):
    """
    Wait until Gemini uploaded file becomes ACTIVE.

    This version handles temporary Gemini File API errors:
    - 500 INTERNAL
    - 503 UNAVAILABLE
    - 429 RESOURCE_EXHAUSTED

    These errors can happen while Gemini is still processing the uploaded video/audio.
    """

    file_name = uploaded_file.name
    start_time = time.time()
    get_error_count = 0

    logger.info(f"Waiting for Gemini file resource {file_name} to be ACTIVE...")

    while time.time() - start_time < timeout_seconds:
        try:
            file_info = client.files.get(name=file_name)
            get_error_count = 0

        except errors.ServerError as e:
            error_text = str(e)
            get_error_count += 1

            if (
                "500" in error_text
                or "503" in error_text
                or "INTERNAL" in error_text
                or "UNAVAILABLE" in error_text
            ):
                if get_error_count > max_get_retries:
                    raise RuntimeError(
                        f"Gemini file status check failed too many times. "
                        f"file={file_name}, error={repr(e)}"
                    )

                wait_seconds = min(3 * get_error_count, 20) + random.randint(0, 3)

                logger.warning(
                    f"Temporary Gemini File API error while checking file status. "
                    f"Retry {get_error_count}/{max_get_retries} after {wait_seconds}s. "
                    f"Error: {repr(e)}"
                )

                time.sleep(wait_seconds)
                continue

            raise

        except errors.APIError as e:
            error_text = str(e)
            get_error_count += 1

            if (
                "429" in error_text
                or "RESOURCE_EXHAUSTED" in error_text
                or "500" in error_text
                or "503" in error_text
            ):
                if get_error_count > max_get_retries:
                    raise RuntimeError(
                        f"Gemini file status check failed too many times. "
                        f"file={file_name}, error={repr(e)}"
                    )

                wait_seconds = min(5 * get_error_count, 30) + random.randint(0, 5)

                logger.warning(
                    f"Temporary Gemini API error while checking file status. "
                    f"Retry {get_error_count}/{max_get_retries} after {wait_seconds}s. "
                    f"Error: {repr(e)}"
                )

                time.sleep(wait_seconds)
                continue

            raise

        state = getattr(file_info, "state", None)
        state_name = getattr(state, "name", str(state))

        logger.info(f"Gemini file {file_name} current state: {state_name}")

        if "ACTIVE" in state_name:
            logger.info(f"Gemini file resource {file_name} is ACTIVE.")
            return file_info

        if "FAILED" in state_name:
            raise RuntimeError(f"Gemini file processing failed. file={file_name}")

        logger.info(
            f"Gemini file is processing, waiting {poll_interval_seconds} seconds..."
        )

        time.sleep(poll_interval_seconds)

    raise TimeoutError(
        f"Timed out waiting for Gemini file {file_name} to become ACTIVE "
        f"after {timeout_seconds} seconds."
    )

def extract_text_with_gemini(file_path: str, mime_type: str) -> str:
    client = get_gemini_client()
    uploaded_file = None
    try:
        logger.info(f"Uploading {file_path} to Gemini (mime_type={mime_type})...")
        uploaded_file = client.files.upload(file=file_path)
        
        # Poll state until active
        uploaded_file = wait_for_gemini_file_active(client, uploaded_file)
        
        if mime_type.startswith("image/"):
            prompt = IMAGE_PROMPT
        elif mime_type.startswith("video/"):
            prompt = VIDEO_PROMPT
        elif mime_type.startswith("audio/"):
            prompt = AUDIO_PROMPT
        else:
            raise ValueError(f"Unsupported Gemini media mime type: {mime_type}")
            
        logger.info(f"Sending analysis request to model: {GEMINI_MODEL}")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[uploaded_file, prompt]
        )
        
        text = response.text
        if not text or not text.strip():
            raise ValueError("Gemini returned empty text")
            
        return text
    finally:
        if uploaded_file:
            try:
                logger.info(f"Cleaning up Gemini uploaded file: {uploaded_file.name}")
                client.files.delete(name=uploaded_file.name)
            except Exception as delete_err:
                logger.warning(f"Failed to delete uploaded Gemini file resource {uploaded_file.name}: {delete_err}")

def extract_text(file_path: str, file_type: str) -> str:
    """Extracts text from a local file based on its type."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    # Standardize the file type format
    file_type = file_type.lower().strip()
    if file_type.startswith('.'):
        file_type = file_type[1:]
        
    logger.info(f"Extracting text from {file_path} of type {file_type}")
    
    _, ext = os.path.splitext(file_path)
    ext = ext.lower().strip('.')
    
    # Detect if it's image, video, audio by mime prefix or file extension
    is_image = file_type.startswith('image/') or ext in ['png', 'jpg', 'jpeg', 'webp', 'gif']
    is_video = file_type.startswith('video/') or ext in ['mp4', 'mov', 'avi', 'mkv']
    is_audio = file_type.startswith('audio/') or ext in ['mp3', 'wav', 'm4a', 'ogg']
    
    if is_image or is_video or is_audio:
        mime_type = guess_media_mime_type(file_path, file_type)
        return extract_text_with_gemini(file_path, mime_type)
        
    # Try generic mime types handling as well
    if 'pdf' in file_type or ext == 'pdf':
        return extract_text_from_pdf(file_path)
    elif 'document' in file_type or 'docx' in file_type or ext == 'docx':
        return extract_text_from_docx(file_path)
    elif 'text' in file_type or 'txt' in file_type or ext == 'txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type} / {ext}")

def extract_text_from_txt(file_path: str) -> str:
    # Try different encodings just in case
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    
    # If all fail, open with replace error handler
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

def extract_text_from_pdf(file_path: str) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF is required for PDF extraction. Please install it using 'pip install PyMuPDF'")
        
    text = ""
    with fitz.open(file_path) as doc:
        for page in doc:
            text += page.get_text()
    return text

def extract_text_from_docx(file_path: str) -> str:
    try:
        import docx
    except ImportError:
        raise ImportError(
            "python-docx is required for DOCX extraction. "
            "Please install it using 'pip install python-docx'"
        )

    doc = docx.Document(file_path)

    text_parts = []

    # Paragraphs
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text.strip())

    # Tables
    for table in doc.tables:
        for row in table.rows:
            row_text = []

            for cell in row.cells:
                cell_text = cell.text.strip()

                if cell_text:
                    row_text.append(cell_text)

            if row_text:
                text_parts.append(" | ".join(row_text))

    extracted_text = "\n".join(text_parts)
    logger.info(
        f"DOCX extracted {len(extracted_text)} characters "
        f"from {len(doc.paragraphs)} paragraphs "
        f"and {len(doc.tables)} tables"
    )
    return extracted_text
