---
name: arc-blockchain
description: >
  Circle社が開発したL1ブロックチェーン「Arc」を使った開発を包括的に支援するスキル。
  ステーブルコイン（USDC/EURC）ネイティブなガストークン、決定論的サブ秒ファイナリティ、
  EVM互換性、CCTP（クロスチェーン転送プロトコル）、StableFX（FXエンジン）、
  オプトインプライバシー、アカウントアブストラクションまで、Arc上でのdApp開発に必要な
  知識を体系的に提供。
  使用場面：(1) Arc Testnet/Mainnetへのスマートコントラクトデプロイ、(2) USDC/EURCを使った
  決済・送金機能実装、(3) CCTPを使ったクロスチェーンブリッジ開発、(4) StableFXを使った
  FX取引実装、(5) Paymasterを使ったガス代スポンサー機能、(6) コンプライアンス対応プライバシー実装。
---

# Arc Blockchain Development Support

Circle社が開発したステーブルコインファイナンス特化のL1ブロックチェーン「Arc」での開発を支援。
USDC/EURCネイティブなエコシステムで、決済・送金・FX・DeFi開発を効率的に行うためのガイドライン。

## クイックスタート

### Arcとは

Arcは、Circle社（NYSE: CRCL）が開発したステーブルコインファイナンス特化のオープンL1ブロックチェーン。

**コアバリュー: "1 cent, 1 second, 1 click"**
- **1 cent**: USDCベースの安定したガス代（約$0.01/トランザクション）
- **1 second**: 決定論的サブ秒ファイナリティ（〜350ms）
- **1 click**: シンプルで直感的なUX

### 主要な特徴

| 特徴 | 説明 |
|------|------|
| **USDCネイティブガス** | ETHではなくUSDCでガス代を支払い、予測可能なドル建てコスト |
| **決定論的ファイナリティ** | Malachite BFTコンセンサスで〜350ms、リオーグなし |
| **EVM互換** | Prague EVM互換、Solidity/Foundry/Hardhatがそのまま使用可能 |
| **高スループット** | 20バリデーターで3,000 TPS、4バリデーターで10,000 TPS |
| **Circle統合** | USDC, EURC, CCTP, Paymaster, StableFX, Circle Walletsネイティブ対応 |
| **オプトインプライバシー** | コンプライアンス対応の選択的プライバシー（View Keys） |

### ネットワーク情報

**Arc Testnet**（2025年10月〜公開）:

| 項目 | 値 |
|------|-----|
| Chain ID | `1244` または `5042002` |
| ネイティブトークン | USDC |
| RPC Endpoints | dRPC, Quicknode, Blockdaemon, Alchemy |
| Faucet | https://faucet.circle.com/ |
| Explorer | Arc Block Explorer |
| CCTP Domain | 7 |

詳細は [network-config.md](references/network-config.md) を参照。

### 開発ワークフロー

```
1. 環境セットアップ
   ├── Foundry/Hardhat設定 → [setup-guide.md](tutorials/setup-guide.md)
   ├── ウォレット接続（MetaMask等）
   └── テストネットUSDC取得（Faucet）

2. スマートコントラクト開発
   ├── EVM互換コントラクト作成 → [deploy-contracts.md](tutorials/deploy-contracts.md)
   ├── USDC統合 → [usdc-integration.md](references/usdc-integration.md)
   └── ガス設計（Stable Fee考慮）

3. クロスチェーン統合
   ├── CCTP実装 → [bridge-usdc.md](tutorials/bridge-usdc.md)
   └── マルチチェーン対応

4. 高度な機能
   ├── Paymaster（ガス代スポンサー） → [account-abstraction.md](references/account-abstraction.md)
   ├── StableFX（FXエンジン） → [stablefx-guide.md](references/stablefx-guide.md)
   └── オプトインプライバシー → [privacy-guide.md](references/privacy-guide.md)

5. デプロイ＆運用
   ├── Testnetデプロイ
   ├── 監視・イベントトラッキング
   └── Mainnet準備（2026年予定）
```

## コア概念

### 1. USDCネイティブガス

ArcではUSDCがネイティブガストークン。ETHの価格変動リスクを排除し、予測可能なコスト計算が可能。

```solidity
// Arcでのガス代はUSDC建て
// 重要: ネイティブUSDCは18 decimals、ERC-20インターフェースは6 decimals

// 残高確認（ERC-20インターフェース推奨）
IERC20 usdc = IERC20(0x3600000000000000000000000000000000000000);
uint256 balance = usdc.balanceOf(address(this)); // 6 decimals

// ガス代見積もり
// 基本: 約$0.01/トランザクション
// EIP-1559 + EWMA（指数加重移動平均）で安定化
```

