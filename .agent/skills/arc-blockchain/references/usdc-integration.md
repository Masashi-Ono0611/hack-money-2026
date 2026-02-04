# USDC Integration on Arc

ArcでのUSDC統合ガイド。ネイティブガストークンとしてのUSDCとERC-20インターフェースの両方をカバー。

## 概要

ArcではUSDCが2つの形態で存在:

| 形態 | Decimals | 用途 | アクセス方法 |
|------|----------|------|-------------|
| Native USDC | 18 | ガス代支払い | `msg.value`, `address.balance` |
| ERC-20 USDC | 6 | トークン操作 | `IERC20(USDC).balanceOf()` |

**重要**: アプリケーションでは**常にERC-20インターフェース（6 decimals）を使用**することを推奨。

## コントラクトアドレス

| ネットワーク | USDC アドレス |
|-------------|---------------|
| Arc Testnet | `0x3600000000000000000000000000000000000000` |
| Arc Mainnet | TBD (2026年予定) |

## 基本操作

### 残高確認

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract USDCBalanceChecker {
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    /// @notice ERC-20残高を取得（推奨）
    function getBalance(address account) external view returns (uint256) {
        return IERC20(USDC).balanceOf(account);
        // 返り値: 6 decimals (例: 100 USDC = 100_000_000)
    }

    /// @notice ネイティブ残高を取得（ガス計算用）
    function getNativeBalance(address account) external view returns (uint256) {
        return account.balance;
        // 返り値: 18 decimals
    }

    /// @notice 両方の残高を比較
    function compareBalances(address account) external view returns (
        uint256 erc20Balance,
        uint256 nativeBalance,
        bool isEqual
    ) {
        erc20Balance = IERC20(USDC).balanceOf(account);
        nativeBalance = account.balance;

        // 18 decimals → 6 decimals変換して比較
        uint256 nativeIn6Decimals = nativeBalance / 1e12;
        isEqual = (erc20Balance == nativeIn6Decimals);
    }
}
```

### 送金

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract USDCTransfer {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    /// @notice USDCを送金
    /// @param recipient 受取人アドレス
    /// @param amount 金額（6 decimals）
    function transfer(address recipient, uint256 amount) external {
        USDC.safeTransferFrom(msg.sender, recipient, amount);
    }

    /// @notice 100 USDCを送金する例
    function send100USDC(address recipient) external {
        uint256 amount = 100 * 10**6; // 100 USDC = 100_000_000
        USDC.safeTransferFrom(msg.sender, recipient, amount);
    }
}
```

### 承認（Approve）

```solidity
// ユーザー側でapproveを実行
// USDC.approve(spenderContract, amount);

// コントラクト側でallowanceを確認
function checkAllowance(address owner, address spender) external view returns (uint256) {
    return USDC.allowance(owner, spender);
}

// Permit2を使用した承認（推奨）
// https://docs.uniswap.org/contracts/permit2/overview
```

## デシマル変換

### 安全な変換関数

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library USDCDecimals {
    uint256 public constant NATIVE_DECIMALS = 18;
    uint256 public constant ERC20_DECIMALS = 6;
    uint256 public constant CONVERSION_FACTOR = 10 ** (NATIVE_DECIMALS - ERC20_DECIMALS);

    /// @notice Native (18) → ERC-20 (6)
    function toERC20(uint256 nativeAmount) internal pure returns (uint256) {
        return nativeAmount / CONVERSION_FACTOR;
    }

    /// @notice ERC-20 (6) → Native (18)
    function toNative(uint256 erc20Amount) internal pure returns (uint256) {
        return erc20Amount * CONVERSION_FACTOR;
    }

    /// @notice 表示用の文字列変換
    function formatUSDC(uint256 amount) internal pure returns (uint256 whole, uint256 fraction) {
        whole = amount / 10**6;
        fraction = amount % 10**6;
    }
}
```

### JavaScript/TypeScript

```typescript
import { formatUnits, parseUnits } from 'viem';

// 6 decimals のUSDC
const USDC_DECIMALS = 6;

// 文字列 → BigInt
function parseUSDC(amount: string): bigint {
    return parseUnits(amount, USDC_DECIMALS);
}

// BigInt → 文字列
function formatUSDC(amount: bigint): string {
    return formatUnits(amount, USDC_DECIMALS);
}

// 使用例
const amount = parseUSDC('100.50'); // 100500000n
const display = formatUSDC(100500000n); // "100.5"
```

## 支払いコントラクト

### 基本的な支払いプロセッサ

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USDCPaymentProcessor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    struct Payment {
        address payer;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 reference;
    }

    mapping(bytes32 => Payment) public payments;

    event PaymentReceived(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        bytes32 reference
    );

    /// @notice 支払いを処理
    function processPayment(
        address recipient,
        uint256 amount,
        bytes32 reference
    ) external nonReentrant returns (bytes32 paymentId) {
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");

        paymentId = keccak256(abi.encode(msg.sender, recipient, amount, block.timestamp, reference));

        // USDC転送
        USDC.safeTransferFrom(msg.sender, recipient, amount);

        // 支払い記録
        payments[paymentId] = Payment({
            payer: msg.sender,
            recipient: recipient,
            amount: amount,
            timestamp: block.timestamp,
            reference: reference
        });

        emit PaymentReceived(paymentId, msg.sender, recipient, amount, reference);
    }

    /// @notice バッチ支払い
    function batchPayment(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata references
    ) external nonReentrant {
        require(recipients.length == amounts.length, "Length mismatch");
        require(amounts.length == references.length, "Length mismatch");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        // 一括で引き出し
        USDC.safeTransferFrom(msg.sender, address(this), total);

        // 個別に配布
        for (uint256 i = 0; i < recipients.length; i++) {
            USDC.safeTransfer(recipients[i], amounts[i]);

            bytes32 paymentId = keccak256(abi.encode(msg.sender, recipients[i], amounts[i], block.timestamp, references[i]));
            emit PaymentReceived(paymentId, msg.sender, recipients[i], amounts[i], references[i]);
        }
    }
}
```

