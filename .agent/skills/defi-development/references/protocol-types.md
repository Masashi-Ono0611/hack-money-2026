# DeFiプロトコル種類ガイド

DeFiエコシステムにおける主要なプロトコル種類の詳細解説。
設計選択、トレードオフ、実装上の考慮事項を網羅。

## 1. DEX（分散型取引所）

### 1.1 AMM（自動マーケットメーカー）型

ユーザーが流動性プールに対して取引を行うモデル。

#### Constant Product AMM (x * y = k)

**代表例**: Uniswap V2, SushiSwap

```solidity
// 基本的なスワップ計算
function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut
) internal pure returns (uint256) {
    uint256 amountInWithFee = amountIn * 997;
    uint256 numerator = amountInWithFee * reserveOut;
    uint256 denominator = reserveIn * 1000 + amountInWithFee;
    return numerator / denominator;
}
```

**特徴**:
- シンプルで理解しやすい
- 全価格帯で流動性を提供
- 大きな取引ではスリッページが大きい

**適用場面**:
- 汎用トークンペア
- 新規トークンの流動性提供
- シンプルな実装が必要な場合

#### Concentrated Liquidity

**代表例**: Uniswap V3, V4

```solidity
// ポジション管理
struct Position {
    uint128 liquidity;
    int24 tickLower;
    int24 tickUpper;
    uint256 feeGrowthInside0LastX128;
    uint256 feeGrowthInside1LastX128;
}

// 特定の価格範囲に流動性を集中
function mint(
    address recipient,
    int24 tickLower,
    int24 tickUpper,
    uint128 amount
) external returns (uint256 amount0, uint256 amount1);
```

**特徴**:
- 資本効率が高い（同じ流動性でより低スリッページ）
- LP側の管理が複雑
- インパーマネントロスが範囲外で100%になる可能性

**適用場面**:
- 安定した価格帯のペア
- プロフェッショナルなLP
- 高頻度取引ペア

#### StableSwap (Curve型)

**代表例**: Curve Finance

```solidity
// StableSwap不変量: A * n^n * sum(x_i) + D = A * D * n^n + D^(n+1) / (n^n * prod(x_i))
// Aパラメータ: 曲線の「平坦さ」を制御

function get_D(uint256[] memory xp, uint256 amp) internal pure returns (uint256) {
    uint256 S = 0;
    for (uint256 i = 0; i < xp.length; i++) {
        S += xp[i];
    }
    if (S == 0) return 0;

    uint256 D = S;
    uint256 Ann = amp * xp.length;

    for (uint256 i = 0; i < 255; i++) {
        uint256 D_P = D;
        for (uint256 j = 0; j < xp.length; j++) {
            D_P = D_P * D / (xp[j] * xp.length);
        }
        uint256 Dprev = D;
        D = (Ann * S + D_P * xp.length) * D / ((Ann - 1) * D + (xp.length + 1) * D_P);

        if (D > Dprev) {
            if (D - Dprev <= 1) break;
        } else {
            if (Dprev - D <= 1) break;
        }
    }
    return D;
}
```

**特徴**:
- ペグ資産間で極めて低いスリッページ
- Aパラメータで曲線特性を調整可能
- ペグが外れると急激にスリッページ増加

**適用場面**:
- ステーブルコイン間スワップ
- wETH/stETH等のペグ資産
- sUSD/USDC等の合成資産

### 1.2 オーダーブック型

**代表例**: dYdX, Serum (Solana)

```solidity
struct Order {
    address maker;
    address taker;      // 0x0 for any taker
    address baseToken;
    address quoteToken;
    uint256 baseAmount;
    uint256 quoteAmount;
    uint256 expiry;
    uint256 salt;
    bytes signature;
}

function fillOrder(Order calldata order, uint256 fillAmount) external;
```

**特徴**:
- 伝統的な取引所と同様の操作感
- 価格発見が効率的
- ガスコストが高い（特にL1）

**適用場面**:
- デリバティブ取引
- プロフェッショナルトレーダー向け
- L2やAppchainでの高頻度取引

## 2. レンディングプロトコル

### 2.1 プール型レンディング

**代表例**: Aave, Compound

