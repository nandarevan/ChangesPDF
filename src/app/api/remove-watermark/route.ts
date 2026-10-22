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
  let tempOutPdf = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const text = (formData.get('text') as string) || '';
    const mode = (formData.get('mode') as string) || 'custom';
    const removeCommon = mode === 'common';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'File PDF belum diunggah.' }, { status: 400 });
    }

    if (mode === 'custom' && !text.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Silakan masukkan teks watermark yang ingin Anda hapus.' },
        { status: 400 }
      );
    }

    const baseName = (file.name || 'document.pdf').replace(/\.[^/.]+$/, '').replace(/_watermarked$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
      renderFormData.append('text', text);
      renderFormData.append('mode', mode);

      const renderResp = await fetch(`${backendUrl}/api/remove-watermark`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const docBuffer = await renderResp.arrayBuffer();
        return new NextResponse(Buffer.from(docBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_clean.pdf"`,
            'X-Cleaned-By': 'render-python',
          },
        });
      }
    } catch (renderErr) {
      console.warn('Render backend remove-watermark failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python
    const tempDir = os.tmpdir();
    const uniqueId = `rm_wm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPdf = path.join(tempDir, `${uniqueId}_in.pdf`);
    tempOutPdf = path.join(tempDir, `${uniqueId}_clean.pdf`);

    fs.writeFileSync(tempInPdf, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'remove_watermark.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script remove_watermark.py tidak ditemukan di ${scriptPath}`);
    }

    const args = [scriptPath, tempInPdf, tempOutPdf];
    if (text.trim()) {
      args.push('--text', text.trim());
    }
    if (removeCommon) {
      args.push('--common');
    }

    try {
      await execFileAsync(pythonPath, args, {
        timeout: 90000,
      });
    } catch (procErr: any) {
      const stderr = (procErr.stderr || procErr.message || '').trim();
      const match = stderr.match(/ERROR:\s*(.+)/);
      const errMsg = match ? match[1].trim() : stderr;
      return NextResponse.json(
        {
          ok: false,
          error: errMsg || 'Gagal menghapus watermark dari dokumen PDF.',
        },
        { status: 400 }
      );
    }

    if (!fs.existsSync(tempOutPdf) || fs.statSync(tempOutPdf).size === 0) {
      throw new Error('Gagal menghapus watermark dari dokumen PDF.');
    }

    const cleanBuffer = fs.readFileSync(tempOutPdf);

    return new NextResponse(cleanBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_no_watermark.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Remove watermark failed:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || String(error),
      },
      { status: 500 }
    );
  } finally {
    try {
      if (tempInPdf && fs.existsSync(tempInPdf)) fs.unlinkSync(tempInPdf);
      if (tempOutPdf && fs.existsSync(tempOutPdf)) fs.unlinkSync(tempOutPdf);
    } catch {}
  }
}
