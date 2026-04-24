#!/bin/bash

# ============================================================================
# AI Ambulance / EMS Dispatch Platform - Start Script
# ============================================================================
# This script:
# 1. Kills any processes on ports 4000 and 3000
# 2. Sets up PostgreSQL database and seeds data
# 3. Installs dependencies
# 4. Starts backend (with nodemon for hot reload) and frontend (with Vite HMR)
# ============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           AI Ambulance / EMS Dispatch Platform              ║"
echo "║                    Metro County EMS                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Kill any existing processes on our ports ────────────────────────
echo -e "${YELLOW}[1/6] Cleaning up ports 4000 and 3000...${NC}"

kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo "  Port $port is free"
  fi
}

kill_port 4000
kill_port 3000

# ── Step 2: Check PostgreSQL is running ─────────────────────────────────────
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}PostgreSQL is running${NC}"
  else
    echo -e "  ${RED}PostgreSQL is not running. Attempting to start...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
      sleep 2
    fi
    if ! pg_isready -q 2>/dev/null; then
      echo -e "  ${RED}Could not start PostgreSQL. Please start it manually.${NC}"
      exit 1
    fi
  fi
else
  echo -e "  ${YELLOW}pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ── Step 3: Create database and user if needed ──────────────────────────────
echo -e "${YELLOW}[3/6] Setting up database...${NC}"

# Create user if not exists
psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='ems_user'" 2>/dev/null | grep -q 1 || \
  psql -U postgres -c "CREATE USER ems_user WITH PASSWORD 'ems_password' CREATEDB;" 2>/dev/null || \
  echo "  User ems_user may already exist or using different auth"

# Create database if not exists
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='ems_dispatch'" 2>/dev/null | grep -q 1 || \
  psql -U postgres -c "CREATE DATABASE ems_dispatch OWNER ems_user;" 2>/dev/null || \
  echo "  Database ems_dispatch may already exist"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ems_dispatch TO ems_user;" 2>/dev/null || true

echo -e "  ${GREEN}Database ready${NC}"

# ── Step 4: Install dependencies ────────────────────────────────────────────
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
  echo "  Installing server dependencies..."
  npm install
else
  echo "  Server dependencies already installed"
fi

if [ ! -d "client/node_modules" ]; then
  echo "  Installing client dependencies..."
  cd client && npm install && cd ..
else
  echo "  Client dependencies already installed"
fi

# ── Step 5: Seed database ──────────────────────────────────────────────────
echo -e "${YELLOW}[5/6] Seeding database with sample data...${NC}"
node database/seed.js
echo -e "  ${GREEN}Database seeded successfully${NC}"

# ── Step 6: Start application ──────────────────────────────────────────────
echo -e "${YELLOW}[6/6] Starting application...${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Backend  → http://localhost:4000  (nodemon, auto-reload)   ║${NC}"
echo -e "${GREEN}║  Frontend → http://localhost:3000  (Vite HMR, auto-reload)  ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Login: admin@emsstation1.com / password123                  ║${NC}"
echo -e "${GREEN}║  (Use 'Quick Login' button for auto-fill)                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Start both servers with hot reload using concurrently
npx concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "cyan,magenta" \
  "npx nodemon --watch server --ext js,json server/index.js" \
  "cd client && npx vite --host"