### サブスクリプション支払い

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract USDCSubscription {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    struct Subscription {
        address subscriber;
        address merchant;
        uint256 amount;
        uint256 interval; // seconds
        uint256 nextPayment;
        bool active;
    }

    mapping(bytes32 => Subscription) public subscriptions;

    event SubscriptionCreated(bytes32 indexed subscriptionId, address indexed subscriber, address indexed merchant);
    event PaymentProcessed(bytes32 indexed subscriptionId, uint256 amount);
    event SubscriptionCancelled(bytes32 indexed subscriptionId);

    /// @notice サブスクリプション作成
    function createSubscription(
        address merchant,
        uint256 amount,
        uint256 interval
    ) external returns (bytes32 subscriptionId) {
        subscriptionId = keccak256(abi.encode(msg.sender, merchant, block.timestamp));

        subscriptions[subscriptionId] = Subscription({
            subscriber: msg.sender,
            merchant: merchant,
            amount: amount,
            interval: interval,
            nextPayment: block.timestamp,
            active: true
        });

        emit SubscriptionCreated(subscriptionId, msg.sender, merchant);

        // 初回支払い
        _processPayment(subscriptionId);
    }

    /// @notice 支払い実行（誰でも呼び出し可能）
    function processPayment(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.active, "Subscription not active");
        require(block.timestamp >= sub.nextPayment, "Not due yet");

        _processPayment(subscriptionId);
    }

    function _processPayment(bytes32 subscriptionId) internal {
        Subscription storage sub = subscriptions[subscriptionId];

        USDC.safeTransferFrom(sub.subscriber, sub.merchant, sub.amount);
        sub.nextPayment = block.timestamp + sub.interval;

        emit PaymentProcessed(subscriptionId, sub.amount);
    }

    /// @notice サブスクリプションキャンセル
    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.subscriber == msg.sender, "Not subscriber");
        sub.active = false;

        emit SubscriptionCancelled(subscriptionId);
    }
}
```

## ethers.js / viem 統合

### ethers.js

```typescript
import { ethers } from 'ethers';

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const USDC_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

async function main() {
    const provider = new ethers.JsonRpcProvider('https://arc-testnet.drpc.org');
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

    // 残高確認
    const balance = await usdc.balanceOf(signer.address);
    console.log('Balance:', ethers.formatUnits(balance, 6), 'USDC');

    // 送金
    const recipient = '0x...';
    const amount = ethers.parseUnits('10', 6); // 10 USDC
    const tx = await usdc.transfer(recipient, amount);
    await tx.wait();
    console.log('Transfer complete:', tx.hash);
}
```

### viem

```typescript
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from './chains';

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const usdcAbi = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
] as const;

async function main() {
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

    const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: arcTestnet,
        transport: http(),
    });

    // 残高確認
    const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: usdcAbi,
        functionName: 'balanceOf',
        args: [account.address],
    });
    console.log('Balance:', formatUnits(balance, 6), 'USDC');

    // 送金
    const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: usdcAbi,
        functionName: 'transfer',
        args: ['0x...', parseUnits('10', 6)],
    });
    console.log('Transfer hash:', hash);
}
```

## テストネットUSDC取得

### Circle Faucet

**URL**: https://faucet.circle.com/

1. Arc Testnetを選択
2. USDCを選択
3. ウォレットアドレスを入力
4. 20 USDC を受け取り

**制限**: 20 USDC / 2時間 / アドレス

### プログラマティック取得

```typescript
// Faucetはウェブインターフェースのみ
// テスト用には deal() を使用（Foundry）

// Foundry Test
function setUp() public {
    deal(USDC, testUser, 1000 * 10**6); // 1000 USDC
}
```

## ベストプラクティス

### 1. 常にSafeERC20を使用

```solidity
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

// Good
USDC.safeTransfer(recipient, amount);
USDC.safeTransferFrom(sender, recipient, amount);

// Avoid
// USDC.transfer(recipient, amount);
// USDC.transferFrom(sender, recipient, amount);
```

### 2. Decimals を間違えない

```solidity
// Good: 定数として定義
uint256 public constant USDC_DECIMALS = 6;
uint256 public constant ONE_USDC = 10 ** USDC_DECIMALS;

// 100 USDC
uint256 amount = 100 * ONE_USDC;

// Avoid: ハードコーディング
// uint256 amount = 100000000; // これは何USDC？
```

### 3. ゼロアドレスチェック

```solidity
function transfer(address recipient, uint256 amount) external {
    require(recipient != address(0), "Invalid recipient");
    // ...
}
```

### 4. 金額の妥当性チェック

```solidity
function deposit(uint256 amount) external {
    require(amount > 0, "Amount must be positive");
    require(amount <= MAX_DEPOSIT, "Exceeds max deposit");
    // ...
}
```

## 参考リンク

- Circle Developer Docs: https://developers.circle.com
- Arc Docs: https://docs.arc.network
- OpenZeppelin ERC20: https://docs.openzeppelin.com/contracts/4.x/erc20
