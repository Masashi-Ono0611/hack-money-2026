# DeFiスマートコントラクト設計パターン

DeFiプロトコル開発で頻繁に使用される設計パターンと実装ガイド。

## 1. アーキテクチャパターン

### 1.1 Diamond Pattern (EIP-2535)

複数のファセット（実装コントラクト）を持つモジュラーアーキテクチャ。

```solidity
// Diamond Storage
library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition;
    }

    struct DiamondStorage {
        mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
        bytes4[] selectors;
        mapping(bytes4 => bool) supportedInterfaces;
        address contractOwner;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}

// Diamond Proxy
contract Diamond {
    constructor(address _diamondCutFacet) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.contractOwner = msg.sender;

        // Add diamondCut function
        bytes4 selector = IDiamondCut.diamondCut.selector;
        ds.selectors.push(selector);
        ds.selectorToFacetAndPosition[selector] = LibDiamond.FacetAddressAndPosition({
            facetAddress: _diamondCutFacet,
            functionSelectorPosition: 0
        });
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
```

**適用場面**: 大規模プロトコル（Aave V3等）

### 1.2 Proxy Pattern (UUPS)

アップグレード可能なコントラクト。

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyProtocolV1 is UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setValue(uint256 _value) external {
        value = _value;
    }
}

// V2へのアップグレード
contract MyProtocolV2 is MyProtocolV1 {
    uint256 public newValue;

    function setNewValue(uint256 _newValue) external {
        newValue = _newValue;
    }
}
```

**注意点**:
- ストレージレイアウトの維持
- コンストラクタの代わりにinitializer使用
- ストレージギャップの確保

```solidity
// ストレージギャップ（将来の拡張用）
contract BaseProtocol {
    uint256 public value;
    uint256[49] private __gap;  // 50スロット確保
}
```

### 1.3 Factory Pattern

同型コントラクトの大量デプロイ。

```solidity
contract PoolFactory {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;

    event PoolCreated(address indexed token0, address indexed token1, address pool);

    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Identical tokens");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Zero address");
        require(getPool[token0][token1] == address(0), "Pool exists");

        // CREATE2でデプロイ（決定的アドレス）
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        pool = address(new Pool{salt: salt}(token0, token1));

        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool);
    }

    // アドレス事前計算
    function computePoolAddress(address tokenA, address tokenB) public view returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));

        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(type(Pool).creationCode)
        )))));
    }
}
```

### 1.4 Minimal Proxy (Clone)

ガス効率の良い軽量クローン。

```solidity
import "@openzeppelin/contracts/proxy/Clones.sol";

contract VaultFactory {
    using Clones for address;

    address public immutable implementation;

    constructor() {
        implementation = address(new Vault());
    }

    function createVault(address asset) external returns (address vault) {
        vault = implementation.clone();
        Vault(vault).initialize(asset, msg.sender);
    }

    // 決定的アドレス版
    function createVaultDeterministic(address asset, bytes32 salt) external returns (address vault) {
        vault = implementation.cloneDeterministic(salt);
        Vault(vault).initialize(asset, msg.sender);
    }
}
```

## 2. トークンパターン

### 2.1 ERC4626 Vault

標準化されたトークン化Vault。

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract YieldVault is ERC4626 {
    constructor(
        IERC20 asset_
    ) ERC4626(asset_) ERC20("Yield Vault Token", "yvTKN") {}

    // カスタム収益計算
    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this)) + _calculateAccruedYield();
    }

    function _calculateAccruedYield() internal view returns (uint256) {
        // ストラテジーからの収益計算
        return 0;
    }

    // 入金フック
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        super._deposit(caller, receiver, assets, shares);
        // カスタムロジック（ストラテジーへの配分等）
    }
}
```

### 2.2 Rebase Token

残高が自動的に変化するトークン。

```solidity
contract RebaseToken is ERC20 {
    uint256 private _totalShares;
    mapping(address => uint256) private _shares;

    uint256 public rebaseIndex = 1e18;  // 初期値 1.0

    function balanceOf(address account) public view override returns (uint256) {
        return _shares[account] * rebaseIndex / 1e18;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalShares * rebaseIndex / 1e18;
    }

    function sharesOf(address account) public view returns (uint256) {
        return _shares[account];
    }

    function _transfer(address from, address to, uint256 amount) internal override {
        uint256 sharesToTransfer = amount * 1e18 / rebaseIndex;
        _shares[from] -= sharesToTransfer;
        _shares[to] += sharesToTransfer;
        emit Transfer(from, to, amount);
    }

    // リベース実行（報酬分配時等）
    function _rebase(uint256 newIndex) internal {
        rebaseIndex = newIndex;
    }
}
```

### 2.3 Wrapped Token with Permit

EIP-2612準拠のガスレス承認。

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract WrappedToken is ERC20Permit {
    IERC20 public immutable underlying;

    constructor(
        IERC20 _underlying
    ) ERC20("Wrapped Token", "wTKN") ERC20Permit("Wrapped Token") {
        underlying = _underlying;
    }

    function wrap(uint256 amount) external {
        underlying.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }

    function unwrap(uint256 amount) external {
        _burn(msg.sender, amount);
        underlying.transfer(msg.sender, amount);
    }

    // Permitを使ったガスレスwrap
    function wrapWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC20Permit(address(underlying)).permit(
            msg.sender, address(this), amount, deadline, v, r, s
        );
        wrap(amount);
    }
}
```

## 3. アクセス制御パターン

### 3.1 Role-Based Access Control

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ProtocolWithRoles is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // 管理者のみ
    function setParameters(uint256 newValue) external onlyRole(ADMIN_ROLE) {
        // ...
    }

    // オペレーターのみ
    function executeStrategy() external onlyRole(OPERATOR_ROLE) {
        // ...
    }

    // ガーディアン（緊急停止用）
    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        // ...
    }
}
```

