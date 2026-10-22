import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getPythonPath(): string {
  const homeDir = os.homedir();
  const candidatePaths = [
    process.env.PYTHON_PATH || '',
    'C:\\laragon\\bin\\python\\python-3.13\\python.exe',
    path.join(homeDir, 'AppData', 'Local', 'Python', 'pythoncore-3.15-64', 'python.exe'),
    path.join(homeDir, 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(homeDir, 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(homeDir, 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'python.exe'),
    'C:\\Program Files\\Python313\\python.exe',
    'C:\\Program Files\\Python312\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
    'py',
    'python',
    'python3',
  ];

  for (const candidate of candidatePaths) {
    if (!candidate) continue;
    if (candidate.includes('\\') || candidate.includes('/')) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } else {
      return candidate;
    }
  }
  return 'python';
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
