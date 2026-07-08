import logging
import os
import subprocess
import shutil
import time
import math
from google import genai
from settings import GEMINI_API_KEY, GEMINI_MODEL,LIBREOFFICE_PATH
import random
from google.genai import errors
from google.genai import types
import concurrent.futures
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

PROMPT_A = """
You are a PDF classifier and extractor.

Classify this PDF into ONE type:

NORMAL_PDF:
- A normal text-based PDF such as book, report, article, paper, manual, or Word-exported PDF.
- Text can be extracted well by a Python PDF library.

GEMINI_PDF:
- A PDF that needs visual reading.
- Examples: slide PDF, scanned PDF, image-based PDF, or PDF with important diagrams/screenshots/charts.

Output format:

If NORMAL_PDF, output exactly:

DOCUMENT_TYPE: NORMAL_PDF
EXTRACTED_TEXT:

If GEMINI_PDF, output exactly:

DOCUMENT_TYPE: GEMINI_PDF
EXTRACTED_TEXT:

<<<PAGE_START:{page_number}>>>
[Page {page_number}]
{full extracted content of this page}

Rules:
- If NORMAL_PDF, do NOT extract full text.
- If GEMINI_PDF, extract page by page.
- Do not summarize.
- Do not rewrite.
- Do not invent.
- Keep titles, bullets, tables, formulas, code, labels, captions, and important diagram text.
- Ignore decorative background, logo, colors, borders, and watermark.
- Return only the required format.
"""

PROMPT_B = """
You are a professional presentation transcription system.

The input is a PDF converted from a presentation file or a PDF confirmed to be slide-based.

Each PDF page is ONE slide.

Your task:
- Extract all readable educational content.
- Keep the content slide by slide.
- Do NOT summarize.
- Do NOT rewrite.
- Do NOT shorten.
- Do NOT invent information.

Output format:

<<<SLIDE_START:{slide_number}>>>
[Slide {slide_number}]
{full extracted content of this slide}

Rules:
- Treat each page as one separate slide.
- Never merge slides.
- Never split slides.
- Keep titles, headings, bullet points, numbering, tables, formulas, source code, comments, labels, captions, and annotations.
- If there are diagrams, charts, screenshots, or educational images, briefly describe the important meaning and include visible labels if readable.
- Ignore decorative backgrounds, theme colors, logos, borders, watermarks, and page decorations unless they contain educational content.
- If some content is unreadable, write: [unclear content].
- Return only the required slide-by-slide output.
"""

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

def extract_media_with_gemini(file_path: str, mime_type: str) -> str:
    client = get_gemini_client()
    uploaded_file = None
    try:
        logger.info(f"Uploading {file_path} to Gemini (mime_type={mime_type})...")
        uploaded_file = client.files.upload(file=file_path)
        
        # Poll state until active
        uploaded_file = wait_for_gemini_file_active(client, uploaded_file)
        
        if mime_type.startswith("video/"):
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

def extract_image_inline(file_path: str, mime_type: str, prompt: str = IMAGE_PROMPT) -> str:
    client = get_gemini_client()
    try:
        logger.info(f"Sending inline image analysis request to Gemini (mime_type={mime_type})...")
        with open(file_path, "rb") as f:
            image_bytes = f.read()
            
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        )
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[image_part, prompt]
        )
        
        text = response.text
        if not text or not text.strip():
            raise ValueError("Gemini returned empty text")
            
        return text
    except Exception as e:
        logger.error(f"Failed to process inline image with Gemini: {e}")
        raise

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
    
    if is_image:
        mime_type = guess_media_mime_type(file_path, file_type)
        return extract_image_inline(file_path, mime_type)
    elif is_video or is_audio:
        mime_type = guess_media_mime_type(file_path, file_type)
        return extract_media_with_gemini(file_path, mime_type)
        
    # Try generic mime types handling as well
    if 'pdf' in file_type or ext == 'pdf':
        return extract_pdf_auto(file_path)
    elif 'excel' in file_type or 'spreadsheet' in file_type or ext in ['xls', 'xlsx']:
        return extract_text_from_excel(file_path, file_type)
    elif 'text' in file_type or 'txt' in file_type or ext == 'txt':
        return extract_text_from_txt(file_path)

    elif 'powerpoint' in file_type or 'presentation' in file_type or ext in ['ppt', 'pptx']:
        return extract_presentation_document(file_path)
    elif 'document' in file_type or 'docx' in file_type or ext == 'docx':
        return extract_text_from_docx(file_path)
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

