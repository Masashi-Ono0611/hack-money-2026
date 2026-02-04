# StableFX Integration Guide

Circle StableFXは、Arc上で24/7稼働する機関投資家向けオンチェーンFXエンジン。

## 概要

StableFXは以下を提供:

- **24/7 FX取引**: 従来の外為市場の営業時間制限なし
- **RFQ実行**: 複数流動性プロバイダーからの競争価格
- **オンチェーン決済**: スマートコントラクトエスクローで決済リスク削減
- **プログラマブル決済**: 即時決済またはネッティング

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      StableFX Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Institution A          StableFX Engine         LP Pool      │
│       │                       │                    │         │
│       │  1. RFQ Request       │                    │         │
│       │──────────────────────>│                    │         │
│       │                       │  2. Quote Request  │         │
│       │                       │───────────────────>│         │
│       │                       │  3. Quotes         │         │
│       │  4. Best Quote        │<───────────────────│         │
│       │<──────────────────────│                    │         │
│       │  5. Accept            │                    │         │
│       │──────────────────────>│                    │         │
│       │                       │  6. Execute & Settle         │
│       │                       │───────────────────>│         │
│       │  7. Confirmation      │                    │         │
│       │<──────────────────────│                    │         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 対応通貨ペア

### Circle発行ステーブルコイン

| ペア | ベース | クォート |
|------|--------|----------|
| USDC/EURC | USDC | EURC |
| EURC/USDC | EURC | USDC |

### パートナーステーブルコイン

| 通貨 | コード | 発行者 | 対USDCペア |
|------|--------|--------|-----------|
| オーストラリアドル | AUDF | Forte Securities | USDC/AUDF |
| ブラジルレアル | BRLA | Avenia | USDC/BRLA |
| 日本円 | JPYC | JPYC Inc. | USDC/JPYC |
| 韓国ウォン | KRW1 | BDACS | USDC/KRW1 |
| メキシコペソ | MXNB | Juno | USDC/MXNB |
| フィリピンペソ | PHPC | Coins.PH | USDC/PHPC |
| カナダドル | QCAD | Stablecorp | USDC/QCAD |
| 南アフリカランド | ZARC | Luno | USDC/ZARC |

## 利用条件

### 機関向け

StableFXは機関投資家向けサービス:

- **KYB（Know Your Business）検証必須**
- **AML（Anti-Money Laundering）コンプライアンス**
- **Circle承認プロセス**

### 現在のステータス

- **Testnet**: 承認済み機関がテスト可能
- **Mainnet**: 2026年のMainnetローンチ時に正式稼働

## 統合方法

### 1. RFQ APIアクセス

```typescript
// StableFX API Client (概念的な例)
interface StableFXClient {
    // RFQリクエスト
    requestQuote(params: {
        baseCurrency: string;
        quoteCurrency: string;
        side: 'BUY' | 'SELL';
        amount: string;
        settlementTime?: string;
    }): Promise<Quote[]>;

    // クォート承諾
    acceptQuote(quoteId: string): Promise<Trade>;

    // 取引ステータス確認
    getTradeStatus(tradeId: string): Promise<TradeStatus>;
}

// 使用例
const quotes = await stableFXClient.requestQuote({
    baseCurrency: 'USDC',
    quoteCurrency: 'EURC',
    side: 'SELL',
    amount: '1000000', // 1M USDC
});

const bestQuote = quotes.sort((a, b) => a.price - b.price)[0];
const trade = await stableFXClient.acceptQuote(bestQuote.id);
```

### 2. オンチェーン統合

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IStableFX {
    struct Quote {
        bytes32 quoteId;
        address baseCurrency;
        address quoteCurrency;
        uint256 baseAmount;
        uint256 quoteAmount;
        uint256 expiry;
        bytes signature;
    }

    function executeSwap(Quote calldata quote) external returns (bool);
}

/// @title StableFXIntegration
/// @notice StableFXを使ったFXスワップの統合例
contract StableFXIntegration {
    using SafeERC20 for IERC20;

    IStableFX public immutable stableFX;
    IERC20 public immutable USDC;
    IERC20 public immutable EURC;

    constructor(address _stableFX, address _usdc, address _eurc) {
        stableFX = IStableFX(_stableFX);
        USDC = IERC20(_usdc);
        EURC = IERC20(_eurc);
    }

    /// @notice USDCをEURCにスワップ
    function swapUSDCtoEURC(
        IStableFX.Quote calldata quote,
        uint256 maxSlippage
    ) external {
        require(quote.baseCurrency == address(USDC), "Invalid base");
        require(quote.quoteCurrency == address(EURC), "Invalid quote");
        require(block.timestamp < quote.expiry, "Quote expired");

        // スリッページチェック
        uint256 minOutput = quote.quoteAmount * (10000 - maxSlippage) / 10000;
        require(quote.quoteAmount >= minOutput, "Slippage exceeded");

        // USDCを転送
        USDC.safeTransferFrom(msg.sender, address(this), quote.baseAmount);
        USDC.approve(address(stableFX), quote.baseAmount);

        // スワップ実行
        bool success = stableFX.executeSwap(quote);
        require(success, "Swap failed");

        // EURCをユーザーに送信
        uint256 eurcReceived = EURC.balanceOf(address(this));
        EURC.safeTransfer(msg.sender, eurcReceived);
    }
}
```

### 3. 決済オプション

#### 即時決済（PvP - Payment vs Payment）

```solidity
// 両者の資金が同時に交換（アトミック）
function executeInstantSettlement(
    IStableFX.Quote calldata quote
) external {
    // 1トランザクションで完了
    // 片方だけ実行されることはない
    stableFX.executeSwap(quote);
}
```

#### 遅延決済（ネッティング）

```solidity
// 複数取引をまとめて決済
struct PendingTrade {
    bytes32 quoteId;
    uint256 amount;
    uint256 settleAfter;
}

