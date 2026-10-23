import os
import sys
import tempfile
import subprocess
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTasks

app = FastAPI(title="ChangesPDF Python Engine API")

# Allow CORS so Vercel frontend can call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "ChangesPDF Python Engine",
        "python": sys.version,
    }

@app.post("/api/pdf-to-word")
async def convert_pdf_to_word(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ocrMode: str = Form("auto")
):
    # Validate ocrMode
    if ocrMode not in ("auto", "force", "off"):
        ocrMode = "auto"

    # Validate file
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        # Read content with 50MB limit
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        # Create temp files
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", ".docx")

        # Run our proven script convert_pdf_to_docx.py
        script_path = os.path.join(os.path.dirname(__file__), "scripts", "convert_pdf_to_docx.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--ocr", ocrMode]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            raise HTTPException(status_code=500, detail=f"Conversion error: {proc.stderr}")

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        # Cleanup input file now, and cleanup output file after response is sent
        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + ".docx" if file.filename else "converted.docx"

        return FileResponse(
            tmp_out_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/unlock-pdf")
async def unlock_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(""),
    forceUnlock: str = Form("false")
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", "_unlocked.pdf")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "unlock_pdf.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path]

        if password:
            cmd.extend(["--password", password])
        if forceUnlock.lower() == "true":
            cmd.append("--force")

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_raw = (proc.stderr or proc.stdout or "").strip()
            err_msg = err_raw.split("ERROR:", 1)[-1].strip() if "ERROR:" in err_raw else err_raw
            if not err_msg:
                err_msg = (
                    "Maaf, dokumen ini dilindungi kata sandi yang kuat dan kompleks (kombinasi huruf, angka, atau simbol) sehingga tidak dapat dibuka paksa. Silakan gunakan opsi 'Ketik Password Dokumen' jika Anda mengetahui kata sandinya."
                    if forceUnlock.lower() == "true"
                    else "Password yang Anda masukkan salah. Mohon periksa kembali huruf besar/kecil, angka, atau simbol password Anda."
                )
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_unlocked.pdf" if file.filename else "unlocked.pdf"

        return FileResponse(
            tmp_out_path,
            media_type="application/pdf",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/protect-pdf")
async def protect_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...),
    aes: str = Form("256")
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    if not password.strip():
        raise HTTPException(status_code=400, detail="Password cannot be empty.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", "_protected.pdf")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "protect_pdf.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--password", password, "--aes", aes]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_msg = (proc.stderr or proc.stdout or "Gagal mengenkripsi dokumen PDF.").strip()
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_protected.pdf" if file.filename else "protected.pdf"

        return FileResponse(
            tmp_out_path,
            media_type="application/pdf",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/remove-watermark")
async def remove_watermark_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    text: str = Form(""),
    mode: str = Form("custom")
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", "_clean.pdf")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "remove_watermark.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path]

        if text.strip():
            cmd.extend(["--text", text.strip()])
        if mode == "common":
            cmd.append("--common")

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_msg = (proc.stderr or proc.stdout or "Gagal menghapus watermark dari dokumen PDF.").strip()
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_clean.pdf" if file.filename else "clean.pdf"

        return FileResponse(
            tmp_out_path,
            media_type="application/pdf",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/check-watermark")
async def check_watermark_endpoint(
    file: UploadFile = File(...),
    text: str = Form("")
):
    if not file.filename or not text.strip():
        return {"ok": True, "found": False, "matchesCount": 0}

    try:
        content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "remove_watermark.py")
        cmd = [sys.executable, script_path, tmp_in_path, "--check", "--text", text.strip()]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        cleanup_file(tmp_in_path)

        import json
        import re
        match = re.search(r'CHECK_RESULT:\s*(\{.*\})', proc.stdout or "")
        if match:
            data = json.loads(match.group(1))
            return {"ok": True, "found": bool(data.get("found")), "matchesCount": int(data.get("matchesCount", 0))}

        return {"ok": True, "found": False, "matchesCount": 0}
    except Exception as e:
        return {"ok": True, "found": False, "matchesCount": 0}
