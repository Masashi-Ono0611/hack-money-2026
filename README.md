# hack-money-2026

## short discription

Zombie L2 Clearinghouse は、
低稼働なEthereum L2チェーンの計算リソースをトークン化し、
ガスレス裁定によってUSDC収益を生み出す財務レイヤーです。

## Overview

EthereumのLayer 2エコシステムでは、
多くのチェーンが「ユーザー不足 → 収益ゼロ → 固定費だけが残る」
という構造的な問題を抱えています。
この結果、有望なL2であっても、キラーdAppが現れる前に
チェーン停止や撤退に追い込まれてしまいます。

Zombie L2 Clearinghouse は、
この問題を「ユーザーが来るまで耐える」のではなく、
「ユーザーがいなくても収益が回る」仕組みで解決します。

本プロダクトでは、各L2の計算コストを
**Compute Token（CPT）**としてトークン化し、
Uniswap v4 を用いて CPT / USDC の基準価格市場を構築します。
さらに v4 Hook により、L2の稼働率に応じて
手数料やスプレッドを動的に制御し、
「空いているL2ほど計算が安くなる」市場ルールを実装します。

生じたCPT価格差は、Yellow SDK の
ガス不要・高速なセッション取引によって裁定され、
最終的な差益は Arc を介して USDC で決済されます。
このUSDCはL2運営者のVaultに集約され、
ノード運用やシーケンサーなどの固定費を直接補填します。

Zombie L2 Clearinghouse は、
死にかけたL2を復活させるプロジェクトではありません。
需要が戻るまでチェーンを生かし続けるための、
新しいL2財務インフラです。

今回のハッカソンで採用するL2ブロックチェーン

- unichain
- Linea

## このプロダクトで解決したい課題

EthereumのLayer 2エコシステムでは、多くのチェーンが
**ユーザー数・取引量・流動性の不足**という共通課題を抱えています。

L2はユーザーが増えない限り、

* 手数料収益やSequencer収益が発生しない
* それにも関わらず、ノード運用・RPC・ブリッジ・監視などの
  **固定インフラコストは継続的に発生**する
* 一定期間赤字が続くと、**チェーン停止・撤退**を選ばざるを得ない

という構造的な問題に直面します。

この結果、
「キラーdAppが生まれる前にL2が消える」
「一部の大規模L2にトラフィックが集中する」
といった状況が生まれ、Ethereum全体の**分散性・耐障害性**が損なわれています。

👉 **問題の本質は「需要がないと何もできないL2運営モデル」そのものです。**

## このプロダクトの解決アプローチ

Zombie L2 Clearinghouse は、
**ユーザー需要に依存しない収益モデル**をL2運営に提供します。

### 1. 計算リソースを資産化する

各L2の計算コストを **Compute Token（CPT）**としてトークン化し、
「空いている計算リソース」を取引可能な資産として定義します。

### 2. プログラム可能な価格市場を作る

Uniswap v4 を用いて CPT / USDC の基準市場を構築し、
v4 Hook によって L2 の稼働率に応じて
手数料やスプレッドを動的に調整します。

これにより、
**「空いているL2ほどCPTが安くなり、買われやすい」**
という市場ルールが自動的に成立します。

### 3. 価格差を高速・低コストで収益化する

複数の低稼働L2間に生じる CPT の価格差を、
Yellow SDK のガス不要・高速なセッション取引によって裁定します。

反復取引はオフチェーンで行い、
最終結果のみをオンチェーンで確定させることで、
コストと遅延を最小化します。

### 4. 収益をUSDCで確定し、運営に還元する

裁定によって得られた差益は、
Arc を介して **USDCで決済・集約**され、
L2運営者のVaultに直接入金されます。

これにより、
裁定収益が **実際のインフラ運用費用を支払える資金**として機能します。

## このプロダクトが与えるインパクト

### L2運営にとってのインパクト

