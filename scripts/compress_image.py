#!/usr/bin/env python3
"""
High-Quality Image Compressor for JPG and PNG.
Supports Extreme, Recommended, and Low compression levels.
Maintains 100% transparency for PNG images (no black boxes).
Optimizes JPEG with smart Huffman tables and progressive encoding.
"""

import sys
import os
import io
import json
import shutil
import argparse

try:
    from PIL import Image
except ImportError:
    Image = None

def compress_image(input_path: str, output_path: str, level: str = 'recommended') -> dict:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    orig_size = os.path.getsize(input_path)

    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    if Image is None:
        shutil.copyfile(input_path, output_path)
        return {
            "original_size": orig_size,
            "compressed_size": orig_size,
            "savings_bytes": 0,
            "savings_percent": 0.0
        }

    ext = os.path.splitext(input_path)[1].lower()
    is_png = ext == '.png'

    im = Image.open(input_path)
    w, h = im.size

    # Parameter tuning by level
    if level == 'extreme':
        jpg_quality = 50
        max_dim = 1600
        png_resize_dim = 1600
    elif level == 'low':
        jpg_quality = 82
        max_dim = 3000
        png_resize_dim = 3200
    else:  # recommended
        jpg_quality = 70
        max_dim = 2200
        png_resize_dim = 2400

    if is_png:
        # Check alpha transparency
        has_transparency = False
        if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
            try:
                im_rgba = im.convert('RGBA')
                alpha = im_rgba.getchannel('A')
                min_a, _ = alpha.getextrema()
                if min_a < 250:
                    has_transparency = True
            except Exception:
                has_transparency = True

        target_im = im
        if max(w, h) > png_resize_dim:
            scale = float(png_resize_dim) / max(w, h)
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
            target_im = target_im.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Save with maximum PNG compression level
        target_im.save(output_path, format='PNG', optimize=True, compress_level=9)
    else:
        # JPG / JPEG
        target_im = im
        if max(w, h) > max_dim:
            scale = float(max_dim) / max(w, h)
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
            target_im = target_im.resize((new_w, new_h), Image.Resampling.LANCZOS)

        if target_im.mode != 'RGB':
            target_im = target_im.convert('RGB')

        target_im.save(
            output_path,
            format='JPEG',
            quality=jpg_quality,
            optimize=True,
            progressive=True
        )

    new_size = os.path.getsize(output_path)
    if new_size > orig_size:
        shutil.copyfile(input_path, output_path)
        new_size = orig_size

    savings = max(0, orig_size - new_size)
    percent = (savings / orig_size * 100) if orig_size > 0 else 0.0

    return {
        "original_size": orig_size,
        "compressed_size": new_size,
        "savings_bytes": savings,
        "savings_percent": round(percent, 1)
    }

def main():
    parser = argparse.ArgumentParser(description="Image Compressor (JPG/PNG)")
    parser.add_argument("input", help="Path to input image file (.jpg, .jpeg, .png)")
    parser.add_argument("output", help="Path to output compressed image file")
    parser.add_argument("--level", choices=["extreme", "recommended", "low"], default="recommended", help="Compression level")

    args = parser.parse_args()

    try:
        result = compress_image(args.input, args.output, args.level)
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