@app.post("/api/compress-pdf")
async def compress_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    level: str = Form("recommended")
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", "_compressed.pdf")

        executed = False
        try:
            from scripts.compress_pdf import compress_pdf
            import asyncio
            await asyncio.to_thread(compress_pdf, tmp_in_path, tmp_out_path, level)
            executed = True
        except Exception:
            executed = False

        if not executed:
            script_path = os.path.join(os.path.dirname(__file__), "scripts", "compress_pdf.py")
            cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--level", level]

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if proc.returncode != 0:
                cleanup_file(tmp_in_path)
                cleanup_file(tmp_out_path)
                err_msg = (proc.stderr or proc.stdout or "Gagal mengompres dokumen PDF.").strip()
                raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_compressed.pdf" if file.filename else "compressed.pdf"

        return FileResponse(
            tmp_out_path,
            media_type="application/pdf",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compress-word")
async def compress_word_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    level: str = Form("recommended")
):
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in [".docx", ".doc"]):
        raise HTTPException(status_code=400, detail="Only Word documents (.docx, .doc) are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        ext = ".docx" if file.filename.lower().endswith(".docx") else ".doc"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(ext, "_compressed.docx")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "compress_docx.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--level", level]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_msg = (proc.stderr or proc.stdout or "Gagal mengompres dokumen Word.").strip()
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_compressed.docx" if file.filename else "compressed.docx"

        return FileResponse(
            tmp_out_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf-to-ppt")
async def pdf_to_ppt_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", ".pptx")

        executed = False
        try:
            from scripts.pdf_to_pptx import convert_pdf_to_pptx
            import asyncio
            await asyncio.to_thread(convert_pdf_to_pptx, tmp_in_path, tmp_out_path)
            executed = True
        except Exception:
            executed = False

        if not executed:
            script_path = os.path.join(os.path.dirname(__file__), "scripts", "pdf_to_pptx.py")
            cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path]

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if proc.returncode != 0:
                cleanup_file(tmp_in_path)
                cleanup_file(tmp_out_path)
                err_msg = (proc.stderr or proc.stdout or "Gagal mengonversi PDF ke PowerPoint.").strip()
                raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + ".pptx" if file.filename else "presentation.pptx"

        return FileResponse(
            tmp_out_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ppt-to-pdf")
async def ppt_to_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in [".pptx", ".ppt"]):
        raise HTTPException(status_code=400, detail="Only PowerPoint files (.pptx, .ppt) are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        ext = ".pptx" if file.filename.lower().endswith(".pptx") else ".ppt"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.rsplit(".", 1)[0] + ".pdf"

        executed = False
        try:
            from scripts.pptx_to_pdf import convert_pptx_to_pdf
            import asyncio
            await asyncio.to_thread(convert_pptx_to_pdf, tmp_in_path, tmp_out_path)
            executed = True
        except Exception:
            executed = False

        if not executed:
            script_path = os.path.join(os.path.dirname(__file__), "scripts", "pptx_to_pdf.py")
            cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path]

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if proc.returncode != 0:
                cleanup_file(tmp_in_path)
                cleanup_file(tmp_out_path)
                err_msg = (proc.stderr or proc.stdout or "Gagal mengonversi PowerPoint ke PDF.").strip()
                raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + ".pdf" if file.filename else "converted.pdf"

        return FileResponse(
            tmp_out_path,
            media_type="application/pdf",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compress-jpg")
async def compress_jpg_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    level: str = Form("recommended")
):
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in [".jpg", ".jpeg"]):
        raise HTTPException(status_code=400, detail="Only JPG/JPEG files are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        ext = ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(ext, "_compressed.jpg")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "compress_image.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--level", level]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_msg = (proc.stderr or proc.stdout or "Gagal mengompres gambar JPG.").strip()
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_compressed.jpg" if file.filename else "compressed.jpg"

        return FileResponse(
            tmp_out_path,
            media_type="image/jpeg",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compress-png")
async def compress_png_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    level: str = Form("recommended")
):
    if not file.filename or not file.filename.lower().endswith(".png"):
        raise HTTPException(status_code=400, detail="Only PNG files are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".png", "_compressed.png")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "compress_image.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--level", level]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_msg = (proc.stderr or proc.stdout or "Gagal mengompres gambar PNG.").strip()
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_compressed.png" if file.filename else "compressed.png"

        return FileResponse(
            tmp_out_path,
            media_type="image/png",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/compress-ppt")
async def compress_ppt_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    level: str = Form("recommended")
):
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in [".pptx", ".ppt"]):
        raise HTTPException(status_code=400, detail="Only PowerPoint files (.pptx, .ppt) are allowed.")

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds maximum allowed limit (50MB).")

        ext = ".pptx" if file.filename.lower().endswith(".pptx") else ".ppt"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_in:
            tmp_in.write(content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(ext, "_compressed.pptx")

        script_path = os.path.join(os.path.dirname(__file__), "scripts", "compress_pptx.py")
        cmd = [sys.executable, script_path, tmp_in_path, tmp_out_path, "--level", level]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if proc.returncode != 0:
            cleanup_file(tmp_in_path)
            cleanup_file(tmp_out_path)
            err_msg = (proc.stderr or proc.stdout or "Gagal mengompres dokumen PowerPoint.").strip()
            raise HTTPException(status_code=400, detail=err_msg)

        if not os.path.exists(tmp_out_path) or os.path.getsize(tmp_out_path) == 0:
            cleanup_file(tmp_in_path)
            raise HTTPException(status_code=500, detail="Output file not generated.")

        cleanup_file(tmp_in_path)
        background_tasks.add_task(cleanup_file, tmp_out_path)

        out_name = file.filename.rsplit(".", 1)[0] + "_compressed.pptx" if file.filename else "compressed.pptx"

        return FileResponse(
            tmp_out_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=out_name,
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