mapping(address => PendingTrade[]) public pendingTrades;

function queueForNetting(
    IStableFX.Quote calldata quote,
    uint256 settleAfter
) external {
    // 決済キューに追加
    pendingTrades[msg.sender].push(PendingTrade({
        quoteId: quote.quoteId,
        amount: quote.baseAmount,
        settleAfter: settleAfter
    }));
}

function settleNetted(address user) external {
    // まとめて決済（ガス効率向上）
    // ...
}
```

## 価格フィード

### オンチェーンレート取得

```solidity
interface IStableFXPriceFeed {
    function getRate(
        address base,
        address quote
    ) external view returns (uint256 rate, uint256 timestamp);
}

contract FXRateConsumer {
    IStableFXPriceFeed public priceFeed;

    function getUSDCtoEURCRate() external view returns (uint256) {
        (uint256 rate, uint256 timestamp) = priceFeed.getRate(USDC, EURC);

        // 鮮度チェック
        require(block.timestamp - timestamp < 60, "Stale rate");

        return rate; // 6 decimals (例: 1.08 = 1_080_000)
    }
}
```

## ユースケース

### 1. クロスボーダー決済

```
┌─────────────────────────────────────────────────────────────┐
│  US Company          StableFX           EU Supplier         │
│       │                  │                    │             │
│       │  1. Pay $100K    │                    │             │
│       │─────────────────>│                    │             │
│       │                  │  2. Convert to EUR │             │
│       │                  │  $100K → €92,000   │             │
│       │                  │                    │             │
│       │                  │  3. Send EURC      │             │
│       │                  │───────────────────>│             │
│       │                  │                    │             │
│       │  Settlement: ~1 second (vs T+2 traditional)        │
└─────────────────────────────────────────────────────────────┘
```

### 2. ヘッジ戦略

```solidity
/// @notice FXヘッジポジションの管理
contract FXHedge {
    struct HedgePosition {
        address baseCurrency;
        address quoteCurrency;
        uint256 notional;
        uint256 strikeRate;
        uint256 expiry;
    }

    // ヘッジポジションの作成
    function createHedge(
        address base,
        address quote,
        uint256 notional,
        uint256 targetRate,
        uint256 duration
    ) external returns (bytes32 positionId) {
        // StableFXでレートをロック
        // ...
    }
}
```

### 3. 自動FX変換

```solidity
/// @notice 受取時に自動的に希望通貨に変換
contract AutoFXConverter {
    mapping(address => address) public preferredCurrency;

    function receivePayment(
        address token,
        uint256 amount
    ) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        address preferred = preferredCurrency[msg.sender];
        if (preferred != address(0) && preferred != token) {
            // 自動変換
            _convertViaStableFX(token, preferred, amount);
        }
    }
}
```

## 手数料構造

| 項目 | 説明 |
|------|------|
| スプレッド | LP提供のビッド/アスクスプレッド |
| プロトコルフィー | Arcネットワークフィー（〜0.01%） |
| ガス代 | 標準Arcトランザクションフィー |

*具体的なフィー構造はMainnetローンチ時に確定*

## セキュリティ考慮事項

### 1. クォートの検証

```solidity
function validateQuote(IStableFX.Quote calldata quote) internal view {
    // 有効期限チェック
    require(block.timestamp < quote.expiry, "Quote expired");

    // 署名検証
    require(verifySignature(quote), "Invalid signature");

    // レートの妥当性チェック
    require(isRateReasonable(quote), "Rate out of range");
}
```

### 2. スリッページ保護

```solidity
function swapWithProtection(
    IStableFX.Quote calldata quote,
    uint256 minOutput
) external {
    require(quote.quoteAmount >= minOutput, "Slippage exceeded");
    // ...
}
```

### 3. 決済リスク軽減

- **スマートコントラクトエスクロー**: 両者の資金をロック
- **アトミック決済**: 全部成功または全部失敗
- **タイムアウト**: 一定時間後に自動キャンセル

## 従来FXとの比較

| 項目 | 従来FX | StableFX |
|------|--------|----------|
| 営業時間 | 平日のみ（主要市場） | 24/7/365 |
| 決済時間 | T+2 | 〜1秒 |
| 最小取引額 | $10K+ | 柔軟 |
| カウンターパーティリスク | あり | スマートコントラクトで軽減 |
| 透明性 | 限定的 | オンチェーン |
| プログラマビリティ | なし | 高い |

## 将来のロードマップ

- **追加通貨ペア**: より多くのパートナーステーブルコイン対応
- **デリバティブ**: FXオプション、フォワード
- **自動マーケットメーカー**: オンチェーンAMMとの統合
- **機関向けAPI拡充**: より高度な取引機能

## 参考リンク

- Circle StableFX: https://www.circle.com/stablefx
- Circle Blog: https://www.circle.com/blog/introducing-circle-stablefx-and-circle-partner-stablecoins
- Circle Blog (Build Guide): https://www.circle.com/blog/how-to-build-real-time-stablecoin-fx-in-your-app-with-stablefx
