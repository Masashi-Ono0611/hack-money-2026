---
name: foundry-setup
description: Templates and automation for initializing and configuring Foundry projects. Use when setting up new Foundry projects or adding Foundry to existing codebases.
---

# Foundry Setup Skill

This skill provides templates, scripts, and best practices for setting up Foundry-based Solidity projects.

## When to Use

Use this skill when:
- Initializing a new Foundry project
- Adding Foundry to an existing Solidity codebase
- Configuring Foundry settings (optimization, tests, etc.)
- Setting up Foundry in a hybrid Hardhat/Foundry project
- Updating Foundry configuration

**Prerequisites:** Foundry must be installed (`foundryup`)

## Integration with Framework Detection

Before using this skill, reference the `framework-detection` skill to:
- Check if Foundry is already configured
- Determine if this is a hybrid setup
- Avoid overwriting existing configuration

## Quick Setup

### Basic Initialization

```bash
# Initialize new Foundry project
forge init my-project
cd my-project

# Or initialize in existing directory
forge init --force
```

### Project Structure

Foundry creates this structure:

```
project/
├── foundry.toml          # Configuration
├── .env.example          # Environment variables template
├── lib/                  # Dependencies (git submodules)
├── src/                  # Contract source files
│   ├── interfaces        # Interfaces
│   │   └──ICounter       # Example interface
│   └── Counter.sol       # Example contract
├── test/                 # Test files
│   └── Counter.t.sol     # Example test
└── script/               # Deployment scripts
    └── Counter.s.sol     # Example script
```

## Configuration Templates

### foundry.toml

See `./templates/foundry.toml` for the complete configuration template.

**Key Configuration Sections:**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.30"
optimizer = true
optimizer_runs = 200
via_ir = false

# Testing
verbosity = 2
fuzz_runs = 256

# Gas reporting
gas_reports = ["*"]

# Formatting
line_length = 120
tab_width = 4
bracket_spacing = false
```

### Environment Variables

See `./templates/.env.example` for complete environment variable template.

**Essential Variables:**

```bash
# RPC URLs
MAINNET_RPC_URL=
SEPOLIA_RPC_URL=
ARBITRUM_RPC_URL=

# Private Keys (NEVER commit actual keys)
PRIVATE_KEY=

# Etherscan API Keys
ETHERSCAN_API_KEY=
ARBISCAN_API_KEY=

# Gas Price Settings
GAS_PRICE=
```

## Common Configurations

### 1. High Optimization for Production

```toml
[profile.production]
optimizer = true
optimizer_runs = 10000
via_ir = true
```

### 2. Detailed Testing

```toml
[profile.test]
verbosity = 3
fuzz_runs = 1000
invariant_runs = 256
```

### 3. Gas Optimization Focus

```toml
[profile.gas-optimized]
optimizer = true
optimizer_runs = 1000000
via_ir = true
gas_reports = ["*"]
```

### 4. Mainnet Forking for Tests

```toml
[profile.default]
fork_url = "${MAINNET_RPC_URL}"
fork_block_number = 18000000
```

## Dependencies Management

### Adding Libraries

```bash
# Add OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts

# Add Solmate
forge install transmissions11/solmate

# Add Forge Standard Library (included by default)
forge install foundry-rs/forge-std
```

### Remappings

Foundry auto-generates `remappings.txt`, but you can customize:

```txt
@openzeppelin/=lib/openzeppelin-contracts/
@solmate/=lib/solmate/src/
forge-std/=lib/forge-std/src/
```

Or configure in `foundry.toml`:

```toml
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/",
    "@solmate/=lib/solmate/src/"
]
```

## Initialization Script

See `./scripts/init-foundry.sh` for automated setup.

**Usage:**

```bash
# Basic initialization
./scripts/init-foundry.sh

# With project name
./scripts/init-foundry.sh my-project

# In existing directory
./scripts/init-foundry.sh --force
```

**What the script does:**
1. Checks if Foundry is installed
2. Initializes Foundry project
3. Copies configuration templates
4. Sets up .gitignore
5. Installs essential dependencies
6. Creates initial directory structure

## Hybrid Setup (Foundry + Hardhat)

When adding Foundry to an existing Hardhat project:

### 1. Initialize Foundry Without Overwriting

```bash
# Initialize but don't overwrite existing files
forge init --no-commit
```

### 2. Configure Separate Directories

```toml
# foundry.toml
[profile.default]
src = "contracts"          # Use Hardhat's contracts dir
test = "test/foundry"      # Separate Foundry tests
out = "out"
libs = ["node_modules", "lib"]  # Include both package managers
```

### 3. Update .gitignore

```gitignore
# Foundry
out/
cache/
lib/

# Hardhat
artifacts/
cache/
node_modules/
```

### 4. Install Shared Dependencies

```bash
# Install via Foundry
forge install OpenZeppelin/openzeppelin-contracts

