// components/Loading.tsx
export default function Loading() {
  return (
    // PERBAIKAN: Gunakan flexbox untuk menengahkan konten secara vertikal dan horizontal
    // dan berikan tinggi minimal agar mengisi sebagian besar layar.
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground col-span-full">
      <i className="fas fa-spinner fa-spin text-5xl"></i>
      <p className="mt-4 text-sm">Memuat...</p>
    </div>
  );
}