* **ユーザーがいなくても収益が発生**
* 固定インフラコストを部分的または継続的に補填
* チェーン停止までのランウェイを延長
* 「失敗したL2」という評価を回避し、将来の選択肢を維持

### Ethereumエコシステム全体へのインパクト

* トラフィックの一極集中リスクを緩和
* 小規模・新規L2が即死しない構造を提供
* 多様なL2が共存できる、より健全なエコシステムを促進

### 長期的な可能性

* L2を **分散型クラウド計算資産**として再定義
* 計算コストをベースとした新しいDeFi市場の創出
* 将来的にはWeb3以外の計算需要（AI・バッチ処理等）への拡張も可能

## System Architecture Diagram

```mermaid
flowchart LR
  %% =========================
  %% Low-activity L2 Chains
  %% =========================
  subgraph L2A["Low-Activity L2 A (e.g. Unichain)"]
    CPTA["CPT-A\n(Compute Token)"]
  end

  subgraph L2B["Low-Activity L2 B (e.g. Linea)"]
    CPTB["CPT-B\n(Compute Token)"]
  end

  %% =========================
  %% Uniswap v4 Pricing Layer
  %% =========================
  subgraph UNI["Uniswap v4 Pricing Layer"]
    POOLA["CPT-A / USDC Pool\n+ v4 Hook"]
    POOLB["CPT-B / USDC Pool\n+ v4 Hook"]
  end

  %% =========================
  %% Arbitrage & Execution
  %% =========================
  WATCHER["Price Discrepancy Watcher"]
  ENGINE["Ghost Arbitrage Engine"]

  subgraph YELLOW["Yellow Network\n(State Channel Execution)"]
    SESSION["Gasless Arbitrage Session"]
  end

  %% =========================
  %% Settlement Layer
  %% =========================
  subgraph ARC["Arc + Circle Settlement Hub"]
    USDC["USDC Settlement"]
  end

  VAULT["Operator Vault\n(USDC)"]

  %% =========================
  %% Dashboard
  %% =========================
  DASH["Dashboard / UI"]

  %% =========================
  %% Token & Pricing Flow
  %% =========================
  CPTA --> POOLA
  CPTB --> POOLB

  POOLA --> WATCHER
  POOLB --> WATCHER

  WATCHER --> ENGINE

  ENGINE --> SESSION

  SESSION --> USDC
  USDC --> VAULT

  %% =========================
  %% Observability
  %% =========================
  POOLA -. price .-> DASH
  POOLB -. price .-> DASH
  SESSION -. trades .-> DASH
  VAULT -. balance .-> DASH

```

## Functions

|  # | 機能名                            | 目的                     | 入力               | 出力/状態変化       | 主なコンポーネント                   |
| -: | ------------------------------ | ---------------------- | ---------------- | ------------- | --------------------------- |
|  1 | CPT（Compute Token）発行/管理        | 「計算コスト」を取引可能な資産にする     | 管理者操作            | CPT供給・残高      | CPT Token（ERC20）、Operator権限 |
|  2 | CPT/USDC 基準市場（Uniswap v4 Pool） | CPTの「公的価格」を形成          | 流動性提供、Swap       | Price/LP状態    | Uniswap v4 Pool             |
|  3 | Uniswap v4 Hook（市場ルール制御）       | L2稼働率に連動して手数料/スプレッドを変更 | 稼働率シグナル、Swap呼び出し | fee/spread/制限 | v4 Hook + Oracle(モック可)      |
|  4 | 価格乖離検知（Watcher）                | 裁定機会を特定                | 2チェーンのCPT/USDC価格 | 乖離イベント        | Watcher（bot/script）         |
|  5 | Ghost Arbitrage Engine（戦略生成）   | 裁定の実行方針決定              | 乖離イベント           | Session指示     | Strategy/Executor           |
|  6 | Yellow セッション（ガスレス高速執行）         | 反復取引をガス不要で回す           | Session開始、注文群    | オフチェーン約定ログ    | Yellow SDK / Session        |
|  7 | 最終決済（USDC）                     | 利益を確定して運営に戻す           | セッション結果（net）     | USDC移転        | Arc + Circle（決済）            |
|  8 | Operator Vault                 | 運営収益の受け皿               | USDC入金           | 残高増加          | Vault Contract              |
|  9 | Dashboard                      | 見せる・監視する               | 価格/ログ/残高         | 可視化           | Web UI / Indexer            |