**Stable Fee Design**:
- EIP-1559ベースだが、ブロックごとではなくEWMAで平滑化
- ベースフィー上限設定で極端なスパイクを防止
- フィーはArc Treasuryに蓄積

詳細は [gas-and-fees.md](references/gas-and-fees.md) を参照。

### 2. 決定論的ファイナリティ（Malachite）

```
┌─────────────────────────────────────────────────────────────┐
│                    Malachite Consensus                       │
├─────────────────────────────────────────────────────────────┤
│  • Byzantine Fault Tolerant (BFT)                           │
│  • Tendermintベース、Informal Systems開発                   │
│  • Rust実装、高性能                                         │
├─────────────────────────────────────────────────────────────┤
│  パフォーマンス:                                             │
│  • 20バリデーター、地理分散: 3,000 TPS、350ms finality      │
│  • 100バリデーター: ~780ms finality                         │
│  • 理論最大: ~50,000 TPS (4バリデーター)                    │
├─────────────────────────────────────────────────────────────┤
│  特徴:                                                       │
│  • 「100% final and irreversible」- リオーグなし            │
│  • コンセンサスと実行の分離                                 │
│  • コンパクト参照でブロック伝播最適化                       │
└─────────────────────────────────────────────────────────────┘
```

**金融アプリケーションでの意義**:
- 決済確定の即時性保証
- 二重支払い・リオーグリスクゼロ
- 従来のT+2決済からリアルタイム決済へ

### 3. EVM互換性

ArcはPrague EVMハードフォーク互換。既存のEthereumツールチェーンがそのまま使用可能。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArcPayment {
    // Arc Testnet USDC address
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    event PaymentReceived(address indexed from, uint256 amount);

    // USDCでの支払い受け取り
    function receivePayment(uint256 amount) external {
        IERC20(USDC).transferFrom(msg.sender, address(this), amount);
        emit PaymentReceived(msg.sender, amount);
    }

    // Arc特有の考慮事項:
    // 1. ガスはUSDC建て（ETH不要）
    // 2. 決定論的ファイナリティ（確認待ち不要）
    // 3. ERC-20 USDC は 6 decimals
}
```

**主な違い**:
| 項目 | Ethereum | Arc |
|------|----------|-----|
| ガストークン | ETH | USDC |
| ファイナリティ | 確率的（〜12分） | 決定論的（〜350ms） |
| フィーモデル | EIP-1559 | EIP-1559 + EWMA |
| USDCデシマル | 6 (ERC-20) | 18 (native) / 6 (ERC-20) |

詳細は [evm-compatibility.md](references/evm-compatibility.md) を参照。

### 4. CCTP（クロスチェーン転送プロトコル）

CCTPはCircleが提供するUSDCのネイティブクロスチェーン転送プロトコル。burn & mintモデルで1:1転送を実現。

```solidity
// CCTP V2 概要
interface ITokenMessenger {
    // Standard Transfer: 通常のクロスチェーン転送
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);

    // Fast Transfer: ファイナリティ前の高速転送（V2）
    // Hooks: 転送後の自動アクション実行（V2）
}

// Arc Testnet CCTP Domain: 7
// 他チェーンへのUSDC転送例
function bridgeToEthereum(uint256 amount, address recipient) external {
    IERC20(USDC).approve(address(tokenMessenger), amount);

    tokenMessenger.depositForBurn(
        amount,
        0, // Ethereum domain
        bytes32(uint256(uint160(recipient))),
        USDC
    );
}
```

**CCTP V2の新機能**:
- **Fast Transfer**: 分単位→秒単位への高速化
- **Hooks**: 転送後の自動アクション（DeFi連携等）

詳細は [bridge-usdc.md](tutorials/bridge-usdc.md) を参照。

### 5. StableFX（FXエンジン）

StableFXは機関投資家向けの24/7オンチェーンFXエンジン。

```
┌─────────────────────────────────────────────────────────────┐
│                      StableFX                                │
├─────────────────────────────────────────────────────────────┤
│  機能:                                                       │
│  • RFQ（Request-for-Quote）実行                             │
│  • 複数流動性プロバイダーからの競争価格                     │
│  • スマートコントラクトエスクロー（決済リスク削減）         │
│  • プログラマブル決済ウィンドウ（即時 or ネッティング）     │
│  • All-to-Allモデル（バイラテラル契約不要）                 │
├─────────────────────────────────────────────────────────────┤
│  対応通貨ペア:                                               │
│  • USDC ↔ EURC                                              │
│  • USDC ↔ パートナーステーブルコイン:                       │
│    - AUDF (AUD), BRLA (BRL), JPYC (JPY), KRW1 (KRW)        │
│    - MXNB (MXN), PHPC (PHP), QCAD (CAD), ZARC (ZAR)        │
└─────────────────────────────────────────────────────────────┘
```

詳細は [stablefx-guide.md](references/stablefx-guide.md) を参照。

### 6. アカウントアブストラクション & Paymaster

ERC-4337ベースのアカウントアブストラクションで、UX向上とガス代スポンサーを実現。

```solidity
// Circle Paymasterの使用例
// ユーザーはUSDC以外のトークンでガス代支払い、またはスポンサー可能

