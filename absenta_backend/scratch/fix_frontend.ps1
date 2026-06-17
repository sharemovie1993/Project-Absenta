$path = "c:\Users\SERVER-DELL\Documents\Projek Koprasi Sekolah\ProjekAbsenta\frontend\absenta_frontend\src\pages\billing\ServiceCenterPage.tsx"
$content = Get-Content -Path $path -Raw

# Ganti variant Button default
$content = $content -replace "variant={categoryFilter === 'ALL' \? 'default' : 'outline'}", "variant={categoryFilter === 'ALL' ? 'primary' : 'outline'}"
$content = $content -replace "variant={isActive \? 'default' : 'outline'}", "variant={isActive ? 'primary' : 'outline'}"

# Ganti variant Button link
$content = $content -replace 'variant="link"', 'variant="ghost"'

# Ganti Card loading
$content = $content -replace '<Card key={i} className="p-10 rounded-\[3rem\] bg-slate-100/50 dark:bg-slate-900 animate-pulse h-\[450px\]"></Card>', '<Card key={i} className="p-10 rounded-[3rem] bg-slate-100/50 dark:bg-slate-900 animate-pulse h-[450px]"><div /></Card>'

Set-Content -Path $path -Value $content -NoNewline
Write-Host "Perbaikan selesai."