def _sample_pdf_page_indexes(page_count: int, max_pages: int = 5) -> list:
    sample_count = min(max_pages, page_count)
    if sample_count <= 0:
        return []
    if sample_count == 1:
        return [0]
    return sorted({
        min(page_count - 1, round(i * (page_count - 1) / (sample_count - 1)))
        for i in range(sample_count)
    })

def has_full_page_background_or_object(file_path: str) -> bool:
    """
    Detect large image/drawing objects that cover most of sampled PDF pages.
    This intentionally ignores text meaning, titles, logos, and content labels.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF is required for PDF inspection. Please install it using 'pip install PyMuPDF'")

    try:
        with fitz.open(file_path) as doc:
            page_indexes = _sample_pdf_page_indexes(len(doc))
            if not page_indexes:
                logger.info("background_detected=False, reason=no_pages")
                return False

            detected_pages = 0
            for page_index in page_indexes:
                page = doc[page_index]
                page_area = page.rect.width * page.rect.height
                if page_area <= 0:
                    continue

                page_has_large_object = False

                for image in page.get_images(full=True):
                    xref = image[0]
                    try:
                        rects = page.get_image_rects(xref)
                    except Exception:
                        rects = []

                    for rect in rects:
                        coverage = (rect.width * rect.height) / page_area
                        if coverage >= 0.70:
                            page_has_large_object = True
                            break

                    if page_has_large_object:
                        break

                if not page_has_large_object:
                    try:
                        drawings = page.get_drawings()
                    except Exception:
                        drawings = []

                    for drawing in drawings:
                        rect = drawing.get("rect")
                        if rect is None:
                            continue
                        coverage = (rect.width * rect.height) / page_area
                        if coverage >= 0.70:
                            page_has_large_object = True
                            break

                if page_has_large_object:
                    detected_pages += 1

            required_pages = 1 if len(page_indexes) == 1 else max(2, math.ceil(len(page_indexes) * 0.6))
            result = detected_pages >= required_pages
            logger.info(
                f"background_detected={result}, detected_pages={detected_pages}, "
                f"sampled_pages={len(page_indexes)}"
            )
            return result

    except Exception as e:
        logger.warning(f"background_detected=False, reason=inspection_failed, error={e}")
        return False

def analyze_pdf_ratio(file_path: str) -> str:
    """
    Analyze sampled PDF page ratios.
    Returns NORMAL_PDF_BY_RATIO, SLIDE_PDF_BY_RATIO, or UNCERTAIN.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF is required for PDF ratio analysis. Please install it using 'pip install PyMuPDF'")

    try:
        with fitz.open(file_path) as doc:
            page_indexes = _sample_pdf_page_indexes(len(doc))
            if not page_indexes:
                logger.info("ratio_result=UNCERTAIN, reason=no_pages")
                return "UNCERTAIN"

            normal_count = 0
            slide_count = 0
            ratios = []

            for page_index in page_indexes:
                rect = doc[page_index].rect
                if rect.height <= 0:
                    continue

                ratio = rect.width / rect.height
                ratios.append(round(ratio, 4))

                if 0.65 <= ratio <= 0.85:
                    normal_count += 1
                elif 1.30 <= ratio <= 1.36 or 1.70 <= ratio <= 1.82:
                    slide_count += 1

            valid_count = len(ratios)
            if valid_count == 0:
                result = "UNCERTAIN"
            elif normal_count > valid_count / 2:
                result = "NORMAL_PDF_BY_RATIO"
            elif slide_count > valid_count / 2:
                result = "SLIDE_PDF_BY_RATIO"
            else:
                result = "UNCERTAIN"

            logger.info(
                f"ratio_result={result}, ratios={ratios}, "
                f"normal_count={normal_count}, slide_count={slide_count}"
            )
            return result

    except Exception as e:
        logger.warning(f"ratio_result=UNCERTAIN, reason=ratio_analysis_failed, error={e}")
        return "UNCERTAIN"

