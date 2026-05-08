#!/bin/bash

# Property Management System - Automated Setup Script
# Run this script in Git Bash or WSL

echo "🏠 Property Management System - Setup Script"
echo "============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check if MariaDB is installed
echo -e "${YELLOW}📋 Step 1: Checking MariaDB installation...${NC}"

if command -v mysql &> /dev/null; then
    echo -e "${GREEN}✅ MySQL/MariaDB client is installed${NC}"
else
    echo -e "${RED}❌ MySQL/MariaDB client is not installed!${NC}"
    echo -e "${YELLOW}Please install MariaDB first:${NC}"
    echo -e "${CYAN}  Download from https://mariadb.org/download/${NC}"
    exit 1
fi

# Step 2: Check if MariaDB service is running
echo ""
echo -e "${YELLOW}📋 Step 2: Checking MariaDB service status...${NC}"

# Try to connect to check if service is running
if mysql -u root -ptoor -e "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✅ MariaDB service is running${NC}"
else
    echo -e "${RED}❌ Cannot connect to MariaDB!${NC}"
    echo -e "${YELLOW}Please ensure:${NC}"
    echo -e "${CYAN}  1. MariaDB service is running${NC}"
    echo -e "${CYAN}  2. Password in .env matches your MariaDB root password${NC}"
    exit 1
fi

# Step 3: Check Node.js installation
echo ""
echo -e "${YELLOW}📋 Step 3: Checking Node.js installation...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js is installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Step 4: Check .env file
echo ""
echo -e "${YELLOW}📋 Step 4: Checking .env configuration...${NC}"

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Read database configuration
    DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
    DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2)
    DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2)
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2)
    
    echo -e "${CYAN}   Database: $DB_NAME${NC}"
    echo -e "${CYAN}   Host: $DB_HOST:$DB_PORT${NC}"
    echo -e "${CYAN}   User: $DB_USER${NC}"
else
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please create .env file with database configuration${NC}"
    exit 1
fi

# Step 5: Test database connection
echo ""
echo -e "${YELLOW}📋 Step 5: Testing database connection...${NC}"

if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed!${NC}"
    echo -e "${YELLOW}Please verify:${NC}"
    echo -e "${CYAN}  1. MariaDB is running${NC}"
    echo -e "${CYAN}  2. Username and password in .env are correct${NC}"
    echo -e "${CYAN}  3. Port 3306 is not blocked${NC}"
    exit 1
fi

# Step 6: Create database if not exists
echo ""
echo -e "${YELLOW}📋 Step 6: Creating database...${NC}"

mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" &> /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database '$DB_NAME' is ready${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
fi

# Step 7: Import database schema
echo ""
echo -e "${YELLOW}📋 Step 7: Importing database schema...${NC}"

if [ -f "property_rental.sql" ]; then
    echo -e "${CYAN}   Importing property_rental.sql...${NC}"
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" < property_rental.sql 2>&1 | grep -v "Warning"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema imported successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Some warnings occurred during import (this may be normal)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  property_rental.sql not found, skipping import${NC}"
fi

# Step 8: Install npm dependencies
echo ""
echo -e "${YELLOW}📋 Step 8: Installing npm dependencies...${NC}"

if [ -f "package.json" ]; then
    echo -e "${CYAN}   Running npm install...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ package.json not found!${NC}"
    exit 1
fi

# Step 9: Test database connection with Node.js
echo ""
echo -e "${YELLOW}📋 Step 9: Testing Node.js database connection...${NC}"

node -e "const {sequelize} = require('./src/server/config/database.js'); sequelize.authenticate().then(() => { console.log('✅ Database connection successful!'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node.js can connect to database${NC}"
else
    echo -e "${RED}❌ Node.js cannot connect to database${NC}"
    exit 1
fi

# Step 10: Summary
echo ""
echo "============================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "============================================="
echo ""
echo -e "${GREEN}✅ MariaDB is running${NC}"
echo -e "${GREEN}✅ Database '$DB_NAME' is ready${NC}"
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo -e "${GREEN}✅ Database connection verified${NC}"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo ""
echo -e "${CYAN}   1. Start the development server:${NC}"
echo -e "      npm run dev"
echo ""
echo -e "${CYAN}   2. Open your browser:${NC}"
echo -e "      http://localhost:3000"
echo ""
echo -e "${CYAN}   3. Login with admin credentials:${NC}"
echo -e "      Email: rahim@property.com"
echo -e "      Password: (check database or create new admin)"
echo ""
echo "============================================="
echo ""

# Ask if user wants to start the server
read -p "Would you like to start the development server now? (Y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}🚀 Starting development server...${NC}"
    echo -e "${YELLOW}   Press Ctrl+C to stop the server${NC}"
    echo ""
    npm run dev
else
    echo ""
    echo -e "${CYAN}To start the server later, run: npm run dev${NC}"
    echo ""
fi
