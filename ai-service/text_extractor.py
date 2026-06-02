import logging
import os

logger = logging.getLogger("ai-service.text_extractor")

def extract_text(file_path: str, file_type: str) -> str:
    """Extracts text from a local file based on its type."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    # Standardize the file type format
    file_type = file_type.lower().strip()
    if file_type.startswith('.'):
        file_type = file_type[1:]
        
    logger.info(f"Extracting text from {file_path} of type {file_type}")
    
    # Try generic mime types handling as well
    if 'pdf' in file_type:
        return extract_text_from_pdf(file_path)
    elif 'document' in file_type or 'docx' in file_type:
        return extract_text_from_docx(file_path)
    elif 'text' in file_type or 'txt' in file_type:
        return extract_text_from_txt(file_path)
    else:
        # Check by extension if mime type is ambiguous
        _, ext = os.path.splitext(file_path)
        ext = ext.lower().strip('.')
        if ext == 'pdf':
            return extract_text_from_pdf(file_path)
        elif ext == 'docx':
            return extract_text_from_docx(file_path)
        elif ext == 'txt':
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
        raise ImportError("python-docx is required for DOCX extraction. Please install it using 'pip install python-docx'")
        
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])
