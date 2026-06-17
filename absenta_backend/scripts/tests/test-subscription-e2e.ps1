Param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$SuperAdminEmail = "superadmin@example.com",
  [string]$SuperAdminPassword = "secret",
  [string]$TenantId = "<tenant-uuid>",
  [string]$PlanId = "<plan-uuid>"
)

Write-Host "=== E2E: Subscription → Billing → Invoice ==="

function Invoke-Api {
  Param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers,
    [object]$Body
  )
  $Uri = "$BaseUrl$Path"
  try {
    if ($Method -eq 'GET') {
      return Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers -ErrorAction Stop
    } elseif ($Method -eq 'POST') {
      return Invoke-RestMethod -Method Post -Uri $Uri -Headers $Headers -ErrorAction Stop -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 6)
    } elseif ($Method -eq 'PUT') {
      return Invoke-RestMethod -Method Put -Uri $Uri -Headers $Headers -ErrorAction Stop -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 6)
    } else {
      throw "Unsupported method: $Method"
    }
  } catch {
    Write-Error "API Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $text = $reader.ReadToEnd()
      Write-Host $text
    }
    throw
  }
}

# 1) Login to get token
Write-Host "[1/5] Login as SUPERADMIN"
$loginBody = @{ email = $SuperAdminEmail; password = $SuperAdminPassword; tenant_id = $TenantId }
$loginRes = Invoke-Api -Method 'POST' -Path '/auth/login' -Headers @{} -Body $loginBody
$token = $loginRes.data.access_token
$headers = @{ Authorization = "Bearer $token"; 'X-Tenant-ID' = $TenantId }
Write-Host "Token acquired"

# 2) Create subscription
Write-Host "[2/5] Create Subscription"
$startDate = (Get-Date).ToString('yyyy-MM-dd')
$endDate = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
$createSubBody = @{ tenant_id = $TenantId; plan_id = $PlanId; start_date = $startDate; end_date = $endDate; status = 'ACTIVE'; auto_renew = $true }
$subRes = Invoke-Api -Method 'POST' -Path '/billing/subscriptions' -Headers $headers -Body $createSubBody
Write-Host "Subscription created: $($subRes.data.id)"

# 3) Generate Billing & Invoice (server auto-generation also happens on create)
Write-Host "[3/5] Generate Billing & Invoice"
$genRes = Invoke-Api -Method 'POST' -Path '/billing/billings/generate' -Headers $headers -Body @{ subscription_id = $subRes.data.id }
Write-Host "Billing & Invoice generated"

# 4) Fetch billings for the subscription
Write-Host "[4/5] Fetch Billings"
$billings = Invoke-Api -Method 'GET' -Path "/billing/billings/subscription/$($subRes.data.id)" -Headers $headers -Body $null
Write-Host "Billings count: $($billings.data.billings.Count)"

# 5) Mark Billing as PAID and sync Invoice to PAID
Write-Host "[5/6] Mark Billing as PAID"
if ($billings.data.billings.Count -gt 0) {
  $billingId = $billings.data.billings[0].id
  $markPaidRes = Invoke-Api -Method 'POST' -Path "/billing/billings/$billingId/mark-paid" -Headers $headers -Body @{ payment_method = 'MANUAL' }
  Write-Host "Billing marked as PAID: $billingId"

  # Fetch invoice by billing ID
  Write-Host "[6/6] Sync Invoice to PAID"
  $invoicesRes = Invoke-Api -Method 'GET' -Path "/invoice?billing_id=$billingId" -Headers $headers -Body $null
  if ($invoicesRes.data.data.Count -gt 0) {
    $invoiceId = $invoicesRes.data.data[0].id
    $invoiceStatus = $invoicesRes.data.data[0].status
    # Send invoice if still DRAFT, then mark as PAID
    if ($invoiceStatus -eq 'DRAFT') {
      $sendRes = Invoke-Api -Method 'PUT' -Path "/invoice/$invoiceId/send" -Headers $headers -Body @{}
    }
    $payRes = Invoke-Api -Method 'PUT' -Path "/invoice/$invoiceId/pay" -Headers $headers -Body @{}
    Write-Host "Invoice marked as PAID: $invoiceId"
    $finalInvoiceRes = Invoke-Api -Method 'GET' -Path "/invoice/$invoiceId" -Headers $headers -Body $null
    $finalInvoice = $finalInvoiceRes.data
  }
}

# Summary
Write-Host "[Summary] Subscription → Billing → Invoice"
$summary = [PSCustomObject]@{
  subscription = $subRes.data
  billing_generate = $genRes
  billings = $billings.data.billings
  billing_mark_paid = $markPaidRes
  invoice_final = $finalInvoice
}
$summary | ConvertTo-Json -Depth 6

Write-Host "=== E2E completed ==="
