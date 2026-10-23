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
    const password = (formData.get('password') as string) || '';
    const forceUnlock = formData.get('forceUnlock') === 'true';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'File PDF belum diunggah.' }, { status: 400 });
    }

    const baseName = (file.name || 'document.pdf').replace(/\.[^/.]+$/, '').replace(/_protected$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python if running in serverless / configured
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
      renderFormData.append('password', password);
      renderFormData.append('forceUnlock', String(forceUnlock));

      const renderResp = await fetch(`${backendUrl}/api/unlock-pdf`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const docBuffer = await renderResp.arrayBuffer();
        return new NextResponse(Buffer.from(docBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_unlocked.pdf"`,
            'X-Unlocked-By': 'render-python',
          },
        });
      } else {
        const errJson = await renderResp.json().catch(() => ({}));
        if (renderResp.status === 400) {
          const defaultMsg = forceUnlock
            ? 'Maaf, dokumen ini dilindungi kata sandi yang kuat dan kompleks (kombinasi huruf, angka, atau simbol) sehingga tidak dapat dibuka paksa. Silakan gunakan opsi "Ketik Password Dokumen" jika Anda mengetahui kata sandinya.'
            : 'Password salah. Pastikan password yang dimasukkan benar.';
          return NextResponse.json(
            { ok: false, error: errJson.detail || defaultMsg },
            { status: 400 }
          );
        }
      }
    } catch (renderErr) {
      console.warn('Render backend unlock failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python (e.g. localhost)
    const tempDir = os.tmpdir();
    const uniqueId = `unlock_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPdf = path.join(tempDir, `${uniqueId}_in.pdf`);
    tempOutPdf = path.join(tempDir, `${uniqueId}_unlocked.pdf`);

    fs.writeFileSync(tempInPdf, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'unlock_pdf.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script unlock_pdf.py tidak ditemukan di ${scriptPath}`);
    }

    const pyArgs = [scriptPath, tempInPdf, tempOutPdf];
    if (password) {
      pyArgs.push('--password', password);
    }
    if (forceUnlock) {
      pyArgs.push('--force');
    }

    try {
      await execFileAsync(pythonPath, pyArgs, {
        timeout: 60000,
      });
    } catch (procErr: any) {
      const errMsg = (procErr.stderr || procErr.message || '').replace(/^ERROR:\s*/, '').trim();
      const defaultMsg = forceUnlock
        ? 'Maaf, dokumen ini dilindungi kata sandi yang kuat dan kompleks (kombinasi huruf, angka, atau simbol) sehingga tidak dapat dibuka paksa. Silakan gunakan opsi "Ketik Password Dokumen" jika Anda mengetahui kata sandinya.'
        : 'Gagal membuka proteksi dokumen PDF.';
      return NextResponse.json(
        {
          ok: false,
          error: errMsg || defaultMsg,
          isWrongPassword: errMsg.includes('Password salah'),
        },
        { status: 400 }
      );
    }

    if (!fs.existsSync(tempOutPdf) || fs.statSync(tempOutPdf).size === 0) {
      throw new Error('Gagal membuka proteksi dokumen PDF.');
    }

    const unlockedBuffer = fs.readFileSync(tempOutPdf);

    return new NextResponse(unlockedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_unlocked.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF unlock failed:', error);
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