```solidity
// 預け入れ
function deposit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
) external;

// 借り入れ
function borrow(
    address asset,
    uint256 amount,
    uint256 interestRateMode,  // 1: stable, 2: variable
    uint16 referralCode,
    address onBehalfOf
) external;

// 返済
function repay(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
) external returns (uint256);
```

**金利モデル**:
```solidity
// 利用率に基づく金利計算
function calculateInterestRate(
    uint256 totalStableDebt,
    uint256 totalVariableDebt,
    uint256 totalLiquidity
) public view returns (uint256) {
    uint256 totalDebt = totalStableDebt + totalVariableDebt;
    uint256 utilizationRate = totalDebt * 1e27 / (totalLiquidity + totalDebt);

    if (utilizationRate <= OPTIMAL_UTILIZATION) {
        return baseRate + (utilizationRate * slope1) / OPTIMAL_UTILIZATION;
    } else {
        uint256 excessUtilization = utilizationRate - OPTIMAL_UTILIZATION;
        uint256 maxExcess = 1e27 - OPTIMAL_UTILIZATION;
        return baseRate + slope1 + (excessUtilization * slope2) / maxExcess;
    }
}
```

**特徴**:
- 即時流動性（プールから借入）
- 変動金利が市場効率を反映
- 清算リスクの管理が必要

### 2.2 P2Pレンディング

**代表例**: Morpho

```solidity
// P2Pマッチング
struct MatchingEngine {
    mapping(address => uint256) p2pSupplyAmount;
    mapping(address => uint256) p2pBorrowAmount;
    mapping(address => uint256) poolSupplyAmount;
    mapping(address => uint256) poolBorrowAmount;
}
```

**特徴**:
- より良い金利（スプレッド削減）
- マッチングの複雑さ
- フォールバックとしてプールを使用

### 2.3 隔離型レンディング

**代表例**: Silo Finance, Euler

```solidity
// 各資産が独自のサイロ（プール）を持つ
struct Silo {
    address asset;
    address bridgeAsset;     // 共通のブリッジ資産（例: ETH）
    uint256 totalDeposits;
    uint256 totalBorrows;
}

// リスクの隔離: 一つのサイロでの問題が他に波及しない
```

**特徴**:
- リスクの隔離
- ロングテール資産のサポート
- 資本効率は低下

## 3. ステーブルコイン

### 3.1 担保型（過剰担保）

**代表例**: MakerDAO (DAI)

```solidity
// CDP (Collateralized Debt Position)
struct Vault {
    uint256 collateral;      // 担保量
    uint256 debt;            // 発行されたステーブルコイン
}

// 担保率チェック
function isHealthy(uint256 vaultId) public view returns (bool) {
    Vault memory vault = vaults[vaultId];
    uint256 collateralValue = vault.collateral * getPrice(collateralAsset);
    uint256 minCollateral = vault.debt * collateralRatio / 100;
    return collateralValue >= minCollateral;
}
```

**特徴**:
- 高い安定性
- 資本効率が低い（過剰担保必要）
- 清算メカニズムの複雑さ

### 3.2 アルゴリズミック

**代表例**: Frax (部分担保), Ampleforth (リベース)

```solidity
// リベース型
function rebase() external {
    uint256 currentPrice = oracle.getPrice();
    uint256 targetPrice = 1e18;  // $1

    if (currentPrice > targetPrice * 105 / 100) {
        // 価格が高すぎる: supply増加
        uint256 rebaseRatio = currentPrice * 1e18 / targetPrice;
        _expandSupply(rebaseRatio);
    } else if (currentPrice < targetPrice * 95 / 100) {
        // 価格が低すぎる: supply減少
        uint256 rebaseRatio = currentPrice * 1e18 / targetPrice;
        _contractSupply(rebaseRatio);
    }
}
```

**特徴**:
- 資本効率が高い
- ペグ維持が困難な場合あり
- 複雑なゲーム理論的考慮

### 3.3 リアルワールドアセット担保

**代表例**: USDC, USDT（中央集権型）, RAI（ETH担保、非ペグ）

**特徴**:
- 高い安定性（中央集権型の場合）
- カウンターパーティリスク
- 規制の影響を受けやすい

## 4. デリバティブ

### 4.1 永久契約（Perpetual）

