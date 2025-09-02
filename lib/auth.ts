// lib/auth.ts
export function isProtected(folderId: string): boolean {
  const protectedFoldersConfig = process.env.PROTECTED_FOLDERS_JSON;
  if (!protectedFoldersConfig) return false;
  try {
    const protectedFolders = JSON.parse(protectedFoldersConfig);
    return !!protectedFolders[folderId];
  } catch (e) {
    console.error("Gagal mem-parsing PROTECTED_FOLDERS_JSON:", e);
    return false;
  }
}

export function validateCredentials(folderId: string, token: string): boolean {
  // --- PERINGATAN KEAMANAN ---
  // Metode otentikasi saat ini sangat TIDAK AMAN dan hanya boleh digunakan untuk
  // tujuan demonstrasi atau dalam lingkungan yang sangat terkontrol.
  //
  // Risiko:
  // 1. Kredensial (ID dan Kata Sandi) dikirim sebagai teks biasa yang di-encode Base64,
  //    yang dapat dengan mudah di-decode oleh siapa pun yang mencegat permintaan.
  // 2. Kata sandi disimpan sebagai teks biasa di variabel lingkungan,
  //    yang merupakan praktik keamanan yang buruk.
  //
  // Rekomendasi:
  // - Ganti mekanisme ini dengan sistem otentikasi yang tepat seperti OAuth2,
  //   JWT (JSON Web Tokens), atau otentikasi berbasis sesi.
  // - Selalu HASH dan SALT kata sandi sebelum menyimpannya, jangan pernah menyimpannya sebagai teks biasa.
  // --- AKHIR PERINGATAN ---

  const protectedFoldersConfig = process.env.PROTECTED_FOLDERS_JSON;
  if (!protectedFoldersConfig) return false;
  try {
    const protectedFolders = JSON.parse(protectedFoldersConfig);
    const folderConfig = protectedFolders[folderId];
    if (!folderConfig) return false;
    
    // Logika dekode Base64 yang tidak aman
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, password] = decoded.split(':');
    
    return id === folderConfig.id && password === folderConfig.password;
  } catch (e) {
    return false;
  }
}