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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const text = (formData.get('text') as string) || '';

    if (!file || !text.trim()) {
      return NextResponse.json({ ok: true, found: false, matchesCount: 0 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Try Render Backend Python
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://changespdf-backend.onrender.com';
    try {
      const renderFormData = new FormData();
      renderFormData.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
      renderFormData.append('text', text);

      const renderResp = await fetch(`${backendUrl}/api/check-watermark`, {
        method: 'POST',
        body: renderFormData,
      });

      if (renderResp.ok) {
        const checkData = await renderResp.json();
        return NextResponse.json(checkData);
      }
    } catch (renderErr) {
      console.warn('Render backend check-watermark failed, trying local python...', renderErr);
    }

    // 2. Fallback to Local Python
    const tempDir = os.tmpdir();
    const uniqueId = `chk_wm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempInPdf = path.join(tempDir, `${uniqueId}_in.pdf`);
    fs.writeFileSync(tempInPdf, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'remove_watermark.py');

    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ ok: true, found: false, matchesCount: 0 });
    }

    const args = [scriptPath, tempInPdf, '--check', '--text', text.trim()];

    const { stdout } = await execFileAsync(pythonPath, args, { timeout: 15000 });
    const match = stdout.match(/CHECK_RESULT:\s*(\{.*\})/);
    if (match) {
      const data = JSON.parse(match[1]);
      return NextResponse.json({
        ok: true,
        found: Boolean(data.found),
        matchesCount: Number(data.matchesCount) || 0,
      });
    }

    return NextResponse.json({ ok: true, found: false, matchesCount: 0 });
  } catch (err: any) {
    console.warn('Check watermark API error:', err);
    return NextResponse.json({ ok: true, found: false, matchesCount: 0 });
  } finally {
    try {
      if (tempInPdf && fs.existsSync(tempInPdf)) fs.unlinkSync(tempInPdf);
    } catch {}
  }
}
