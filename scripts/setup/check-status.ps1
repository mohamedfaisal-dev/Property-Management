# Property Management System - Status Check Script

Write-Host "Property Management System - Status Check" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: MariaDB Service
Write-Host "1. MariaDB Service:" -NoNewline
$mariadbService = Get-Service -Name "MariaDB" -ErrorAction SilentlyContinue
if ($mariadbService -and $mariadbService.Status -eq "Running") {
    Write-Host " [OK] Running" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Not Running" -ForegroundColor Red
    $allGood = $false
}

# Check 2: MariaDB Connection
Write-Host "2. Database Connection:" -NoNewline
try {
    $result = & "C:\Program Files\MariaDB 12.2\bin\mysql.exe" -u root -ptoor -e "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK] Connected" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] Failed" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host " [FAIL] Failed" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Database Exists
Write-Host "3. Database 'property_rental':" -NoNewline
try {
    $result = & "C:\Program Files\MariaDB 12.2\bin\mysql.exe" -u root -ptoor -e "USE property_rental; SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK] Exists" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] Not Found" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host " [FAIL] Not Found" -ForegroundColor Red
    $allGood = $false
}

# Check 4: Tables
Write-Host "4. Database Tables:" -NoNewline
try {
    $tables = & "C:\Program Files\MariaDB 12.2\bin\mysql.exe" -u root -ptoor property_rental -e "SHOW TABLES;" 2>&1
    if ($LASTEXITCODE -eq 0 -and $tables -match "admins") {
        $tableCount = ($tables -split "`n" | Where-Object { $_ -match "^\|" -and $_ -notmatch "Tables_in" }).Count
        Write-Host " [OK] $tableCount tables found" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] Missing" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host " [FAIL] Error" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Node.js
Write-Host "5. Node.js:" -NoNewline
try {
    $nodeVersion = node --version
    Write-Host " [OK] $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host " [FAIL] Not Installed" -ForegroundColor Red
    $allGood = $false
}

# Check 6: Dependencies
Write-Host "6. NPM Dependencies:" -NoNewline
if (Test-Path "node_modules") {
    Write-Host " [OK] Installed" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Not Installed" -ForegroundColor Red
    $allGood = $false
}

# Check 7: .env file
Write-Host "7. Configuration (.env):" -NoNewline
if (Test-Path ".env") {
    Write-Host " [OK] Present" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Missing" -ForegroundColor Red
    $allGood = $false
}

# Check 8: Node.js Database Connection
Write-Host "8. Node.js DB Connection:" -NoNewline
$testScript = @"
const {sequelize} = require('./src/server/config/database.js');
sequelize.authenticate()
  .then(() => { process.exit(0); })
  .catch(() => { process.exit(1); });
"@
$testScript | node 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " [OK] Working" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Failed" -ForegroundColor Red
    $allGood = $false
}

# Check 9: Admin User
Write-Host "9. Admin User:" -NoNewline
try {
    $adminCheck = & "C:\Program Files\MariaDB 12.2\bin\mysql.exe" -u root -ptoor property_rental -e "SELECT COUNT(*) as count FROM admins;" 2>&1
    if ($LASTEXITCODE -eq 0 -and $adminCheck -match "\d+") {
        $adminCount = [regex]::Match($adminCheck, "\d+").Value
        if ([int]$adminCount -gt 0) {
            Write-Host " [OK] $adminCount admin(s) found" -ForegroundColor Green
        } else {
            Write-Host " [WARN] No admins found" -ForegroundColor Yellow
        }
    } else {
        Write-Host " [FAIL] Error checking" -ForegroundColor Red
    }
} catch {
    Write-Host " [FAIL] Error" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "[SUCCESS] All Systems Ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the application, run:" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Then open: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "[WARNING] Some Issues Detected" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run setup.ps1 to fix issues:" -ForegroundColor Cyan
    Write-Host "   .\setup.ps1" -ForegroundColor White
}
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
