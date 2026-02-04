# Bridge USDC with CCTP

CCTP（Cross-Chain Transfer Protocol）を使用したArcとの間のUSDCブリッジガイド。

## 概要

CCTPはCircleが提供するUSDCのネイティブクロスチェーン転送プロトコル:

- **Burn & Mint**: ソースチェーンでburn、デスティネーションでmint
- **1:1転送**: ラップトークンなし、ネイティブUSDC
- **セキュア**: Circle署名による検証

## CCTP Domains

| チェーン | Domain ID | USDC |
|---------|-----------|------|
| Ethereum | 0 | Native |
| Avalanche | 1 | Native |
| Optimism | 2 | Native |
| Arbitrum | 3 | Native |
| Noble | 4 | Native |
| Solana | 5 | Native |
| Base | 6 | Native |
| **Arc** | **7** | Native |

## 基本フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    CCTP Transfer Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Source Chain (e.g., Base)         Destination (Arc)        │
│         │                                │                   │
│  1. Approve USDC to TokenMessenger       │                   │
│         │                                │                   │
│  2. depositForBurn()                     │                   │
│         │  ─────────────────────>        │                   │
│         │      USDC burned               │                   │
│         │                                │                   │
│  3. Circle Attestation Service           │                   │
│         │  ─────────────────────>        │                   │
│         │      signs message             │                   │
│         │                                │                   │
│  4. receiveMessage()                     │                   │
│         │  ─────────────────────>        │                   │
│         │                         USDC minted               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 1. 手動ブリッジ実装

### コントラクト

```solidity
// src/ArcBridge.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);
}

/// @title ArcBridge
/// @notice ArcとのUSDCブリッジ
contract ArcBridge {
    using SafeERC20 for IERC20;

    ITokenMessenger public immutable tokenMessenger;
    IMessageTransmitter public immutable messageTransmitter;
    IERC20 public immutable usdc;

    // CCTP Domains
    uint32 public constant ETHEREUM = 0;
    uint32 public constant AVALANCHE = 1;
    uint32 public constant OPTIMISM = 2;
    uint32 public constant ARBITRUM = 3;
    uint32 public constant NOBLE = 4;
    uint32 public constant SOLANA = 5;
    uint32 public constant BASE = 6;
    uint32 public constant ARC = 7;

    event BridgeInitiated(
        address indexed sender,
        uint32 indexed destinationDomain,
        bytes32 mintRecipient,
        uint256 amount,
        uint64 nonce
    );

    event BridgeCompleted(
        bytes32 indexed messageHash,
        address indexed recipient,
        uint256 amount
    );

    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdc
    ) {
        tokenMessenger = ITokenMessenger(_tokenMessenger);
        messageTransmitter = IMessageTransmitter(_messageTransmitter);
        usdc = IERC20(_usdc);
    }

    /// @notice USDCを他のチェーンにブリッジ
    /// @param destinationDomain 宛先チェーンのドメインID
    /// @param recipient 受取人アドレス
    /// @param amount USDC金額（6 decimals）
    function bridgeUSDC(
        uint32 destinationDomain,
        address recipient,
        uint256 amount
    ) external returns (uint64 nonce) {
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");

        // USDCを受け取り
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // TokenMessengerにapprove
        usdc.approve(address(tokenMessenger), amount);

        // bytes32形式のrecipient
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        // depositForBurn実行
        nonce = tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc)
        );

        emit BridgeInitiated(
            msg.sender,
            destinationDomain,
            mintRecipient,
            amount,
            nonce
        );
    }

    /// @notice Arcにブリッジ（ショートカット）
    function bridgeToArc(address recipient, uint256 amount) external returns (uint64) {
        return this.bridgeUSDC(ARC, recipient, amount);
    }

    /// @notice Ethereumにブリッジ（ショートカット）
    function bridgeToEthereum(address recipient, uint256 amount) external returns (uint64) {
        return this.bridgeUSDC(ETHEREUM, recipient, amount);
    }

    /// @notice 受信メッセージを処理（宛先チェーンで実行）
    function receiveFromBridge(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool) {
        return messageTransmitter.receiveMessage(message, attestation);
    }
}
```

### デプロイ

```solidity
// script/DeployBridge.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArcBridge.sol";

contract DeployBridge is Script {
    // 各チェーンのCCTPアドレス（公式ドキュメント参照）
    // Arc Testnet用（確認必要）
    address constant TOKEN_MESSENGER = 0x0000000000000000000000000000000000000000;
    address constant MESSAGE_TRANSMITTER = 0x0000000000000000000000000000000000000000;
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (ArcBridge) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ArcBridge bridge = new ArcBridge(
            TOKEN_MESSENGER,
            MESSAGE_TRANSMITTER,
            USDC
        );

        console.log("ArcBridge deployed to:", address(bridge));

        vm.stopBroadcast();

        return bridge;
    }
}
```

