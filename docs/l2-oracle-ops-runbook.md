# L2 Utilization Oracle 運用 Runbook

本書は `l2-utilization-oracle` の運用・監査導線を定義する。
対象は Base Sepolia / Unichain Sepolia の Oracle, Hook, FunctionsReceiver, offchain bot。

## 1. イベント監視クエリ例（Task 8.1）

### 1.1 Oracle 更新イベント

`UtilizationUpdated(uint256 utilization, uint8 source, uint256 updatedAt)` を監視する。

```bash
cast logs \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --address $ORACLE_ADDRESS \
  --from-block $FROM_BLOCK \
  --to-block latest \
  "UtilizationUpdated(uint256,uint8,uint256)"
```

`source` は `1=bot`, `2=functions`。`source` は indexed ではないため、取得結果をデコードして集計する。

### 1.2 権限変更イベント

```bash
cast logs \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --address $ORACLE_ADDRESS \
  --from-block $FROM_BLOCK \
  --to-block latest \
  "UpdaterAuthorizationChanged(address,bool)"
```

### 1.3 TTL 変更イベント

```bash
cast logs \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --address $ORACLE_ADDRESS \
  --from-block $FROM_BLOCK \
  --to-block latest \
  "TtlUpdated(uint256)"
```

### 1.4 Functions 実行イベント

```bash
cast logs \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --address $FUNCTIONS_RECEIVER_ADDRESS \
  --from-block $FROM_BLOCK \
  --to-block latest \
  "FunctionsResponseReceived(bytes32,uint256)"

cast logs \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --address $FUNCTIONS_RECEIVER_ADDRESS \
  --from-block $FROM_BLOCK \
  --to-block latest \
  "FunctionsError(bytes32,bytes)"
```

### 1.5 stale フォールバック監視

```bash
cast logs \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --address $HOOK_ADDRESS \
  --from-block $FROM_BLOCK \
  --to-block latest \
  "StaleFallbackApplied(bytes32,uint256,uint8)"
```

発生時は「staleにより `DEFAULT_FEE` が適用された」ことを意味する。

## 2. stale 検知アラート条件（Task 8.2）

### 2.1 監視指標

`getUtilizationWithMeta()` の `updatedAt`, `stale`, `source` を監視する。

```bash
cast call $ORACLE_ADDRESS \
  "getUtilizationWithMeta()(uint256,uint256,bool,uint8)" \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

### 2.2 推奨アラート閾値

1. Warning: `block.timestamp - updatedAt > staleTtl * 0.8`
2. Critical: `stale == true` が 2 連続ポーリングで継続
3. Critical: `StaleFallbackApplied` が 1 回でも発火

### 2.3 SLO 目安

1. bot 更新間隔: 60 秒（目標）
2. Functions 検証間隔: 15 分（目標）
3. stale 許容上限: 20 分（`DEFAULT_STALE_TTL`）

## 3. LINK 残高監視手順（Task 8.3）

対象は Base Sepolia の Functions Subscription と Automation Upkeep 残高。

### 3.1 日次確認項目

1. Functions Subscription の LINK 残高
2. Automation Upkeep の LINK 残高
3. 直近 24h の `FunctionsError` 発生件数

### 3.2 推奨アラート閾値

1. Warning: 予測 3 日未満の残高
2. Critical: 予測 1 日未満の残高

予測は「直近 24h 消費量」を基準に算出する。

### 3.3 補充フロー

1. Chainlink 管理画面で対象 Subscription / Upkeep を開く
2. LINK を追加入金する
3. `performUpkeep` または次回スケジュール実行で復旧確認する
4. `FunctionsResponseReceived` を確認してクローズする

## 4. 障害時 Runbook（Task 8.4）

### 4.1 bot 停止（Functions は稼働）

判定:
1. `source=1` の `UtilizationUpdated` が bot 更新間隔の 2 倍以上途絶
2. `source=2` 更新は継続

対応:
1. `scripts/arbitrage/oracle-updater.ts` のプロセス状態とログを確認
2. primary RPC 障害時は fallback RPC 到達性を確認
3. bot 再起動後、`source=1` 更新再開を確認

### 4.2 Functions 停止（bot は稼働）

判定:
1. `FunctionsError` が連続発生
2. `FunctionsResponseReceived` が Functions 検証間隔の 2 倍以上途絶
3. `source=1` 更新は継続

対応:
1. Subscription LINK 残高確認・補充
2. Consumer 登録と allowlist を確認
3. `source.js` / args / RPC ヘルスを確認
4. 復旧後に `FunctionsResponseReceived` を確認

### 4.3 bot / Functions 両停止

判定:
1. `source=1` / `source=2` の更新がともに停止
2. `stale == true` かつ `StaleFallbackApplied` が発火

対応:
1. まず `DEFAULT_FEE` フォールバック発動を確認（安全側維持）
2. bot を先に復旧（最短復旧経路）
3. Functions を復旧し、二重経路へ戻す
4. 復旧後に stale 解消（`stale=false`）を確認

### 4.4 事後対応

1. 障害時間、影響範囲、原因、再発防止策を記録
2. アラート閾値と runbook を必要に応じて更新