interface IPaymaster {
    // EURC等でガス代を支払う
    function payGasWithToken(
        address token,
        uint256 maxGas
    ) external;

    // dAppがユーザーのガス代をスポンサー
    function sponsorGas(
        address user,
        bytes calldata userOperation
    ) external;
}

// Bundler統合: Pimlico, Alchemy
// スマートアカウント: セッション管理、バッチトランザクション
```

**Paymasterの用途**:
1. **EURC支払い**: ユーロ圏ユーザー向け
2. **ガス代スポンサー**: オンボーディング促進
3. **バッチ処理**: 複数操作を1トランザクションに

詳細は [account-abstraction.md](references/account-abstraction.md) を参照。

### 7. オプトインプライバシー

コンプライアンス対応の選択的プライバシー機能。

```
┌─────────────────────────────────────────────────────────────┐
│                   Opt-in Privacy                             │
├─────────────────────────────────────────────────────────────┤
│  Confidential Transfers:                                     │
│  • トランザクション金額を秘匿                               │
│  • アドレスは可視のまま                                     │
│  • View Keysで選択的開示（監査人・規制当局向け）           │
├─────────────────────────────────────────────────────────────┤
│  技術実装:                                                   │
│  • 現在: Trusted Execution Environments (TEEs)              │
│  • 将来: MPC, FHE, ZK proofs                                │
├─────────────────────────────────────────────────────────────┤
│  コンプライアンス:                                           │
│  • Travel Rule対応                                          │
│  • 規制当局への選択的開示                                   │
│  • KYB/AML検証必須（機関向け）                              │
└─────────────────────────────────────────────────────────────┘
```

**将来のプライバシーロードマップ**:
- Private State
- Confidential Computation
- Private Order Book
- Automated Treasury

詳細は [privacy-guide.md](references/privacy-guide.md) を参照。

## 開発環境セットアップ

### Foundry（推奨）

```bash
# Foundryインストール
curl -L https://foundry.paradigm.xyz | bash
foundryup

# プロジェクト作成
forge init my-arc-project
cd my-arc-project

# 依存関係追加
forge install OpenZeppelin/openzeppelin-contracts
forge install circlefin/cctp-contracts  # CCTP統合用

# foundry.toml設定
cat >> foundry.toml << 'EOF'

[rpc_endpoints]
arc_testnet = "https://arc-testnet.drpc.org"

[etherscan]
arc_testnet = { key = "${ETHERSCAN_API_KEY}", url = "https://explorer.arc.network/api" }
EOF
```

### Hardhat

```bash
# プロジェクト作成
mkdir my-arc-project && cd my-arc-project
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Hardhat初期化
npx hardhat init

