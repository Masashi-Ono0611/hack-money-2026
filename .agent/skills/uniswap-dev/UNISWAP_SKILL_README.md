# Uniswap Development Skill

Uniswap Protocol (v2/v3/v4) の包括的な開発支援SKILLです。SDK統合、Subgraph API、スマートコントラクト開発をサポートします。

## 📦 インストール方法

1. SKILLファイルを Claude Code にインストール:
```bash
# uniswap-dev.skill ファイルを使用してインストール
```

2. または、Skills ディレクトリに直接配置:
```bash
cp uniswap-dev.skill ~/.claude/skills/
```

## ✨ 主な機能

### 1. バージョン選択ガイド
- v2/v3/v4の比較と選択基準
- プロジェクトに最適なバージョンの推奨
- 各バージョンの特徴とユースケース

### 2. スワップ実装
- v4 SDK を使用した完全なスワップ実装例
- スリッページ保護とデッドライン設定
- セキュリティベストプラクティス

### 3. カスタムフック開発 (v4)
- フックテンプレートとパターン
- ライフサイクルポイントの詳細説明
- Dynamic Fee、Limit Order、TWAMM などの実装例

### 4. Subgraph API統合
- GraphQL クエリパターン
- プールデータ、スワップ履歴、ユーザーポジションの取得
- Python と TypeScript の実装例

### 5. セキュリティ
- スリッページ保護の実装方法
- TWAP オラクルの使用
- MEV保護とリエントランシー対策
- 本番デプロイ前のチェックリスト

## 📚 含まれるリソース

### Scripts (実行可能コード)
- **swap_v4_example.ts**: v4 SDK を使用した完全なスワップ実装
- **subgraph_query.py**: Subgraph API の包括的なクエリ例

### References (参考ドキュメント)
- **version-guide.md**: バージョン比較と選択ガイド
- **v4-hooks.md**: v4 フックシステムの詳細
- **security.md**: セキュリティベストプラクティス
- **subgraph-schema.md**: Subgraph API リファレンス

### Assets (テンプレート)
- **hook-template.sol**: 本番環境対応のフックテンプレート

## 🚀 クイックスタート

### スワップの実装

```typescript
import { CurrencyAmount, Token, Percent } from '@uniswap/sdk-core';
import { Pool, Route, Trade } from '@uniswap/v4-sdk';

// 1. トークン定義
const USDC = new Token(1, USDC_ADDRESS, 6, 'USDC', 'USD Coin');
const WETH = new Token(1, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');

// 2. スリッページ保護
const slippageTolerance = new Percent(50, 10000); // 0.5%
const minimumAmountOut = trade.minimumAmountOut(slippageTolerance);

// 3. デッドライン設定
const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分

// 4. スワップ実行
await swapRouter.swap(poolKey, swapParams, '0x', deadline);
```

### Subgraph からデータ取得

```python
from subgraph_query import UniswapSubgraph

subgraph = UniswapSubgraph()

# プールデータの取得
pool = subgraph.get_pool("0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640")
print(f"TVL: ${pool['totalValueLockedUSD']}")

# 最近のスワップ履歴
swaps = subgraph.get_recent_swaps(pool_address, limit=100)

# ユーザーのポジション
positions = subgraph.get_user_positions(user_address)
```

### カスタムフック開発 (v4)

```solidity
contract MyHook is BaseHook {
    function getHookPermissions() public pure override
        returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeSwap: true,
            afterSwap: true,
            // ... その他のパーミッション
        });
    }

    function beforeSwap(...) external override returns (...) {
        // カスタムロジック
        uint24 dynamicFee = calculateDynamicFee(key);
        return (this.beforeSwap.selector, BeforeSwapDelta.ZERO, dynamicFee);
    }
}
```

## 🔐 セキュリティチェックリスト

本番環境デプロイ前に必ず確認:

- [ ] スリッページ保護の実装 (`amountOutMinimum` 設定)
- [ ] デッドライン保護 (例: 20分)
- [ ] TWAP オラクルの使用 (スポット価格は不可)
- [ ] コールバック検証 (v3/v4)
- [ ] リエントランシーガード
- [ ] テストカバレッジ >90%
- [ ] セキュリティ監査完了

## 🎯 使用例

### 例1: バージョン選択
```
ユーザー: "Uniswap統合を始めたいけど、どのバージョンを使うべき？"

→ version-guide.md を参照
→ プロジェクト要件に基づいて推奨
→ 各バージョンのトレードオフを説明
```

### 例2: セキュリティレビュー
```
ユーザー: "このスワップコードをレビューして"

→ security.md のチェックリストを適用
→ 脆弱性の特定と修正案の提示
→ ベストプラクティスの実装
```

### 例3: フック開発
```
ユーザー: "ダイナミックフィーフックを実装したい"

→ hook-template.sol をベースに使用
→ v4-hooks.md のパターンを適用
→ セキュリティ考慮事項を組み込み
```

## 🔗 リソースリンク

### 公式ドキュメント
- **v4**: https://docs.uniswap.org/contracts/v4/
- **v3**: https://docs.uniswap.org/contracts/v3/
- **SDK**: https://docs.uniswap.org/sdk/
- **Subgraph**: https://docs.uniswap.org/api/subgraph/

### コード例
- **v4 Template**: https://github.com/Uniswap/v4-template
- **v4 Periphery**: https://github.com/Uniswap/v4-periphery
- **v3 Examples**: https://github.com/Uniswap/examples

### サポート
- **Discord**: https://discord.gg/uniswap
- **GitHub**: https://github.com/Uniswap
- **Forum**: https://gov.uniswap.org

## 🤝 Context7 統合

このSKILLは Context7 MCP ツールと統合されています。最新のドキュメントや詳細な実装情報が必要な場合:

1. `resolve-library-id` で Uniswap ライブラリを特定
2. `query-docs` で具体的な質問を実行
3. このSKILLのガイダンスと組み合わせて使用

例:
```
ユーザー: "最新のv4 SDK のフック機能について教えて"

→ Context7: resolve-library-id("@uniswap/v4-sdk")
→ query-docs で最新のフック機能を照会
→ v4-hooks.md のパターンを適用
→ security.md のベストプラクティスを統合
```

## 📝 ライセンス

このSKILLはMITライセンスの下で提供されています。

## 🙏 貢献

改善提案やバグ報告は Issues または Pull Requests で受け付けています。

---

**Created for**: Uniswap Protocol 開発者
**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Supported Versions**: Uniswap v2, v3, v4, UniswapX
