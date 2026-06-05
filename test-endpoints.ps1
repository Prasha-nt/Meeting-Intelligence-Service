# PowerShell Script to Test Meeting Intelligence API Endpoints
$baseUrl = "http://localhost:5000"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "1. Testing Health Check (GET /health)" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
$health | ConvertTo-Json -Depth 4
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "2. Registering a New User (POST /api/auth/register)" -ForegroundColor Yellow
$userEmail = "testuser-" + (Get-Random) + "@example.com"
$registerBody = @{
    email = $userEmail
    password = "securepassword123"
    name = "Demo User"
} | ConvertTo-Json

$register = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $registerBody -Headers $headers
$register | ConvertTo-Json -Depth 4
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "3. Logging In (POST /api/auth/login)" -ForegroundColor Yellow
$loginBody = @{
    email = $userEmail
    password = "securepassword123"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -Headers $headers
$login | ConvertTo-Json -Depth 4

# Extract JWT Token
$token = $login.data.token
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "4. Creating a Meeting with Transcript (POST /api/meetings)" -ForegroundColor Yellow
$meetingBody = @{
    title = "Weekly Sync Meeting"
    participants = @("alice@example.com", "bob@example.com")
    meetingDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    transcript = @(
        @{ timestamp = "00:10"; speaker = "Bob"; text = "I will setup the Slack webhook integration by tomorrow." },
        @{ timestamp = "00:25"; speaker = "Alice"; text = "We should schedule release tests." }
      )
} | ConvertTo-Json -Depth 4

$meeting = Invoke-RestMethod -Uri "$baseUrl/api/meetings" -Method Post -Body $meetingBody -Headers $authHeaders
$meeting | ConvertTo-Json -Depth 4

$meetingId = $meeting.data.id
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "5. Running AI Transcript Analysis (POST /api/meetings/:id/analyze)" -ForegroundColor Yellow
$analysis = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId/analyze" -Method Post -Headers $authHeaders
$analysis | ConvertTo-Json -Depth 4

# Extract the automatically created action item ID
$actionItemId = $analysis.data.actionItems[0].id
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "6. Updating Action Item Status (PATCH /api/action-items/:id/status)" -ForegroundColor Yellow
$statusBody = @{
    status = "IN_PROGRESS"
} | ConvertTo-Json

$statusUpdate = Invoke-RestMethod -Uri "$baseUrl/api/action-items/$actionItemId/status" -Method Patch -Body $statusBody -Headers $authHeaders
$statusUpdate | ConvertTo-Json -Depth 4
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "7. Fetching Overdue Action Items (GET /api/action-items/overdue)" -ForegroundColor Yellow
$overdue = Invoke-RestMethod -Uri "$baseUrl/api/action-items/overdue" -Headers $authHeaders
$overdue | ConvertTo-Json -Depth 4
Write-Host "==================================================" -ForegroundColor Cyan
