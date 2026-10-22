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
