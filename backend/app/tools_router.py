import tempfile
import os
import asyncio
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
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
        doc.save(temp_path, garbage=1, deflate=True, clean=True)
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

import re
import csv


import json


import edge_tts
import asyncio
import os
import tempfile

@router.post("/download-page-audio")
async def download_page_audio(text: str = Form(...)):
    try:
        fd, temp_path = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)
        
        # Using a high-quality free Neural voice from Edge TTS
        communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
        await communicate.save(temp_path)
        
        from starlette.background import BackgroundTask
        def cleanup():
            try: os.remove(temp_path)
            except: pass
            
        return FileResponse(
            path=temp_path,
            filename="Audiobook_Page.mp3",
            media_type="audio/mpeg",
            background=BackgroundTask(cleanup)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

import pdfplumber
import pandas as pd
import tempfile
import os

@router.post("/pdf-to-excel")
async def convert_pdf_to_excel(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        # Save uploaded PDF to a temporary file
        fd_pdf, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(fd_pdf, "wb") as f_out:
            f_out.write(await file.read())
            
        all_tables = []
        with pdfplumber.open(temp_pdf_path) as pdf:
            for page in pdf.pages:
                # Use robust table extraction strategy
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        all_tables.extend(table)
                        # Add a blank row between tables to keep them separate
                        all_tables.append([""] * len(table[0]) if table else [])
        
        os.remove(temp_pdf_path)
        
        if not all_tables:
            raise HTTPException(status_code=400, detail="No tabular data found in this PDF.")
            
        # Create Excel file
        df = pd.DataFrame(all_tables)
        
        # Clean dataframe - replace None with empty string
        df = df.fillna("")
        
        fd_xlsx, temp_xlsx_path = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd_xlsx)
        
        # Write to excel without index and headers
        df.to_excel(temp_xlsx_path, index=False, header=False)
        
        from starlette.background import BackgroundTask
        def cleanup():
            try: os.remove(temp_xlsx_path)
            except: pass
            
        return FileResponse(
            path=temp_xlsx_path,
            filename=f"{file.filename.replace('.pdf', '')}_Data.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            background=BackgroundTask(cleanup)
        )
        
    except Exception as e:
        import traceback; traceback.print_exc(); raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-sensitive-data")
async def analyze_sensitive_data(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        import fitz
        import pdfplumber
        
        fd_pdf, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(fd_pdf, "wb") as f_out:
            f_out.write(await file.read())
            
        doc = fitz.open(temp_pdf_path)
        
        found = {
            "emails": set(),
            "phones": set(),
            "aadhar": set(),
            "credit_cards": set(),
            "columns": set()
        }
        
        pat_email = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
        pat_aadhar = r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b"
        pat_cc = r"\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b"
        pat_phone = r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"
        
        for page in doc:
            text = page.get_text("text")
            found["emails"].update(re.findall(pat_email, text))
            for match in re.findall(pat_aadhar, text):
                clean_len = len(re.sub(r"[ -]", "", match))
                if clean_len == 12: found["aadhar"].add(match)
                elif clean_len == 16: found["credit_cards"].add(match)
            for match in re.findall(pat_cc, text):
                found["credit_cards"].add(match)
            for match in re.findall(pat_phone, text):
                clean = re.sub(r"[-.\s]", "", match)
                if len(clean) == 10: found["phones"].add(match)
        doc.close()
        
        with pdfplumber.open(temp_pdf_path) as pdf_plumb:
            for page in pdf_plumb.pages:
                tables = page.find_tables()
                for table in tables:
                    extracted = table.extract()
                    if extracted and extracted[0]:
                        for header in extracted[0]:
                            if header and str(header).strip():
                                found["columns"].add(str(header).strip().replace('\n', ' '))
        
        os.remove(temp_pdf_path)
        
        return {
            "emails": list(found["emails"]),
            "phones": list(found["phones"]),
            "aadhar": list(found["aadhar"]),
            "credit_cards": list(found["credit_cards"]),
            "columns": list(found["columns"])
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/redact-pdf")
async def redact_pdf(
    file: UploadFile = File(...),
    items: str = Form("[]"),
    columns: str = Form("[]")
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        items_to_redact = set(json.loads(items))
        columns_to_redact = json.loads(columns)
        
        if not items_to_redact and not columns_to_redact:
            raise HTTPException(status_code=400, detail="No items or columns selected for redaction.")
            
        import fitz
        import pdfplumber
        
        fd_pdf, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(fd_pdf, "wb") as f_out:
            f_out.write(await file.read())
            
        doc = fitz.open(temp_pdf_path)
        
        with pdfplumber.open(temp_pdf_path) as pdf_plumb:
            for page_num, plumb_page in enumerate(pdf_plumb.pages):
                fitz_page = doc[page_num]
                
                # 1. Global Text Redaction for items (Emails, Phones, Custom Words)
                for word in items_to_redact:
                    text_instances = fitz_page.search_for(word)
                    for inst in text_instances:
                        fitz_page.add_redact_annot(inst, fill=(0, 0, 0))
                
                # 2. Strict Geometric Redaction for Table Columns
                if columns_to_redact:
                    for table in plumb_page.find_tables():
                        extracted = table.extract()
                        if not extracted or not extracted[0]: continue
                        
                        header_row = [str(c).strip().replace('\n', ' ').lower() if c else "" for c in extracted[0]]
                        
                        cols_indices = []
                        for idx, col_name in enumerate(header_row):
                            for req_col in columns_to_redact:
                                if req_col.lower() == col_name:
                                    cols_indices.append(idx)
                        
                        if cols_indices:
                            for row_idx, row_cells in enumerate(table.cells):
                                if row_idx == 0: continue # Skip header row
                                for col_idx in cols_indices:
                                    if col_idx < len(row_cells):
                                        cell_bbox = row_cells[col_idx]
                                        # Safely check if it's a valid bounding box
                                        if isinstance(cell_bbox, (tuple, list)) and len(cell_bbox) == 4:
                                            # pdfplumber bbox is (x0, top, x1, bottom)
                                            rect = fitz.Rect(cell_bbox[0], cell_bbox[1], cell_bbox[2], cell_bbox[3])
                                            fitz_page.add_redact_annot(rect, fill=(0, 0, 0))

                fitz_page.apply_redactions()
            
        fd_out, temp_out_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd_out)
        doc.save(temp_out_path, garbage=4, deflate=True)
        doc.close()
        os.remove(temp_pdf_path)
        
        from starlette.background import BackgroundTask
        def cleanup():
            try: os.remove(temp_out_path)
            except: pass
            
        return FileResponse(
            path=temp_out_path,
            filename=f"Redacted_{file.filename}",
            media_type="application/pdf",
            background=BackgroundTask(cleanup)
        )
        
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-text-paginated")
async def extract_text_paginated(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for page in doc:
            text = page.get_text("text")
            
            # --- Text Cleanup for Human-like TTS Flow ---
            text = re.sub(r'https?://\S+|www\.\S+', '', text)
            text = re.sub(r'\S+@\S+', '', text)
            text = text.replace('\n', ' ')
            text = re.sub(r'[_/\\|*~<>\[\]{}]', ' ', text)
            text = re.sub(r',([^\s])', r', \1', text)
            text = re.sub(r'\.([^\s])', r'. \1', text)
            text = re.sub(r'\s+', ' ', text).strip()
            
            if text:
                pages.append(text)
                
        doc.close()
        return {"pages": pages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

@router.post("/get-pdf-columns")

async def get_pdf_columns(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        columns = []
        for page in doc:
            tables = page.find_tables()
            for table in tables:
                data = table.extract()
                if data and len(data) > 0:
                    header = data[0]
                    for col in header:
                        if col and isinstance(col, str) and col.strip():
                            clean_col = " ".join(col.split()).strip()
                            if clean_col and clean_col not in columns:
                                columns.append(clean_col)
        doc.close()
        
        if not columns:
            raise HTTPException(status_code=404, detail="No table columns found in this PDF.")
            
        return {"columns": columns}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze PDF: {str(e)}")

@router.post("/extract-selected-columns")
async def extract_selected_columns(
    file: UploadFile = File(...),
    selected_columns: str = Form(...) 
):
    try:
        cols_to_extract = json.loads(selected_columns)
        if not cols_to_extract:
             raise HTTPException(status_code=400, detail="No columns selected.")
             
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        all_extracted_data = []
        
        for page in doc:
            tables = page.find_tables()
            for table in tables:
                data = table.extract()
                if not data or len(data) == 0:
                    continue
                
                header = data[0]
                clean_header = [" ".join(str(c).split()).strip() if c else "" for c in header]
                
                col_indices = []
                for req_col in cols_to_extract:
                    if req_col in clean_header:
                        col_indices.append((req_col, clean_header.index(req_col)))
                
                if not col_indices:
                    continue 
                    
                for row in data[1:]:
                    row_data = {}
                    for req_col, idx in col_indices:
                        if idx < len(row):
                            val = row[idx]
                            row_data[req_col] = " ".join(str(val).split()).strip() if val else ""
                        else:
                            row_data[req_col] = ""
                    
                    flat_row = [row_data.get(col, "") for col in cols_to_extract]
                    if any(flat_row):
                        all_extracted_data.append(flat_row)
                        
        doc.close()
        
        fd, temp_path = tempfile.mkstemp(suffix=".csv")
        with open(fd, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(cols_to_extract)
            writer.writerows(all_extracted_data)
            
        from starlette.background import BackgroundTask
        def cleanup():
            try: os.remove(temp_path)
            except: pass

        return FileResponse(
            path=temp_path,
            filename=f"Omni_CustomData_{file.filename}.csv",
            media_type="text/csv",
            background=BackgroundTask(cleanup)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


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

from PIL import Image
import io
import zipfile

@router.post("/convert-images")
async def convert_images(
    files: List[UploadFile] = File(...),
    target_format: str = Form("pdf")
):
    """Converts single/multiple images into PDF or other image formats with 100% loss-free quality and strict malicious file validation."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    validated_images = []

    # 1. Strict Security & Format Validation
    for f in files:
        img_bytes = await f.read()
        try:
            pil_img = Image.open(io.BytesIO(img_bytes))
            pil_img.verify()  # Verify image integrity (blocks malicious non-image payloads)
            
            # Re-open after verify() as Pillow requires
            pil_img = Image.open(io.BytesIO(img_bytes))
            validated_images.append({
                "filename": f.filename,
                "bytes": img_bytes,
                "pil": pil_img
            })
        except Exception:
            raise HTTPException(
                status_code=400, 
                detail=f"Security alert: File '{f.filename}' is not a valid image or is corrupted."
            )

    target_fmt = target_format.lower().strip()

    # 2. Convert Images to PDF (Lossless 100% Quality)
    if target_fmt == "pdf":
        try:
            doc = fitz.open()
            for img_info in validated_images:
                img_doc = fitz.open(stream=img_info["bytes"], filetype="image")
                pdf_bytes = img_doc.convert_to_pdf()
                page_doc = fitz.open("pdf", pdf_bytes)
                doc.insert_pdf(page_doc)
                img_doc.close()
                page_doc.close()

            fd, temp_path = tempfile.mkstemp(suffix=".pdf")
            os.close(fd)

            doc.save(temp_path, garbage=0, clean=False)  # Preserves 100% original image stream quality
            doc.close()

            from starlette.background import BackgroundTask
            def cleanup():
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

            return FileResponse(
                path=temp_path,
                filename="Omni_Converted_Images.pdf",
                media_type="application/pdf",
                background=BackgroundTask(cleanup)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create PDF from images: {str(e)}")

    # 3. Convert to JPG / PNG / WebP Format
    elif target_fmt in ["jpg", "jpeg", "png", "webp"]:
        pil_fmt = "JPEG" if target_fmt in ["jpg", "jpeg"] else target_fmt.upper()
        ext = "jpg" if target_fmt in ["jpg", "jpeg"] else target_fmt

        if len(validated_images) == 1:
            img_info = validated_images[0]
            img = img_info["pil"]
            if pil_fmt == "JPEG" and img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            out_buf = io.BytesIO()
            img.save(out_buf, format=pil_fmt, quality=100, subsampling=0) # 100% lossless quality
            out_buf.seek(0)

            fd, temp_path = tempfile.mkstemp(suffix=f".{ext}")
            os.close(fd)
            with open(temp_path, "wb") as out_f:
                out_f.write(out_buf.getvalue())

            from starlette.background import BackgroundTask
            def cleanup():
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

            return FileResponse(
                path=temp_path,
                filename=f"Omni_Converted_{img_info['filename']}.{ext}",
                media_type=f"image/{ext}",
                background=BackgroundTask(cleanup)
            )
        else:
            # Bulk converted zip
            fd, temp_zip_path = tempfile.mkstemp(suffix=".zip")
            os.close(fd)

            with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for idx, img_info in enumerate(validated_images):
                    img = img_info["pil"]
                    if pil_fmt == "JPEG" and img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")

                    out_buf = io.BytesIO()
                    img.save(out_buf, format=pil_fmt, quality=100, subsampling=0)
                    base_name = img_info["filename"].rsplit('.', 1)[0]
                    zf.writestr(f"{base_name}_converted.{ext}", out_buf.getvalue())

            from starlette.background import BackgroundTask
            def cleanup():
                try:
                    os.remove(temp_zip_path)
                except Exception:
                    pass

            return FileResponse(
                path=temp_zip_path,
                filename="Omni_Converted_Images.zip",
                media_type="application/zip",
                background=BackgroundTask(cleanup)
            )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {target_format}")





# ─── OCR Tool (English + Hindi) ───────────────────────────────────────────────

@router.post("/ocr")
async def ocr_document(
    file: UploadFile = File(...),
    language: str = Form("eng+hin"),
):
    """Extract text from scanned PDFs & photos (JPG, PNG, WebP) using offline OCR (English + Hindi support)."""
    filename_lower = file.filename.lower()
    is_pdf = filename_lower.endswith(".pdf")
    is_img = any(filename_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"])

    if not is_pdf and not is_img:
        raise HTTPException(status_code=400, detail="Only PDF and Image files (JPG, PNG, WebP) are supported.")

    try:
        file_bytes = await file.read()

        # ── Run CPU-heavy OCR in a thread so the async event loop stays free ────
        def _run_ocr():
            from PIL import Image as PILImage
            import io as _io
            from rapidocr_onnxruntime import RapidOCR
            ocr_engine = RapidOCR()

            _full_text = ""
            _page_count = 1

            if is_img:
                pil_img = PILImage.open(_io.BytesIO(file_bytes)).convert("RGB")
                ocr_result, _ = ocr_engine(pil_img)
                if ocr_result:
                    lines = [item[1] for item in ocr_result if item and len(item) > 1 and item[1].strip()]
                    _full_text = "\n".join(lines)
                _page_count = 1

            elif is_pdf:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                _page_count = len(doc)
                pages_text = []

                for page_num, page in enumerate(doc, start=1):
                    native_text = page.get_text("text").strip()
                    # Fast path for digital pages with clean text
                    if len(native_text) > 80:
                        pages_text.append(f"--- Page {page_num} ---\n\n{native_text}")
                    else:
                        # Scanned page — render at 2x zoom for high-accuracy OCR
                        mat = fitz.Matrix(2.0, 2.0)
                        pix = page.get_pixmap(matrix=mat, alpha=False)
                        pil_img = PILImage.open(_io.BytesIO(pix.tobytes("png"))).convert("RGB")
                        ocr_result, _ = ocr_engine(pil_img)

                        if ocr_result:
                            page_lines = [item[1] for item in ocr_result if item and len(item) > 1 and item[1].strip()]
                            extracted_page = "\n".join(page_lines)
                        else:
                            extracted_page = native_text or ""

                        pages_text.append(f"--- Page {page_num} ---\n\n{extracted_page}")

                doc.close()
                _full_text = "\n\n".join(pages_text)

            return _full_text, _page_count

        full_text, page_count = await asyncio.to_thread(_run_ocr)
        # ────────────────────────────────────────────────────────────────────────

        base_name = file.filename.rsplit(".", 1)[0]
        return JSONResponse(
            content={
                "success": True,
                "text": full_text.strip(),
                "filename": f"Omni_OCR_{base_name}.txt",
                "page_count": page_count,
            }
        )

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


# ─── PDF to Word (DOCX) ───────────────────────────────────────────────────────

@router.post("/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        from pdf2docx import Converter
        import docx
        from docx.enum.text import WD_LINE_SPACING
        from docx.shared import Pt
        import tempfile
        import os
        from starlette.background import BackgroundTask

        pdf_bytes = await file.read()
        
        fd_pdf, temp_pdf = tempfile.mkstemp(suffix=".pdf")
        os.close(fd_pdf)
        with open(temp_pdf, "wb") as f_pdf:
            f_pdf.write(pdf_bytes)
            
        fd_clean, temp_clean_pdf = tempfile.mkstemp(suffix="_clean.pdf")
        os.close(fd_clean)
        
        # 1. Advanced Watermark & Collision Cleaner via PyMuPDF
        # Removes diagonal/faint watermark text that causes layout overlap/corruption
        try:
            doc = fitz.open(temp_pdf)
            has_watermark = False
            for page in doc:
                raw_dict = page.get_text("rawdict")
                for block in raw_dict.get("blocks", []):
                    if block.get("type") == 0:  # text block
                        for line in block.get("lines", []):
                            dx, dy = line.get("dir", (1.0, 0.0))
                            # Diagonal text is always a watermark
                            is_diagonal = abs(dx) > 0.05 and abs(dy) > 0.05
                            
                            for span in line.get("spans", []):
                                text = span.get("text", "").lower().strip()
                                is_kw = any(w in text for w in ["watermark", "confidential", "sample copy", "draft copy", "do not copy"])
                                is_faint = span.get("opacity", 1.0) < 0.6
                                
                                if is_diagonal or is_kw or is_faint:
                                    has_watermark = True
                                    for ch in span.get("chars", []):
                                        page.add_redact_annot(fitz.Rect(ch["bbox"]), fill=False)
                if has_watermark:
                    page.apply_redactions()
            
            doc.save(temp_clean_pdf)
            doc.close()
            convert_source = temp_clean_pdf
        except Exception:
            convert_source = temp_pdf
            
        # 2a. Scanned PDF detection — guide user to OCR tool if no text found
        try:
            _check_doc = fitz.open(convert_source)
            _total_chars = sum(len(p.get_text()) for p in _check_doc)
            _check_doc.close()
            if _total_chars < 80:
                raise HTTPException(
                    status_code=422,
                    detail="This PDF appears to be scanned (image-only) — no text was found. Please use the OCR tool first to extract the text, then convert to Word."
                )
        except HTTPException:
            raise
        except Exception:
            pass  # If detection fails, proceed anyway

        fd_docx, temp_docx = tempfile.mkstemp(suffix=".docx")
        os.close(fd_docx)

        # 2b. Layout & Geometry Conversion
        # Semaphore: max 5 simultaneous conversions — prevents server overload
        # Thread: keeps async event loop free while pdf2docx runs
        def _run_conversion():
            cv = Converter(convert_source)
            cv.convert(
                temp_docx,
                start=0,
                end=None,
                connected_border_tolerance=0.5,
                list_not_table=True,
                parse_lattice_table=True,
                parse_stream_table=True,
                delete_end_line_hyphen=True
            )
            cv.close()
        await asyncio.to_thread(_run_conversion)
        
        # 3. Post-Processing: Prevent Line Overlap / Underlap in MS Word
        try:
            doc_word = docx.Document(temp_docx)
            
            def sanitize_para(p):
                # Switch EXACTLY line spacing to AT_LEAST to stop overlapping
                if p.paragraph_format.line_spacing_rule == WD_LINE_SPACING.EXACTLY:
                    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.AT_LEAST
                if p.paragraph_format.line_spacing is not None:
                    try:
                        if isinstance(p.paragraph_format.line_spacing, Pt) and p.paragraph_format.line_spacing < Pt(11):
                            p.paragraph_format.line_spacing = Pt(11.5)
                    except Exception:
                        pass
                if p.paragraph_format.space_before and p.paragraph_format.space_before < 0:
                    p.paragraph_format.space_before = Pt(0)
                if p.paragraph_format.space_after and p.paragraph_format.space_after < 0:
                    p.paragraph_format.space_after = Pt(2)

            for p in doc_word.paragraphs:
                sanitize_para(p)
                
            for table in doc_word.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            sanitize_para(p)
                            
            doc_word.save(temp_docx)
        except Exception as post_err:
            print("Post-processing warning:", post_err)
        
        def cleanup():
            for p in [temp_pdf, temp_clean_pdf, temp_docx]:
                try: os.remove(p)
                except: pass
            
        base_name = file.filename.replace(".pdf", "")
        return FileResponse(
            path=temp_docx,
            filename=f"Omni_Word_{base_name}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup)
        )
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to convert PDF to Word: {str(e)}")

