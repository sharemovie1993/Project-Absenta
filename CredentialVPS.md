Deployer 
Lokasi Project : D:\BarayaProject\deployer
Quick Deploy Script:
- Jalankan `quick-deploy-licensing.bat` (1-klik langsung update Server Lisensi di VPS 103.196.155.87)
- Atau `run.bat` -> Menu [2] Quick Update -> Menu [3] VPS Linux Remote -> Menu [2] Server Lisensi

VPS Public (Server lisensi)
Lokasi Project : D:\BarayaProject\Project-Server-Lisensi
Akun SSH
IP : 103.196.155.87
domain : absenta.id
Key : ls-key.pem
user : asepsuryadi

Quick Deploy setelah perubahan kode di Project-Server-Lisensi:
- Cara 1 (Paling Mudah): Double-click `deploy.bat` atau jalankan `npm run deploy`
- Cara 2 (Fast SCP - 0% CPU VPS): Jalankan `npm run deploy:fast` atau `powershell .\deploy-fast.ps1`
- Cara 3 (CLI langsung via SSH):
  ssh -i ls-key.pem asepsuryadi@103.196.155.87 "cd /var/www/licensing-server && git pull origin master && npm run build && pm2 restart licensing-server"

VPS Lokal (Server Produksi Platfom Absenta/Project Absenta)
lokasi projek : D:\BarayaProject\Project Absenta
Akun SSH
IP : 10.10.10.99
domain : smkn1pld.absenta.id
Key : nginxonly.pem
user : asep
password : 1

VPS Lokal (Server Produksi Platfom Absenta/Project Absenta)
Akun SSH
IP : 10.10.10.116
domain : demo.absenta.id
Key : nginxonly.pem
user : asep
password : 1
