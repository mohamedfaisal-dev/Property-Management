#!/bin/bash

# Quick Start Script - Property Management System
# This script checks if everything is set up and starts the server

echo "🚀 Property Management System - Quick Start"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please run setup.sh first${NC}"
    exit 1
fi

# Read database configuration
DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2)
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)
DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2)

# Check MariaDB connection
echo -e "${CYAN}Checking MariaDB connection...${NC}"
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "USE $DB_NAME;" &> /dev/null; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
else
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    echo -e "${YELLOW}Please ensure MariaDB is running and configured correctly${NC}"
    echo -e "${CYAN}Run setup.sh to configure the database${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    echo -e "${CYAN}Installing dependencies...${NC}"
    npm install
fi

echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo -e "${CYAN}Starting development server...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo -e "${CYAN}Frontend: http://localhost:3000${NC}"
echo -e "${CYAN}Backend API: http://localhost:4002${NC}"
echo ""

# Start the server
npm run dev
