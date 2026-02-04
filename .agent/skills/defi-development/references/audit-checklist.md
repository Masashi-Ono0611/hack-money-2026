# DeFi監査チェックリスト

スマートコントラクト監査の準備と実施のための包括的なチェックリスト。
内部レビューから外部監査まで対応。

## 1. 監査前準備

### 1.1 ドキュメント準備

- [ ] **技術仕様書**
  - プロトコルの目的と機能
  - アーキテクチャ概要
  - コントラクト間の相互作用
  - 外部依存関係

- [ ] **脅威モデル**
  - 想定される攻撃ベクトル
  - 信頼の境界
  - 特権アカウント一覧

- [ ] **デプロイ計画**
  - ネットワーク
  - 初期パラメータ
  - アップグレード戦略

### 1.2 コード品質

```bash
# NatSpecコメント完備の確認
# 全てのpublic/external関数にドキュメント
/**
 * @notice ユーザーの資産をデポジット
 * @param asset デポジットするトークンアドレス
 * @param amount デポジット量
 * @return shares 発行されるシェア数
 */
function deposit(address asset, uint256 amount) external returns (uint256 shares);

# コードフォーマット
forge fmt

# 静的解析
slither . --print human-summary
slither . --checklist
```

### 1.3 テストカバレッジ

```bash
# カバレッジレポート生成
forge coverage --report lcov

# 目標: 90%以上のラインカバレッジ
# 特に重要な関数は100%
```

## 2. 共通脆弱性チェックリスト

### 2.1 アクセス制御

- [ ] 全ての管理者関数に適切なアクセス制御
- [ ] 初期化関数の保護
- [ ] オーナー権限の移譲プロセス
- [ ] マルチシグ/タイムロックの実装

```solidity
// 良い例
function setParameters(uint256 newValue) external onlyRole(ADMIN_ROLE) {
    require(newValue >= MIN_VALUE && newValue <= MAX_VALUE, "Out of range");
    emit ParameterUpdated(parameters, newValue);
    parameters = newValue;
}

// 悪い例
function setParameters(uint256 newValue) external {
    parameters = newValue;  // アクセス制御なし、イベントなし
}
```

### 2.2 リエントランシー

- [ ] 全ての外部呼び出しにReentrancyGuard
- [ ] CEI（Checks-Effects-Interactions）パターン
- [ ] クロスファンクションリエントランシーの考慮

```solidity
// チェック項目
// 1. 状態変更が外部呼び出しの前にあるか
// 2. nonReentrant修飾子が適用されているか
// 3. コールバックを受け取る関数の保護
```

### 2.3 数値処理

- [ ] オーバーフロー/アンダーフローの防止（Solidity 0.8+）
- [ ] 除算のゼロチェック
- [ ] 丸め誤差の方向（プロトコル有利）
- [ ] 精度損失の最小化

```solidity
// 良い例: プロトコル有利な丸め
function calculateShares(uint256 assets) public view returns (uint256) {
    uint256 supply = totalSupply();
    // 切り捨て（ユーザーが少なく受け取る）
    return supply == 0 ? assets : assets * supply / totalAssets();
}

function calculateAssets(uint256 shares) public view returns (uint256) {
    uint256 supply = totalSupply();
    // 切り捨て（ユーザーが少なく受け取る）
    return supply == 0 ? shares : shares * totalAssets() / supply;
}
```

### 2.4 外部呼び出し

- [ ] 全ての外部呼び出しの戻り値チェック
- [ ] 低レベルcallの適切なハンドリング
- [ ] delegatecallの慎重な使用
- [ ] トークン転送の安全性（SafeERC20）

```solidity
// 良い例
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

function deposit(address token, uint256 amount) external {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
}

// 悪い例
function deposit(address token, uint256 amount) external {
    IERC20(token).transferFrom(msg.sender, address(this), amount);  // 戻り値未チェック
}
```

### 2.5 オラクル

- [ ] 価格データの鮮度チェック
- [ ] 複数オラクルのアグリゲーション
- [ ] フォールバック戦略
- [ ] 価格操作耐性（TWAP等）

### 2.6 フロントランニング

- [ ] スリッページ保護
- [ ] デッドライン設定
- [ ] コミットリビール（必要に応じて）

### 2.7 ガバナンス

- [ ] タイムロック実装
- [ ] 定足数設定
- [ ] 投票力のスナップショット
- [ ] 緊急停止機能

## 3. DeFi固有チェックリスト

### 3.1 AMM/DEX

- [ ] スリッページ保護の必須化
- [ ] 流動性プロバイダーへの公平な手数料分配
- [ ] フラッシュスワップのコールバック検証
- [ ] 価格操作耐性
- [ ] トークンペアの順序付け

### 3.2 レンディング

- [ ] 担保率の適切な設定
- [ ] 清算閾値と清算ボーナスの設計
- [ ] 金利モデルの健全性
- [ ] オラクル依存の最小化
- [ ] バッドデット処理

```solidity
// 清算チェック
function isLiquidatable(address user) public view returns (bool) {
    uint256 healthFactor = calculateHealthFactor(user);
    return healthFactor < 1e18;  // 1.0未満で清算対象
}

// 清算実行
function liquidate(address user, address collateral, uint256 debtToCover) external {
    require(isLiquidatable(user), "Not liquidatable");
    require(debtToCover <= maxLiquidatable(user), "Exceeds close factor");

    uint256 collateralToSeize = calculateCollateralToSeize(debtToCover, collateral);
    // ...
}
```

### 3.3 ステーキング/Vault

- [ ] ERC4626インフレ攻撃対策
- [ ] 報酬計算の精度
- [ ] 緊急引き出し機能
- [ ] 報酬レートの上限

