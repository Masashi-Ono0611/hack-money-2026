# Project Overview

**Project Name:** Zombie L2 Clearinghouse (Hack Money 2026)

**Purpose:**
A financial infrastructure layer designed to monetize low-activity Ethereum L2 chains ("Zombie L2s") by tokenizing their compute resources into "Compute Tokens" (CPT). It uses arbitrage and settlement mechanisms to generate USDC revenue for L2 operators, helping them cover fixed costs even in the absence of user activity.

**Key Mechanisms:**
1.  **Tokenization:** L2 compute resources -> CPT (Compute Token).
2.  **Market:** Uniswap v4 (on L2 or L1?) for CPT/USDC trading.
3.  **Pricing:** v4 Hook dynamically controls fees/spreads based on L2 utilization (lower utilization = lower CPT price/fees).
4.  **Arbitrage:** Yellow SDK provides intent-based, gasless, high-speed trading to capture CPT price differences.
5.  **Settlement:** Arc protocol bridges/settles the profits in USDC to the L2 operator's Vault.

**Target Networks:**
- Base Sepolia
- WorldCoin Sepolia