# hardhat.config.js に追加
```

```javascript
// hardhat.config.js
module.exports = {
  solidity: "0.8.20",
  networks: {
    arcTestnet: {
      url: "https://arc-testnet.drpc.org",
      chainId: 1244,
      accounts: [process.env.PRIVATE_KEY],
      // 注意: ガスはUSDC建て
    }
  }
};
```

### ウォレット設定（MetaMask）

```
Network Name: Arc Testnet
RPC URL: https://arc-testnet.drpc.org
Chain ID: 1244
Currency Symbol: USDC
Block Explorer: https://explorer.arc.network
```

### テストネットUSDC取得

```bash
# Circle Faucet: https://faucet.circle.com/
# Arc Testnetを選択、USDC/EURCを取得
# 制限: 20 USDC / 2時間 / アドレス
```

## コントラクトアドレス

### Arc Testnet

| コントラクト | アドレス |
|-------------|---------|
| USDC (Native) | `0x3600000000000000000000000000000000000000` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| CCTP TokenMessenger | 公式ドキュメント参照 |
| CCTP MessageTransmitter | 公式ドキュメント参照 |

詳細は [contract-addresses.md](references/contract-addresses.md) を参照。

## 開発パターン

### USDCを使った支払いコントラクト

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ArcPaymentProcessor is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Arc Testnet USDC
    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    event PaymentProcessed(
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        bytes32 indexed orderId
    );

    /// @notice USDCでの支払いを処理
    /// @dev Arcの決定論的ファイナリティにより、確認待ち不要
    function processPayment(
        address recipient,
        uint256 amount,
        bytes32 orderId
    ) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");

        // USDC転送（6 decimals）
        USDC.safeTransferFrom(msg.sender, recipient, amount);

        // Arc: ファイナリティ保証により即座に確定
        emit PaymentProcessed(msg.sender, recipient, amount, orderId);
    }

    /// @notice バッチ支払い（給与支払い等）
    function batchPayment(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        // 一括で引き出し
        USDC.safeTransferFrom(msg.sender, address(this), total);

        // 個別に配布
        for (uint256 i = 0; i < recipients.length; i++) {
            USDC.safeTransfer(recipients[i], amounts[i]);
        }
    }
}
```

### クロスチェーンブリッジ統合

```solidity
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

contract ArcBridge {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);
    ITokenMessenger public immutable tokenMessenger;

    // CCTP Domains
    uint32 public constant ETHEREUM = 0;
    uint32 public constant ARBITRUM = 3;
    uint32 public constant BASE = 6;
    uint32 public constant ARC = 7;

    event BridgeInitiated(
        address indexed sender,
        uint32 indexed destinationDomain,
        address recipient,
        uint256 amount,
        uint64 nonce
    );

    constructor(address _tokenMessenger) {
        tokenMessenger = ITokenMessenger(_tokenMessenger);
    }

    /// @notice USDCを他のチェーンにブリッジ
    function bridgeUSDC(
        uint32 destinationDomain,
        address recipient,
        uint256 amount
    ) external returns (uint64 nonce) {
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        USDC.approve(address(tokenMessenger), amount);

        nonce = tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            bytes32(uint256(uint160(recipient))),
            address(USDC)
        );

        emit BridgeInitiated(
            msg.sender,
            destinationDomain,
            recipient,
            amount,
            nonce
        );
    }
}
```

## テスト

### Foundryテスト例

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ArcPaymentProcessor.sol";

contract ArcPaymentProcessorTest is Test {
    ArcPaymentProcessor public processor;
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    address public payer = makeAddr("payer");
    address public recipient = makeAddr("recipient");

    function setUp() public {
        // Arc Testnet fork
        vm.createSelectFork("arc_testnet");
        processor = new ArcPaymentProcessor();
    }

    function test_ProcessPayment() public {
        uint256 amount = 100 * 10**6; // 100 USDC

        // Faucetでテスト用USDCを取得した想定
        deal(USDC, payer, amount);

        vm.startPrank(payer);
        IERC20(USDC).approve(address(processor), amount);
        processor.processPayment(recipient, amount, keccak256("order1"));
        vm.stopPrank();

        assertEq(IERC20(USDC).balanceOf(recipient), amount);
    }

    function testFuzz_ProcessPayment(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000 * 10**6); // 1 ~ 1M USDC

        deal(USDC, payer, amount);

        vm.startPrank(payer);
        IERC20(USDC).approve(address(processor), amount);
        processor.processPayment(recipient, amount, keccak256("order"));
        vm.stopPrank();

        assertEq(IERC20(USDC).balanceOf(recipient), amount);
    }
}
```

### テスト実行

```bash
# 全テスト実行
forge test -vvv

# Arc Testnetフォークでテスト
forge test --fork-url https://arc-testnet.drpc.org -vvv

# ガスレポート
forge test --gas-report

# カバレッジ
forge coverage
```

## デプロイ

### Foundryでのデプロイ

```bash
# 環境変数設定
export PRIVATE_KEY=your_private_key
export RPC_URL=https://arc-testnet.drpc.org

# デプロイ
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# 検証（Explorer対応時）
forge verify-contract \
  --chain-id 1244 \
  --compiler-version v0.8.20 \
  CONTRACT_ADDRESS \
  src/ArcPaymentProcessor.sol:ArcPaymentProcessor