# Reference in Hardhat
# Add to hardhat.config.js:
# paths: { sources: "./contracts" }
```

## Testing Setup

### Basic Test Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;

    function setUp() public {
        myContract = new MyContract();
    }

    function testBasic() public {
        // Test implementation
    }

    function testFuzz_Amount(uint256 amount) public {
        // Fuzz test
    }
}
```

### Running Tests

```bash
# Run all tests
forge test

# Run specific test
forge test --match-test testBasic

# Run with verbosity
forge test -vvvv

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

## Security Best Practices for Private Keys

⚠️ **CRITICAL: Never store production private keys in .env files!**

### Recommended Approaches (in order of preference)

#### 1. Hardware Wallets (Most Secure - Production)

```bash
# Deploy using Ledger
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --ledger \
  --broadcast

# Deploy using Trezor
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --trezor \
  --broadcast
```

#### 2. Cast Wallet (Recommended - Development & Production)

Create a named keystore:

```bash
# Create a new wallet (prompts for password)
cast wallet new ~/.foundry/keystores/deployer

# Import existing private key into keystore
cast wallet import deployer --interactive
```

Use in deployment:

```bash
# Deploy using named account
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --account deployer \
  --sender 0xYourAddress \
  --broadcast
```

Update your script to use the account:

```solidity
contract DeployScript is Script {
    function run() external {
        // No private key needed - uses --account flag
        vm.startBroadcast();

        MyContract myContract = new MyContract();

        vm.stopBroadcast();

        console.log("MyContract deployed to:", address(myContract));
    }
}
```

#### 3. Interactive Private Key (Development Only)

```bash
# Prompts for private key (not stored anywhere)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key-interactive \
  --broadcast
```

#### 4. .env Variables (Development/Testing ONLY)

⚠️ **Use ONLY for local development or testnet testing with non-production keys!**

```solidity
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MyContract myContract = new MyContract();

        vm.stopBroadcast();

        console.log("MyContract deployed to:", address(myContract));
    }
}
```

**If using .env:**
- ✅ Only use accounts created specifically for development/testing
- ✅ Never reuse production private keys
- ✅ Keep test funds minimal
- ✅ Add .env to .gitignore
- ❌ Never commit .env to version control
- ❌ Never use for mainnet deployments

## Deployment Setup

### Deploy Commands

```bash
# Dry run (simulation)
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL

# Actual deployment with hardware wallet (RECOMMENDED for production)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --ledger \
  --broadcast \
  --verify

# Actual deployment with cast wallet (RECOMMENDED for all deployments)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --account deployer \
  --sender 0xYourAddress \
  --broadcast \
  --verify

# Development only: with .env private key
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

## Best Practices

1. **Secure private key management** - Use hardware wallets or `cast wallet` for all deployments; never store production keys in .env
2. **Use profiles** - Create different profiles for dev, test, production
3. **High optimizer runs for production** - Use 10,000+ optimizer runs for deployed contracts
4. **Comprehensive .env.example** - Document all required environment variables (but discourage private keys)
5. **Git submodules for deps** - Let Foundry manage dependencies via git
6. **Separate test directories** - Use `test/foundry/` for Foundry tests in hybrid setups
7. **Enable via-ir for optimization** - Use `via_ir = true` for complex contracts
8. **Version pin Solidity** - Specify exact `solc_version` in foundry.toml

## Troubleshooting

### Issue: "forge: command not found"

```bash
# Install/update Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Issue: Dependency conflicts in hybrid setup

```toml
# Prioritize Foundry libs over node_modules
libs = ["lib", "node_modules"]
```

### Issue: Compilation errors with remappings

```bash
# Regenerate remappings
forge remappings > remappings.txt
```

### Issue: Tests not found

```bash
# Check test file naming (must end in .t.sol)
mv test/MyTest.sol test/MyTest.t.sol
```

## Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| Init project | `forge init` | Creates new project |
| Add dependency | `forge install <repo>` | Uses git submodules |
| Build | `forge build` | Compiles contracts |
| Test | `forge test` | Runs tests |
| Coverage | `forge coverage` | Test coverage |
| Gas report | `forge test --gas-report` | Gas usage |
| Format | `forge fmt` | Code formatting |
| Deploy | `forge script` | Run deployment |
| Verify | `forge verify-contract` | Verify on Etherscan |

## Template Files

This skill provides the following templates:
- `./templates/foundry.toml` - Complete Foundry configuration
- `./templates/.env.example` - Environment variables template

## Scripts

This skill provides the following scripts:
- `./scripts/init-foundry.sh` - Automated project initialization

---

**Next Steps After Setup:**
1. Configure `foundry.toml` for your specific needs
2. Copy `.env.example` to `.env` and fill in values
3. Install required dependencies with `forge install`
4. Write contracts in `src/`
5. Write tests in `test/`
6. Run `forge test` to verify setup
