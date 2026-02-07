# Current Status（更新日: 2026-02-07）

## 全体サマリ
- リポジトリはクリーン（`git status --short` の差分なし）。
- Kiro 仕様は複数並行で管理され、`offchain-arbitrage-engine` は **tasks 承認済みで実装着手可能**。
- コントラクト基盤（CPT/Oracle/Vault + Uniswap v4 Hook）は実装・テスト資産が存在。
- Offchain Arbitrage Engine 本体（価格監視/裁定戦略/Yellow セッション管理の TypeScript 実装）は未着手。

## Kiro Spec 進捗
- `offchain-arbitrage-engine`: `tasks-generated`, ready_for_implementation=true
- `uniswap-v4-integration`: `tasks-generated`, ready_for_implementation=true
- `core-token-system`: `tasks-generated`, ready_for_implementation=true
- `dashboard-demo`: `design-generated`, tasks 未承認（実装未着手）
- `settlement-layer`: `requirements-generated`（初期段階）

## 実装済み（確認できるファイルベース）
### Smart Contracts
- `contract/src/ComputeToken.sol`
- `contract/src/MockOracle.sol`
- `contract/src/OperatorVault.sol`
- `contract/src/hooks/UtilizationHook.sol`
- 補助: `contract/src/lib/HookMiner.sol`

### Contract Scripts
- `contract/script/DeployCore.s.sol`
- `contract/script/DeployHook.s.sol`
- `contract/script/InitializePool.s.sol`
- `contract/script/AddLiquidity.s.sol`
- `contract/script/MintCpt.s.sol`
- `contract/script/VerifyHookBehavior.s.sol`

### Tests（Foundry）
- `contract/test/UtilizationHook.t.sol`
- `contract/test/PoolHookIntegration.t.sol`
- `contract/test/Integration.t.sol`
- `contract/test/V4Setup.t.sol`
- `contract/test/CPTToken.t.sol`
- `contract/test/MockOracle.t.sol`
- `contract/test/OperatorVault.t.sol`
- `contract/test/Security.t.sol`

### Frontend
- Next.js 構成は存在（`frontend/app/layout.tsx`, `frontend/app/page.tsx`, `frontend/app/globals.css`）。
- 現状は最小構成で、ダッシュボード仕様実装はこれから。

### Offchain Scripts
- `scripts/arc-transfer.ts`
- `scripts/settle-to-vault.ts`

## 未着手・優先課題
1. `offchain-arbitrage-engine` の実装開始（Task 1〜7）。
2. Yellow 実 SDK 統合可否の調査と、不可時のモック運用方針確定。
3. `dashboard-demo` の tasks 承認・実装着手。
4. `settlement-layer` の requirements フェーズ前進。

## 実装開始時の最短ルート
1. 共有基盤（型/ロガー/リトライ/設定）を先に実装。
2. 価格監視 → 裁定戦略 → セッション管理を順次接続。
3. モックで end-to-end を先に成立させてから Yellow 実統合を差し込む。