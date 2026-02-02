# DeFiセキュリティガイド

DeFiプロトコル開発における包括的なセキュリティベストプラクティス。
過去のハック事例から学んだ教訓と、具体的な対策を詳述。

## 攻撃ベクトル一覧

### 1. リエントランシー攻撃

**概要**: 外部コントラクト呼び出し中に再入されることで、状態が不整合になる攻撃。

**過去の事例**: The DAO (2016) - $60M損失

```solidity
// 脆弱なコード
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount);
        // 危険: 状態更新前に外部呼び出し
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] -= amount;  // ここに到達前に再入される
    }
}

// 安全なコード
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecureVault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount);
        // CEI パターン: Checks-Effects-Interactions
        balances[msg.sender] -= amount;  // Effects first
        (bool success, ) = msg.sender.call{value: amount}("");  // Interactions last
        require(success);
    }
}
```

**対策**:
1. `ReentrancyGuard`の使用
2. CEI（Checks-Effects-Interactions）パターンの徹底
3. `transfer()`より`call()`を使うが、必ず状態更新後に

### 2. フラッシュローン攻撃

**概要**: 1トランザクション内で大量の資金を無担保で借り、価格操作やガバナンス攻撃を行う。

**過去の事例**: bZx (2020), Cream Finance (2021)

```solidity
// 脆弱: スポット価格を直接使用
function getCollateralValue(address user) public view returns (uint256) {
    uint256 balance = collateral.balanceOf(user);
    uint256 price = uniswapPair.getReserves().price();  // 危険!
    return balance * price;
}

// 安全: TWAP使用
function getCollateralValue(address user) public view returns (uint256) {
    uint256 balance = collateral.balanceOf(user);
    uint256 price = getTWAP(30 minutes);  // 30分TWAPを使用
    return balance * price;
}

// 同一ブロック内での操作を制限
mapping(address => uint256) public lastInteractionBlock;

modifier noSameBlockInteraction() {
    require(
        block.number > lastInteractionBlock[msg.sender],
        "Same block interaction"
    );
    lastInteractionBlock[msg.sender] = block.number;
    _;
}
```

**対策**:
1. TWAPオラクルの使用（スポット価格の直接使用禁止）
2. ブロック跨ぎチェック
3. 複数オラクルのアグリゲーション
4. スナップショットベースのガバナンス

### 3. オラクル操作

**概要**: 価格オラクルを操作して、清算やスワップを有利に実行。

```solidity
// Chainlinkオラクルの安全な使用
function getPrice(address feed) public view returns (uint256) {
    (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) = AggregatorV3Interface(feed).latestRoundData();

    // 必須チェック
    require(price > 0, "Invalid price");
    require(updatedAt > block.timestamp - MAX_STALENESS, "Stale price");
    require(answeredInRound >= roundId, "Stale round");

    return uint256(price);
}

// 複数オラクルのアグリゲーション
function getAggregatedPrice() public view returns (uint256) {
    uint256 chainlinkPrice = getChainlinkPrice();
    uint256 uniswapTWAP = getUniswapTWAP();

    // 乖離チェック
    uint256 deviation = chainlinkPrice > uniswapTWAP
        ? (chainlinkPrice - uniswapTWAP) * 100 / chainlinkPrice
        : (uniswapTWAP - chainlinkPrice) * 100 / uniswapTWAP;

    require(deviation < MAX_DEVIATION, "Price deviation too high");

    return (chainlinkPrice + uniswapTWAP) / 2;
}
```

**対策**:
1. Chainlink等の分散型オラクル使用
2. 複数ソースからの価格アグリゲーション
3. 価格変動の上限設定
4. サーキットブレーカーの実装

### 4. サンドイッチ攻撃（フロントランニング）

**概要**: ユーザーのトランザクションの前後に攻撃者がトランザクションを挿入し利益を得る。

```solidity
// スリッページ保護の実装
function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 amountOutMin,    // 必須: 最小受取量
    uint256 deadline         // 必須: 有効期限
) external {
    require(block.timestamp <= deadline, "Transaction expired");

    uint256 amountOut = _executeSwap(tokenIn, tokenOut, amountIn);

    require(amountOut >= amountOutMin, "Slippage tolerance exceeded");

    IERC20(tokenOut).transfer(msg.sender, amountOut);
}

// プライベートメモリプールの活用
// Flashbots Protect等のプライベートRPCを使用
```

**対策**:
1. スリッページ保護の必須化
2. デッドラインの設定
3. Flashbots等のプライベートメモリプール使用
4. コミットリビール方式

### 5. ガバナンス攻撃

**概要**: 投票トークンを一時的に取得し、悪意ある提案を可決。

```solidity
// 脆弱: 現在の残高で投票
function vote(uint256 proposalId) external {
    uint256 votingPower = token.balanceOf(msg.sender);
    proposals[proposalId].votes += votingPower;
}

// 安全: スナップショットベースの投票
function vote(uint256 proposalId) external {
    uint256 snapshotId = proposals[proposalId].snapshotId;
    uint256 votingPower = token.balanceOfAt(msg.sender, snapshotId);
    proposals[proposalId].votes += votingPower;
}

// タイムロックの実装
contract Timelock {
    uint256 public constant MINIMUM_DELAY = 2 days;
    uint256 public constant MAXIMUM_DELAY = 30 days;

    mapping(bytes32 => bool) public queuedTransactions;

    function queueTransaction(
        address target,
        uint256 value,
        bytes memory data,
        uint256 eta
    ) external onlyAdmin returns (bytes32) {
        require(eta >= block.timestamp + MINIMUM_DELAY, "Delay too short");
        require(eta <= block.timestamp + MAXIMUM_DELAY, "Delay too long");

        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));
        queuedTransactions[txHash] = true;
        return txHash;
    }
}
```

