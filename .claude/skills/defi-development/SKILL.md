---
name: defi-development
description: >
  DeFi（分散型金融）プロダクトの包括的な開発支援スキル。DEX、レンディング、ステーブルコイン、
  デリバティブ、イールドアグリゲーター、リキッドステーキング等の全DeFiカテゴリをカバー。
  金融工学、スマートコントラクトセキュリティ、トークノミクス設計、オラクル統合、
  監査対応まで、プロダクション品質のDeFi開発に必要な知識を体系的に提供。
  使用場面：(1) DeFiプロトコル設計・実装、(2) AMM/流動性プール開発、(3) レンディング/借入機能実装、
  (4) オラクル統合、(5) トークノミクス設計、(6) セキュリティ監査対応、(7) マルチチェーン展開。
---

# DeFi Development Support

DeFi（分散型金融）プロダクト開発のための包括的なナレッジベースとガイドライン。
金融工学からスマートコントラクト実装、セキュリティまで体系的にカバー。

## クイックスタート

### プロトコル選定

開発するDeFiの種類を決定。詳細は [protocol-types.md](references/protocol-types.md) を参照。

**主要カテゴリ**:
| カテゴリ | ユースケース | 代表例 | 複雑度 |
|---------|-------------|--------|--------|
| DEX (AMM) | トークン交換 | Uniswap, Curve | ★★★☆☆ |
| レンディング | 貸借 | Aave, Compound | ★★★★☆ |
| ステーブルコイン | 価格安定資産 | MakerDAO, Frax | ★★★★★ |
| デリバティブ | オプション/先物 | dYdX, GMX | ★★★★★ |
| イールドアグリゲーター | 利回り最適化 | Yearn | ★★★☆☆ |
| リキッドステーキング | ステーキング派生 | Lido | ★★★☆☆ |
| ブリッジ | クロスチェーン | LayerZero | ★★★★★ |

### 開発ワークフロー

```
1. プロトコル設計
   ├── ユースケース定義
   ├── 経済モデル設計 → [tokenomics.md](references/tokenomics.md)
   └── リスク分析

2. スマートコントラクト開発
   ├── アーキテクチャ設計 → [smart-contract-patterns.md](references/smart-contract-patterns.md)
   ├── セキュリティ実装 → [security.md](references/security.md)
   └── オラクル統合 → [oracle-guide.md](references/oracle-guide.md)

3. テスト＆監査
   ├── ユニットテスト
   ├── インテグレーションテスト
   ├── ファズテスト
   └── 外部監査 → [audit-checklist.md](references/audit-checklist.md)

4. デプロイ＆運用
   ├── マルチシグ設定
   ├── アップグレード戦略
   └── モニタリング
```

## コア概念

### 1. AMM（自動マーケットメーカー）の基礎

```solidity
// Constant Product AMM (x * y = k)
// Uniswap V2スタイル
function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut
) public pure returns (uint256 amountOut) {
    uint256 amountInWithFee = amountIn * 997; // 0.3% fee
    uint256 numerator = amountInWithFee * reserveOut;
    uint256 denominator = (reserveIn * 1000) + amountInWithFee;
    amountOut = numerator / denominator;
}
```

**AMM曲線の種類**:
- **Constant Product (x*y=k)**: 汎用、Uniswap
- **Constant Sum (x+y=k)**: ペグ資産向け、高スリッページリスク
- **StableSwap (Curve)**: ペグ資産最適化、低スリッページ
- **Concentrated Liquidity**: 資本効率向上、Uniswap V3

詳細は [financial-engineering.md](references/financial-engineering.md) を参照。

### 2. レンディングプロトコルの基礎

