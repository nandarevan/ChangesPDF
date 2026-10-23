#!/usr/bin/env python3
"""
Advanced PDF Unlock & Force-Decryption Script using PyMuPDF (fitz).
Supports:
1. Standard Unlock with User/Owner Password (trimming, encoding variants).
2. "Buka Paksa" (Force Unlock):
   - Removes Owner / Restriction passwords (PDF permission bypass).
   - Tests empty password and common default passwords (admin, 1234, 0000, etc.).
   - Fast 4-digit PIN brute-force (0000-9999).
   - Completely removes encryption and permissions, outputting a 100% clean, unlocked PDF.
"""
import sys
import os
import argparse
import fitz

def unlock_pdf(input_path: str, output_path: str, password: str = "", force_unlock: bool = False):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    doc = fitz.open(input_path)
    
    # If the document is not encrypted at all, simply save clean copy
    if not doc.is_encrypted:
        doc.save(output_path, encryption=fitz.PDF_ENCRYPT_NONE, deflate=True)
        doc.close()
        return {"status": "unlocked", "method": "not_encrypted"}
    
    unlocked = False
    auth_method = ""
    
    if not force_unlock:
        # Mode 1: User explicitly chose "Ketik Password Dokumen"
        # In this mode, we MUST strictly validate the user's password.
        # If the password does not match, we MUST throw an error and NEVER bypass it!
        clean_pw = (password or "").strip()
        if not clean_pw:
            raise ValueError("Harap masukkan password dokumen PDF.")
            
        candidates = [
            password,
            clean_pw,
            clean_pw.strip("'\""),
            clean_pw.replace("\r", "").replace("\n", ""),
        ]
        candidates = list(dict.fromkeys(candidates))
        
        for candidate in candidates:
            if not candidate:
                continue
            res = doc.authenticate(candidate)
            if res > 0:
                unlocked = True
                auth_method = "user_password"
                break
                
        if not unlocked:
            raise ValueError("Password salah. Password yang Anda masukkan tidak cocok dengan dokumen PDF ini.")
            
    else:
        # Mode 2: "Buka Paksa (Tanpa Password)"
        # 1. Test empty password (handles 100% of owner password / restricted permissions PDFs!)
        res = doc.authenticate("")
        if res > 0:
            unlocked = True
            auth_method = "empty_password_bypass"
            
        # 2. Test common dictionary passwords
        if not unlocked:
            common_passwords = [
                "password", "1234", "123456", "0000", "1111", "admin", "12345678",
                "root", "user", "guest", "secret", "default", "9999", "123", "8888",
                "admin123", "pass", "master"
            ]
            for cp in common_passwords:
                if doc.authenticate(cp) > 0:
                    unlocked = True
                    auth_method = f"common_dict_{cp}"
                    break
                    
        # 3. Fast 4-digit numeric PIN crack (0000 - 9999) - runs in ~0.15s in PyMuPDF
        if not unlocked:
            for pin in range(10000):
                if doc.authenticate(f"{pin:04d}") > 0:
                    unlocked = True
                    auth_method = f"pin_{pin:04d}"
                    break
                    
        if not unlocked:
            raise ValueError(
                "Maaf, dokumen ini dilindungi kata sandi yang kuat dan kompleks (kombinasi huruf, angka, atau simbol) sehingga tidak dapat dibuka paksa. "
                "Silakan gunakan opsi 'Ketik Password Dokumen' jika Anda mengetahui kata sandinya."
            )
                
    # Cleanly remove all encryption and permissions permanently:
    # Creating a new unencrypted document and copying all pages via insert_pdf guarantees
    # that any residual encryption dictionaries, permissions locks, or owner/user security
    # envelopes from the original PDF are 100% stripped from the output.
    new_doc = fitz.open()
    new_doc.insert_pdf(doc)
    
    # Preserve metadata and table of contents
    try:
        if doc.metadata:
            new_doc.set_metadata(doc.metadata)
    except Exception:
        pass
        
    try:
        toc = doc.get_toc(False)
        if toc:
            new_doc.set_toc(toc)
    except Exception:
        pass

    new_doc.save(output_path, encryption=fitz.PDF_ENCRYPT_NONE, deflate=True, garbage=4, clean=True)
    new_doc.close()
    doc.close()
    
    # Double check output file has no encryption remaining
    verify_doc = fitz.open(output_path)
    if verify_doc.is_encrypted:
        verify_doc.close()
        raise RuntimeError("Gagal menghapus proteksi dokumen. Enkripsi PDF masih aktif.")
    verify_doc.close()
    
    return {"status": "unlocked", "method": auth_method}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unlock and remove password from PDF")
    parser.add_argument("input", help="Path to input PDF")
    parser.add_argument("output", help="Path to output PDF")
    parser.add_argument("--password", "-p", default="", help="Password to decrypt PDF")
    parser.add_argument("--force", action="store_true", help="Force unlock without password")
    
    args = parser.parse_args()
    try:
        res = unlock_pdf(args.input, args.output, args.password, force_unlock=args.force)
        print(f"SUCCESS: {res['method']}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
