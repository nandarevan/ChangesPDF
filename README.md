# ChangePDF 📄✨

**ChangePDF** adalah toolkit PDF modern, cepat, dan aman yang terinspirasi dari iLovePDF. Aplikasi ini dirancang dengan antarmuka minimalis 3 warna (*Merah Soft, Putih Soft, Hitam Soft*), dukungan Light Mode dan Dark Mode, serta pemrosesan dokumen langsung di sisi klien browser maupun backend engine berkinerja tinggi.

Dibuat oleh **Nanda Revan Saputro** (2026).

---

## 🚀 Fitur Utama

- **Konversi Dokumen**:
  - **PDF to Word (DOCX)**: Mendukung dokumen teks biasa dan **OCR** untuk scan/gambar dokumen.
  - **Word to PDF**: Konversi dokumen DOCX ke PDF berkualitas tinggi.
  - **Image to PDF & PDF to Image**: Konversi JPG/PNG ke PDF dan ekstraksi halaman PDF ke format gambar.
- **Optimasi & Organisasi**:
  - **Merge PDF**: Gabungkan banyak file PDF menjadi satu file secara berurutan.
  - **Split PDF**: Pisahkan halaman PDF tertentu atau potong per rentang halaman.
  - **Compress PDF**: Kompres ukuran dokumen PDF tanpa mengurangi keterbacaan teks.
- **Keamanan & Watermark**:
  - **Protect PDF**: Kunci file PDF dengan enkripsi password.
  - **Unlock PDF**: Buka kunci dokumen dengan password atau opsi pembuka.
  - **Remove Watermark**: Deteksi dan hapus watermark teks spesifik pada dokumen PDF.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Bahasa**: TypeScript / JavaScript & Python
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion
- **PDF Libraries**: `pdf-lib`, `pdfjs-dist`, `docx`
- **Backend / Python Engine**: PyMuPDF (`fitz`), `python-docx`, `pytesseract`

---

## 💻 Menjalankan Secara Lokal

1. **Clone repositori**:
   ```bash
   git clone https://github.com/nandarevan/ChangePDF.git
   cd ChangePDF
   ```

2. **Install dependensi Node.js**:
   ```bash
   npm install
   ```

3. **Install dependensi Python (opsional untuk backend engine)**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Jalankan development server**:
   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## ☁️ Deploy ke Vercel

1. Buka [Vercel Dashboard](https://vercel.com/) dan login dengan akun GitHub Anda.
2. Klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Pilih repositori **`nandarevan/ChangePDF`**.
4. Biarkan konfigurasi build default (*Framework: Next.js*).
5. Klik **"Deploy"**. Vercel akan otomatis melakukan build dan memberikan URL aktif untuk aplikasi Anda.

---

## 📄 Lisensi & Kredit

Hak Cipta © 2026 **ChangePDF**. Dikembangkan oleh **Nanda Revan Saputro**.