```solidity
// 担保率計算
function getHealthFactor(
    address user
) public view returns (uint256) {
    (uint256 totalCollateralETH, uint256 totalDebtETH) = getUserAccountData(user);

    // Health Factor = (担保価値 * 清算閾値) / 借入額
    // Health Factor < 1 で清算対象
    return (totalCollateralETH * liquidationThreshold) / totalDebtETH;
}

// 金利モデル（利用率ベース）
function calculateInterestRate(
    uint256 utilizationRate
) public pure returns (uint256) {
    if (utilizationRate <= OPTIMAL_UTILIZATION) {
        // 基本金利 + (利用率 / 最適利用率) * 傾き1
        return baseRate + (utilizationRate * slope1) / OPTIMAL_UTILIZATION;
    } else {
        // 最適利用率超過時は急上昇
        return baseRate + slope1 +
            ((utilizationRate - OPTIMAL_UTILIZATION) * slope2) /
            (MAX_UTILIZATION - OPTIMAL_UTILIZATION);
    }
}
```

### 3. オラクル統合

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// Chainlinkオラクル使用例
function getLatestPrice(
    address priceFeed
) public view returns (uint256) {
    AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);
    (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) = feed.latestRoundData();

    // 必須: データの鮮度チェック
    require(updatedAt > block.timestamp - MAX_DELAY, "Stale price");
    require(price > 0, "Invalid price");
    require(answeredInRound >= roundId, "Stale round");

    return uint256(price);
}

// TWAP（時間加重平均価格）オラクル
function getTWAP(
    address pool,
    uint32 twapInterval
) public view returns (uint256) {
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = twapInterval;
    secondsAgos[1] = 0;

    (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(secondsAgos);

    int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
    int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapInterval)));

    return OracleLibrary.getQuoteAtTick(arithmeticMeanTick, baseAmount, baseToken, quoteToken);
}
```

詳細は [oracle-guide.md](references/oracle-guide.md) を参照。

## セキュリティ必須事項

### 絶対に実装すべきセキュリティパターン

```solidity
// 1. リエントランシー防止
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecureProtocol is ReentrancyGuard {
    mapping(address => uint256) public balances;

    // CEI (Checks-Effects-Interactions) パターン
    function withdraw(uint256 amount) external nonReentrant {
        // Checks
        require(balances[msg.sender] >= amount, "Insufficient");

        // Effects（状態変更を先に）
        balances[msg.sender] -= amount;

        // Interactions（外部呼び出しを最後に）
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

// 2. スリッページ保護
function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 amountOutMin,  // 必須: 最小受取量
    uint256 deadline       // 必須: 有効期限
) external {
    require(block.timestamp <= deadline, "Expired");

    uint256 amountOut = _executeSwap(tokenIn, tokenOut, amountIn);
    require(amountOut >= amountOutMin, "Slippage exceeded");
}

// 3. フラッシュローン攻撃対策
modifier noFlashLoan() {
    require(block.number > lastInteractionBlock[msg.sender], "Same block");
    lastInteractionBlock[msg.sender] = block.number;
    _;
}

// 4. アクセス制御
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ProtocolWithRoles is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
}
```

### 主要な攻撃ベクトル

| 攻撃タイプ | 説明 | 対策 |
|-----------|------|------|
| リエントランシー | 再入攻撃 | ReentrancyGuard, CEIパターン |
| フラッシュローン操作 | 価格/ガバナンス操作 | TWAP, ブロック跨ぎチェック |
| オラクル操作 | スポット価格操作 | TWAP, 複数オラクル |
| サンドイッチ攻撃 | フロントラン/バックラン | スリッページ保護, デッドライン |
| ガバナンス攻撃 | 投票力借入 | タイムロック, スナップショット |
| インフレ攻撃 | シェア希釈 | 最小デポジット, デッドシェア |
| ドネーション攻撃 | 直接送金による操作 | 内部会計の使用 |

詳細は [security.md](references/security.md) を参照。

## 金融工学エッセンス

### インパーマネントロス計算

```python
def impermanent_loss(price_ratio: float) -> float:
    """
    価格変動に対するインパーマネントロスを計算

    Args:
        price_ratio: 現在価格 / 初期価格

    Returns:
        IL率（負の値、例: -0.05 = 5%損失）
    """
    return 2 * math.sqrt(price_ratio) / (1 + price_ratio) - 1

