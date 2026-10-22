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

export async function GET() {
  return NextResponse.json({
    ok: true,
    ocrEnabled: true,
    engine: 'RapidOCR + pdf2docx',
    supportedModes: ['auto', 'force', 'off'],
  });
}

export async function POST(req: NextRequest) {
  let tempPdfPath = '';
  let tempDocxPath = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ocrMode = (formData.get('ocrMode') as string) || 'auto';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const buffer = Buffer.from(await file.arrayBuffer());

    const tempDir = os.tmpdir();
    const uniqueId = `pdf2docx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tempPdfPath = path.join(tempDir, `${uniqueId}.pdf`);
    tempDocxPath = path.join(tempDir, `${uniqueId}.docx`);

    fs.writeFileSync(tempPdfPath, buffer);

    const pythonPath = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'convert_pdf_to_docx.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at ${scriptPath}`);
    }

    // Execute Python pdf2docx + RapidOCR converter
    await execFileAsync(pythonPath, [scriptPath, tempPdfPath, tempDocxPath, '--ocr', ocrMode], {
      timeout: 180000, // 3 minutes max for large OCR documents
    });

    if (!fs.existsSync(tempDocxPath)) {
      throw new Error('Python conversion completed but output file was not created.');
    }

    const docxBuffer = fs.readFileSync(tempDocxPath);

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.docx"`,
        'X-Converted-By': 'python-pdf2docx',
      },
    });
  } catch (error: any) {
    console.error('Python PDF to Word conversion failed:', error);
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
      if (tempPdfPath && fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      if (tempDocxPath && fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
