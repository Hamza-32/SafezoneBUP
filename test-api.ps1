# Test SafeZone API endpoints
Write-Host "🧪 Testing SafeZone API..." -ForegroundColor Green

# Test login
Write-Host "`n1. Testing Admin Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@safezone.edu"
    password = "admin123" 
    role = "admin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($response.data.token.Substring(0,20))..." -ForegroundColor Cyan
    $token = $response.data.token
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test dashboard
Write-Host "`n2. Testing Admin Dashboard..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $dashboard = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/dashboard" -Method GET -Headers $headers
    Write-Host "✅ Dashboard data retrieved!" -ForegroundColor Green
    Write-Host "Total Users: $($dashboard.data.statistics.users.total)" -ForegroundColor Cyan
    Write-Host "Total Emergency Reports: $($dashboard.data.statistics.reports.emergencies.total)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Dashboard failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test emergency reports
Write-Host "`n3. Testing Emergency Reports..." -ForegroundColor Yellow
try {
    $reports = Invoke-RestMethod -Uri "http://localhost:3000/api/emergency/reports" -Method GET -Headers $headers
    Write-Host "✅ Emergency reports retrieved!" -ForegroundColor Green
    Write-Host "Found $($reports.data.reports.Count) emergency reports" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Emergency reports failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 API Testing Complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Blue
Write-Host "- Visit http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "- Login with: admin@safezone.edu / admin123" -ForegroundColor White
Write-Host "- Test the frontend interface" -ForegroundColor White
