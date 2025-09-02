import os
from datetime import datetime

def is_text_file(file_path):
    try:
        # Cek ukuran file (skip jika >1 MB untuk mencegah output besar)
        if os.path.getsize(file_path) > 1_000_000:  # 1 MB dalam bytes
            return False
        # Coba buka file sebagai teks dengan encoding UTF-8
        with open(file_path, 'r', encoding='utf-8') as file:
            # Baca sedikit untuk cek
            file.read(1024)  # Baca 1KB pertama untuk deteksi
        return True
    except (UnicodeDecodeError, IOError):
        # Jika gagal (misal file biner seperti gambar), skip
        return False

def cat_files_to_single_file(folder_path, output_file, exclude_folders):
    try:
        # Pastikan folder ada
        if not os.path.isdir(folder_path):
            print(f"Error: '{folder_path}' bukan folder yang valid.")
            return

        # Dapatkan tanggal dan jam saat ini (format WIB)
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB")

        # Buka file output dengan mode 'w' untuk overwrite
        with open(output_file, 'w', encoding='utf-8') as out_file:
            # Tulis tanggal dan jam di paling atas
            out_file.write(f"File ini dibuat/diganti pada: {current_time}\n")
            out_file.write("=" * 50 + "\n")

            skipped_files = []
            processed_files = []

            # Iterasi semua file di folder dan subfolder
            for root, dirs, files in os.walk(folder_path):
                # Abaikan folder yang ada di exclude_folders
                dirs[:] = [d for d in dirs if d.lower() not in exclude_folders]
                
                for file_name in files:
                    file_path = os.path.join(root, file_name)
                    
                    # Cek apakah file adalah file teks/coding
                    if is_text_file(file_path):
                        processed_files.append(file_path)
                        out_file.write(f"\n=== Isi file: {file_path} ===\n")
                        try:
                            with open(file_path, 'r', encoding='utf-8') as in_file:
                                content = in_file.read()
                                out_file.write(content + "\n")
                        except Exception as e:
                            out_file.write(f"Error saat membaca '{file_path}': {str(e)}\n")
                        out_file.write("=" * 50 + "\n")
                        print(f"Menambahkan {file_path} ke {output_file}")
                    else:
                        skipped_files.append(file_path)

            # Tulis ringkasan di akhir file
            out_file.write(f"\n=== Ringkasan ===\n")
            out_file.write(f"File yang diproses: {len(processed_files)}\n")
            out_file.write(f"File yang di-skip: {len(skipped_files)}\n")
            out_file.write(f"Folder yang di-exclude: {', '.join(exclude_folders)}\n")
            out_file.write("=" * 50 + "\n")

            print(f"\nSemua file teks/coding telah disimpan ke '{output_file}'.")
            print(f"File yang diproses: {len(processed_files)}")
            print(f"File yang di-skip: {len(skipped_files)}")

    except Exception as e:
        print(f"Error saat memproses folder: {str(e)}")

# Tentukan folder_path sebagai folder tempat script berada
folder_path = os.path.dirname(os.path.abspath(__file__))

# Nama file output (akan disimpan di folder yang sama dengan script)
output_file = os.path.join(folder_path, "cat_output.txt")

# Daftar folder yang ingin di-exclude
exclude_folders = {
    'node_modules',
    '.next',
    '.vercel',
    '.github',
    '.vscode',
    'public',
    'dist',
    'build',
    '.git',
    '.venv',
    'venv',
    '__pycache__',
    'coverage',
    'target'
}

cat_files_to_single_file(folder_path, output_file, exclude_folders)