## Sequence Diagram

### 2-1. CPT発行/管理（L2ごと）

```mermaid
sequenceDiagram
  autonumber
  actor Operator as L2運営者
  participant CPT as CPT Token (ERC20)
  participant Vault as Operator Vault

  Operator->>CPT: mint(amount) ※運営者権限
  CPT-->>Operator: CPT残高増加
  Operator->>Vault: depositCPT(amount)
  Vault-->>Operator: VaultにCPT保管/記録
```

### 2-2. CPT/USDC 基準市場（Uniswap v4 Pool）でのSwap

```mermaid
sequenceDiagram
  autonumber
  actor Trader as トレーダー/ボット
  participant Pool as Uniswap v4 Pool (CPT/USDC)
  participant CPT as CPT Token
  participant USDC as USDC Token

  Trader->>Pool: swapExactIn(USDC->CPT or CPT->USDC)
  Pool->>USDC: transferFrom(Trader, Pool, amountIn)
  Pool->>CPT: transfer(Pool, Trader, amountOut)
  Pool-->>Trader: swap結果（価格が形成される）
```

### 2-3. Uniswap v4 Hook（稼働率連動の手数料/スプレッド調整）

> ここが「Uniswap v4を使う必然性」の核です（審査員が最も評価しやすい部分）。

```mermaid
sequenceDiagram
  autonumber
  actor Trader as トレーダー/ボット
  participant Pool as Uniswap v4 Pool
  participant Hook as v4 Hook
  participant Oracle as Utilization Oracle(モック可)

  Trader->>Pool: swap(...)
  Pool->>Hook: beforeSwap(params)
  Hook->>Oracle: getUtilization(L2)
  Oracle-->>Hook: utilization / gas signal
  Hook-->>Pool: fee/spread/limit を返す
  Pool-->>Trader: Hook反映後のswap実行
```

### 2-4. 価格乖離検知（Watcher）

```mermaid
sequenceDiagram
  autonumber
  participant Watcher as Price Watcher
  participant PoolA as Uniswap v4 Pool (CPT-A/USDC)
  participant PoolB as Uniswap v4 Pool (CPT-B/USDC)
  participant Engine as Ghost Arbitrage Engine

  loop 定期ポーリング or イベント購読
    Watcher->>PoolA: getQuote()/readPrice()
    PoolA-->>Watcher: priceA
    Watcher->>PoolB: getQuote()/readPrice()
    PoolB-->>Watcher: priceB
  end

  alt 乖離が閾値以上
    Watcher->>Engine: onDiscrepancy(priceA, priceB)
  else 乖離なし
    Watcher-->>Watcher: no-op
  end
```

### 2-5. Ghost Arbitrage Engine（戦略生成 → Yellowセッション開始）

```mermaid
sequenceDiagram
  autonumber
  participant Engine as Ghost Arbitrage Engine
  participant Risk as Risk Controller(任意)
  participant Yellow as Yellow SDK
  participant Session as Yellow Session

  Engine->>Risk: check(discrepancy, limits)
  Risk-->>Engine: OK / Reject

  alt OK
    Engine->>Yellow: createSession(params)
    Yellow-->>Engine: sessionId / sessionKey
    Engine->>Session: submitOrders(買い/売り指示)
  else Reject
    Engine-->>Engine: abort
  end
```

### 2-6. Yellow セッション内（ガスレス高速執行 → 終了）

