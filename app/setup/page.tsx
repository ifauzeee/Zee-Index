"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    rootFolderId: "",
    authCode: "",
  });

  useEffect(() => {
    if (window.location.search.includes("code=") && step === 1) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      const savedDataStr = localStorage.getItem("zee_setup_temp");
      const savedData = savedDataStr ? JSON.parse(savedDataStr) : {};

      if (code && savedData.clientId) {
        setFormData((prev) => ({ ...prev, ...savedData, authCode: code }));
        setStep(2);
        window.history.replaceState({}, document.title, "/setup");
      }
    }
  }, [step]);

  const handleAuthorize = () => {
    if (!formData.clientId || !formData.clientSecret) {
      alert("Mohon isi Client ID dan Client Secret");
      return;
    }

    const scope = "https://www.googleapis.com/auth/drive";
    const redirectUri = `${window.location.origin}/setup`;

    localStorage.setItem("zee_setup_temp", JSON.stringify(formData));

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${formData.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    window.location.href = authUrl;
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          redirectUri: `${window.location.origin}/setup`,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.removeItem("zee_setup_temp");
        if (data.restartNeeded) {
          alert(
            "Setup Berhasil! Token telah disimpan ke .env.\n\nServer akan dimatikan otomatis atau silakan restart manual.",
          );
        } else {
          alert("Setup Berhasil! Mengalihkan ke beranda...");
          router.push("/");
        }
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full bg-card border p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Zee-Index Setup</h1>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">
                Google Client ID
              </label>
              <input
                placeholder="...apps.googleusercontent.com"
                className="w-full p-3 border rounded-lg bg-background focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={formData.clientId}
                onChange={(e) =>
                  setFormData({ ...formData, clientId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">
                Google Client Secret
              </label>
              <input
                type="password"
                placeholder="GOCSPX-..."
                className="w-full p-3 border rounded-lg bg-background focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={formData.clientSecret}
                onChange={(e) =>
                  setFormData({ ...formData, clientSecret: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">
                Root Folder ID
              </label>
              <input
                placeholder="ID Folder Google Drive..."
                className="w-full p-3 border rounded-lg bg-background focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={formData.rootFolderId}
                onChange={(e) =>
                  setFormData({ ...formData, rootFolderId: e.target.value })
                }
              />
            </div>
            <button
              onClick={handleAuthorize}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold transition-colors mt-4"
            >
              Authorize with Google
            </button>
          </div>
        ) : (
          <div className="text-center space-y-6 py-6">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-semibold">Otorisasi Berhasil!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Klik tombol di bawah untuk menukar kode, menyimpan token ke
                database, dan memperbarui file .env secara otomatis.
              </p>
            </div>
            <button
              onClick={handleFinishSetup}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Generate Token & Finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
