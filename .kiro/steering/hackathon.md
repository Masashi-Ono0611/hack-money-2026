# Hackathon Context (ETH Global HackMoney 2026)

## Sponsor Prize Requirements

このプロジェクトは以下3つのスポンサープライズを統合的に活用する設計です。

### 🟦 Arc / USDC (Circle)
**必然性**: 裁定収益を安定資産で確定し、L2運営費用を実際に補填できる資金にする

**使い所**:
- Yellow セッション終了後の最終ネット決済
- CPT 売買差益を USDC で確定
- Operator Vault への USDC 入金

**審査ポイント**:
- 「本当に稼げている」ことが Vault 残高で可視化される
- Gateway / CCTP を使った複数L2からの収益集約

### 🟪 Uniswap v4
**必然性**: CPTを「プログラム可能な計算市場」にし、L2稼働率を価格に反映させる

**使い所**:
- CPT / USDC プールで公的な基準価格を形成
- **v4 Hook** で L2稼働率に連動した手数料・スプレッド・スワップ制限を動的制御
- 「空いているL2ほどCPTが安くなる」市場ルールを実装

**審査ポイント**:
- **Hook が単なるラッパーではなく、本質的な価値を提供している**（v3では不可能な設計）
- 稼働率シグナルによる動的手数料調整のロジック
- Yellow 裁定の「アンカー価格」として機能

### 🟨 Yellow SDK
**必然性**: 反復的な裁定取引をガス不要・高速に実行し、コストと遅延を最小化する

**使い所**:
- CPT間の価格差を検知 → セッション開始
- オフチェーンで反復的に売買を回す（ガス不要）
- セッション終了時のみオンチェーンに最終結果を反映

**審査ポイント**:
- 「死んだL2間でも裁定が成立する」現実性
- ステートチャネルによる高速実行のデモ
- Web2並みの速度で稼働するUX

## 3技術の統合設計

> **Uniswap v4 が価格を決め、Yellow が速く動かし、Arc + USDC が価値を確定する。**

1. **Uniswap v4** で各L2のCPT/USDC価格を形成（Hook で動的制御）
2. **Yellow** でL2間の価格差を高速裁定（ガスレス・反復実行）
3. **Arc + USDC** で裁定収益を確定し、Vault に集約

## Demo Scenario (審査員向け)

### ストーリー
1. L2-A (Base Sepolia) が高稼働 → CPT-A が高い
2. L2-B (WorldCoin Sepolia) が低稼働 → CPT-B が安い（Hook により手数料減）
3. Watcher が価格差を検知 → Arbitrage Engine 起動
4. Yellow セッション内で反復売買（CPT-B 買い → CPT-A 売り）
5. セッション終了 → Arc で USDC 決済
6. Operator Vault 残高増加 → Dashboard で可視化

### デモで見せるべきポイント
- **Hook の動的制御**: 稼働率変化で手数料・スプレッドが変わる様子
- **Yellow の高速実行**: ガス不要で複数回の売買が完了
- **Arc の決済確定**: 最終的な USDC 残高増加が確認できる
- **Dashboard 可視化**: 価格差・Hook状態・セッションログ・Vault残高がリアルタイム更新

## Implementation Priorities

### Must Have (最優先)
1. **Uniswap v4 Hook** - 動的手数料制御ロジック（L2稼働率連動）
2. **Yellow Session** - ガスレス裁定実行のデモ
3. **Arc Settlement** - USDC 決済と Vault 入金
4. **Dashboard** - 価格差・収益の可視化

### Should Have (時間があれば)
- 実際の L2 稼働率取得（Oracle 統合）
- 複数 CPT ペアの同時監視
- エラーハンドリング・リトライロジック

### Nice to Have (余裕があれば)
- 履歴データの保存・チャート表示
- リスク管理ロジック（最大ポジション制限等）
- マルチチェーン対応の拡張

## Judging Criteria Alignment

### Innovation (革新性)
- L2を「分散型クラウド計算資産」として再定義
- 需要に依存しない収益モデルの提案

### Technical Implementation (技術実装)
- 3つのスポンサー技術を本質的に統合
- Hook / セッション / 決済の一貫した設計

### Practicality (実用性)
- L2運営の実際の課題（固定費補填）に対応
- 実収益が USDC で可視化される

### UX/Design (UX/デザイン)
- Dashboard で価格差・Hook状態・収益を分かりやすく表示
- 審査員が「動いている」ことを直感的に理解できる

## Risk Mitigation

### 技術リスク
- **Yellow SDK 統合難易度**: 事前にドキュメント確認・サンプルコード実装
- **Uniswap v4 Hook デプロイ**: テストネットで十分に検証
- **Arc 決済フロー**: Circle ドキュメントと Skills を活用

### デモリスク
- **ネットワーク遅延**: ローカル環境でのフォールバック準備
- **価格差が発生しない**: モック価格データでのデモシナリオ用意
- **時間不足**: MVP スコープを明確化し、優先順位付け

---
_Focus on hackathon-specific context and sponsor requirements_
