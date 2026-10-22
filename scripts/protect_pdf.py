#!/usr/bin/env python3
"""
PDF Password Protection & Encryption Script using PyMuPDF (fitz).
Applies standard AES-256 (or AES-128) encryption with user and owner passwords.
"""
import sys
import os
import argparse
import fitz

def protect_pdf(input_path: str, output_path: str, user_pw: str, owner_pw: str = None, key_len: int = 256):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    if not user_pw:
        raise ValueError("Password cannot be empty")
        
    owner_pw = owner_pw or user_pw
    
    doc = fitz.open(input_path)
    
    # Select encryption method
    enc = fitz.PDF_ENCRYPT_AES_256 if key_len == 256 else fitz.PDF_ENCRYPT_AES_128
    
    # Permissions: allow printing and copying or restrict as desired
    perm = (
        fitz.PDF_PERM_PRINT
        | fitz.PDF_PERM_COPY
        | fitz.PDF_PERM_ANNOTATE
    )
    
    doc.save(
        output_path,
        encryption=enc,
        user_pw=user_pw,
        owner_pw=owner_pw,
        permissions=perm,
        deflate=True,
    )
    doc.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Protect PDF with password encryption")
    parser.add_argument("input", help="Path to input PDF")
    parser.add_argument("output", help="Path to output PDF")
    parser.add_argument("--password", "-p", required=True, help="Password for user access")
    parser.add_argument("--owner-password", help="Password for owner permissions")
    parser.add_argument("--aes", type=int, default=256, choices=[128, 256], help="AES key length (128 or 256)")
    
    args = parser.parse_args()
    try:
        protect_pdf(args.input, args.output, args.password, args.owner_password, args.aes)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
