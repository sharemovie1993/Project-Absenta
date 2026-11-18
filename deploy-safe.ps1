# Safe Deployment Trigger for Absenta (Demo & Staging VPS 10.10.10.116)
$sshKey = "D:\BarayaProject\deployer\nginxonly.pem"
$vpsHost = "asep@10.10.10.116"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Triggering Isolated Safe Deploy on VPS (10.10.10.116)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

ssh -i $sshKey -o StrictHostKeyChecking=no $vpsHost "/var/www/deploy-safe.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n Deployment to VPS succeeded with zero downtime!" -ForegroundColor Green
} else {
    Write-Host "`n Deployment aborted: An error occurred in staging! Production is protected." -ForegroundColor Red
}
