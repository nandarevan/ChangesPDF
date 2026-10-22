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
    const aes = (formData.get('aes') as string) || '256';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'File PDF belum diunggah.' }, { status: 400 });
    }
    if (!password.trim()) {
      return NextResponse.json({ ok: false, error: 'Password tidak boleh kosong.' }, { status: 400 });
    }

    const baseName = (file.name || 'document.pdf').replace(/\.[^/.]+$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    const tempDir = os.tmpdir();
    const uniqueId = `protect_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPdf = path.join(tempDir, `${uniqueId}_in.pdf`);
    tempOutPdf = path.join(tempDir, `${uniqueId}_protected.pdf`);

    fs.writeFileSync(tempInPdf, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'protect_pdf.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script protect_pdf.py tidak ditemukan di ${scriptPath}`);
    }

    await execFileAsync(pythonPath, [scriptPath, tempInPdf, tempOutPdf, '--password', password, '--aes', aes], {
      timeout: 60000,
    });

    if (!fs.existsSync(tempOutPdf) || fs.statSync(tempOutPdf).size === 0) {
      throw new Error('Gagal mengenkripsi dokumen PDF.');
    }

    const protectedBuffer = fs.readFileSync(tempOutPdf);

    return new NextResponse(protectedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_protected.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF protection failed:', error);
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