```

### デプロイスクリプト

```solidity
// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArcPaymentProcessor.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ArcPaymentProcessor processor = new ArcPaymentProcessor();
        console.log("Deployed to:", address(processor));

        vm.stopBroadcast();
    }
}
```

## セキュリティ考慮事項

### Arc特有の考慮点

1. **USDCデシマル混同**: ネイティブ(18) vs ERC-20(6)の違いに注意
2. **ファイナリティ前提**: 確認待ちロジックは不要だが、トランザクション失敗ハンドリングは必要
3. **Paymaster統合**: スポンサー攻撃への対策
4. **プライバシー機能**: View Keys管理の適切な設計

### 標準的なセキュリティパターン

```solidity
// 1. リエントランシー防止
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// 2. アクセス制御
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// 3. 一時停止機能
import "@openzeppelin/contracts/utils/Pausable.sol";

// 4. SafeERC20使用
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
```

## パートナーエコシステム

### ローンチパートナー（100社以上）

**金融機関**: BlackRock, Visa, Goldman Sachs, Mastercard, Standard Chartered, Deutsche Bank, BNY, State Street, ICE

**ウォレット**: MetaMask, Ledger, Fireblocks, Rainbow, Exodus, Privy, Turnkey

**開発ツール**: Alchemy, Chainlink, Thirdweb, LayerZero, Pimlico, ZeroDev, Crossmint, Dynamic, Fun.xyz

**AI**: Anthropic

**クラウド**: AWS, Cloudflare

**取引所**: Coinbase, Kraken, Robinhood

### パートナーステーブルコイン

| 通貨 | 発行者 | コード |
|------|--------|--------|
| オーストラリアドル | Forte Securities | AUDF |
| ブラジルレアル | Avenia | BRLA |
| 日本円 | JPYC | JPYC |
| 韓国ウォン | BDACS | KRW1 |
| メキシコペソ | Juno | MXNB |
| フィリピンペソ | Coins.PH | PHPC |
| カナダドル | Stablecorp | QCAD |
| 南アフリカランド | Luno | ZARC |

## タイムライン

| 時期 | マイルストーン |
|------|----------------|
| 2025年8月 | Arc発表、プライベートテストネット |
| 2025年10月 | パブリックテストネット開始 |
| 2025年11月 | StableFX、パートナーステーブルコイン発表 |
| 2026年 | メインネットベータ → 正式ローンチ予定 |

## リファレンス一覧

### ドキュメント
- **[network-config.md](references/network-config.md)**: ネットワーク設定詳細
- **[contract-addresses.md](references/contract-addresses.md)**: コントラクトアドレス一覧
- **[gas-and-fees.md](references/gas-and-fees.md)**: ガス・手数料設計
- **[evm-compatibility.md](references/evm-compatibility.md)**: EVM互換性詳細
- **[usdc-integration.md](references/usdc-integration.md)**: USDC統合ガイド
- **[account-abstraction.md](references/account-abstraction.md)**: AA & Paymaster
- **[stablefx-guide.md](references/stablefx-guide.md)**: StableFX統合ガイド
- **[privacy-guide.md](references/privacy-guide.md)**: プライバシー機能ガイド

### チュートリアル
- **[setup-guide.md](tutorials/setup-guide.md)**: 開発環境セットアップ
- **[deploy-contracts.md](tutorials/deploy-contracts.md)**: コントラクトデプロイ
- **[bridge-usdc.md](tutorials/bridge-usdc.md)**: CCTP統合

### アセット
- **[arc-payment-base.sol](assets/arc-payment-base.sol)**: 支払いコントラクトテンプレート
- **[arc-bridge-base.sol](assets/arc-bridge-base.sol)**: ブリッジコントラクトテンプレート

### 外部リソース
- **Arc公式**: https://arc.network
- **Arc Docs**: https://docs.arc.network
- **Circle Developer**: https://developers.circle.com
- **CCTP**: https://developers.circle.com/cctp
- **Faucet**: https://faucet.circle.com

## 関連スキルとの連携

- **defi-development**: DeFiプロトコル開発時に併用（AMM、レンディング等）
- **uniswap-dev**: DEX機能をArc上に実装する場合

## よくある落とし穴

1. **USDCデシマル誤り**: ERC-20 は 6 decimals、ネイティブは 18 decimals
2. **ETHでのガス代計算**: Arc では不要、USDC で計算
3. **確認数待ち**: 決定論的ファイナリティのため不要
4. **Mainnet未対応**: 2026年まではTestnetのみ
5. **プライバシー機能の過信**: 現在はTEEベース、完全なZKではない
6. **Paymaster濫用**: スポンサーポリシーの適切な設計が必要
