# Style & Conventions（更新日: 2026-02-08）

## 言語・コミュニケーション
- **チャット応答**: 日本語
- **ドキュメント/Specs**: `spec.json` の言語指定（日本語想定）
- **コミットメッセージ**: Conventional Commits（英語）

## コーディング規約

### Frontend
- **フレームワーク**: Next.js App Router
- **スタイル**: Tailwind CSS 4
- **UI**: Shadcn/ui（Radix UI）
- **フォーマット**: Biome（`bun run format`）
- **Lint**: ESLint（`bun run lint`）

### Contracts
- **Solidity**: NatSpec コメント必須
- **フォーマット**: `forge fmt`
- **テスト**: `forge test`

### Scripts
- **TypeScript**: Strict（`tsconfig.json`）
- **実行**: `tsx`
- **テスト**: Vitest

## 開発姿勢
- **Spec Driven Development**: `.kiro/specs/` と `.kiro/steering/` がSoT
- **3段階承認**: Requirements → Design → Tasks
- **Boy Scout Rule**: 触った箇所は改善
- **エラー処理**: 根本原因を修正（抑制は不可）
- **コメント**: "why" を説明（"what" はコードで示す）

## 実行ルール
- 変更時は関連テスト/フォーマットを優先的に実行
- 追加依存は最小限（必要性/ライセンス/保守性を確認）
