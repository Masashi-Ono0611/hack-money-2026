# Arc Contract Addresses

Arc Testnet上の主要コントラクトアドレス一覧。

## Arc Testnet

### ネイティブアセット

| アセット | アドレス | Decimals | 備考 |
|---------|---------|----------|------|
| USDC (Native) | `0x3600000000000000000000000000000000000000` | 18 (native) / 6 (ERC-20) | ガストークン |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | ユーロステーブルコイン |

### CCTP (Cross-Chain Transfer Protocol)

| コントラクト | アドレス | 備考 |
|-------------|---------|------|
| TokenMessenger | 公式ドキュメント参照 | CCTP V2 |
| MessageTransmitter | 公式ドキュメント参照 | メッセージ伝送 |

**CCTP Domain**: `7`

### Circle Platform

| コントラクト | アドレス | 備考 |
|-------------|---------|------|
| Circle Paymaster | 公式ドキュメント参照 | ERC-4337 |
| StableFX | 公式ドキュメント参照 | FXエンジン（機関向け） |

## USDC デシマルに関する重要な注意

Arcでは、USDCに2つの表現があります:

### 1. ネイティブUSDC（ガストークン）
- **Decimals**: 18
- **用途**: ガス代支払い
- **アクセス**: `msg.value`、`address.balance`

### 2. ERC-20 USDC
- **Decimals**: 6
- **用途**: トークン転送、DeFi統合
- **アクセス**: `IERC20(USDC_ADDRESS).balanceOf()`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract USDCExample {
    // ERC-20 USDC (6 decimals) - 推奨
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    function getERC20Balance(address account) external view returns (uint256) {
        // 6 decimals (例: 100 USDC = 100_000_000)
        return IERC20(USDC).balanceOf(account);
    }

    function getNativeBalance(address account) external view returns (uint256) {
        // 18 decimals (ガス用)
        return account.balance;
    }

    // 100 USDCの表現
    // ERC-20: 100 * 10**6 = 100_000_000
    // Native: 100 * 10**18 = 100_000_000_000_000_000_000
}
```

### 推奨事項

**Circle公式推奨**: アプリケーションでUSDCを扱う場合は、**常にERC-20インターフェース（6 decimals）を使用**してください。

```solidity
// Good: ERC-20インターフェースを使用
uint256 balance = IERC20(USDC).balanceOf(user);
IERC20(USDC).transfer(recipient, 100 * 10**6); // 100 USDC

// Avoid: ネイティブ残高を直接使用（ガス計算以外）
// uint256 nativeBalance = user.balance; // 混乱の元
```

## CCTP Domain一覧

クロスチェーン転送時のドメインID:

| チェーン | Domain ID |
|---------|-----------|
| Ethereum | 0 |
| Avalanche | 1 |
| Optimism | 2 |
| Arbitrum | 3 |
| Noble | 4 |
| Solana | 5 |
| Base | 6 |
| **Arc** | **7** |
| Polygon PoS | 7 |

## パートナーステーブルコイン

Arc上にデプロイされるパートナーステーブルコイン:

| 通貨 | コード | 発行者 | アドレス |
|------|--------|--------|---------|
| オーストラリアドル | AUDF | Forte Securities | TBD |
| ブラジルレアル | BRLA | Avenia | TBD |
| 日本円 | JPYC | JPYC Inc. | TBD |
| 韓国ウォン | KRW1 | BDACS | TBD |
| メキシコペソ | MXNB | Juno | TBD |
| フィリピンペソ | PHPC | Coins.PH | TBD |
| カナダドル | QCAD | Stablecorp | TBD |
| 南アフリカランド | ZARC | Luno | TBD |

## OpenZeppelinコントラクト

Foundry/Hardhatでの依存関係:

```bash
# Foundry
forge install OpenZeppelin/openzeppelin-contracts

# Hardhat
npm install @openzeppelin/contracts
```

## コントラクト検証

Arc Explorerでのコントラクト検証:

```bash
# Foundry
forge verify-contract \
  --chain-id 1244 \
  --compiler-version v0.8.20 \
  --constructor-args $(cast abi-encode "constructor(address)" 0x...) \
  CONTRACT_ADDRESS \
  src/MyContract.sol:MyContract \
  --etherscan-api-key $API_KEY \
  --verifier-url https://explorer.arc.network/api
```

## アドレス更新情報

**最終更新**: 2025年12月

アドレスは変更される可能性があります。最新情報は公式ドキュメントを確認してください:
- https://docs.arc.network/arc/references/contract-addresses

## 参考リンク

- Arc公式ドキュメント: https://docs.arc.network/arc/references/contract-addresses
- CCTP Contracts: https://developers.circle.com/cctp/docs/contract-addresses
- Circle Faucet: https://faucet.circle.com/