```mermaid
sequenceDiagram
  autonumber
  participant Engine as Arbitrage Engine
  participant Session as Yellow Session
  participant Node as Yellow Node/Matcher

  loop 反復取引（高速）
    Engine->>Session: placeOrder(update)
    Session->>Node: off-chain match/route
    Node-->>Session: executionResult
    Session-->>Engine: ack / filled
  end

  Engine->>Session: closeSession()
  Session-->>Engine: finalNetState (net profit/loss)
```

### 2-7. 最終決済（Arc + USDC）→ Operator Vault入金

※ここは実装の都合で「Arcで最終USDCを受け取る」形にしておくと、デモが非常に分かりやすいです。

```mermaid
sequenceDiagram
  autonumber
  participant Engine as Arbitrage Engine
  participant Arc as Arc Settlement
  participant USDC as USDC Token
  participant Vault as Operator Vault

  Engine->>Arc: settle(finalNetState)
  Arc->>USDC: transfer(Vault, profitAmount)
  USDC-->>Vault: Vault残高更新
  Arc-->>Engine: settlementTx / receipt
```

### 2-8. Dashboard（可視化：価格・Hook状態・セッションログ・Vault残高）

```mermaid
sequenceDiagram
  autonumber
  actor User as 審査員/運営者
  participant UI as Dashboard
  participant Indexer as Indexer/Backend
  participant PoolA as Pool A
  participant PoolB as Pool B
  participant Session as Yellow Session
  participant Vault as Operator Vault

  User->>UI: open
  UI->>Indexer: fetchLatest()
  Indexer->>PoolA: readPrice()
  PoolA-->>Indexer: priceA
  Indexer->>PoolB: readPrice()
  PoolB-->>Indexer: priceB
  Indexer->>Session: readLogs()
  Session-->>Indexer: trades/logs
  Indexer->>Vault: balanceOf(USDC)
  Vault-->>Indexer: usdcBalance
  Indexer-->>UI: render(prices, logs, balance)
```

## このプロダクトにおけるスポンサープライズの技術の「使い所」

### 🟦 Arc / USDC（Circle）

**役割：最終決済と財務集約レイヤー**

**なぜ使うか**

* 裁定で得た利益を **安定資産（USDC）で確定**させるため
* 複数L2に分散した収益を **1か所に集約**するため
* 「本当に稼げている」ことを**一目で示すため**

**具体的な使い所**

* Yellowセッション終了後の**最終ネット決済**
* CPT売買による差益を **USDCで確定**
* L2運営者の **Operator Vault にUSDCを入金**

**価値**

* L2運営にとって「固定費を払える現実のお金」になる
* 審査員に「これはデモではなく実収益」と伝わる

---

### 🟪 Uniswap v4

**役割：CPT（計算リソース）の価格形成と市場ルール制御**

**なぜ使うか**

* CPTを「ただのトークン」ではなく
  **プログラム可能な計算市場**にするため

**具体的な使い所**

* **CPT / USDC プール**を作成し、公的な基準価格を形成
* **v4 Hook**を用いて以下を動的に制御：

  * 手数料
  * スプレッド
  * スワップ制限
* L2の稼働率が低いほど、CPTが **安く・買われやすく**なる市場設計

**価値**

* 「L2が空いている＝計算が安い」という現実を価格に反映
* Yellowによる裁定の **基準価格（アンカー）** になる
* Uniswap v4 Prize に直結する設計

---

### 🟨 Yellow SDK

**役割：裁定取引の高速・ガスレス実行レイヤー**

**なぜ使うか**

* CPT価格差の裁定は **反復・高速処理が前提**
* オンチェーン取引では **ガス・遅延・MEV** に勝てない

**具体的な使い所**

* CPT間の裁定取引を **オフチェーンセッション**で実行
* ガス不要で何度も売買を回す
* セッション終了時のみオンチェーンに結果を反映

