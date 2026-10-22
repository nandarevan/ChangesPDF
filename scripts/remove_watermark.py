#!/usr/bin/env python3
"""
PDF Watermark Removal Script using PyMuPDF (fitz).
Removes text watermarks (exact or pattern-based), watermark annotations,
stamps, and translucent background overlays without creating black boxes.
"""
import sys
import os
import argparse
import fitz

import re

COMMON_WATERMARKS = [
    "CONFIDENTIAL",
    "DRAFT",
    "SAMPLE",
    "WATERMARK",
    "DO NOT COPY",
    "COPY",
    "RAHASIA",
    "CONTOH",
    "TIDAK BOLEH DISEBARLUASKAN",
    "PREVIEW",
    "EVALUATION COPY",
    "FOR REVIEW ONLY",
]

def is_whole_word_on_page(page, target_text: str) -> bool:
    """
    Check if target_text exists on this page as an exact whole word or whole phrase.
    Prevents partial substrings (e.g. 'yoi', 'YOI', 'y', 'yo', 'YO') from matching when the watermark is 'YOII'.
    """
    clean = target_text.strip()
    if not clean:
        return False
    
    page_text = page.get_text("text")
    pattern = r'(?<!\w)' + re.escape(clean) + r'(?!\w)'
    if re.search(pattern, page_text, flags=re.IGNORECASE):
        return True
    
    # Also support spaced letters if watermark was rendered with character spacing (e.g. Y O I I)
    spaced_pattern = r'(?<!\w)' + r'\s*'.join(re.escape(c) for c in clean) + r'(?!\w)'
    if re.search(spaced_pattern, page_text, flags=re.IGNORECASE):
        return True
        
    return False

def remove_watermark(
    input_path: str,
    output_path: str,
    target_text: str = None,
    remove_all_common: bool = False,
    remove_annots: bool = True,
    password: str = "",
):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    doc = fitz.open(input_path)
    if doc.is_encrypted:
        res = 0
        if password and password.strip():
            res = doc.authenticate(password.strip())
        if res <= 0:
            res = doc.authenticate("")
        if doc.is_encrypted:
            raise ValueError("Dokumen PDF ini diproteksi password. Harap buka proteksinya terlebih dahulu di menu 'Unlock PDF'.")
        
    targets = []
    custom_target = target_text.strip() if target_text and target_text.strip() else None
    if custom_target:
        targets.append(custom_target)
    if remove_all_common:
        targets.extend(COMMON_WATERMARKS)
        
    # Deduplicate targets
    targets = list(dict.fromkeys(targets))

    total_redacted = 0
    total_annots_removed = 0
    custom_target_matched = 0

    for page in doc:
        # 1. Search and redact text watermarks (including diagonal/rotated watermarks via quads=True)
        for t in targets:
            is_custom = custom_target and (t.lower() == custom_target.lower())
            
            # STRICT WHOLE-WORD REQUIREMENT:
            # If target is custom text (e.g. 'YOII'), it MUST exist on this page as a complete whole word or whole phrase.
            # Substrings like 'yoi', 'YOI', 'y', 'yo', 'YO' MUST NOT match if the watermark is 'YOII'!
            if is_custom and not is_whole_word_on_page(page, t):
                continue
                
            quad_variants = []
            for variant in [t, t.upper(), t.lower(), t.title()]:
                q_list = page.search_for(variant, quads=True)
                if q_list:
                    quad_variants.extend(q_list)
                
            for q in quad_variants:
                # If custom target, verify this quad is truly a whole word and not a partial slice of a longer word
                if is_custom:
                    check_rect = fitz.Rect(q.rect.x0 - 6, q.rect.y0 - 4, q.rect.x1 + 6, q.rect.y1 + 4)
                    surrounding = page.get_text("text", clip=check_rect).strip()
                    pat = r'(?<!\w)' + re.escape(t.strip()) + r'(?!\w)'
                    pat_sp = r'(?<!\w)' + r'\s*'.join(re.escape(c) for c in t.strip()) + r'(?!\w)'
                    if surrounding and not (re.search(pat, surrounding, flags=re.IGNORECASE) or re.search(pat_sp, surrounding, flags=re.IGNORECASE)):
                        continue # Skip: this quad is merely a substring of a larger word
                        
                page.add_redact_annot(q.rect, fill=None)
                total_redacted += 1
                if is_custom:
                    custom_target_matched += 1

        # Apply text redactions seamlessly without black boxes
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

        # 2. Remove watermark annotations (Watermark, Stamp, FreeText)
        if remove_annots:
            for annot in list(page.annots()):
                sub = annot.type[1] if isinstance(annot.type, tuple) else str(annot.type)
                info = annot.info or {}
                content = (info.get("content") or "") + " " + (info.get("subject") or "") + " " + (info.get("title") or "")
                
                is_watermark = "watermark" in sub.lower() or "stamp" in sub.lower()
                matches_text = False
                for t in targets:
                    pat = r'(?<!\w)' + re.escape(t.strip()) + r'(?!\w)'
                    if re.search(pat, content, flags=re.IGNORECASE):
                        matches_text = True
                        break
                
                if is_watermark or matches_text:
                    page.delete_annot(annot)
                    total_annots_removed += 1
                    if custom_target:
                        pat_custom = r'(?<!\w)' + re.escape(custom_target) + r'(?!\w)'
                        if re.search(pat_custom, content, flags=re.IGNORECASE):
                            custom_target_matched += 1

    # VALIDASI TEGAS: Jika pengguna memasukkan teks watermark tertentu,
    # dan teks tersebut TIDAK COCOK sama sekali sebagai kata utuh di dokumen PDF:
    if custom_target and custom_target_matched == 0:
        doc.close()
        raise ValueError(
            f"Teks watermark '{custom_target}' tidak ditemukan di dalam dokumen PDF ini. "
            f"Pastikan teks yang diketik sama persis dengan watermark yang ada di dokumen."
        )

    doc.save(output_path, deflate=True, garbage=4, clean=True)
    doc.close()
    
    return {
        "text_redacted_count": total_redacted,
        "annots_removed_count": total_annots_removed,
    }


