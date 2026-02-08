# プロジェクト概要（更新日: 2026-02-08）

**Ghost Yield** は、低稼働なEthereum L2チェーンの計算リソースを **Compute Token (CPT)** としてトークン化し、ガスレス裁定によってL2運営者にUSDC収益を生み出す財務レイヤーです。

## コアコンセプト
- **CPT (Compute Token)**: L2の実行能力を表す資産。1 CPT = 1,000,000 GSU。
- **Uniswap v4 + Hooks**: CPT/USDC市場を形成し、L2稼働率に応じた動的手数料・スプレッド制御を実装。
- **Yellow Network**: ガスレス・高速の意図ベース取引で裁定を反復実行。
- **Arc + Circle (USDC)**: 裁定利益をUSDCで確定し、Operator Vaultに集約。

## 価値提供
- **L2 Operators**: ユーザー不在でも「第2の収益源」を確保。
- **Traders/Bots**: ガスコストのボラティリティを取引可能な資産クラスへ。
- **Developers**: 計算コストの事前購入・予算化を可能に。

## 対象チェーン（Hackathon Scope）
- Base Sepolia
- WorldCoin Sepolia

## 構成要素（実装の柱）
1. **スマートコントラクト**（`contract/`）
   - CPT Token / Operator Vault / Utilization Hook
2. **オフチェーン裁定**（`scripts/`）
   - Arbitrage Engine / Oracle Updater / Yellow Session
3. **収益決済**（`scripts/settlement/`）
   - Arc/USDC Settlement / Vault入金
4. **ダッシュボード**（`frontend/`）
   - 価格差・Vault残高・Hook状態の可視化

## 一文まとめ
**「Uniswap v4 が価格を決め、Yellow が速く動かし、Arc + USDC が価値を確定する」**
