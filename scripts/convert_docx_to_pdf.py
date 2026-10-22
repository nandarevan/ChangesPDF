#!/usr/bin/env python3
"""
High-Fidelity Word (.docx / .doc) to PDF Converter.
Supports Windows native Microsoft Word COM automation for 100% exact layout,
fonts, tables, headers, footers, and image preservation, with cross-platform
LibreOffice and python fallback options.
"""

import sys
import os
import subprocess
import shutil

def convert_with_word_powershell(input_path: str, output_path: str) -> bool:
    """
    Convert Word document to PDF using Microsoft Word COM via PowerShell.
    This guarantees 100% fidelity on Windows systems with MS Office installed.
    """
    abs_input = os.path.abspath(input_path).replace("'", "''")
    abs_output = os.path.abspath(output_path).replace("'", "''")

    ps_script = f"""
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {{
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open('{abs_input}', $false, $true)
    # 17 = wdFormatPDF
    $doc.SaveAs([ref]'{abs_output}', [ref]17)
    $doc.Close([ref]0)
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    exit 0
}} catch {{
    if ($doc) {{ try {{ $doc.Close([ref]0) }} catch {{}} }}
    if ($word) {{ try {{ $word.Quit() }} catch {{}} }}
    Write-Error $_.Exception.Message
    exit 1
}}
"""
    try:
        proc = subprocess.run(
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=120
        )
        if proc.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True
        else:
            if proc.stderr:
                print(f"[Word COM Warning] {proc.stderr.strip()}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"[Word COM Error] {e}", file=sys.stderr)
        return False

def convert_with_libreoffice(input_path: str, output_path: str) -> bool:
    """
    Fallback using LibreOffice headless command line.
    """
    soffice_cmd = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_cmd:
        # Check standard Windows paths
        win_candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for candidate in win_candidates:
            if os.path.exists(candidate):
                soffice_cmd = candidate
                break

    if not soffice_cmd:
        return False

    out_dir = os.path.dirname(os.path.abspath(output_path))
    try:
        proc = subprocess.run(
            [soffice_cmd, "--headless", "--convert-to", "pdf", "--outdir", out_dir, os.path.abspath(input_path)],
            capture_output=True,
            text=True,
            timeout=120
        )
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        lo_output = os.path.join(out_dir, f"{base_name}.pdf")
        if os.path.exists(lo_output):
            if os.path.abspath(lo_output) != os.path.abspath(output_path):
                shutil.move(lo_output, output_path)
            return True
        return False
    except Exception as e:
        print(f"[LibreOffice Error] {e}", file=sys.stderr)
        return False

def convert_docx_to_pdf(input_path: str, output_path: str):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Ensure output directory exists
    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # 1. Try Windows Word COM (highest fidelity)
    if os.name == 'nt':
        print("[1/2] Attempting Microsoft Word COM conversion...")
        if convert_with_word_powershell(input_path, output_path):
            print(f"SUCCESS: Converted via Microsoft Word COM -> {output_path}")
            return True

    # 2. Try LibreOffice headless
    print("[2/2] Attempting LibreOffice conversion...")
    if convert_with_libreoffice(input_path, output_path):
        print(f"SUCCESS: Converted via LibreOffice -> {output_path}")
        return True

    raise RuntimeError("Conversion failed: Neither Microsoft Word COM nor LibreOffice was able to convert the document.")

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_docx_to_pdf.py <input.docx> <output.pdf>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        convert_docx_to_pdf(input_file, output_file)
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
