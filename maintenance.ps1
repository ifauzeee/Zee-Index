function Show-Menu {
    Clear-Host
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "    ZEE-INDEX MAINTENANCE CLI" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "1. Cek Kesehatan Kode (Lint, Types, Format)"
    Write-Host "2. Perbaiki Kode Otomatis (Fix Lint & Format)"
    Write-Host "3. Hapus Cache (.next)"
    Write-Host "4. Reset Total (Hapus node_modules)"
    Write-Host "5. Cek Update Library"
    Write-Host "6. Build & Start (Simulasi Production)"
    Write-Host "Q. Keluar"
    Write-Host "=============================================" -ForegroundColor Cyan
}

while ($true) {
    Show-Menu
    $pilihan = Read-Host "Masukkan pilihan Anda"

    if ($pilihan -eq "1") {
        Write-Host "`n[1/3] Mengecek TypeScript..." -ForegroundColor Yellow
        cmd /c "pnpm typecheck"
        
        Write-Host "`n[2/3] Mengecek Formatting..." -ForegroundColor Yellow
        cmd /c "pnpm format:check"
        
        Write-Host "`n[3/3] Mengecek Linting..." -ForegroundColor Yellow
        cmd /c "pnpm lint"
        
        Write-Host "`nSelesai." -ForegroundColor Green
        Pause
    }
    elseif ($pilihan -eq "2") {
        Write-Host "`nMemperbaiki code style..." -ForegroundColor Yellow
        cmd /c "pnpm fix:all"
        Write-Host "`nSelesai." -ForegroundColor Green
        Pause
    }
    elseif ($pilihan -eq "3") {
        Write-Host "`nMenghapus folder .next..." -ForegroundColor Yellow
        if (Test-Path ".next") { 
            Remove-Item ".next" -Recurse -Force 
            Write-Host "Folder .next berhasil dihapus." -ForegroundColor Green
        } else {
            Write-Host "Folder .next tidak ditemukan." -ForegroundColor Gray
        }
        Pause
    }
    elseif ($pilihan -eq "4") {
        Write-Host "`nPERINGATAN: Ini akan menghapus folder node_modules." -ForegroundColor Red
        $confirm = Read-Host "Ketik 'y' untuk lanjut"
        if ($confirm -eq "y") {
            if (Test-Path "node_modules") { 
                Write-Host "Menghapus node_modules (mohon tunggu)..." -ForegroundColor Yellow
                Remove-Item "node_modules" -Recurse -Force 
            }
            if (Test-Path "pnpm-lock.yaml") { Remove-Item "pnpm-lock.yaml" -Force }
            
            Write-Host "Membersihkan cache pnpm..." -ForegroundColor Yellow
            cmd /c "pnpm store prune"
            
            Write-Host "Menginstall ulang..." -ForegroundColor Yellow
            cmd /c "pnpm install"
            
            Write-Host "`nSelesai!" -ForegroundColor Green
        } else {
            Write-Host "Dibatalkan."
        }
        Pause
    }
    elseif ($pilihan -eq "5") {
        Write-Host "`nMengecek update..." -ForegroundColor Yellow
        cmd /c "pnpm outdated"
        Pause
    }
    elseif ($pilihan -eq "6") {
        Write-Host "`nBuild production..." -ForegroundColor Yellow
        cmd /c "pnpm build"
        Write-Host "`nMenjalankan server..." -ForegroundColor Yellow
        cmd /c "pnpm start"
        Pause
    }
    elseif ($pilihan -eq "Q" -or $pilihan -eq "q") {
        Write-Host "Bye!"
        break
    }
    else {
        Write-Host "Pilihan tidak valid." -ForegroundColor Red
        Start-Sleep -Seconds 1
    }
}