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
  let tempDocxPath = '';
  let tempPdfPath = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name || 'document.docx';
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const extension = path.extname(originalName).toLowerCase() || '.docx';
    const buffer = Buffer.from(await file.arrayBuffer());

    const tempDir = os.tmpdir();
    const uniqueId = `docx2pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempDocxPath = path.join(tempDir, `${uniqueId}${extension}`);
    tempPdfPath = path.join(tempDir, `${uniqueId}.pdf`);

    fs.writeFileSync(tempDocxPath, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'convert_docx_to_pdf.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Word-to-PDF conversion script not found at ${scriptPath}`);
    }

    // Execute Python / Word COM converter
    await execFileAsync(pythonPath, [scriptPath, tempDocxPath, tempPdfPath], {
      timeout: 120000, // 2 minutes max
    });

    if (!fs.existsSync(tempPdfPath) || fs.statSync(tempPdfPath).size === 0) {
      throw new Error('Conversion completed but output PDF was not generated.');
    }

    const pdfBuffer = fs.readFileSync(tempPdfPath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.pdf"`,
        'X-Converted-By': 'word-to-pdf-native',
      },
    });
  } catch (error: any) {
    console.error('Word to PDF conversion failed:', error);
    return NextResponse.json(
      {
        ok: false,
        fallback: true,
        error: error.message || String(error),
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary files
    try {
      if (tempDocxPath && fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
      if (tempPdfPath && fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
