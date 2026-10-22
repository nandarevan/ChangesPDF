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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('test') === 'buka_paksa') {
    try {
      const pythonPath = getPythonPath();
      const code = `
import sys, json, fitz, os, time

# 1. Create a document with permissions restricted (owner pw only, empty user pw)
doc1 = fitz.open()
p1 = doc1.new_page()
p1.insert_text((100, 100), "Dokumen Terkunci Izin")
doc1.save("test_owner_only.pdf", encryption=fitz.PDF_ENCRYPT_AES_256, user_pw="", owner_pw="supersecretadmin123")
doc1.close()

# 2. Test Buka Paksa on owner-only protected PDF
doc_test1 = fitz.open("test_owner_only.pdf")
print("Is encrypted before:", doc_test1.is_encrypted)
# Authenticate with empty string
auth_res = doc_test1.authenticate("")
print("Auth with empty string:", auth_res)
doc_test1.save("test_owner_unlocked.pdf", encryption=fitz.PDF_ENCRYPT_NONE)
doc_test1.close()

# Check if unlocked
doc_chk = fitz.open("test_owner_unlocked.pdf")
print("Is encrypted after:", doc_chk.is_encrypted)
doc_chk.close()

# 3. Create a document with 4-digit PIN "2026"
doc2 = fitz.open()
p2 = doc2.new_page()
p2.insert_text((100, 100), "Dokumen PIN 4 Digit")
doc2.save("test_pin.pdf", encryption=fitz.PDF_ENCRYPT_AES_128, user_pw="2026", owner_pw="2026")
doc2.close()

# Test 4-digit PIN auto-crack
t0 = time.time()
doc_pin = fitz.open("test_pin.pdf")
found_pin = None
for pin in range(10000):
    candidate = f"{pin:04d}"
    if doc_pin.authenticate(candidate) > 0:
        found_pin = candidate
        break
t1 = time.time()
print(f"Cracked PIN: {found_pin} in {t1 - t0:.3f} seconds")
doc_pin.save("test_pin_unlocked.pdf", encryption=fitz.PDF_ENCRYPT_NONE)
doc_pin.close()

# Clean up
for f in ["test_owner_only.pdf", "test_owner_unlocked.pdf", "test_pin.pdf", "test_pin_unlocked.pdf"]:
    if os.path.exists(f): os.remove(f)

print(json.dumps({"ok": True, "buka_paksa_owner": True, "cracked_pin": found_pin, "elapsed": t1 - t0}))
`;
      const { stdout } = await execFileAsync(pythonPath, ['-c', code]);
      return NextResponse.json(JSON.parse(stdout.trim()));
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

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
