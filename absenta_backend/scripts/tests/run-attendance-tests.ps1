# COMPREHENSIVE ATTENDANCE API TESTING SCRIPT
# 
# This PowerShell script runs comprehensive tests for all attendance module endpoints
# to verify proper mode restrictions and functionality for both SIMPLE and MULTI_SESI modes.
#
# Usage: .\scripts\run-attendance-tests.ps1

param(
    [string]$ServerUrl = "http://localhost:3000",
    [switch]$SkipServerCheck = $false,
    [switch]$Verbose = $false
)

Write-Host "🚀 COMPREHENSIVE ATTENDANCE API TESTING" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Set error action preference
$ErrorActionPreference = "Continue"

# Function to check if server is running
function Test-ServerHealth {
    param([string]$Url)
    
    try {
        Write-Host "🔍 Checking server health at $Url..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri "$Url/health" -Method GET -TimeoutSec 10
        Write-Host "✅ Server is running and healthy" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to wait for server to be ready
function Wait-ForServer {
    param([string]$Url, [int]$MaxAttempts = 30)
    
    Write-Host "⏳ Waiting for server to be ready..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        if (Test-ServerHealth -Url $Url) {
            return $true
        }
        
        Write-Host "   Attempt $i/$MaxAttempts - Server not ready, waiting 2 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    
    Write-Host "❌ Server failed to become ready after $MaxAttempts attempts" -ForegroundColor Red
    return $false
}

# Function to run the attendance API tests
function Invoke-AttendanceTests {
    Write-Host "🧪 Running comprehensive attendance API tests..." -ForegroundColor Yellow
    
    try {
        # Change to backend directory
        $backendPath = Join-Path $PSScriptRoot ".."
        Push-Location $backendPath
        
        # Run the test script
        $testResult = node "scripts/test-attendance-api.js"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Attendance API tests completed successfully" -ForegroundColor Green
            Write-Host $testResult
            return $true
        }
        else {
            Write-Host "❌ Attendance API tests failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host $testResult
            return $false
        }
    }
    catch {
        Write-Host "❌ Error running attendance tests: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Pop-Location
    }
}

# Function to generate test summary
function Write-TestSummary {
    param([bool]$TestsPassed)
    
    Write-Host "`n📋 TEST EXECUTION SUMMARY" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    if ($TestsPassed) {
        Write-Host "✅ All attendance API tests completed successfully" -ForegroundColor Green
        Write-Host "✅ Mode restrictions are working correctly" -ForegroundColor Green
        Write-Host "✅ Both SIMPLE and MULTI_SESI modes are properly validated" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Some attendance API tests failed" -ForegroundColor Red
        Write-Host "❌ Please check the test output above for details" -ForegroundColor Red
    }
    
    Write-Host "`n📊 TESTED MODULES:" -ForegroundColor Yellow
    Write-Host "   • Gerbang (Gate) Attendance - Both modes" -ForegroundColor White
    Write-Host "   • Kegiatan (Activity) Attendance - Mode restrictions" -ForegroundColor White
    Write-Host "   • Manual Attendance - Mode restrictions" -ForegroundColor White
    Write-Host "   • Rekap (Reports) Attendance - Universal & restricted endpoints" -ForegroundColor White
    
    Write-Host "`n🎯 VALIDATION POINTS:" -ForegroundColor Yellow
    Write-Host "   • SIMPLE mode: Gerbang only, other modules forbidden" -ForegroundColor White
    Write-Host "   • MULTI_SESI mode: All modules accessible" -ForegroundColor White
    Write-Host "   • Universal endpoints: Work with both modes" -ForegroundColor White
    Write-Host "   • Restricted endpoints: Only MULTI_SESI mode" -ForegroundColor White
}

# Main execution
try {
    # Check if we should skip server check
    if (-not $SkipServerCheck) {
        # Check if server is running
        if (-not (Test-ServerHealth -Url $ServerUrl)) {
            Write-Host "⚠️  Server is not running. Please start the backend server first." -ForegroundColor Yellow
            Write-Host "   Run: npm run dev (in backend directory)" -ForegroundColor Gray
            
            # Ask if user wants to wait for server
            $response = Read-Host "Do you want to wait for the server to start? (y/N)"
            if ($response -eq "y" -or $response -eq "Y") {
                if (-not (Wait-ForServer -Url $ServerUrl)) {
                    Write-Host "❌ Exiting due to server unavailability" -ForegroundColor Red
                    exit 1
                }
            }
            else {
                Write-Host "❌ Exiting due to server unavailability" -ForegroundColor Red
                exit 1
            }
        }
    }
    else {
        Write-Host "⚠️  Skipping server health check as requested" -ForegroundColor Yellow
    }
    
    # Run the comprehensive attendance API tests
    $testsSuccessful = Invoke-AttendanceTests
    
    # Generate summary
    Write-TestSummary -TestsPassed $testsSuccessful
    
    # Exit with appropriate code
    if ($testsSuccessful) {
        Write-Host "`n🎉 Comprehensive attendance API testing completed successfully!" -ForegroundColor Green
        exit 0
    }
    else {
        Write-Host "`n💥 Comprehensive attendance API testing failed!" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Unexpected error during test execution: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
finally {
    Write-Host "`n🏁 Test execution finished." -ForegroundColor Cyan
}