def _extract_text_after_marker(gemini_text: str, marker: str = "EXTRACTED_TEXT:") -> str:
    marker_index = gemini_text.find(marker)
    if marker_index < 0:
        return gemini_text.strip()
    return gemini_text[marker_index + len(marker):].strip()

def extract_pdf_auto(file_path: str) -> str:
    """Main flow for directly uploaded PDF files."""
    if has_full_page_background_or_object(file_path):
        logger.info("background_detected=True -> slide_pdf_prompt_b")
        return extract_presentation_document(file_path)

    ratio_result = analyze_pdf_ratio(file_path)
    logger.info(f"ratio_result={ratio_result}")

    if ratio_result == "SLIDE_PDF_BY_RATIO":
        logger.info("slide_pdf_prompt_b")
        return extract_presentation_document(file_path)

    if ratio_result == "NORMAL_PDF_BY_RATIO":
        logger.info("normal_pdf_python_extract")
        return extract_text_from_pdf(file_path)

    logger.info("uncertain_pdf_prompt_a")
    gemini_text = call_gemini_for_pdf(file_path, PROMPT_A)
    normalized = (gemini_text or "").upper()

    if "DOCUMENT_TYPE: NORMAL_PDF" in normalized:
        logger.info("PROMPT_A classified NORMAL_PDF -> normal_pdf_python_extract")
        return extract_text_from_pdf(file_path)

    if "DOCUMENT_TYPE: GEMINI_PDF" in normalized:
        logger.info("PROMPT_A classified GEMINI_PDF -> using EXTRACTED_TEXT")
        extracted_text = _extract_text_after_marker(gemini_text)
        if not extracted_text:
            raise ValueError("Gemini classified PDF as GEMINI_PDF but returned empty EXTRACTED_TEXT")
        return extracted_text

    logger.warning("PROMPT_A returned unrecognized format; returning Gemini text as fallback.")
    return gemini_text

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


def extract_text_from_excel(file_path: str, file_type: str = "") -> str:
    ext = os.path.splitext(file_path)[1].lower().strip('.')
    
    if ext == 'xls':
        try:
            import xlrd
        except ImportError:
            raise ImportError("xlrd is required for .xls files. pip install xlrd")
        
        wb = xlrd.open_workbook(file_path)
        text_parts = []
        
        for sheet in wb.sheets():
            text_parts.append(f"<<<SHEET:{sheet.name}>>>")
            is_header = True
            for rowx in range(sheet.nrows):
                row_values = sheet.row_values(rowx)
                if all(cell == "" for cell in row_values):
                    continue
                row_str_parts = [str(cell).strip().replace("\n", " ") for cell in row_values]
                row_text = " | ".join(row_str_parts)
                
                if is_header:
                    text_parts.append("<<<HEADER>>>")
                    text_parts.append(row_text)
                    is_header = False
                else:
                    text_parts.append(f"<<<ROW:{rowx+1}>>>")
                    text_parts.append(row_text)
                    
        return "\n".join(text_parts)
    
    else:
        try:
            import openpyxl
        except ImportError:
            raise ImportError("openpyxl is required. pip install openpyxl")
        
        wb = openpyxl.load_workbook(file_path, data_only=True)
        text_parts = []
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            text_parts.append(f"<<<SHEET:{sheet_name}>>>")
            is_header = True
            for idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
                if all(cell is None or str(cell).strip() == "" for cell in row):
                    continue
                row_str_parts = [str(cell).strip().replace("\n", " ") if cell is not None else "" for cell in row]
                row_text = " | ".join(row_str_parts)
                if is_header:
                    text_parts.append("<<<HEADER>>>")
                    text_parts.append(row_text)
                    is_header = False
                else:
                    text_parts.append(f"<<<ROW:{idx}>>>")
                    text_parts.append(row_text)
                    
        return "\n".join(text_parts)