def check_watermark(input_path: str, target_text: str, password: str = ""):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    doc = fitz.open(input_path)
    if doc.is_encrypted:
        res = 0
        if password and password.strip():
            res = doc.authenticate(password.strip())
        if res <= 0:
            res = doc.authenticate("")
        if doc.is_encrypted:
            doc.close()
            return {"found": False, "matchesCount": 0, "encrypted": True}
    
    clean_target = target_text.strip() if target_text else ""
    if not clean_target:
        doc.close()
        return {"found": False, "matchesCount": 0}
        
    matches = 0
    for page in doc:
        # STRICT WHOLE-WORD CHECK:
        # Only count if clean_target exists as an exact whole word or phrase,
        # never as a partial prefix or substring (e.g. 'yoi', 'YOI', 'y', 'yo', 'YO' for 'YOII')
        if is_whole_word_on_page(page, clean_target):
            matches += 1
            
        for annot in list(page.annots()):
            info = annot.info or {}
            content = ((info.get("content") or "") + " " + (info.get("subject") or ""))
            pattern = r'(?<!\w)' + re.escape(clean_target) + r'(?!\w)'
            if re.search(pattern, content, flags=re.IGNORECASE):
                matches += 1
                
    doc.close()
    return {"found": matches > 0, "matchesCount": matches}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove watermarks from PDF")
    parser.add_argument("input", help="Path to input PDF")
    parser.add_argument("output", nargs="?", default=None, help="Path to output PDF")
    parser.add_argument("--check", action="store_true", help="Check if watermark text exists without modifying")
    parser.add_argument("--text", "-t", default=None, help="Specific watermark text to remove or check")
    parser.add_argument("--common", action="store_true", help="Remove all common watermark texts")
    parser.add_argument("--no-annots", action="store_true", help="Do not remove watermark annotations")
    parser.add_argument("--password", "-p", default="", help="Password to decrypt PDF if encrypted")

    args = parser.parse_args()
    try:
        if args.check:
            import json
            chk = check_watermark(args.input, args.text or "", password=args.password)
            print(f"CHECK_RESULT: {json.dumps(chk)}")
            sys.exit(0)

        if not args.output:
            raise ValueError("Output path is required when not running with --check.")

        res = remove_watermark(
            args.input,
            args.output,
            target_text=args.text,
            remove_all_common=args.common or (not args.text),
            remove_annots=not args.no_annots,
            password=args.password,
        )
        print(f"SUCCESS: {res}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