## 2. Circle Bridge Kit

Circle Bridge Kitを使用したシンプルな統合:

### インストール

```bash
npm install @circlefin/cctp-sdk
```

### フロントエンド統合

```typescript
// bridge.ts
import { CircleBridge } from '@circlefin/cctp-sdk';

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

interface BridgeConfig {
  sourceChain: 'ethereum' | 'arbitrum' | 'base' | 'arc';
  destinationChain: 'ethereum' | 'arbitrum' | 'base' | 'arc';
  amount: string; // USDC amount
  recipient: string;
}

async function bridgeUSDC(config: BridgeConfig) {
  const bridge = new CircleBridge({
    // 設定
  });

  // Step 1: Burn on source chain
  const burnTx = await bridge.depositForBurn({
    sourceChain: config.sourceChain,
    destinationChain: config.destinationChain,
    amount: config.amount,
    recipient: config.recipient,
  });

  console.log('Burn tx:', burnTx.hash);

  // Step 2: Wait for attestation
  const attestation = await bridge.waitForAttestation(burnTx.hash);
  console.log('Attestation received');

  // Step 3: Mint on destination chain
  const mintTx = await bridge.receiveMessage(attestation);
  console.log('Mint tx:', mintTx.hash);

  return mintTx;
}
```

## 3. 手動ブリッジプロセス

### Step 1: Burn（ソースチェーン）

```typescript
import { ethers } from 'ethers';

const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64)'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

async function burnUSDC(
  provider: ethers.Provider,
  signer: ethers.Signer,
  tokenMessengerAddress: string,
  usdcAddress: string,
  amount: bigint,
  destinationDomain: number,
  recipient: string
) {
  const usdc = new ethers.Contract(usdcAddress, USDC_ABI, signer);
  const tokenMessenger = new ethers.Contract(tokenMessengerAddress, TOKEN_MESSENGER_ABI, signer);

  // Approve
  const approveTx = await usdc.approve(tokenMessengerAddress, amount);
  await approveTx.wait();
  console.log('Approved:', approveTx.hash);

  // Burn
  const mintRecipient = ethers.zeroPadValue(recipient, 32);
  const burnTx = await tokenMessenger.depositForBurn(
    amount,
    destinationDomain,
    mintRecipient,
    usdcAddress
  );
  const receipt = await burnTx.wait();
  console.log('Burn tx:', burnTx.hash);

  return receipt;
}
```

### Step 2: Attestation取得

```typescript
const CIRCLE_ATTESTATION_API = 'https://iris-api.circle.com/attestations';

async function getAttestation(messageHash: string): Promise<string> {
  let attestation = null;

  // ポーリング（通常数分で完了）
  while (!attestation) {
    const response = await fetch(`${CIRCLE_ATTESTATION_API}/${messageHash}`);
    const data = await response.json();

    if (data.status === 'complete') {
      attestation = data.attestation;
    } else {
      console.log('Waiting for attestation...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待機
    }
  }

  return attestation;
}
```

### Step 3: Mint（宛先チェーン）

```typescript
const MESSAGE_TRANSMITTER_ABI = [
  'function receiveMessage(bytes message, bytes attestation) returns (bool)'
];

async function receiveMessage(
  provider: ethers.Provider,
  signer: ethers.Signer,
  messageTransmitterAddress: string,
  message: string,
  attestation: string
) {
  const messageTransmitter = new ethers.Contract(
    messageTransmitterAddress,
    MESSAGE_TRANSMITTER_ABI,
    signer
  );

  const tx = await messageTransmitter.receiveMessage(message, attestation);
  const receipt = await tx.wait();
  console.log('Receive tx:', tx.hash);

  return receipt;
}
```

## 4. CCTP V2 新機能

### Fast Transfer

通常のファイナリティ待ちなしで高速転送:

```typescript
// CCTP V2 Fast Transfer
async function fastBridgeUSDC(config: BridgeConfig) {
  const bridge = new CircleBridge({ version: 'v2' });

  // Fast Transferはファイナリティ前に転送
  // 通常: 分単位 → Fast: 秒単位
  const tx = await bridge.fastTransfer({
    ...config,
    speed: 'fast'
  });

  return tx;
}
```

### Hooks

転送後に自動アクションを実行:

```solidity
// CCTP V2 Hooks
interface ICCTPHooks {
    function afterTransfer(
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external;
}

contract MyHookReceiver is ICCTPHooks {
    function afterTransfer(
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external override {
        // 転送後の自動アクション
        // 例: 自動的にDeFiプロトコルに預入
        // 例: NFTの発行
        // 例: ガバナンストークンの配布
    }
}
```

