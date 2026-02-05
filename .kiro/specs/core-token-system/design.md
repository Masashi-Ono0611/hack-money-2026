# Design Document: Core Token System

## Overview

**Purpose**: Core Token System は、Zombie L2 Clearinghouse の基盤となるトークンインフラを提供します。計算リソースをERC20トークン（CPT）として発行し、裁定収益を受け取るOperator Vaultを実装します。

**Users**:
- **L2運営者**: CPTを発行し、Vaultから収益を引き出す
- **システム（自動実行）**: Mock Oracleから稼働率データを取得
- **他の仕様**: CPT価格市場（uniswap-v4-integration）、決済処理（settlement-layer）が依存

**Impact**:
トークン化された計算リソースと収益管理の基盤を提供し、Zombie L2 Clearinghouse の全機能を支える中核レイヤーとなります。

### Goals

- CPT（Compute Token）トークン化による計算リソースの資産化
- Operator Vault による USDC 収益の安全な管理
- Mock Oracle による稼働率シグナル供給（デモ・テスト用）
- 他の仕様が依存可能な堅牢なコントラクト基盤

### Non-Goals

- Uniswap v4 Pool 初期化（uniswap-v4-integration 仕様）
- 動的手数料制御ロジック（uniswap-v4-integration 仕様）
- 価格監視・裁定実行（offchain-arbitrage-engine 仕様）
- Arc + Circle 決済統合（settlement-layer 仕様）

---

## Architecture

### Architecture Pattern & Boundary Map

**選択パターン**: シンプルなコントラクトレイヤー（オンチェーンのみ）

**Domain/Feature Boundaries**:
- **Token Domain**: CPT Token Contract（ERC20標準実装）
- **Vault Domain**: Operator Vault（USDC収益管理）
- **Oracle Domain**: Mock Oracle（稼働率シグナル供給）

**Dependency Direction**:
- CPT Token → Operator Vault: CPTをVaultに預ける（将来拡張）
- Mock Oracle → Utilization Hook: 稼働率データを提供（他仕様）
- Settlement Layer → Operator Vault: USDC入金（他仕様）

```mermaid
graph TB
    subgraph CoreTokenSystem["Core Token System"]
        CPT_A[CPT Token A<br/>Base Sepolia]
        CPT_B[CPT Token B<br/>WorldCoin Sepolia]
        Oracle_A[Mock Oracle A<br/>Base Sepolia]
        Oracle_B[Mock Oracle B<br/>WorldCoin Sepolia]
        Vault[Operator Vault<br/>Arc]
    end

    subgraph ExternalDeps["External Dependencies"]
        Hook_A[Utilization Hook A]
        Hook_B[Utilization Hook B]
        Settlement[Settlement Orchestrator]
    end

    Oracle_A -.-> Hook_A
    Oracle_B -.-> Hook_B
    Settlement --> Vault

    style CoreTokenSystem fill:#e1f5ff
    style ExternalDeps fill:#fff4e1
</mermaid>

**Steering Compliance**:
- 機能ドメイン優先の組織化（ステアリング `structure.md`）
- Solidity 0.8.x以上、OpenZeppelin活用（ステアリング `tech.md`）
- ハッカソンスコープでの簡略化（Mock Oracle）

---

## Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| **Smart Contracts** | Solidity 0.8.x | CPT Token, Mock Oracle, Operator Vault | ERC20標準、Ownable、ReentrancyGuard |
| **Blockchain** | Base Sepolia (L2-A), WorldCoin Sepolia (L2-B), Arc (Vault) | CPT発行・稼働率供給・USDC管理 | Testnet環境でデプロイ |
| **Deployment** | Foundry | コントラクトデプロイ・テスト | スクリプト自動化、既存 `contract/` ディレクトリ活用 |
| **Testing** | Foundry test | コントラクト単体・統合テスト | forge test, forge coverage |

---

## Components and Interfaces

### Component Summary

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|--------------|--------------------------|-----------|
| CPT Token Contract | Onchain/Token | ERC20計算トークン発行・転送 | 1.1-1.7 | OpenZeppelin ERC20 (P0) | Service |
| Mock Oracle | Onchain/Test | 稼働率シグナル供給 | 2.1-2.6 | - | Service |
| Operator Vault | Onchain/Vault | USDC収益管理 | 3.1-3.7 | USDC Token (P0), OpenZeppelin (P0) | Service |

---

### CPT Token Contract

| Field | Detail |
|-------|--------|
| Intent | 計算リソースをERC20トークンとして発行・転送する |
| Requirements | 1.1-1.7 |

**Responsibilities & Constraints**
- ERC20標準インターフェースの完全実装
- 運営者アドレスのみが発行可能（mint権限）
- Base Sepolia と WorldCoin Sepolia に独立してデプロイ

**Dependencies**
- Outbound: OpenZeppelin ERC20, Ownable — 標準実装 (P0)

**Contracts**: Service [x]

#### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IComputeToken is IERC20 {
    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    function mint(uint256 amount) external;

    /// @notice 発行権限を持つアドレスを返す
    function owner() external view returns (address);
}

contract ComputeToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    function mint(uint256 amount) external onlyOwner {
        _mint(msg.sender, amount);
    }
}
```