### 3.2 Timelock

重要な変更に遅延を設ける。

```solidity
contract TimelockController {
    uint256 public constant MINIMUM_DELAY = 2 days;
    uint256 public constant MAXIMUM_DELAY = 30 days;

    mapping(bytes32 => uint256) public timestamps;

    event CallScheduled(bytes32 indexed id, address target, uint256 value, bytes data, uint256 delay);
    event CallExecuted(bytes32 indexed id, address target, uint256 value, bytes data);

    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32) {
        require(delay >= MINIMUM_DELAY && delay <= MAXIMUM_DELAY, "Invalid delay");

        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        require(timestamps[id] == 0, "Already scheduled");

        timestamps[id] = block.timestamp + delay;
        emit CallScheduled(id, target, value, data, delay);
        return id;
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external payable onlyRole(EXECUTOR_ROLE) {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);

        require(isOperationReady(id), "Not ready");
        require(predecessor == bytes32(0) || isOperationDone(predecessor), "Predecessor not done");

        timestamps[id] = 1;  // Mark as executed

        (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");

        emit CallExecuted(id, target, value, data);
    }

    function isOperationReady(bytes32 id) public view returns (bool) {
        uint256 timestamp = timestamps[id];
        return timestamp > 1 && timestamp <= block.timestamp;
    }
}
```

## 4. 会計パターン

### 4.1 Internal Accounting

外部トークン残高に依存しない内部会計。

```solidity
contract InternalAccounting {
    mapping(address => mapping(address => uint256)) private _balances;
    mapping(address => uint256) private _totalDeposits;

    // デポジット（内部残高を更新）
    function deposit(address token, uint256 amount) external {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        uint256 actualReceived = IERC20(token).balanceOf(address(this)) - balanceBefore;

        _balances[msg.sender][token] += actualReceived;
        _totalDeposits[token] += actualReceived;
    }

    // 引き出し（内部残高を参照）
    function withdraw(address token, uint256 amount) external {
        require(_balances[msg.sender][token] >= amount, "Insufficient balance");

        _balances[msg.sender][token] -= amount;
        _totalDeposits[token] -= amount;

        IERC20(token).transfer(msg.sender, amount);
    }

    // ドネーション攻撃対策: 外部残高ではなく内部会計を使用
    function totalDeposits(address token) public view returns (uint256) {
        return _totalDeposits[token];
    }
}
```

### 4.2 Accumulator Pattern

効率的な報酬分配。

```solidity
contract RewardDistributor {
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public rewardRate;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored +
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18 / totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        return (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18)
            + rewards[account];
    }

    function stake(uint256 amount) external updateReward(msg.sender) {
        totalSupply += amount;
        balances[msg.sender] += amount;
        // transfer tokens
    }

    function withdraw(uint256 amount) external updateReward(msg.sender) {
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        // transfer tokens
    }

    function getReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            // transfer reward tokens
        }
    }
}
```

## 5. フラッシュローンパターン

```solidity
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";

contract FlashLender is IERC3156FlashLender {
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    uint256 public constant FEE_BPS = 9;  // 0.09%

    mapping(address => bool) public supportedTokens;

    function maxFlashLoan(address token) external view override returns (uint256) {
        return supportedTokens[token] ? IERC20(token).balanceOf(address(this)) : 0;
    }

    function flashFee(address token, uint256 amount) external view override returns (uint256) {
        require(supportedTokens[token], "Unsupported token");
        return amount * FEE_BPS / 10000;
    }

    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override returns (bool) {
        require(supportedTokens[token], "Unsupported token");

        uint256 fee = amount * FEE_BPS / 10000;
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).transfer(address(receiver), amount);

        require(
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) == CALLBACK_SUCCESS,
            "Callback failed"
        );

        require(
            IERC20(token).balanceOf(address(this)) >= balanceBefore + fee,
            "Repayment failed"
        );

        return true;
    }
}

// 借り手実装例
contract FlashBorrower is IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // アービトラージ等のロジック

        // 返済
        IERC20(token).approve(msg.sender, amount + fee);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
```

## 6. ガス最適化パターン

### 6.1 Batch Operations

```solidity
contract BatchOperations {
    function batchTransfer(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < recipients.length; ) {
            IERC20(token).transferFrom(msg.sender, recipients[i], amounts[i]);
            unchecked { ++i; }
        }
    }

    // Multicallパターン
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; ) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "Multicall failed");
            results[i] = result;
            unchecked { ++i; }
        }
    }
}
```

### 6.2 Packed Storage

```solidity
contract PackedStorage {
    // Bad: 3つのストレージスロット使用
    // uint256 value1;
    // uint256 value2;
    // uint256 value3;

    // Good: 1つのストレージスロットにパック
    struct PackedData {
        uint64 value1;
        uint64 value2;
        uint64 value3;
        uint64 value4;
    }

    PackedData public data;

    function setValues(uint64 v1, uint64 v2, uint64 v3, uint64 v4) external {
        data = PackedData(v1, v2, v3, v4);
    }
}
```

## まとめ: パターン選択ガイド

| 要件 | 推奨パターン |
|------|-------------|
| 大規模プロトコル | Diamond Pattern |
| アップグレード必要 | UUPS Proxy |
| 多数の同型コントラクト | Factory + Clone |
| トークン化Vault | ERC4626 |
| 複雑な権限管理 | AccessControl + Timelock |
| 報酬分配 | Accumulator Pattern |
| 即時流動性提供 | Flash Loan Pattern |
