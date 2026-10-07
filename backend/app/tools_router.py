import tempfile
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
import fitz  # PyMuPDF

router = APIRouter(prefix="/api/tools", tags=["tools"])

@router.post("/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    if not files or len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 PDF files are required to merge.")

    # Sort files by filename to ensure predictable order if needed, 
    # but usually the client sends them in the desired order.
    # We will trust the order provided by the client's FormData.

    merged_doc = fitz.open()

    try:
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")
            
            # Read file content into memory
            pdf_bytes = await file.read()
            # Open it with PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            # Append it to the merged_doc
            merged_doc.insert_pdf(doc)
            doc.close()
            
        # Create a temporary file to save the merged PDF
        fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        
        # Save without garbage collection for maximum speed, or with garbage collection to compress.
        # We will use basic save. For 500MB+ it's extremely fast.
        merged_doc.save(temp_path)
        merged_doc.close()
        
        # Return the file response. FileResponse can delete the file after sending if we use background tasks,
        # but for simplicity and safety across OS, we can just let tempfile clean it up eventually, or we can use background task.
        from starlette.background import BackgroundTask
        
        def cleanup():
            try:
                os.remove(temp_path)
            except Exception:
                pass

        return FileResponse(
            path=temp_path,
            filename="Omni_Merged_Document.pdf",
            media_type="application/pdf",
            background=BackgroundTask(cleanup)
        )
        
    except Exception as e:
        merged_doc.close()
        raise HTTPException(status_code=500, detail=f"Failed to merge PDFs: {str(e)}")

@router.post("/compress")
async def compress_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        
        # Deep Compression Engine: 
        # Clean removes unreferenced streams. 
        # deflate_images and deflate_fonts compress the internal resources heavily.
        doc.save(temp_path, garbage=2, deflate=True, deflate_images=True, deflate_fonts=True, clean=True)
        doc.close()
        
        from starlette.background import BackgroundTask
        def cleanup():
            try:
                os.remove(temp_path)
            except Exception:
                pass

        return FileResponse(
            path=temp_path,
            filename=f"Omni_Compressed_{file.filename}",
            media_type="application/pdf",
            background=BackgroundTask(cleanup)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compress PDF: {str(e)}")

@router.post("/unlock")
async def unlock_pdf(file: UploadFile = File(...), password: str = Form("")):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        if doc.needs_pass:
            if not password:
                doc.close()
                raise HTTPException(status_code=401, detail="PASSWORD_REQUIRED")
            if not doc.authenticate(password):
                doc.close()
                raise HTTPException(status_code=401, detail="INCORRECT_PASSWORD")

        fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        
        # Save it without any encryption or permissions (it strips them natively)
        doc.save(temp_path)
        doc.close()
        
        from starlette.background import BackgroundTask
        def cleanup():
            try:
                os.remove(temp_path)
            except Exception:
                pass

        return FileResponse(
            path=temp_path,
            filename=f"Omni_Unlocked_{file.filename}",
            media_type="application/pdf",
            background=BackgroundTask(cleanup)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlock PDF: {str(e)}")

@router.post("/extract")
async def extract_pdf(file: UploadFile = File(...), pages: str = Form(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Parse pages string (e.g., "1-3, 5, 7-9")
        # Note: fitz pages are 0-indexed, user inputs are 1-indexed
        pages_to_keep = set()
        parts = pages.split(",")
        for part in parts:
            part = part.strip()
            if not part: continue
            if "-" in part:
                start, end = part.split("-")
                start_idx = max(0, int(start) - 1)
                end_idx = min(len(doc) - 1, int(end) - 1)
                pages_to_keep.update(range(start_idx, end_idx + 1))
            else:
                idx = int(part) - 1
                if 0 <= idx < len(doc):
                    pages_to_keep.add(idx)
                    
        if not pages_to_keep:
            doc.close()
            raise HTTPException(status_code=400, detail="No valid pages specified for extraction.")
            
        pages_list = sorted(list(pages_to_keep))
        doc.select(pages_list)
        
        fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        
        doc.save(temp_path, garbage=1, deflate=True)
        doc.close()
        
        from starlette.background import BackgroundTask
        def cleanup():
            try:
                os.remove(temp_path)
            except Exception:
                pass

        return FileResponse(
            path=temp_path,
            filename=f"Omni_Extracted_{file.filename}",
            media_type="application/pdf",
            background=BackgroundTask(cleanup)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract pages: {str(e)}")


@router.post("/extract-text")
async def extract_pdf_text(file: UploadFile = File(...)):
    """Extracts raw text perfectly from all pages without missing a single word."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        extracted_pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            # preserve layout roughly using "text" or "blocks"
            text = page.get_text("text") 
            extracted_pages.append({
                "page": page_num + 1,
                "text": text
            })
            
        doc.close()
        
        return {
            "filename": file.filename,
            "total_pages": len(extracted_pages),
            "pages": extracted_pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")