def _find_libreoffice() -> str:
    """Find the LibreOffice executable path."""
    if LIBREOFFICE_PATH and os.path.exists(LIBREOFFICE_PATH):
        return LIBREOFFICE_PATH

    soffice_path = shutil.which("soffice")
    if soffice_path:
        return soffice_path

    common_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path
            
    return ""

def convert_ppt_to_pdf(file_path: str) -> str:
    """
    Convert PPT/PPTX to PDF using LibreOffice Headless.
    Returns the absolute path to the converted PDF file.
    """

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    abs_file_path = os.path.abspath(file_path)
    output_dir = os.path.dirname(abs_file_path)

    base_name = os.path.splitext(os.path.basename(abs_file_path))[0]
    pdf_path = os.path.join(output_dir, f"{base_name}.pdf")

    logger.info(f"Start converting PPT/PPTX to PDF: {abs_file_path}")

    libreoffice_path = _find_libreoffice()

    if not libreoffice_path or not os.path.exists(libreoffice_path):
        raise RuntimeError(
            "LibreOffice not found. Set LIBREOFFICE_PATH or install soffice in PATH."
        )

    command = [
        libreoffice_path,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        output_dir,
        abs_file_path
    ]

    logger.info("Running LibreOffice command:")
    logger.info(" ".join(command))

    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=120,
            check=True
        )

        logger.info(result.stdout)

    except subprocess.TimeoutExpired:
        raise RuntimeError(f"LibreOffice conversion timed out for file: {abs_file_path}")

    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"LibreOffice conversion failed.\n"
            f"stdout:\n{e.stdout}\n\n"
            f"stderr:\n{e.stderr}"
        )

    if not os.path.exists(pdf_path):
        raise RuntimeError(
            f"LibreOffice finished but PDF was not created: {pdf_path}"
        )

    logger.info(f"PDF created successfully: {pdf_path}")

    return pdf_path

def extract_text_from_pptx(file_path: str) -> str:
    """Backward-compatible wrapper for PPT/PPTX extraction."""
    return extract_presentation_document(file_path)

def extract_presentation_document(file_path: str) -> str:
    """
    Extract a confirmed presentation/slide document.
    PPT/PPTX are converted to PDF first; slide PDFs go directly to Gemini Prompt B.
    """
    ext = os.path.splitext(file_path)[1].lower().strip('.')

    if ext in ["ppt", "pptx"]:
        pdf_path = convert_ppt_to_pdf(file_path)
        logger.info(f"ppt_converted_prompt_b, source={file_path}, converted_pdf={pdf_path}")
        return call_gemini_for_pdf(pdf_path, PROMPT_B)

    if ext == "pdf":
        logger.info("slide_pdf_prompt_b")
        return call_gemini_for_pdf(file_path, PROMPT_B)

    raise ValueError(f"Unsupported presentation document type: {ext}")

def call_gemini_for_pdf(file_path: str, prompt: str) -> str:
    """Call Gemini Inline API for a PDF with the provided prompt."""
    client = get_gemini_client()
    try:
        logger.info(f"Reading PDF file {file_path} for Gemini Inline API...")
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
            
        pdf_part = types.Part.from_bytes(
            data=pdf_bytes,
            mime_type="application/pdf",
        )
        
        logger.info(f"Sending PDF inline analysis request to model: {GEMINI_MODEL}")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[pdf_part, prompt]
        )
        
        text = response.text
        if not text or not text.strip():
            raise ValueError("Gemini returned empty text for PDF extraction")
            
        return text
    except Exception as e:
        logger.error(f"Failed to process PDF with Gemini Inline API: {e}")
        raise

def extract_text_from_pdf_gemini(file_path: str) -> str:
    """Backward-compatible wrapper for old call sites."""
    return call_gemini_for_pdf(file_path, PROMPT_A)

