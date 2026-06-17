# COMPREHENSIVE BILLING MODULE TESTING SCRIPT
# 
# Script untuk testing lengkap semua endpoint billing
# Menggunakan test data yang telah di-setup
#
# Usage: .\test-billing-comprehensive.ps1

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Verbose = $false
)

# Test configuration
$TestConfig = @{
    BaseUrl = $BaseUrl
    Verbose = $Verbose
    SuperAdminCredentials = @{
        email = "superadmin@system.com"
    password = "superadmin123"
    }
    AdminCredentials = @{
        email = "admin1@sman1jkt.sch.id"
        password = "Admin123!"
    }
    Admin2Credentials = @{
        email = "admin2@smktek-bdg.sch.id"
        password = "Admin123!"
    }
}

# Global variables
$SuperAdminToken = $null
$AdminToken = $null
$Admin2Token = $null
$TestResults = @()

# Helper functions
function Write-TestHeader {
    param([string]$Title)
    Write-Host "`n" -NoNewline
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Success,
        [string]$Details = "",
        [object]$Data = $null
    )
    
    $status = if ($Success) { "[PASS]" } else { "[FAIL]" }
    $color = if ($Success) { "Green" } else { "Red" }
    
    Write-Host "$status $TestName" -ForegroundColor $color
    
    if ($Details) {
        Write-Host "  Details: $Details" -ForegroundColor Gray
    }
    
    if ($TestConfig.Verbose -and $Data) {
        Write-Host "  Data: $($Data | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    }
    
    # Store result
    $global:TestResults += @{
        TestName = $TestName
        Success = $Success
        Details = $Details
        Timestamp = Get-Date
    }
}

function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Token = $null,
        [object]$Body = $null
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $params = @{
        Uri = "$($TestConfig.BaseUrl)$Endpoint"
        Method = $Method
        Headers = $headers
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
            StatusCode = 200
        }
    }
    catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = $statusCode
        }
    }
}

function Test-Authentication {
    Write-TestHeader "AUTHENTICATION TESTS"
    
    # Test SUPERADMIN login
    Write-Host "`nTesting SUPERADMIN login..."
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/auth/login" -Body $TestConfig.SuperAdminCredentials
    
    if ($result.Success -and $result.Data.success) {
        $global:SuperAdminToken = $result.Data.data.token
        Write-TestResult "SUPERADMIN Login" $true "Token obtained successfully"
    } else {
        Write-TestResult "SUPERADMIN Login" $false "Failed to login: $($result.Error)"
        return $false
    }
    
    # Test ADMIN login
    Write-Host "`nTesting ADMIN login..."
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/auth/login" -Body $TestConfig.AdminCredentials
    
    if ($result.Success -and $result.Data.success) {
        $global:AdminToken = $result.Data.data.token
        Write-TestResult "ADMIN Login" $true "Token obtained successfully"
    } else {
        Write-TestResult "ADMIN Login" $false "Failed to login: $($result.Error)"
        return $false
    }
    
    # Test ADMIN2 login
    Write-Host "`nTesting ADMIN2 login..."
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/auth/login" -Body $TestConfig.Admin2Credentials
    
    if ($result.Success -and $result.Data.success) {
        $global:Admin2Token = $result.Data.data.token
        Write-TestResult "ADMIN2 Login" $true "Token obtained successfully"
    } else {
        Write-TestResult "ADMIN2 Login" $false "Failed to login: $($result.Error)"
        return $false
    }
    
    return $true
}

