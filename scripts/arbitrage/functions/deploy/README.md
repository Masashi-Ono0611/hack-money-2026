# Base Sepolia Functions 運用手順

## 対象
- チェーン: Base Sepolia (`chainId=84532`)
- 目的: `scripts/arbitrage/functions/source.js` を Chainlink Functions で定期実行し、Oracle 検証値を取得する

## 前提
- Functions Subscription を作成済み
- Subscription に LINK を入金済み
- Consumer に `FunctionsReceiver` を登録済み
- `FunctionsReceiver` を Oracle allowlist に登録済み

## 引数仕様（固定）
`source.js` の引数は次の順序で固定する。
1. `chainId`
2. `blockWindow`
3. `rpcPrimary`
4. `rpcFallback`

## デプロイ設定の生成
`buildBaseSepoliaFunctionsDeployConfig` を利用し、Router/DON/CallbackGas と引数を一貫生成する。

```ts
import { buildBaseSepoliaFunctionsDeployConfig } from "./index.js";

const cfg = buildBaseSepoliaFunctionsDeployConfig({
  rpcPrimary: process.env.ORACLE_BASE_PRIMARY_RPC!,
  rpcFallback: process.env.ORACLE_BASE_FALLBACK_RPC!,
  blockWindow: 60,
  subscriptionId: BigInt(process.env.ORACLE_BASE_FUNCTIONS_SUBSCRIPTION_ID ?? "0"),
});
```

## 更新手順
1. `source.js` を更新
2. Functions にソースを再登録
3. `FunctionsReceiver.setSource()` / `setArgs()` を owner で更新
4. `performUpkeep` 実行ログと `FunctionsResponseReceived` イベントを確認

## 障害時対応
- Functions 実行失敗:
  - `FunctionsError` を確認
  - source の構文・引数順序・RPC到達性を点検
- RPC障害:
  - `rpcPrimary` が失敗しても `rpcFallback` にフォールバックする
- LINK不足:
  - Subscription 残高を補充し再実行
