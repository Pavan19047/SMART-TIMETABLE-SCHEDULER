# PostgreSQL Database Setup Script

Write-Host "=== PostgreSQL Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Prompt for PostgreSQL password
Write-Host "Enter your PostgreSQL 'postgres' user password:" -ForegroundColor Yellow
Write-Host "(This is the password you set during PostgreSQL installation)" -ForegroundColor Gray
$postgresPassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow

# Set environment variable for psql
$env:PGPASSWORD = $plainPassword

# Try to find psql.exe
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    $psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
}
if (-not (Test-Path $psqlPath)) {
    $psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
}
if (-not (Test-Path $psqlPath)) {
    $psqlPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
}

if (-not (Test-Path $psqlPath)) {
    Write-Host "ERROR: Could not find psql.exe. Please check your PostgreSQL installation." -ForegroundColor Red
    exit 1
}

Write-Host "Found PostgreSQL at: $psqlPath" -ForegroundColor Green

# Test connection
try {
    $testResult = & $psqlPath -U postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to connect to PostgreSQL. Please check your password." -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully connected to PostgreSQL!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to connect to PostgreSQL." -ForegroundColor Red
    exit 1
}

# Create database
Write-Host ""
Write-Host "Creating database 'timetable_db'..." -ForegroundColor Yellow
$createResult = & $psqlPath -U postgres -c "CREATE DATABASE timetable_db;" 2>&1

$resultText = $createResult | Out-String
$alreadyExists = $resultText -match "already exists"

if ($alreadyExists) {
    Write-Host "Database 'timetable_db' already exists." -ForegroundColor Green
} elseif ($LASTEXITCODE -eq 0) {
    Write-Host "Database 'timetable_db' created successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create database." -ForegroundColor Red
    Write-Host $resultText -ForegroundColor Red
    exit 1
}

# Update .env file
Write-Host ""
Write-Host "Updating .env file..." -ForegroundColor Yellow

$envPath = Join-Path $PSScriptRoot ".env"
$databaseUrl = "DATABASE_URL=`"postgresql://postgres:$plainPassword@localhost:5432/timetable_db?schema=public`""

if (Test-Path $envPath) {
    $envLines = Get-Content $envPath
    $newLines = @()
    $foundDbUrl = $false
    
    foreach ($line in $envLines) {
        if ($line -match '^DATABASE_URL=') {
            $newLines += $databaseUrl
            $foundDbUrl = $true
        } else {
            $newLines += $line
        }
    }
    
    if (-not $foundDbUrl) {
        $newLines += $databaseUrl
    }
    
    $newLines | Set-Content -Path $envPath
    Write-Host ".env file updated with correct credentials!" -ForegroundColor Green
} else {
    Write-Host "ERROR: .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run prisma:generate" -ForegroundColor White
Write-Host "2. Run: npm run prisma:migrate" -ForegroundColor White
Write-Host "3. Run: npm run prisma:seed" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host ""
