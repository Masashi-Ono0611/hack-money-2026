#!/usr/bin/env bash
# Foundry Project Initialization Script
# Automates the setup of a new Foundry project with best practices

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="${1:-.}"  # Use first argument or current directory
FORCE_FLAG="${2:-}"

echo -e "${GREEN}🔨 Foundry Project Initialization${NC}"
echo "=================================="

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Foundry is not installed${NC}"
    echo "Install Foundry with: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

echo -e "${GREEN}✓ Foundry detected${NC}"
forge --version

# Initialize Foundry project
echo ""
echo "Initializing Foundry project..."

if [ "$FORCE_FLAG" == "--force" ]; then
    forge init --force "$PROJECT_NAME"
else
    forge init "$PROJECT_NAME"
fi

# Navigate to project directory if not current directory
if [ "$PROJECT_NAME" != "." ]; then
    cd "$PROJECT_NAME"
fi

echo -e "${GREEN}✓ Foundry project initialized${NC}"

# Create .gitignore if it doesn't exist
echo ""
echo "Setting up configuration files..."

if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Foundry
out/
cache/
cache_hardhat/
broadcast/

# Dependencies
lib/
node_modules/

# Environment
.env
.env.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build artifacts
*.log
build-info/
EOF
    echo -e "${GREEN}✓ Created .gitignore${NC}"
fi

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    cat > .env.example << 'EOF'
# RPC URLs
MAINNET_RPC_URL=
SEPOLIA_RPC_URL=
ETH_RPC_URL=

# Private Keys (NEVER commit!)
PRIVATE_KEY=

# Etherscan API Keys
ETHERSCAN_API_KEY=
ARBISCAN_API_KEY=

# Gas Settings
GAS_PRICE=
EOF
    echo -e "${GREEN}✓ Created .env.example${NC}"
fi

# Install essential dependencies
echo ""
echo "Installing essential dependencies..."

# Install Forge Standard Library (usually included, but ensure latest)
if [ ! -d "lib/forge-std" ]; then
    forge install foundry-rs/forge-std --no-commit
    echo -e "${GREEN}✓ Installed forge-std${NC}"
fi

# Install OpenZeppelin Contracts
read -p "Install OpenZeppelin Contracts? (y/n): " install_oz
if [ "$install_oz" == "y" ]; then
    forge install OpenZeppelin/openzeppelin-contracts --no-commit
    echo -e "${GREEN}✓ Installed OpenZeppelin Contracts${NC}"
fi

# Install Solmate
read -p "Install Solmate? (y/n): " install_solmate
if [ "$install_solmate" == "y" ]; then
    forge install transmissions11/solmate --no-commit
    echo -e "${GREEN}✓ Installed Solmate${NC}"
fi

# Generate remappings
echo ""
echo "Generating remappings..."
forge remappings > remappings.txt
echo -e "${GREEN}✓ Generated remappings.txt${NC}"

# Build project to verify setup
echo ""
echo "Building project..."
forge build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Run tests to verify setup
echo ""
echo "Running tests..."
forge test

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Tests failed or no tests found${NC}"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✅ Foundry project setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Write your contracts in src/"
echo "3. Write tests in test/"
echo "4. Run 'forge test' to test your contracts"
echo "5. Run 'forge build' to compile"
echo ""
echo "Useful commands:"
echo "  forge build          - Compile contracts"
echo "  forge test           - Run tests"
echo "  forge test -vvv      - Run tests with verbose output"
echo "  forge coverage       - Generate coverage report"
echo "  forge fmt            - Format code"
echo "  forge install <repo> - Install dependencies"
echo ""
echo "Documentation: https://book.getfoundry.sh/"