**代表例**: GMX, dYdX

```solidity
// ファンディングレート計算
function calculateFundingRate() public view returns (int256) {
    int256 premium = (markPrice - indexPrice) * 1e18 / indexPrice;
    return premium / fundingInterval;  // 通常8時間
}

// ポジション
struct Position {
    uint256 size;           // ポジションサイズ
    uint256 collateral;     // 担保
    uint256 averagePrice;   // 平均取得価格
    int256 entryFundingRate;
    bool isLong;
}
```

**特徴**:
- 期限なしのレバレッジ取引
- ファンディングレートで価格を維持
- 清算リスクの管理が重要

### 4.2 オプション

**代表例**: Opyn, Lyra

```solidity
struct Option {
    address underlying;
    uint256 strikePrice;
    uint256 expiry;
    bool isPut;
}

// Black-Scholesに基づくプレミアム計算（簡略化）
function calculatePremium(
    Option memory option,
    uint256 spotPrice,
    uint256 volatility
) public view returns (uint256);
```

**特徴**:
- 複雑な金融商品
- 高度な価格モデルが必要
- 流動性の確保が課題

## 5. イールドアグリゲーター

**代表例**: Yearn Finance

```solidity
// Vaultアーキテクチャ
contract Vault is ERC4626 {
    Strategy[] public strategies;
    uint256 public totalDebt;  // ストラテジーに配分された資金

    function deposit(uint256 assets, address receiver)
        public override returns (uint256 shares)
    {
        shares = previewDeposit(assets);
        _deposit(msg.sender, receiver, assets, shares);
        _allocateToStrategies();
    }

    function _allocateToStrategies() internal {
        for (uint256 i = 0; i < strategies.length; i++) {
            uint256 allocation = calculateAllocation(strategies[i]);
            strategies[i].deposit(allocation);
        }
    }
}
```

**特徴**:
- 自動的な利回り最適化
- ストラテジーリスクの集約
- ガス効率の良い運用

## 6. リキッドステーキング

**代表例**: Lido (stETH), Rocket Pool (rETH)

```solidity
// stETH: リベーストークン
contract StETH is ERC20 {
    uint256 public totalPooledEther;
    uint256 public totalShares;

    function balanceOf(address account) public view override returns (uint256) {
        return shares[account] * totalPooledEther / totalShares;
    }

    function submit(address referral) external payable returns (uint256) {
        uint256 sharesToMint = msg.value * totalShares / totalPooledEther;
        _mintShares(msg.sender, sharesToMint);
        // ステーキングプールに追加
        return sharesToMint;
    }
}
```

**特徴**:
- ステーキング報酬を維持しながら流動性確保
- DeFiでの担保として使用可能
- バリデーター分散化の課題

## 7. ブリッジ

### 7.1 ロック＆ミント

```solidity
// ソースチェーン
function lockTokens(address token, uint256 amount, uint256 destChainId) external {
    IERC20(token).transferFrom(msg.sender, address(this), amount);
    emit TokensLocked(token, msg.sender, amount, destChainId);
}

// 宛先チェーン（オフチェーンでの検証後）
function mintTokens(address token, address to, uint256 amount, bytes memory proof) external {
    require(verifyProof(proof), "Invalid proof");
    wrappedToken[token].mint(to, amount);
}
```

### 7.2 流動性ネットワーク

**代表例**: Stargate, Hop Protocol

```solidity
// 各チェーンに流動性プールを維持
function swap(
    uint16 dstChainId,
    uint256 srcPoolId,
    uint256 dstPoolId,
    address to,
    uint256 amountLD
) external payable;
```

**特徴**:
- 高速なファイナリティ
- 流動性の断片化
- スリッページの発生

## プロトコル選定マトリクス

| 要件 | 推奨プロトコルタイプ |
|-----|---------------------|
| トークン交換 | AMM (Uniswap V3型) |
| ステーブルコイン交換 | StableSwap (Curve型) |
| レバレッジ取引 | 永久契約プロトコル |
| パッシブ収益 | レンディング or リキッドステーキング |
| リスク分離した貸出 | 隔離型レンディング |
| クロスチェーン | ブリッジ（用途に応じて選択） |
| 新トークンの流動性提供 | Constant Product AMM |
