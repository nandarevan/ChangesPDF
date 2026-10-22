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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const text = (formData.get('text') as string) || '';

    if (!file || !text.trim()) {
      return NextResponse.json({ ok: true, found: false, matchesCount: 0 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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
