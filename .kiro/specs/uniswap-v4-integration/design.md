# Design Document: Uniswap v4 Integration

## Overview

**Purpose**: Uniswap v4 Integration は、CPT/USDC 市場を構築し、L2稼働率に応じて手数料を動的に制御するHookを実装します。

**Users**:
- **トレーダー/ボット**: CPT/USDC 市場で取引
- **システム（Hook）**: L2稼働率に応じて手数料を動的調整
- **開発者**: CREATE2 + HookMiner パターンでデプロイ

**Impact**:
「空いているL2ほど計算が安くなる」市場ルールを実現し、計算リソースの需給を価格に反映させます。

### Goals

- Uniswap v4 Hook による動的手数料制御
- CREATE2 + HookMiner パターンによる適切なアドレスデプロイ
- CPT/USDC Pool の初期化と流動性提供

### Non-Goals

- CPT Token 発行（core-token-system 仕様）
- Mock Oracle 実装（core-token-system 仕様）
- 価格監視ロジック（offchain-arbitrage-engine 仕様）

---

## Architecture

### Utilization Hook Component

| Field | Detail |
|-------|--------|
| Intent | L2稼働率に応じてUniswap v4 スワップ手数料を動的に制御する |
| Requirements | 2.1-2.9 |

**Responsibilities & Constraints**
- Uniswap v4 Hook インターフェース準拠
- beforeSwap で稼働率を取得し、手数料を調整
- Hook 実行権限は Uniswap v4 Pool のみ
- **CREATE2 + HookMiner パターンでデプロイ（アドレスビットパターン制約対応）**

**Dependencies**
- Inbound: Uniswap v4 Pool — beforeSwap 呼び出し (P0)
- Outbound: Mock Oracle — 稼働率シグナル取得 (P0)

#### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseHook} from "@uniswap/v4-periphery/src/base/hooks/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

interface IUtilizationHook {
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external returns (bytes4, uint24 fee);

    function getUtilization() external view returns (uint256 utilization);
}

contract UtilizationHook is BaseHook {
    address public immutable mockOracle;

    constructor(IPoolManager _poolManager, address _mockOracle) BaseHook(_poolManager) {
        mockOracle = _mockOracle;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Get utilization from Mock Oracle
        uint256 utilization = IMockOracle(mockOracle).getUtilization();

        // Calculate dynamic fee based on utilization
        uint24 fee;
        if (utilization < 30) {
            fee = 500; // 0.05% (low utilization)
        } else if (utilization < 70) {
            fee = 3000; // 0.3% (standard)
        } else {
            fee = 10000; // 1.0% (high utilization)
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
    }
}
```

---

### CREATE2 + HookMiner デプロイ戦略

**Uniswap v4 Hook アドレス制約**:
- Hook の機能（beforeSwap 等）はアドレスの特定ビットで示される
- 例: `beforeSwap` を有効にするには、アドレスの特定ビットが `1` である必要がある

**CREATE2 + HookMiner パターン**:

```solidity
// Hook デプロイ用のヘルパー（Uniswap v4-periphery から参照）
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

// デプロイスクリプト (Foundry)
contract DeployUtilizationHook is Script {
    function run() external {
        // 1. 必要な Hook フラグを定義
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        // 2. CREATE2 で適切なアドレスを探索
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(UtilizationHook).creationCode,
            abi.encode(poolManager, mockOracle)
        );

        // 3. CREATE2 でデプロイ
        vm.startBroadcast();
        UtilizationHook hook = new UtilizationHook{salt: salt}(
            poolManager,
            mockOracle
        );
        vm.stopBroadcast();

        require(address(hook) == hookAddress, "Hook address mismatch");
    }
}
```

**フォールバック**: HookMiner が適切なアドレスを見つけられない場合、salt の探索範囲を拡大

---

## Testing Strategy

### Unit Tests

1. **Utilization Hook**: beforeSwap（稼働率による手数料調整）
   - 稼働率 < 30% → 0.05% 手数料
   - 稼働率 30-70% → 0.3% 手数料
   - 稼働率 > 70% → 1.0% 手数料

### Integration Tests

1. **Uniswap v4 Pool + Hook**: スワップ時のHook呼び出し
2. **CREATE2 + HookMiner**: アドレスビットパターン検証

---

## Deployment Strategy

**デプロイフェーズ**:

1. **Phase 1**: CREATE2 + HookMiner で Utilization Hook をデプロイ（Base Sepolia, WorldCoin Sepolia）
2. **Phase 2**: Uniswap v4 Pool を CPT/USDC ペアで初期化
3. **Phase 3**: 初期流動性提供（テスト用）
4. **Phase 4**: コントラクトアドレス記録（JSON設定ファイル）

---

## Dependencies on Other Specifications

- **core-token-system**: CPT Token と Mock Oracle が必須
- **offchain-arbitrage-engine**: Pool 価格を監視
- **dashboard-demo**: Hook 状態を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. Utilization Hook が CREATE2 + HookMiner パターンでデプロイされる
2. Uniswap v4 Pool が CPT/USDC ペアで初期化される
3. スワップ時に Hook が動的手数料を適用する
4. すべてのテストがパスする（単体テスト・統合テスト）
5. デプロイスクリプトが自動化され、コントラクトアドレスが記録される