# 例: 価格が2倍になった場合
# IL = 2 * sqrt(2) / (1 + 2) - 1 = -5.72%
```

### 清算メカニズム

```solidity
struct LiquidationParams {
    uint256 collateralFactor;    // 担保係数（例: 75%）
    uint256 liquidationBonus;    // 清算ボーナス（例: 5%）
    uint256 closeFactor;         // 一度に清算可能な割合（例: 50%）
}

function liquidate(
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover
) external {
    uint256 healthFactor = getHealthFactor(borrower);
    require(healthFactor < 1e18, "Cannot liquidate healthy position");

    // 最大清算可能額をチェック
    uint256 maxLiquidatable = (userDebt * closeFactor) / 100;
    require(debtToCover <= maxLiquidatable, "Exceeds close factor");

    // 清算ボーナスを含めた担保の移転
    uint256 collateralToSeize = (debtToCover * (100 + liquidationBonus)) / 100;

    _repayDebt(borrower, debtAsset, debtToCover);
    _seizeCollateral(borrower, msg.sender, collateralAsset, collateralToSeize);
}
```

詳細は [financial-engineering.md](references/financial-engineering.md) を参照。

## トークノミクス設計

### ガバナンストークン設計原則

```solidity
// veToken モデル（Curve式）
contract VotingEscrow {
    struct LockedBalance {
        uint256 amount;
        uint256 end;
    }

    mapping(address => LockedBalance) public locked;

    // 投票力 = ロック量 * 残りロック期間 / 最大ロック期間
    function balanceOf(address user) public view returns (uint256) {
        LockedBalance memory lock = locked[user];
        if (block.timestamp >= lock.end) return 0;

        uint256 remainingTime = lock.end - block.timestamp;
        return (lock.amount * remainingTime) / MAX_LOCK_TIME;
    }

    // 投票力は時間と共に線形減少
    function createLock(uint256 amount, uint256 unlockTime) external {
        require(unlockTime <= block.timestamp + MAX_LOCK_TIME, "Exceeds max lock");
        require(locked[msg.sender].amount == 0, "Already locked");

        locked[msg.sender] = LockedBalance({
            amount: amount,
            end: unlockTime
        });

        token.transferFrom(msg.sender, address(this), amount);
    }
}
```

### 手数料分配モデル

| モデル | 説明 | メリット | デメリット |
|--------|------|---------|-----------|
| ステーカー分配 | 手数料をステーカーに分配 | シンプル、インセンティブ明確 | 売り圧力 |
| バイバック＆バーン | 手数料でトークン買戻し・焼却 | デフレ圧力 | 流動性依存 |
| プロトコル準備金 | 手数料をDAOトレジャリーへ | 持続可能な開発資金 | 短期インセンティブ弱い |
| ハイブリッド | 上記の組み合わせ | バランス | 複雑 |

詳細は [tokenomics.md](references/tokenomics.md) を参照。

## 開発環境セットアップ

### Foundry（推奨）

```bash
# インストール
curl -L https://foundry.paradigm.xyz | bash
foundryup

# プロジェクト作成
forge init my-defi-protocol
cd my-defi-protocol

# 依存関係追加
forge install OpenZeppelin/openzeppelin-contracts
forge install smartcontractkit/chainlink
forge install Uniswap/v4-core

# remappings設定
echo "@openzeppelin/=lib/openzeppelin-contracts/
@chainlink/=lib/chainlink/
@uniswap/=lib/v4-core/" > remappings.txt
```

### テスト実行

```bash
# 全テスト実行
forge test -vvv

# 特定テスト
forge test --match-test testSwap -vvv

# ファズテスト（重要！）
forge test --match-test testFuzz -vvv

# フォークテスト（メインネット状態でテスト）
forge test --fork-url $ETH_RPC_URL -vvv

# ガスレポート
forge test --gas-report

# カバレッジ
forge coverage
```

### スラッシングテスト例

```solidity
// ファズテストでエッジケースを発見
function testFuzz_Swap(uint256 amountIn) public {
    // 境界条件を設定
    amountIn = bound(amountIn, 1, type(uint128).max);

    uint256 amountOut = pool.swap(amountIn);

    // 不変条件のチェック
    assertGe(amountOut, 0, "Negative output");
    assertLe(amountOut, pool.reserve1(), "Exceeds reserves");
}