## 5. 完全な例：Base → Arc

```typescript
// baseToArc.ts
import { ethers } from 'ethers';

// コントラクトアドレス（要確認）
const BASE_CONFIG = {
  rpc: 'https://mainnet.base.org',
  tokenMessenger: '0x...', // Base TokenMessenger
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
};

const ARC_CONFIG = {
  rpc: 'https://arc-testnet.drpc.org',
  messageTransmitter: '0x...', // Arc MessageTransmitter
  usdc: '0x3600000000000000000000000000000000000000',
  domain: 7,
};

async function bridgeBaseToArc(
  privateKey: string,
  recipient: string,
  amount: string // "100" for 100 USDC
) {
  // 1. Base接続
  const baseProvider = new ethers.JsonRpcProvider(BASE_CONFIG.rpc);
  const baseSigner = new ethers.Wallet(privateKey, baseProvider);

  // 2. Burn on Base
  const amountWei = ethers.parseUnits(amount, 6);
  const burnReceipt = await burnUSDC(
    baseProvider,
    baseSigner,
    BASE_CONFIG.tokenMessenger,
    BASE_CONFIG.usdc,
    amountWei,
    ARC_CONFIG.domain,
    recipient
  );

  // 3. メッセージハッシュ抽出
  const messageHash = extractMessageHash(burnReceipt);

  // 4. Attestation待機
  const attestation = await getAttestation(messageHash);

  // 5. Arc接続
  const arcProvider = new ethers.JsonRpcProvider(ARC_CONFIG.rpc);
  const arcSigner = new ethers.Wallet(privateKey, arcProvider);

  // 6. Mint on Arc
  const message = extractMessage(burnReceipt);
  const mintReceipt = await receiveMessage(
    arcProvider,
    arcSigner,
    ARC_CONFIG.messageTransmitter,
    message,
    attestation
  );

  console.log('Bridge complete!');
  console.log('Base tx:', burnReceipt.hash);
  console.log('Arc tx:', mintReceipt.hash);

  return { burnReceipt, mintReceipt };
}

function extractMessageHash(receipt: ethers.TransactionReceipt): string {
  // MessageSentイベントからハッシュを抽出
  // 実装省略
  return '0x...';
}

function extractMessage(receipt: ethers.TransactionReceipt): string {
  // MessageSentイベントからメッセージを抽出
  // 実装省略
  return '0x...';
}
```

## 6. エラーハンドリング

```typescript
class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

async function safeBridge(config: BridgeConfig) {
  try {
    // 残高チェック
    const balance = await getUSDCBalance(config.sourceChain, config.sender);
    if (balance < BigInt(config.amount)) {
      throw new BridgeError('Insufficient balance', 'INSUFFICIENT_BALANCE', {
        required: config.amount,
        available: balance.toString(),
      });
    }

    // ブリッジ実行
    const result = await bridgeUSDC(config);
    return result;
  } catch (error) {
    if (error instanceof BridgeError) {
      throw error;
    }

    // その他のエラーをラップ
    throw new BridgeError(
      'Bridge failed',
      'BRIDGE_FAILED',
      { originalError: error }
    );
  }
}
```

## 7. モニタリング

```typescript
// ブリッジステータスの追跡
interface BridgeStatus {
  burnTxHash: string;
  mintTxHash?: string;
  status: 'pending' | 'attesting' | 'ready' | 'complete' | 'failed';
  amount: string;
  sourceChain: string;
  destinationChain: string;
  timestamp: number;
}

async function trackBridgeStatus(burnTxHash: string): Promise<BridgeStatus> {
  // 1. Burnトランザクション確認
  const burnReceipt = await getTransactionReceipt(burnTxHash);
  if (!burnReceipt) {
    return { status: 'pending', ... };
  }

  // 2. Attestation確認
  const messageHash = extractMessageHash(burnReceipt);
  const attestation = await checkAttestation(messageHash);

  if (!attestation) {
    return { status: 'attesting', ... };
  }

  // 3. Mint確認
  const mintTxHash = await findMintTransaction(messageHash);
  if (mintTxHash) {
    return { status: 'complete', mintTxHash, ... };
  }

  return { status: 'ready', ... };
}
```

## 参考リンク

- CCTP公式: https://developers.circle.com/cctp
- CCTP Contracts: https://developers.circle.com/cctp/docs/contract-addresses
- Bridge Kit: https://www.circle.com/blog/integrating-rainbowkit-with-bridge-kit-for-crosschain-usdc-transfers
- Circle Attestation API: https://developers.circle.com/cctp/reference/getattestation
