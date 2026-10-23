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
  let tempInDocx = '';
  let tempOutDocx = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const level = (formData.get('level') as string) || 'recommended';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name || 'document.docx';
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const extension = path.extname(originalName).toLowerCase() || '.docx';
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python if running in serverless / production
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), originalName);
      renderFormData.append('level', level);

      const renderResp = await fetch(`${backendUrl}/api/compress-word`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const compressedBuffer = await renderResp.arrayBuffer();
        return new NextResponse(Buffer.from(compressedBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_compressed.docx"`,
            'X-Compressed-By': 'render-python',
          },
        });
      }
    } catch (renderErr) {
      console.warn('Render backend compress-word failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python
    const tempDir = os.tmpdir();
    const uniqueId = `compress_word_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInDocx = path.join(tempDir, `${uniqueId}_in${extension}`);
    tempOutDocx = path.join(tempDir, `${uniqueId}_out.docx`);

    fs.writeFileSync(tempInDocx, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'compress_docx.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Compress script not found at ${scriptPath}`);
    }

    const { stdout } = await execFileAsync(pythonPath, [scriptPath, tempInDocx, tempOutDocx, '--level', level], {
      timeout: 120000,
    });

    if (!fs.existsSync(tempOutDocx) || fs.statSync(tempOutDocx).size === 0) {
      throw new Error('Word compression failed: Output file not created.');
    }

    let stats = { original_size: buffer.length, compressed_size: fs.statSync(tempOutDocx).size, savings_percent: 0 };
    try {
      const match = stdout.match(/\{"original_size":.*\}/);
      if (match) {
        stats = JSON.parse(match[0]);
      }
    } catch {}

    const compressedBuffer = fs.readFileSync(tempOutDocx);

    return new NextResponse(compressedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_compressed.docx"`,
        'X-Original-Size': String(stats.original_size),
        'X-Compressed-Size': String(stats.compressed_size),
        'X-Savings-Percent': String(stats.savings_percent),
      },
    });
  } catch (error: any) {
    console.error('Word compression failed:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || String(error),
      },
      { status: 500 }
    );
  } finally {
    try {
      if (tempInDocx && fs.existsSync(tempInDocx)) fs.unlinkSync(tempInDocx);
      if (tempOutDocx && fs.existsSync(tempOutDocx)) fs.unlinkSync(tempOutDocx);
    } catch {}
  }
}
