# Property Management System - Automated Setup Script
# Run this script as Administrator

Write-Host "🏠 Property Management System - Setup Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check administrator privileges
if (-not (Test-Administrator)) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "Please right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Step 1: Check if MariaDB is installed
Write-Host "📋 Step 1: Checking MariaDB installation..." -ForegroundColor Yellow

$mariadbService = Get-Service -Name "MariaDB" -ErrorAction SilentlyContinue

if ($null -eq $mariadbService) {
    Write-Host "❌ MariaDB is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MariaDB first:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install mariadb -y" -ForegroundColor Cyan
    Write-Host "  Option 2: Download from https://mariadb.org/download/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    pause
    exit 1
} else {
    Write-Host "✅ MariaDB is installed" -ForegroundColor Green
}

# Step 2: Check if MariaDB service is running
Write-Host ""
Write-Host "📋 Step 2: Checking MariaDB service status..." -ForegroundColor Yellow

if ($mariadbService.Status -ne "Running") {
    Write-Host "⚠️  MariaDB service is not running. Starting..." -ForegroundColor Yellow
    try {
        Start-Service -Name "MariaDB"
        Start-Sleep -Seconds 3
        Write-Host "✅ MariaDB service started successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start MariaDB service: $_" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "✅ MariaDB service is running" -ForegroundColor Green
}

# Step 3: Check Node.js installation
Write-Host ""
Write-Host "📋 Step 3: Checking Node.js installation..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 4: Check .env file
Write-Host ""
Write-Host "📋 Step 4: Checking .env configuration..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    # Read and display database configuration
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DB_HOST=([^\r\n]+)") { $dbHost = $matches[1] }
    if ($envContent -match "DB_PORT=([^\r\n]+)") { $dbPort = $matches[1] }
    if ($envContent -match "DB_NAME=([^\r\n]+)") { $dbName = $matches[1] }
    if ($envContent -match "DB_USER=([^\r\n]+)") { $dbUser = $matches[1] }
    if ($envContent -match "DB_PASSWORD=([^\r\n]+)") { $dbPassword = $matches[1] }
    
    Write-Host "   Database: $dbName" -ForegroundColor Cyan
    Write-Host "   Host: $dbHost:$dbPort" -ForegroundColor Cyan
    Write-Host "   User: $dbUser" -ForegroundColor Cyan
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with database configuration" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 5: Test database connection
Write-Host ""
Write-Host "📋 Step 5: Testing database connection..." -ForegroundColor Yellow

$mysqlPath = "mysql"
$testConnection = "SELECT 1;" | & $mysqlPath -u $dbUser -p$dbPassword -h $dbHost -P $dbPort 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} else {
    Write-Host "❌ Database connection failed!" -ForegroundColor Red
    Write-Host "Error: $testConnection" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify:" -ForegroundColor Yellow
    Write-Host "  1. MariaDB is running" -ForegroundColor Cyan
    Write-Host "  2. Username and password in .env are correct" -ForegroundColor Cyan
    Write-Host "  3. Port 3306 is not blocked" -ForegroundColor Cyan
    pause
    exit 1
}

# Step 6: Create database if not exists
Write-Host ""
Write-Host "📋 Step 6: Creating database..." -ForegroundColor Yellow

$createDbQuery = "CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
$createDbQuery | & $mysqlPath -u $dbUser -p$dbPassword -h $dbHost -P $dbPort 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database '$dbName' is ready" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create database" -ForegroundColor Red
    pause
    exit 1
}

# Step 7: Import database schema
Write-Host ""
Write-Host "📋 Step 7: Importing database schema..." -ForegroundColor Yellow

if (Test-Path "property_rental.sql") {
    Write-Host "   Importing property_rental.sql..." -ForegroundColor Cyan
    Get-Content "property_rental.sql" | & $mysqlPath -u $dbUser -p$dbPassword -h $dbHost -P $dbPort $dbName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database schema imported successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: Some errors occurred during import (this may be normal)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  property_rental.sql not found, skipping import" -ForegroundColor Yellow
}

# Step 8: Install npm dependencies
Write-Host ""
Write-Host "📋 Step 8: Installing npm dependencies..." -ForegroundColor Yellow

if (Test-Path "package.json") {
    Write-Host "   Running npm install..." -ForegroundColor Cyan
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "❌ package.json not found!" -ForegroundColor Red
    pause
    exit 1
}

# Step 9: Test database connection with Node.js
Write-Host ""
Write-Host "📋 Step 9: Testing Node.js database connection..." -ForegroundColor Yellow

$testScript = @"
const {sequelize} = require('./src/server/config/database.js');
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection successful!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"@

$testScript | node

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js can connect to database" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js cannot connect to database" -ForegroundColor Red
    pause
    exit 1
}

# Step 10: Summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ MariaDB is running" -ForegroundColor Green
Write-Host "✅ Database '$dbName' is ready" -ForegroundColor Green
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host "✅ Database connection verified" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Start the development server:" -ForegroundColor Cyan
Write-Host "      npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "   2. Open your browser:" -ForegroundColor Cyan
Write-Host "      http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "   3. Login with admin credentials:" -ForegroundColor Cyan
Write-Host "      Email: rahim@property.com" -ForegroundColor White
Write-Host "      Password: (check database or create new admin)" -ForegroundColor White
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to start the server
$startServer = Read-Host "Would you like to start the development server now? (Y/N)"

if ($startServer -eq "Y" -or $startServer -eq "y") {
    Write-Host ""
    Write-Host "🚀 Starting development server..." -ForegroundColor Green
    Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "To start the server later, run: npm run dev" -ForegroundColor Cyan
    Write-Host ""
}

pause
