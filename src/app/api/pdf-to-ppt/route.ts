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
  let tempInPdf = '';
  let tempOutPptx = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'File PDF belum diunggah.' }, { status: 400 });
    }

    const baseName = (file.name || 'document.pdf').replace(/\.[^/.]+$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name || 'document.pdf');

      const renderResp = await fetch(`${backendUrl}/api/pdf-to-ppt`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const pptxBuffer = await renderResp.arrayBuffer();
        return new NextResponse(Buffer.from(pptxBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.pptx"`,
            'X-Converted-By': 'render-python',
          },
        });
      } else {
        const errJson = await renderResp.json().catch(() => ({}));
        return NextResponse.json(
          { ok: false, error: errJson.detail || 'Gagal mengonversi PDF ke PowerPoint.' },
          { status: 400 }
        );
      }
    } catch (renderErr) {
      console.warn('Render backend pdf-to-ppt failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python
    const tempDir = os.tmpdir();
    const uniqueId = `pdf_to_ppt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPdf = path.join(tempDir, `${uniqueId}_in.pdf`);
    tempOutPptx = path.join(tempDir, `${uniqueId}.pptx`);

    fs.writeFileSync(tempInPdf, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_pptx.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script pdf_to_pptx.py tidak ditemukan di ${scriptPath}`);
    }

    try {
      await execFileAsync(pythonPath, [scriptPath, tempInPdf, tempOutPptx], {
        timeout: 90000,
      });
    } catch (procErr: any) {
      const errMsg = (procErr.stderr || procErr.message || '').replace(/^ERROR:\s*/, '').trim();
      return NextResponse.json(
        { ok: false, error: errMsg || 'Gagal mengonversi PDF ke PowerPoint.' },
        { status: 400 }
      );
    }

    if (!fs.existsSync(tempOutPptx) || fs.statSync(tempOutPptx).size === 0) {
      throw new Error('Gagal menghasilkan file PowerPoint (.pptx).');
    }

    const pptxBuffer = fs.readFileSync(tempOutPptx);

    return new NextResponse(pptxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.pptx"`,
      },
    });
  } catch (error: any) {
    console.error('PDF to PPT conversion error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  } finally {
    try {
      if (tempInPdf && fs.existsSync(tempInPdf)) fs.unlinkSync(tempInPdf);
      if (tempOutPptx && fs.existsSync(tempOutPptx)) fs.unlinkSync(tempOutPptx);
    } catch {}
  }
}