- **Preconditions**: mint呼び出しはownerのみ
- **Postconditions**: 指定数量のCPTが発行され、ownerアドレスに転送される
- **Invariants**: totalSupply >= 0, owner権限は変更不可（ハッカソンスコープ）

**Implementation Notes**
- Integration: OpenZeppelin ERC20 + Ownable を継承
- Validation: onlyOwner modifier で mint 権限制御
- Risks: 発行上限なし（ハッカソンスコープでは問題なし）

---

### Mock Oracle

| Field | Detail |
|-------|--------|
| Intent | L2稼働率をモック実装で供給する（Utilization Hook 用） |
| Requirements | 2.1-2.6 |

**Responsibilities & Constraints**
- getUtilization 関数を実装（0-100%の範囲）
- デモ用の setUtilization 関数を実装
- 異常データを拒否

**Dependencies**
- Outbound: なし（独立）

**Contracts**: Service [x]

#### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMockOracle {
    /// @notice 現在の稼働率を返す
    /// @return utilization 稼働率（0-100%）
    function getUtilization() external view returns (uint256 utilization);

    /// @notice 稼働率を設定する（デモ用）
    /// @param utilization 稼働率（0-100%）
    function setUtilization(uint256 utilization) external;
}

contract MockOracle is IMockOracle {
    uint256 private _utilization = 50; // デフォルト50%

    /// @notice 現在の稼働率を返す
    function getUtilization() external view returns (uint256) {
        return _utilization;
    }

    /// @notice 稼働率を設定する（デモ用）
    /// @param utilization 稼働率（0-100%）
    function setUtilization(uint256 utilization) external {
        require(utilization <= 100, "MockOracle: utilization out of range");
        _utilization = utilization;
    }
}
```

- **Preconditions**: setUtilization で 0 <= utilization <= 100
- **Postconditions**: 設定された稼働率が getUtilization で返される
- **Invariants**: 0 <= _utilization <= 100

**Implementation Notes**
- Integration: 独立したコントラクト、Utilization Hook から参照される
- Validation: 範囲外の稼働率を拒否
- Risks: なし（シンプルなモック実装）

---

### Operator Vault

| Field | Detail |
|-------|--------|
| Intent | 裁定収益（USDC）を受け取り、運営者が引き出し可能にする |
| Requirements | 3.1-3.7 |

**Responsibilities & Constraints**
- USDC 残高管理
- 運営者のみが引き出し可能
- Arc チェーンにデプロイ

**Dependencies**
- Inbound: Settlement Orchestrator — USDC 入金 (P0)
- Outbound: USDC Token — 残高確認・転送 (P0)

**Contracts**: Service [x], Event [x]

#### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IOperatorVault {
    /// @notice USDCを入金する
    /// @param amount 入金数量
    function depositUSDC(uint256 amount) external;

    /// @notice USDCを引き出す（運営者のみ）
    /// @param amount 引き出し数量
    function withdraw(uint256 amount) external;

    /// @notice USDC残高を返す
    function balanceOf() external view returns (uint256);

    event Deposit(uint256 amount, uint256 timestamp);
    event Withdraw(address indexed operator, uint256 amount, uint256 timestamp);
}

contract OperatorVault is IOperatorVault, Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    /// @notice USDCを入金する
    function depositUSDC(uint256 amount) external nonReentrant {
        require(usdc.transferFrom(msg.sender, address(this), amount), "OperatorVault: transfer failed");
        emit Deposit(amount, block.timestamp);
    }

    /// @notice USDCを引き出す（運営者のみ）
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance >= amount, "OperatorVault: insufficient balance");
        require(usdc.transfer(msg.sender, amount), "OperatorVault: transfer failed");
        emit Withdraw(msg.sender, amount, block.timestamp);
    }

    /// @notice USDC残高を返す
    function balanceOf() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
```

- **Preconditions**: withdraw は owner のみ、残高 >= amount
- **Postconditions**: USDC が owner アドレスに転送される
- **Invariants**: balanceOf >= 0

**Implementation Notes**
- Integration: OpenZeppelin Ownable + ReentrancyGuard, USDC ERC20 インターフェース
- Validation: 残高不足時は revert
- Risks: なし（シンプルな Vault）

---

## Data Models

### Domain Model

**主要エンティティ**:

1. **CPT Token** (Value Object)
   - 属性: symbol, decimals, totalSupply
   - 制約: ERC20標準準拠、運営者のみ発行可能

2. **Operator Vault** (Entity)
   - 属性: balance (USDC), owner
   - 制約: balance >= 0, owner のみ引き出し可能

3. **Mock Oracle** (Value Object)
   - 属性: utilization (0-100%)
   - 制約: 範囲内の値のみ

**Domain Events**:
- `CPTMinted(amount, owner)`
- `USDCDeposited(amount, vault)`
- `USDCWithdrawn(operator, amount)`

