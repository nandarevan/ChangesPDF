import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getPythonPath(): string {
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

export async function POST(req: NextRequest) {
  let tempInPpt = '';
  let tempOutPdf = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'File PowerPoint belum diunggah.' }, { status: 400 });
    }

    const originalName = file.name || 'presentation.pptx';
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const ext = path.extname(originalName).toLowerCase() || '.pptx';
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), originalName);

      const renderResp = await fetch(`${backendUrl}/api/ppt-to-pdf`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const pdfBuffer = await renderResp.arrayBuffer();
        return new NextResponse(Buffer.from(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.pdf"`,
            'X-Converted-By': 'render-python',
          },
        });
      } else {
        const errJson = await renderResp.json().catch(() => ({}));
        return NextResponse.json(
          { ok: false, error: errJson.detail || 'Gagal mengonversi PowerPoint ke PDF.' },
          { status: 400 }
        );
      }
    } catch (renderErr) {
      console.warn('Render backend ppt-to-pdf failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python
    const tempDir = os.tmpdir();
    const uniqueId = `ppt_to_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPpt = path.join(tempDir, `${uniqueId}_in${ext}`);
    tempOutPdf = path.join(tempDir, `${uniqueId}.pdf`);

    fs.writeFileSync(tempInPpt, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'pptx_to_pdf.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script pptx_to_pdf.py tidak ditemukan di ${scriptPath}`);
    }

    try {
      await execFileAsync(pythonPath, [scriptPath, tempInPpt, tempOutPdf], {
        timeout: 90000,
      });
    } catch (procErr: any) {
      const errMsg = (procErr.stderr || procErr.message || '').replace(/^ERROR:\s*/, '').trim();
      return NextResponse.json(
        { ok: false, error: errMsg || 'Gagal mengonversi PowerPoint ke PDF.' },
        { status: 400 }
      );
    }

    if (!fs.existsSync(tempOutPdf) || fs.statSync(tempOutPdf).size === 0) {
      throw new Error('Gagal menghasilkan file PDF.');
    }

    const pdfBuffer = fs.readFileSync(tempOutPdf);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PPT to PDF conversion error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  } finally {
    try {
      if (tempInPpt && fs.existsSync(tempInPpt)) fs.unlinkSync(tempInPpt);
      if (tempOutPdf && fs.existsSync(tempOutPdf)) fs.unlinkSync(tempOutPdf);
    } catch {}
  }
}
