"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    rootFolderId: "",
    authCode: "" 
  });

  const handleAuthorize = () => {
    const scope = "https://www.googleapis.com/auth/drive.readonly";
    const redirectUri = `${window.location.origin}/setup`; 
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${formData.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    localStorage.setItem("zee_setup_temp", JSON.stringify(formData));
    window.location.href = authUrl;
  };

  if (typeof window !== "undefined" && window.location.search.includes("code=") && step === 1) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const savedData = JSON.parse(localStorage.getItem("zee_setup_temp") || "{}");
    
    if (code && savedData.clientId) {
      setFormData({ ...savedData, authCode: code });
      setStep(2); 
    }
  }

  const handleFinishSetup = async () => {
    const res = await fetch("/api/setup/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, redirectUri: `${window.location.origin}/setup` }),
    });

    if (res.ok) {
      localStorage.removeItem("zee_setup_temp");
      router.push("/");
    } else {
      alert("Gagal Setup: Cek Client Secret atau Code.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-card border p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Zee-Index Setup Wizard</h1>
        
        {step === 1 ? (
          <div className="space-y-4">
            <input 
              placeholder="Google Client ID" 
              className="w-full p-2 border rounded"
              value={formData.clientId}
              onChange={(e) => setFormData({...formData, clientId: e.target.value})}
            />
            <input 
              placeholder="Google Client Secret" 
              type="password"
              className="w-full p-2 border rounded"
              value={formData.clientSecret}
              onChange={(e) => setFormData({...formData, clientSecret: e.target.value})}
            />
            <input 
              placeholder="Root Folder ID" 
              className="w-full p-2 border rounded"
              value={formData.rootFolderId}
              onChange={(e) => setFormData({...formData, rootFolderId: e.target.value})}
            />
            <button 
              onClick={handleAuthorize}
              disabled={!formData.clientId || !formData.clientSecret}
              className="w-full bg-blue-600 text-white p-2 rounded font-bold"
            >
              Authorize with Google
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-green-500 font-medium">Code berhasil didapatkan!</p>
            <button 
              onClick={handleFinishSetup}
              className="w-full bg-green-600 text-white p-2 rounded font-bold"
            >
              Generate Token & Finish Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