**Invariants**:
- CPT Token: totalSupply >= 0
- Operator Vault: balance >= 0
- Mock Oracle: 0 <= utilization <= 100

---

### Logical Data Model

**主要構造**:

1. **CPT Token (ERC20)**
   - balances: mapping(address => uint256)
   - allowances: mapping(address => mapping(address => uint256))
   - totalSupply: uint256

2. **Operator Vault**
   - usdc: IERC20 (immutable)
   - owner: address

3. **Mock Oracle**
   - _utilization: uint256 (private)

**Consistency Boundaries**:
- CPT Token: ERC20 標準により残高整合性を保証
- Operator Vault: 単一コントラクトで USDC 残高を管理
- Mock Oracle: 単一変数で状態管理

---

### Physical Data Model

**Onchain (Ethereum L2)**:

1. **CPT Token Contract (Solidity)**
   - Storage: ERC20 標準の balances, allowances, totalSupply
   - Indexes: なし（ERC20標準で十分）

2. **Operator Vault Contract (Solidity)**
   - Storage: usdc (address), owner (address)
   - Indexes: なし

3. **Mock Oracle Contract (Solidity)**
   - Storage: _utilization (uint256)
   - Indexes: なし

---

## Error Handling

### Error Strategy

**エラーカテゴリ**:

1. **User Errors (4xx)**
   - 例: 残高不足、権限なし
   - 対応: revert with custom error

2. **System Errors (5xx)**
   - 例: コントラクトデプロイ失敗
   - 対応: デプロイスクリプトでエラー出力、処理中断

### Error Categories and Responses

**Onchain Errors**:
- `InsufficientBalance`: 残高不足 → revert
- `Unauthorized`: 権限なし → revert
- `UtilizationOutOfRange`: 稼働率範囲外 → revert

---

## Testing Strategy

### Unit Tests

1. **CPT Token Contract**: mint, transfer, balanceOf
   - mint 権限テスト（onlyOwner）
   - ERC20 標準機能テスト

2. **Mock Oracle**: getUtilization, setUtilization
   - 稼働率範囲テスト（0-100%）
   - 範囲外データ拒否テスト

3. **Operator Vault**: depositUSDC, withdraw, balanceOf
   - 入出金テスト
   - 権限制御テスト（onlyOwner）
   - ReentrancyGuard テスト

### Integration Tests

1. **CPT Token + Operator Vault**: CPTを預ける（将来拡張）
2. **Mock Oracle + Utilization Hook**: 稼働率データ取得（他仕様との統合）

---

## Security Considerations

### Authentication & Authorization

- **CPT Token**: mint 権限は owner のみ（Ownable）
- **Operator Vault**: withdraw 権限は owner のみ（Ownable）

### Data Protection

- **秘密鍵・APIキー**: 環境変数で管理（.env ファイル、gitignore）
- **ハードコード禁止**: コードに秘密情報を含まない

### Smart Contract Security

- **Reentrancy Guard**: OpenZeppelin ReentrancyGuard 使用（Operator Vault）
- **Input Validation**: すべてのパブリック関数で引数検証
- **Access Control**: onlyOwner modifier で権限制御

---

## Performance & Scalability

### Target Metrics

- **CPT Token**: mint/transfer は標準的な ERC20 性能（< 100ms）
- **Operator Vault**: 入出金は 1ブロック以内に確定

### Scaling Approach

- **ハッカソンスコープ**: 2チェーン（Base Sepolia, WorldCoin Sepolia）+ Arc
- **将来拡張**: 追加L2への拡張が容易な設計（コントラクトは独立）

---

## Deployment Strategy

**デプロイフェーズ**:

1. **Phase 1**: CPT Token デプロイ（Base Sepolia, WorldCoin Sepolia）
2. **Phase 2**: Mock Oracle デプロイ（Base Sepolia, WorldCoin Sepolia）
3. **Phase 3**: Operator Vault デプロイ（Arc）
4. **Phase 4**: コントラクトアドレス記録（JSON設定ファイル）

**Rollback Triggers**:
- コントラクトデプロイ失敗 → 再デプロイ
- アドレス記録失敗 → 手動記録

**Validation Checkpoints**:
- 各フェーズ完了時にコントラクトアドレス確認
- テストネットでの動作確認

---

## Dependencies on Other Specifications

- **uniswap-v4-integration**: Mock Oracle が提供する稼働率データを使用
- **settlement-layer**: Operator Vault が USDC を受け取る
- **dashboard-demo**: CPT Token と Operator Vault の状態を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. CPT Token が Base Sepolia と WorldCoin Sepolia にデプロイされ、mint/transfer が動作する
2. Mock Oracle が Base Sepolia と WorldCoin Sepolia にデプロイされ、稼働率データを返す
3. Operator Vault が Arc にデプロイされ、USDC の入出金が動作する
4. すべてのテストがパスする（単体テスト・統合テスト）
5. デプロイスクリプトが自動化され、コントラクトアドレスが記録される
