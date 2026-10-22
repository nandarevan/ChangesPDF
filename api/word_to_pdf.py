from http.server import BaseHTTPRequestHandler
import cgi
import tempfile
import os
import sys
import shutil
import subprocess

def convert_document(in_path, out_path):
    # Check if Microsoft Word COM is available on Windows
    if os.name == 'nt':
        ps_script = f"""
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {{
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open('{in_path}', $false, $true)
    $doc.SaveAs([ref]'{out_path}', [ref]17)
    $doc.Close([ref]0)
    $word.Quit()
    exit 0
}} catch {{
    if ($doc) {{ try {{ $doc.Close([ref]0) }} catch {{}} }}
    if ($word) {{ try {{ $word.Quit() }} catch {{}} }}
    exit 1
}}
"""
        try:
            res = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script], timeout=120)
            if res.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                return True
        except Exception:
            pass

    # Check for LibreOffice
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if soffice:
        out_dir = os.path.dirname(out_path)
        res = subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", out_dir, in_path], timeout=120)
        base = os.path.splitext(os.path.basename(in_path))[0]
        lo_out = os.path.join(out_dir, f"{base}.pdf")
        if os.path.exists(lo_out):
            if lo_out != out_path:
                shutil.move(lo_out, out_path)
            return True

    return False

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        in_path = None
        out_path = None
        try:
            content_type = self.headers.get('Content-Type', '')
            if not content_type.startswith('multipart/form-data'):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Content-Type must be multipart/form-data"}')
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type}
            )

            if 'file' not in form:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "No file field found in request"}')
                return

            file_item = form['file']
            file_data = file_item.file.read()

            with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as in_f:
                in_f.write(file_data)
                in_path = in_f.name

            out_path = in_path.replace('.docx', '.pdf')
            success = convert_document(in_path, out_path)

            if not success or not os.path.exists(out_path):
                raise RuntimeError("Failed to convert document to PDF")

            with open(out_path, 'rb') as out_f:
                pdf_bytes = out_f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'application/pdf')
            self.send_header('Content-Disposition', 'attachment; filename="converted.pdf"')
            self.send_header('Content-Length', str(len(pdf_bytes)))
            self.end_headers()
            self.wfile.write(pdf_bytes)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))
        finally:
            if in_path and os.path.exists(in_path):
                try:
                    os.remove(in_path)
                except:
                    pass
            if out_path and os.path.exists(out_path):
                try:
                    os.remove(out_path)
                except:
                    pass