```solidity
// インフレ攻撃対策
constructor(IERC20 asset) ERC4626(asset) {
    // 方法1: デッドシェア
    _mint(address(0xdead), 10 ** decimals());

    // 方法2: 仮想オフセット（totalAssets/totalSupplyをオーバーライド）
}
```

### 3.4 ブリッジ

- [ ] メッセージ検証の完全性
- [ ] リプレイ攻撃防止
- [ ] 資金ロックの安全性
- [ ] 緊急停止機能

## 4. テスト要件

### 4.1 ユニットテスト

```solidity
// 各関数の正常系テスト
function test_Deposit_Success() public {
    uint256 amount = 1000e18;
    token.approve(address(vault), amount);

    uint256 sharesBefore = vault.balanceOf(address(this));
    uint256 shares = vault.deposit(amount, address(this));
    uint256 sharesAfter = vault.balanceOf(address(this));

    assertEq(sharesAfter - sharesBefore, shares);
    assertGt(shares, 0);
}

// 異常系テスト
function test_Deposit_RevertWhen_ZeroAmount() public {
    vm.expectRevert("Zero amount");
    vault.deposit(0, address(this));
}

function test_Deposit_RevertWhen_Paused() public {
    vault.pause();
    vm.expectRevert("Paused");
    vault.deposit(1000e18, address(this));
}
```

### 4.2 ファズテスト

```solidity
// ファズテスト
function testFuzz_Deposit(uint256 amount) public {
    amount = bound(amount, 1, type(uint128).max);

    deal(address(token), address(this), amount);
    token.approve(address(vault), amount);

    uint256 shares = vault.deposit(amount, address(this));

    assertGt(shares, 0, "Shares should be positive");
    assertLe(shares, amount, "Shares should not exceed amount");
}

// インバリアントテスト
function invariant_TotalAssetsGEQTotalSupply() public {
    // Vaultの資産は常にシェア総量以上
    assertGe(vault.totalAssets(), vault.totalSupply());
}

function invariant_NoFreeShares() public {
    // 無料でシェアを取得できない
    uint256 assetsNeeded = vault.previewMint(1e18);
    assertGt(assetsNeeded, 0);
}
```

### 4.3 フォークテスト

```solidity
// メインネットフォークでのテスト
function setUp() public {
    // 特定のブロックでフォーク
    vm.createSelectFork(vm.envString("ETH_RPC_URL"), 18_000_000);

    // 実際のプロトコルとの統合テスト
    aave = IPool(AAVE_POOL_ADDRESS);
    chainlink = AggregatorV3Interface(ETH_USD_FEED);
}

function test_Integration_WithAave() public {
    // 実際のAaveプロトコルとの統合テスト
}
```

## 5. 静的解析

### 5.1 Slither

```bash
# 基本実行
slither .

# 詳細レポート
slither . --print human-summary

# 特定のチェック
slither . --detect reentrancy-eth,reentrancy-no-eth

# カスタムチェック除外
slither . --exclude naming-convention,solc-version
```

### 5.2 よくあるSlither警告と対応

| 警告 | 対応 |
|------|------|
| reentrancy-eth | ReentrancyGuard追加、CEIパターン確認 |
| unchecked-transfer | SafeERC20使用 |
| divide-before-multiply | 計算順序の見直し |
| arbitrary-send-eth | アクセス制御確認 |
| uninitialized-state | 初期化確認 |

## 6. 監査プロセス

### 6.1 内部レビュー

1. **セルフレビュー**
   - 開発者自身によるチェックリスト確認
   - コードコメントの確認

2. **ピアレビュー**
   - 別の開発者によるコードレビュー
   - 設計上の決定の確認

3. **セキュリティレビュー**
   - 内部セキュリティチームによるレビュー
   - 脅威モデルの確認

### 6.2 外部監査

**監査会社選定基準**:
- DeFi経験
- 過去の監査実績
- レスポンス時間
- 料金

**主要監査会社**:
| 会社 | 特徴 |
|------|------|
| Trail of Bits | 高品質、長期間 |
| OpenZeppelin | 広範なDeFi経験 |
| Consensys Diligence | Ethereum専門 |
| Certik | 迅速、コスト効率 |
| Spearbit | 専門家ネットワーク |

### 6.3 監査後対応

```markdown
## 監査指摘事項対応

### Critical

| ID | 指摘 | 対応 | 状態 |
|----|------|------|------|
| C-1 | リエントランシー | ReentrancyGuard追加 | 修正済 |

### High

| ID | 指摘 | 対応 | 状態 |
|----|------|------|------|
| H-1 | オラクル操作 | TWAP実装 | 修正済 |

### Medium

...
```

## 7. 緊急対応計画

### 7.1 インシデント対応

```solidity
// 緊急停止機能
contract EmergencyStop is Pausable, AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }
}
```

### 7.2 バグバウンティ

**プラットフォーム**:
- Immunefi（DeFi特化）
- HackerOne
- Code4rena（競争監査）

**報酬設計例**:
| 重大度 | 報酬 |
|--------|------|
| Critical | $100,000 - $1,000,000 |
| High | $10,000 - $100,000 |
| Medium | $1,000 - $10,000 |
| Low | $100 - $1,000 |

## チェックリストサマリー

### デプロイ前必須

- [ ] 全てのCritical/High指摘事項を修正
- [ ] テストカバレッジ90%以上
- [ ] Slitherのクリティカル警告ゼロ
- [ ] 外部監査完了（TVL > $1Mの場合）
- [ ] マルチシグ設定
- [ ] 緊急停止機能テスト
- [ ] ドキュメント最終確認
- [ ] バグバウンティプログラム設定