function Test-PlansEndpoints {
    Write-TestHeader "PLANS ENDPOINTS TESTS"
    
    # Test SUPERADMIN access to plans
    Write-Host "`nTesting SUPERADMIN access to plans..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/plans" -Token $SuperAdminToken
    
    if ($result.Success -and $result.Data.success) {
        $planCount = $result.Data.data.Count
        Write-TestResult "SUPERADMIN Get Plans" $true "Found $planCount plans" $result.Data.data
    } else {
        Write-TestResult "SUPERADMIN Get Plans" $false "Error: $($result.Error)"
    }
    
    # Test ADMIN access to plans (should fail)
    Write-Host "`nTesting ADMIN access to plans (should fail)..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/plans" -Token $AdminToken
    
    if ($result.StatusCode -eq 403) {
        Write-TestResult "ADMIN Get Plans (Forbidden)" $true "Correctly denied access (403)"
    } else {
        Write-TestResult "ADMIN Get Plans (Forbidden)" $false "Expected 403, got $($result.StatusCode)"
    }
    
    # Test creating a new plan (SUPERADMIN only)
    Write-Host "`nTesting plan creation..."
    $newPlan = @{
        name = "Test Plan $(Get-Date -Format 'yyyyMMddHHmmss')"
        price_monthly = 150000
        max_user = 100
        features = @("Test Feature 1", "Test Feature 2")
        currency = "IDR"
    }
    
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/billing/plans" -Token $SuperAdminToken -Body $newPlan
    
    if ($result.Success -and $result.Data.success) {
        Write-TestResult "Create Plan" $true "Plan created successfully" $result.Data.data
        $global:TestPlanId = $result.Data.data.id
    } else {
        Write-TestResult "Create Plan" $false "Error: $($result.Error)"
    }
}

function Test-SubscriptionsEndpoints {
    Write-TestHeader "SUBSCRIPTIONS ENDPOINTS TESTS"
    
    # Test SUPERADMIN access to all subscriptions
    Write-Host "`nTesting SUPERADMIN access to all subscriptions..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/subscriptions" -Token $SuperAdminToken
    
    if ($result.Success -and $result.Data.success) {
        $subCount = $result.Data.data.Count
        Write-TestResult "SUPERADMIN Get All Subscriptions" $true "Found $subCount subscriptions" $result.Data.data
    } else {
        Write-TestResult "SUPERADMIN Get All Subscriptions" $false "Error: $($result.Error)"
    }
    
    # Test ADMIN access to own tenant subscriptions
    Write-Host "`nTesting ADMIN access to own subscriptions..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/subscriptions" -Token $AdminToken
    
    if ($result.Success -and $result.Data.success) {
        $subCount = $result.Data.data.Count
        Write-TestResult "ADMIN Get Own Subscriptions" $true "Found $subCount subscriptions for own tenant" $result.Data.data
    } else {
        Write-TestResult "ADMIN Get Own Subscriptions" $false "Error: $($result.Error)"
    }
    
    # Test ADMIN2 access to own tenant subscriptions
    Write-Host "`nTesting ADMIN2 access to own subscriptions..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/subscriptions" -Token $Admin2Token
    
    if ($result.Success -and $result.Data.success) {
        $subCount = $result.Data.data.Count
        Write-TestResult "ADMIN2 Get Own Subscriptions" $true "Found $subCount subscriptions for own tenant" $result.Data.data
    } else {
        Write-TestResult "ADMIN2 Get Own Subscriptions" $false "Error: $($result.Error)"
    }
}

function Test-BillingsEndpoints {
    Write-TestHeader "BILLINGS ENDPOINTS TESTS"
    
    # Test SUPERADMIN access to all billings
    Write-Host "`nTesting SUPERADMIN access to all billings..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/billings" -Token $SuperAdminToken
    
    if ($result.Success -and $result.Data.success) {
        $billCount = $result.Data.data.Count
        Write-TestResult "SUPERADMIN Get All Billings" $true "Found $billCount billings" $result.Data.data
    } else {
        Write-TestResult "SUPERADMIN Get All Billings" $false "Error: $($result.Error)"
    }
    
    # Test ADMIN access to own tenant billings
    Write-Host "`nTesting ADMIN access to own billings..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/billings" -Token $AdminToken
    
    if ($result.Success -and $result.Data.success) {
        $billCount = $result.Data.data.Count
        Write-TestResult "ADMIN Get Own Billings" $true "Found $billCount billings for own tenant" $result.Data.data
        
        # Store a billing ID for mark-paid test
        if ($result.Data.data.Count -gt 0) {
            $global:TestBillingId = $result.Data.data[0].id
        }
    } else {
        Write-TestResult "ADMIN Get Own Billings" $false "Error: $($result.Error)"
    }
    
    # Test mark billing as paid
    if ($global:TestBillingId) {
        Write-Host "`nTesting mark billing as paid..."
        $result = Invoke-ApiRequest -Method "POST" -Endpoint "/billing/billings/$global:TestBillingId/mark-paid" -Token $AdminToken
        
        if ($result.Success -and $result.Data.success) {
            Write-TestResult "Mark Billing Paid" $true "Billing marked as paid successfully" $result.Data.data
        } else {
            Write-TestResult "Mark Billing Paid" $false "Error: $($result.Error)"
        }
    }
}