// インバリアントテスト
function invariant_ConstantProduct() public {
    uint256 k = pool.reserve0() * pool.reserve1();
    assertGe(k, initialK, "K decreased");
}
```

## 主要プロトコルアドレス

### Ethereum Mainnet

| プロトコル | コントラクト | アドレス |
|-----------|------------|---------|
| Uniswap V3 | Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| Uniswap V3 | Router | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| Aave V3 | Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Chainlink | ETH/USD | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| Curve | 3pool | `0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7` |
| Compound V3 | cUSDC | `0xc3d688B66703497DAA19211EEdff47f25384cdc3` |

### Arbitrum

| プロトコル | コントラクト | アドレス |
|-----------|------------|---------|
| GMX | Vault | `0x489ee077994B6658eAfA855C308275EAd8097C4A` |
| Camelot | Router | `0xc873fEcbd354f5A56E00E710B90EF4201db2448d` |

## 監査準備

### 必須チェックリスト

1. **ドキュメント**
   - [ ] 技術仕様書
   - [ ] アーキテクチャ図
   - [ ] 脅威モデル
   - [ ] テストカバレッジレポート

2. **コード品質**
   - [ ] NatSpec完備
   - [ ] Slither警告ゼロ
   - [ ] ファズテスト実装
   - [ ] インバリアントテスト実装

3. **セキュリティ**
   - [ ] アクセス制御レビュー
   - [ ] 外部呼び出し監査
   - [ ] 数値オーバーフローチェック
   - [ ] リエントランシー保護確認

詳細は [audit-checklist.md](references/audit-checklist.md) を参照。

## リファレンス一覧

### ドキュメント
- **[protocol-types.md](references/protocol-types.md)**: DeFiプロトコル種類の詳細解説
- **[security.md](references/security.md)**: セキュリティベストプラクティス
- **[financial-engineering.md](references/financial-engineering.md)**: 金融工学の基礎と応用
- **[smart-contract-patterns.md](references/smart-contract-patterns.md)**: スマートコントラクト設計パターン
- **[tokenomics.md](references/tokenomics.md)**: トークノミクス設計ガイド
- **[oracle-guide.md](references/oracle-guide.md)**: オラクル統合完全ガイド
- **[audit-checklist.md](references/audit-checklist.md)**: 監査準備チェックリスト

### アセット
- **[defi-base.sol](assets/defi-base.sol)**: DeFi開発用ベーステンプレート
- **[security-patterns.sol](assets/security-patterns.sol)**: セキュリティパターン集

### 外部リソース
- **Ethereum**: https://ethereum.org/developers
- **OpenZeppelin**: https://docs.openzeppelin.com
- **Chainlink**: https://docs.chain.link
- **DeFiLlama**: https://defillama.com
- **Rekt News**: https://rekt.news（ハック事例分析）

## よくある落とし穴

1. **スポット価格の直接使用**: フラッシュローン操作に脆弱 → TWAPを使用
2. **スリッページ保護の欠如**: サンドイッチ攻撃の標的 → amountOutMinを必須に
3. **無期限の承認**: トークン承認を必要最小限に
4. **不適切な清算パラメータ**: バッドデットリスク → シミュレーション必須
5. **単一障害点オラクル**: オラクル停止時にプロトコル停止 → フォールバック実装
6. **ガバナンスタイムロック不足**: 悪意ある提案の即時実行 → 最低2日のタイムロック
7. **アップグレード可能性の濫用**: 信頼前提の増加 → イミュータブル or 厳格なガバナンス
8. **テスト不足でのデプロイ**: 本番環境での予期せぬ挙動 → フォークテスト必須

## 関連スキルとの連携

- **uniswap-dev**: Uniswap特化の開発支援 → DEX実装時に併用
- **Context7 MCP**: 最新ドキュメント取得 → ライブラリ更新確認時に使用

```
例: Aave V3の最新インターフェースを確認したい場合
→ Context7: resolve-library-id("@aave/core-v3")
→ 取得したドキュメントとこのスキルのセキュリティガイドを組み合わせ
```