**対策**:
1. スナップショットベースの投票
2. タイムロック（最低2日）
3. 定足数の設定
4. veToken（ロックトークン）モデル

### 6. ERC4626インフレ攻撃

**概要**: 最初の預け入れ者のシェアを希釈する攻撃。

```solidity
// 脆弱: 基本的なERC4626実装
contract VulnerableVault is ERC4626 {
    // 攻撃者が1weiをデポジット後、大量のトークンを直接送金
    // → シェア価格が急騰し、後続の預け入れ者のシェアが希釈
}

// 安全: デッドシェアパターン
contract SecureVault is ERC4626 {
    constructor(IERC20 asset) ERC4626(asset) {
        // デッドシェアを作成して攻撃を無効化
        _mint(address(0xdead), 10 ** decimals());
    }
}

// または: 仮想オフセット
contract VirtualOffsetVault is ERC4626 {
    uint256 private constant VIRTUAL_SHARES = 1e18;
    uint256 private constant VIRTUAL_ASSETS = 1e18;

    function totalAssets() public view override returns (uint256) {
        return super.totalAssets() + VIRTUAL_ASSETS;
    }

    function totalSupply() public view override returns (uint256) {
        return super.totalSupply() + VIRTUAL_SHARES;
    }
}
```

### 7. 署名リプレイ攻撃

```solidity
// 脆弱: nonceなし
function executeWithSignature(
    address to,
    uint256 value,
    bytes calldata data,
    bytes memory signature
) external {
    bytes32 hash = keccak256(abi.encode(to, value, data));
    address signer = ECDSA.recover(hash, signature);
    require(signer == owner, "Invalid signature");
    (bool success, ) = to.call{value: value}(data);
    require(success);
}

// 安全: nonce + chainId
mapping(address => uint256) public nonces;

function executeWithSignature(
    address to,
    uint256 value,
    bytes calldata data,
    uint256 deadline,
    bytes memory signature
) external {
    require(block.timestamp <= deadline, "Expired");

    bytes32 hash = keccak256(abi.encode(
        to, value, data, nonces[msg.sender]++, block.chainid, deadline
    ));
    bytes32 ethSignedHash = keccak256(abi.encodePacked(
        "\x19Ethereum Signed Message:\n32", hash
    ));

    address signer = ECDSA.recover(ethSignedHash, signature);
    require(signer == owner, "Invalid signature");

    (bool success, ) = to.call{value: value}(data);
    require(success);
}
```

## セキュリティチェックリスト

### デプロイ前必須

- [ ] **リエントランシー**: 全ての外部呼び出しにReentrancyGuard適用
- [ ] **アクセス制御**: 全ての管理者関数にonlyOwner/onlyRole
- [ ] **入力検証**: 全てのパラメータの境界チェック
- [ ] **オーバーフロー**: Solidity 0.8+使用またはSafeMath
- [ ] **スリッページ保護**: amountOutMin, deadline必須
- [ ] **オラクル**: 鮮度チェック、複数ソース
- [ ] **署名**: nonce、chainId、deadline含む

### テスト必須

```bash
# Slitherによる静的解析
slither . --print human-summary

# Echidnaによるファズテスト
echidna-test . --contract MyContract --config echidna.yaml

# Foundryファズテスト
forge test --match-test testFuzz -vvv

# Foundryインバリアントテスト
forge test --match-test invariant -vvv
```

### 監査前準備

1. **ドキュメント**
   - 技術仕様書
   - アーキテクチャ図
   - 脅威モデル

2. **コード品質**
   - NatSpecコメント完備
   - Slither警告ゼロ
   - テストカバレッジ90%以上

3. **テスト**
   - ユニットテスト
   - インテグレーションテスト
   - ファズテスト
   - フォークテスト

## 緊急対応

### Pausable実装

```solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

contract EmergencyProtocol is Pausable, AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // 緊急時に即座に停止可能
    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function deposit() external whenNotPaused {
        // ...
    }

    function withdraw() external {
        // withdrawは常に許可（ユーザー資金のロック防止）
    }
}
```

### サーキットブレーカー

```solidity
contract CircuitBreaker {
    uint256 public constant MAX_DAILY_OUTFLOW = 1000 ether;
    uint256 public dailyOutflow;
    uint256 public lastResetTimestamp;

    modifier withinDailyLimit(uint256 amount) {
        if (block.timestamp > lastResetTimestamp + 1 days) {
            dailyOutflow = 0;
            lastResetTimestamp = block.timestamp;
        }

        require(dailyOutflow + amount <= MAX_DAILY_OUTFLOW, "Daily limit exceeded");
        dailyOutflow += amount;
        _;
    }

    function withdraw(uint256 amount) external withinDailyLimit(amount) {
        // ...
    }
}
```

## 推奨ツール

| ツール | 用途 | URL |
|--------|------|-----|
| Slither | 静的解析 | github.com/crytic/slither |
| Echidna | ファズテスト | github.com/crytic/echidna |
| Mythril | シンボリック実行 | github.com/ConsenSys/mythril |
| Foundry | テスト/フォーク | getfoundry.sh |
| Tenderly | シミュレーション | tenderly.co |
| Forta | ランタイム監視 | forta.org |

## 参考資料

- **SWC Registry**: swcregistry.io（脆弱性カタログ）
- **Rekt News**: rekt.news（ハック事例分析）
- **Immunefi**: immunefi.com（バグバウンティ）
- **OpenZeppelin**: docs.openzeppelin.com/contracts
- **Trail of Bits**: building-secure-contracts
