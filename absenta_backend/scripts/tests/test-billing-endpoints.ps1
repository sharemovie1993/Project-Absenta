# PowerShell script untuk testing billing endpoints
$baseUrl = "http://localhost:3000"
$tenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d482"

# Test data
$testUser = @{
    email = "admin@testschool.edu"
    password = "password123"
    tenant_id = $tenantId
}

# Global variables
$authToken = ""
$subscriptionId = ""
$billingId = ""

function Write-TestResult {
    param($testName, $success, $message = "")
    if ($success) {
        Write-Host "[PASS] $testName" -ForegroundColor Green
        if ($message) { Write-Host "   $message" -ForegroundColor Gray }
    } else {
        Write-Host "[FAIL] $testName" -ForegroundColor Red
        if ($message) { Write-Host "   $message" -ForegroundColor Red }
    }
}

function Invoke-ApiRequest {
    param($method, $endpoint, $body = $null, $useAuth = $true)
    
    $uri = "$baseUrl$endpoint"
    $headers = @{'Content-Type' = 'application/json'}
    
    if ($useAuth -and $authToken) {
        $headers['Authorization'] = "Bearer $authToken"
        $headers['x-tenant-id'] = $tenantId
    }
    
    try {
        if ($body) {
            $jsonBody = $body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -Body $jsonBody
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $method -Headers $headers
        }
        return @{ success = $true; data = $response }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

# 1. Login Test
Write-Host "`nTesting Login..." -ForegroundColor Cyan
$loginResult = Invoke-ApiRequest -method "POST" -endpoint "/auth/login" -body $testUser -useAuth $false

if ($loginResult.success) {
    $authToken = $loginResult.data.data.token
    Write-TestResult "Login" $true "Token obtained"
} else {
    Write-TestResult "Login" $false $loginResult.error
    exit 1
}

# 2. Test Plans
Write-Host "`nTesting Plans Endpoints..." -ForegroundColor Cyan

$plansResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/plans"
if ($plansResult.success) {
    Write-TestResult "Get All Plans" $true "Found $($plansResult.data.data.Count) plans"
} else {
    Write-TestResult "Get All Plans" $false $plansResult.error
}

# 3. Test Subscriptions
Write-Host "`nTesting Subscription Endpoints..." -ForegroundColor Cyan

# Get plans first to use in subscription creation
if ($plansResult.success -and $plansResult.data.data.Count -gt 0) {
    $planId = $plansResult.data.data[0].id
    
    # Create subscription
    $subscriptionData = @{
        plan_id = $planId
        tenant_id = $tenantId
        start_date = (Get-Date).ToString("yyyy-MM-dd")
        status = "ACTIVE"
    }
    
    $createSubResult = Invoke-ApiRequest -method "POST" -endpoint "/billing/subscriptions" -body $subscriptionData
    if ($createSubResult.success) {
        $subscriptionId = $createSubResult.data.data.id
        Write-TestResult "Create Subscription" $true "ID: $subscriptionId"
    } else {
        Write-TestResult "Create Subscription" $false $createSubResult.error
    }
    
    # Get all subscriptions
    $getSubsResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/subscriptions"
    Write-TestResult "Get All Subscriptions" $getSubsResult.success
    
    # Get subscription by ID
    if ($subscriptionId) {
        $getSubResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/subscriptions/$subscriptionId"
        Write-TestResult "Get Subscription by ID" $getSubResult.success
        
        # Update subscription
        $updateSubData = @{
            status = "ACTIVE"
        }
        $updateSubResult = Invoke-ApiRequest -method "PUT" -endpoint "/billing/subscriptions/$subscriptionId" -body $updateSubData
        Write-TestResult "Update Subscription" $updateSubResult.success
    }
}

# 4. Test Billings
Write-Host "`nTesting Billing Endpoints..." -ForegroundColor Cyan

if ($subscriptionId) {
    # Create billing
    $billingData = @{
        subscription_id = $subscriptionId
        amount = 100000
        billing_date = (Get-Date).ToString("yyyy-MM-dd")
        due_date = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        status = "PENDING"
    }
    
    $createBillResult = Invoke-ApiRequest -method "POST" -endpoint "/billing/billings" -body $billingData
    if ($createBillResult.success) {
        $billingId = $createBillResult.data.data.id
        Write-TestResult "Create Billing" $true "ID: $billingId"
    } else {
        Write-TestResult "Create Billing" $false $createBillResult.error
    }
    
    # Get all billings
    $getBillsResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/billings"
    Write-TestResult "Get All Billings" $getBillsResult.success
    
    # Get billing by ID
    if ($billingId) {
        $getBillResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/billings/$billingId"
        Write-TestResult "Get Billing by ID" $getBillResult.success
        
        # Update billing
        $updateBillData = @{
            amount = 120000
        }
        $updateBillResult = Invoke-ApiRequest -method "PUT" -endpoint "/billing/billings/$billingId" -body $updateBillData
        Write-TestResult "Update Billing" $updateBillResult.success
        
        # Mark billing as paid
        $payBillResult = Invoke-ApiRequest -method "POST" -endpoint "/billing/billings/$billingId/mark-paid"
        Write-TestResult "Mark Billing as Paid" $payBillResult.success
    }
    
    # Get billings by subscription
    $getBillsBySubResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/billings/subscription/$subscriptionId"
    Write-TestResult "Get Billings by Subscription" $getBillsBySubResult.success
    
    # Generate monthly billing
    $generateBillData = @{
        subscription_id = $subscriptionId
        month = (Get-Date).Month
        year = (Get-Date).Year
    }
    $generateBillResult = Invoke-ApiRequest -method "POST" -endpoint "/billing/billings/generate-monthly" -body $generateBillData
    Write-TestResult "Generate Monthly Billing" $generateBillResult.success
}

# 5. Test Billing Stats
Write-Host "`nTesting Billing Statistics..." -ForegroundColor Cyan
$statsResult = Invoke-ApiRequest -method "GET" -endpoint "/billing/billings/stats"
Write-TestResult "Get Billing Statistics" $statsResult.success

Write-Host "`nBilling Module Testing Completed!" -ForegroundColor Green