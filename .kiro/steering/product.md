# Product Overview

Zombie L2 Clearinghouse は、低稼働なEthereum L2チェーンの計算リソースをトークン化し、ガスレス裁定によってUSDC収益を生み出す財務レイヤーです。

## Core Capabilities

### 1. 計算リソースの資産化
各L2の計算コストを **Compute Token (CPT)** としてERC20トークン化し、「空いている計算リソース」を取引可能な資産に変換します。

### 2. プログラム可能な価格市場
Uniswap v4 を用いて CPT / USDC の基準市場を構築。v4 Hook により L2 稼働率に連動して手数料・スプレッドを動的制御し、「空いているL2ほどCPTが安くなる」市場ルールを実装します。

### 3. ガスレス高速裁定
Yellow SDK のステートチャネルを活用し、複数のL2間に生じる CPT 価格差を反復的にガス不要で裁定。最終結果のみオンチェーンで確定させることで、コストと遅延を最小化します。

### 4. USDC 収益の確定・還元
Arc + Circle を介して裁定収益を USDC で決済・集約し、L2運営者の Vault に入金。実際のインフラ運用費用を支払える資金として機能します。

## Target Use Cases

- **低稼働L2の収益化**: ユーザー数・取引量が少ないL2が、需要回復までの間に継続的な収益を確保する
- **固定費の補填**: ノード・RPC・ブリッジ等のインフラコストを裁定収益で直接補填する
- **チェーン停止リスクの軽減**: ランウェイを延長し、キラーdApp出現までチェーンを維持する

## Value Proposition

**従来**: L2は「ユーザー不足 → 収益ゼロ → 固定費のみ → チェーン停止」という構造的問題を抱える

**本プロダクト**: 「ユーザーがいなくても収益が発生する」仕組みを提供
- L2運営にとって: 需要に依存しない収益モデルによる財務安定化
- Ethereumエコシステムにとって: トラフィック一極集中の緩和、多様なL2の共存促進
- 長期的には: L2を分散型クラウド計算資産として再定義し、新しいDeFi市場を創出

## 技術的差別化要素

1. **Uniswap v4 Hook**: L2稼働率を価格メカニズムに反映する動的市場制御
2. **Yellow Network**: オフチェーンセッションによる高速・ガスレス裁定実行
3. **Arc + USDC**: 安定資産による決済確定と複数L2収益の集約

---

## Target Chains (Hackathon Scope)

- **L2-A**: Base Sepolia
- **L2-B**: WorldCoin Sepolia

## Project Context

ETH Global HackMoney 2026 ハッカソンプロジェクト。スポンサープライズ要件（Uniswap v4 / Yellow / Arc・Circle）を満たしつつ、実用的なL2財務インフラとして設計されています。

---
_Focus on patterns and purpose, not exhaustive feature lists_
