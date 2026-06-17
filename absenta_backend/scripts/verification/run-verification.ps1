# Endpoint Verification Script
# 
# Runs endpoint verification to ensure all attendance endpoints
# work correctly with mode restrictions
#
# @author AI Assistant
# @date 2025-01-27
# @version 1.0.0

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AuthToken = "test-token"
)

Write-Host "🔍 Starting Endpoint Verification..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Auth Token: $AuthToken" -ForegroundColor Gray
Write-Host ""

# Set environment variables
$env:API_BASE_URL = $BaseUrl
$env:TEST_AUTH_TOKEN = $AuthToken
$env:NODE_ENV = "test"

# Check if server is running
try {
    Write-Host "🌐 Checking if server is running..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running at $BaseUrl" -ForegroundColor Red
    Write-Host "Please start the server first with: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Run the verification script
try {
    Write-Host "🚀 Running endpoint verification..." -ForegroundColor Yellow
    node scripts/verify-endpoints.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 All endpoint verifications passed!" -ForegroundColor Green
        Write-Host "✅ Mode restrictions are working correctly" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Some endpoint verifications failed!" -ForegroundColor Red
        Write-Host "Please check the output above for details" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run verification script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Verification Summary:" -ForegroundColor Cyan
Write-Host "- Gerbang endpoints tested for both SIMPLE and MULTI_SESI modes" -ForegroundColor Gray
Write-Host "- Manual attendance endpoints tested (MULTI_SESI only)" -ForegroundColor Gray
Write-Host "- Rekap endpoints tested with proper mode restrictions" -ForegroundColor Gray
Write-Host "- Cross-tenant isolation verified" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Endpoint verification completed successfully!" -ForegroundColor Green