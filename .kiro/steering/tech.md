# Technology Stack

## Architecture

**3層アーキテクチャ**: オンチェーン（価格形成・決済）/ オフチェーン（裁定実行）/ フロントエンド（可視化）

- **オンチェーン**: CPT発行・Uniswap v4市場・USDC決済・Vault管理
- **オフチェーン**: 価格監視・裁定戦略・Yellowセッション実行・決済オーケストレーション
- **フロントエンド**: 価格差・Hook状態・セッションログ・Vault残高の可視化

## Core Technologies

- **Language**: TypeScript (オフチェーン・フロントエンド), Solidity (スマートコントラクト)
- **Runtime**: Node.js 20+
- **Blockchain**: Base Sepolia (L2-A), WorldCoin Sepolia (L2-B), Arc (決済ハブ)
- **Framework**: Next.js + TailwindCSS + Shadcn/ui (フロントエンド)

## Key Libraries

### Blockchain / Smart Contract
- **Uniswap v4**: CPT/USDC プール、Hook による動的市場制御
- **Yellow SDK (Nitrolite)**: ステートチャネル・ガスレスセッション実行
- **Circle (Gateway / CCTP)**: USDC決済・クロスチェーン転送
- **Foundry or Hardhat**: スマートコントラクト開発・テスト・デプロイ

### Offchain Execution
- **viem**: コントラクト読み書き・イベント監視
- **Node.js / TypeScript**: 価格監視・裁定エンジン・決済オーケストレーション

### Frontend
- **wagmi / viem**: ウォレット接続・Tx署名
- **Recharts or Chart.js**: CPT価格と収益推移の可視化

## Development Standards

### Type Safety
- TypeScript strict mode 必須
- `any` は基本的に禁止（外部SDK型定義が不完全な場合のみ例外）
- スマートコントラクトは Solidity 0.8.x 以上を使用

### Code Quality
- ESLint + Prettier でフォーマット統一
- コントラクトは natspec コメント必須

### Testing
- **Foundry test** (コントラクト) または **Hardhat** テスト
- **Vitest** (TypeScript ロジック): 裁定エンジン・価格監視のロジックテスト
- デモ用のエンドツーエンド動作確認スクリプト

## Development Environment

### Required Tools
- Node.js 20+
- Foundry または Hardhat
- Git
- ウォレット (MetaMask 等、テスト用)

### Common Commands
```bash
# Dev (frontend): npm run dev
# Build (frontend): npm run build
# Test (contracts): forge test or npx hardhat test
# Test (offchain): npm run test
# Deploy: npm run deploy:[network]
```

## Key Technical Decisions

### 1. Uniswap v4 Hook の必然性
L2稼働率に応じた手数料・スプレッド制御により、「空いているL2ほど計算が安くなる」市場ルールをプログラマブルに実装。これは v3 では不可能で、v4 Hook の本質的な価値を示す設計。

### 2. Yellow Network の役割
CPT間の裁定は反復・高速処理が前提。オンチェーン取引ではガス・遅延・MEVに勝てないため、ステートチャネルによるガスレス実行が必須。セッション終了時のみオンチェーンに結果を反映。

### 3. Arc + USDC による決済確定
裁定収益を安定資産（USDC）で確定させ、複数L2に分散した収益を1か所に集約。L2運営者にとって「固定費を払える現実のお金」として機能。

### 4. デモ実装の優先順位
ハッカソンスコープでは以下に注力:
- Uniswap v4 Hook の動的制御ロジック（審査員が評価しやすい）
- Yellow セッション内での裁定実行（ガスレス取引のデモ）
- Arc での USDC 決済と Vault 入金（収益可視化）
- Dashboard による価格差・Hook状態・収益の可視化

---
_Document standards and patterns, not every dependency_