function Test-BillingStats {
    Write-TestHeader "BILLING STATISTICS TESTS"
    
    # Test SUPERADMIN billing stats
    Write-Host "`nTesting SUPERADMIN billing statistics..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/billings/stats" -Token $SuperAdminToken
    
    if ($result.Success -and $result.Data.success) {
        Write-TestResult "SUPERADMIN Billing Stats" $true "Statistics retrieved successfully" $result.Data.data
    } else {
        Write-TestResult "SUPERADMIN Billing Stats" $false "Error: $($result.Error)"
    }
    
    # Test ADMIN billing stats
    Write-Host "`nTesting ADMIN billing statistics..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/billings/stats" -Token $AdminToken
    
    if ($result.Success -and $result.Data.success) {
        Write-TestResult "ADMIN Billing Stats" $true "Statistics retrieved successfully" $result.Data.data
    } else {
        Write-TestResult "ADMIN Billing Stats" $false "Error: $($result.Error)"
    }
}

function Test-PermissionValidation {
    Write-TestHeader "PERMISSION VALIDATION TESTS"
    
    # Test unauthorized access (no token)
    Write-Host "`nTesting unauthorized access..."
    $result = Invoke-ApiRequest -Method "GET" -Endpoint "/billing/plans"
    
    if ($result.StatusCode -eq 401) {
        Write-TestResult "Unauthorized Access" $true "Correctly denied access (401)"
    } else {
        Write-TestResult "Unauthorized Access" $false "Expected 401, got $($result.StatusCode)"
    }
    
    # Test ADMIN trying to create plan (should fail)
    Write-Host "`nTesting ADMIN trying to create plan..."
    $newPlan = @{
        name = "Unauthorized Plan"
        price_monthly = 100000
        max_user = 50
        features = @("Test")
        currency = "IDR"
    }
    
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/billing/plans" -Token $AdminToken -Body $newPlan
    
    if ($result.StatusCode -eq 403) {
        Write-TestResult "ADMIN Create Plan (Forbidden)" $true "Correctly denied access (403)"
    } else {
        Write-TestResult "ADMIN Create Plan (Forbidden)" $false "Expected 403, got $($result.StatusCode)"
    }
}

function Show-TestSummary {
    Write-TestHeader "TEST SUMMARY"
    
    $totalTests = $TestResults.Count
    $passedTests = ($TestResults | Where-Object { $_.Success }).Count
    $failedTests = $totalTests - $passedTests
    $successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }
    
    Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
    Write-Host "Passed: $passedTests" -ForegroundColor Green
    Write-Host "Failed: $failedTests" -ForegroundColor Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } else { "Yellow" })
    
    if ($failedTests -gt 0) {
        Write-Host "`nFailed Tests:" -ForegroundColor Red
        $TestResults | Where-Object { -not $_.Success } | ForEach-Object {
            Write-Host "  - $($_.TestName): $($_.Details)" -ForegroundColor Red
        }
    }
    
    Write-Host "`nTest completed at: $(Get-Date)" -ForegroundColor Gray
}

# Main execution
function Main {
    Write-Host "COMPREHENSIVE BILLING MODULE TESTING" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host "Base URL: $($TestConfig.BaseUrl)" -ForegroundColor Gray
    Write-Host "Verbose: $($TestConfig.Verbose)" -ForegroundColor Gray
    
    # Check if server is running
    try {
        $healthCheck = Invoke-RestMethod -Uri "$($TestConfig.BaseUrl)/health" -Method GET -TimeoutSec 5
        Write-Host "Server is running" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Server is not running at $($TestConfig.BaseUrl)" -ForegroundColor Red
        Write-Host "Please start the server with: npm run dev" -ForegroundColor Yellow
        exit 1
    }
    
    # Run all tests
    if (-not (Test-Authentication)) {
        Write-Host "Authentication failed. Cannot proceed with other tests." -ForegroundColor Red
        exit 1
    }
    
    Test-PlansEndpoints
    Test-SubscriptionsEndpoints
    Test-BillingsEndpoints
    Test-BillingStats
    Test-PermissionValidation
    
    Show-TestSummary
    
    Write-Host "`nBilling module testing completed!" -ForegroundColor Green
}

# Run the main function
Main
