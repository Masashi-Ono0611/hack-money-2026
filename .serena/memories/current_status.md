# 現在のステータス（更新日: 2026-02-08）

## 確認済みの構成
- **プロジェクト名**: Ghost Yield（README/Steeringと一致）
- **ディレクトリ**: `contract/`, `frontend/`, `scripts/`, `docs/`, `.kiro/steering`, `.kiro/specs`

## コードベースの実在確認（存在ベース）

### Smart Contracts (`contract/`)
- `contract/src/ComputeToken.sol`
- `contract/src/OperatorVault.sol`
- `contract/src/MockOracle.sol`
- `contract/src/hooks/UtilizationHook.sol`
- テストとスクリプトは `contract/test/`, `contract/script/` に配置

### Offchain / Scripts (`scripts/`)
- `scripts/arbitrage/`: `arbitrage-engine.ts`, `oracle-updater.ts`, `price-watcher.ts`, `yellow-session-manager.ts`, `real-yellow-session.ts`, `index.ts` ほか
- `scripts/settlement/`: `settle-to-vault.ts`, `auto-settle.ts`, `open-channel.ts`, `test-yellow-connection.ts`, `settlement-orchestrator.ts` ほか

### Frontend (`frontend/`)
- App Router: `app/dashboard`, `app/settlement`, `app/admin`, `app/api`, `app/_components` が存在
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css` 確認

## Kiro Specs（ディレクトリ確認）
- `core-token-system/`, `dashboard-demo/`, `l2-utilization-oracle/`, `offchain-arbitrage-engine/`, `settlement-layer/`, `uniswap-v4-integration/`
- 旧仕様は `_archived-zombie-l2-clearinghouse/` に保存

## 直近の優先事項（推定）
- オフチェーン裁定フローの検証（`scripts/arbitrage/`）
- Yellow セッション + Arc 決済の通し確認（`scripts/settlement/`）
- Dashboard の可視化拡充（`frontend/app/dashboard`）