**価値**

* 「死んだL2間でも裁定が成立する」現実性
* UXとコストの両立（Web2並みの速度）
* Yellow Prize 要件を自然に満たす

---

## 3技術の関係を一言で

> **Uniswap v4 が価格を決め、
> Yellow が速く動かし、
> Arc + USDC が価値を確定する。**

## Tech Stacks

## 技術スタック一覧（提案）

### ① ブロックチェーン / ネットワーク

| 区分   | 採用候補         | 用途                           |
| ---- | ------------ | ---------------------------- |
| L2-A | Unichain（想定） | CPT発行、Uniswap v4 pool、価格形成   |
| L2-B | Linea（想定）    | CPT発行、Uniswap v4 pool、価格形成   |
| 決済ハブ | Arc          | USDC最終決済、Operator Vault 収益集約 |

### ② スマートコントラクト（オンチェーン）

| コンポーネント         | 技術                 | 用途/責務                    |
| --------------- | ------------------ | ------------------------ |
| CPT Token       | Solidity（ERC20ベース） | 計算クレジットの発行・移転・残高管理       |
| Operator Vault  | Solidity           | USDC収益の受け皿、会計用イベント       |
| Uniswap v4 Pool | Uniswap v4         | CPT/USDCの価格市場（アンカー）      |
| Uniswap v4 Hook | Uniswap v4 Hooks   | L2稼働率に応じた手数料/スプレッド/制限の制御 |

### ③ オフチェーン実行（裁定・セッション）

| コンポーネント                 | 技術                            | 用途/責務                       |
| ----------------------- | ----------------------------- | --------------------------- |
| Ghost Arbitrage Engine  | Node.js / TypeScript          | 価格乖離検知→戦略生成→執行指示            |
| Price Watcher           | Node.js / TypeScript          | 各L2のCPT/USDC価格監視（Uniswap参照） |
| Gasless Execution       | Yellow SDK（Nitrolite/Session） | セッション内で裁定を反復実行（ガス不要・高速）     |
| Settlement Orchestrator | Node.js / TS                  | セッション終了→ArcでUSDC決済→Vault入金  |

### ④ USDC 決済・クロスチェーン

| コンポーネント | 技術                       | 用途/責務           |
| ------- | ------------------------ | --------------- |
| USDC決済  | Circle（Gateway / CCTP想定） | 利益のUSDC確定・移動    |
| 決済チェーン  | Arc                      | USDC集約・最終残高の可視化 |

### ⑤ フロントエンド（ダッシュボード）

| コンポーネント  | 技術                    | 用途/責務                          |
| -------- | --------------------- | ------------------------------ |
| Web UI   | Next.js + TailwindCSS + Shadcn/ui | 価格差、Hook状態、セッションログ、Vault残高の可視化 |
| Wallet接続 | wagmi / viem          | ウォレット接続、Tx署名（必要な場合のみ）          |
| チャート     | Recharts / Chart.js   | CPT価格と収益推移の可視化                 |

### ⑥ インデクサ / データ取得

| コンポーネント       | 技術            | 用途/責務                     |
| ------------- | ------------- | ------------------------- |
| Onchain Read  | viem          | Pool価格・Vault残高・イベント取得     |
| Logs Indexing | 自前Indexer（軽量） | デモ用に必要なイベントだけ保持（価格・決済・ログ） |

### ⑦ 開発・テスト・デプロイ

| 区分       | 技術                    | 用途                           |
| -------- | --------------------- | ---------------------------- |
| コントラクト開発 | Foundry or Hardhat    | コントラクトテスト、デプロイ               |
| テスト      | Foundry test / Vitest | Hook・CPT・Vault・botロジックの単体テスト |
| デプロイ     | スクリプト（TS）             | L2-A/B + Arc へデプロイ           |
| CI（任意）   | GitHub Actions        | lint/testの自動実行               |
