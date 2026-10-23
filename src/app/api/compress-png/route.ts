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
  let tempInPng = '';
  let tempOutPng = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const level = (formData.get('level') as string) || 'recommended';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'File PNG belum diunggah.' }, { status: 400 });
    }

    const originalName = file.name || 'image.png';
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'image/png' }), originalName);
      renderFormData.append('level', level);

      const renderResp = await fetch(`${backendUrl}/api/compress-png`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const compressedBuffer = await renderResp.arrayBuffer();
        return new NextResponse(Buffer.from(compressedBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_compressed.png"`,
            'X-Compressed-By': 'render-python',
          },
        });
      }
    } catch (renderErr) {
      console.warn('Render backend compress-png failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python
    const tempDir = os.tmpdir();
    const uniqueId = `compress_png_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPng = path.join(tempDir, `${uniqueId}_in.png`);
    tempOutPng = path.join(tempDir, `${uniqueId}_compressed.png`);

    fs.writeFileSync(tempInPng, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'compress_image.py');

    if (fs.existsSync(scriptPath)) {
      try {
        await execFileAsync(pythonPath, [scriptPath, tempInPng, tempOutPng, '--level', level], {
          timeout: 60000,
        });

        if (fs.existsSync(tempOutPng) && fs.statSync(tempOutPng).size > 0) {
          const compressedBuffer = fs.readFileSync(tempOutPng);
          return new NextResponse(compressedBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_compressed.png"`,
            },
          });
        }
      } catch (localErr) {
        console.warn('Local python compress-png failed:', localErr);
      }
    }

    // 3. Fallback: return original buffer
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_compressed.png"`,
      },
    });
  } catch (error: any) {
    console.error('PNG compression error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || String(error) },
      { status: 500 }
    );
  } finally {
    try {
      if (tempInPng && fs.existsSync(tempInPng)) fs.unlinkSync(tempInPng);
      if (tempOutPng && fs.existsSync(tempOutPng)) fs.unlinkSync(tempOutPng);
    } catch {}
  }
}
