# Implementation Plan: Core Token System

## Task Overview

本実装計画は、Core Token System（CPT Token, Mock Oracle, Operator Vault）を実装可能なタスクに分解したものです。

**総タスク数**: 10 major tasks, 17 sub-tasks
**並列実行可能**: 9タスク（マーカー: `(P)`）
**推定期間**: 1-2日（Phase 1）

---

## Task List

### 1. OpenZeppelin Contracts 導入

- [x] 1. (P) OpenZeppelin Contracts インストール
  - Foundry で OpenZeppelin Contracts v5.x をインストール（`forge install OpenZeppelin/openzeppelin-contracts`）
  - foundry.toml で remappings 設定（`@openzeppelin/contracts=lib/openzeppelin-contracts/contracts`）
  - ERC20, Ownable, ReentrancyGuard が利用可能であることを確認
  - _Requirements: 1.6, 3.7, 7.6_

---

### 2. CPT Token Contract 実装

- [x] 2.1 (P) CPT Token Contract 実装
  - OpenZeppelin ERC20 + Ownable を継承した ComputeToken コントラクトを実装
  - mint 関数を実装（onlyOwner modifier、_mint で msg.sender に発行）
  - NatSpec コメントを追加（@title, @notice, @dev, @param）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_
  - _Contracts: ComputeToken (Service)_

- [x] 2.2 (P) CPT Token 単体テスト
  - mint 権限テスト（owner のみ発行可能、非 owner は revert）
  - ERC20 標準機能テスト（transfer, balanceOf, totalSupply）
  - approve + transferFrom テスト
  - transferOwnership テスト
  - _Requirements: 1.5, 1.7, 6.1_

---

### 3. Mock Oracle 実装

- [x] 3.1 (P) Mock Oracle Contract 実装
  - _utilization 変数（デフォルト50%）を実装
  - getUtilization 関数を実装（view）
  - setUtilization 関数を実装（範囲検証 0-100%、require文）
  - UtilizationUpdated イベントを実装
  - NatSpec コメントを追加
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_
  - _Contracts: MockOracle (Service)_

- [x] 3.2 (P) Mock Oracle 単体テスト
  - getUtilization テスト（デフォルト50%）
  - setUtilization テスト（0-100%範囲、範囲外は revert）
  - UtilizationUpdated イベント発行確認
  - _Requirements: 2.5, 6.2_

---

### 4. Operator Vault 実装

- [x] 4.1 (P) Operator Vault Contract 実装
  - OpenZeppelin Ownable + ReentrancyGuard を継承した OperatorVault コントラクトを実装
  - コンストラクタで USDC アドレスと initialOwner を受け取る（ゼロアドレスチェック）
  - depositUSDC 関数を実装（nonReentrant、amount > 0 チェック、transferFrom、Deposit イベント）
  - withdraw 関数を実装（onlyOwner、nonReentrant、balance チェック、transfer、Withdraw イベント）
  - balanceOf 関数を実装（view、usdc.balanceOf(address(this)) を返す）
  - NatSpec コメントを追加
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 7.6_
  - _Contracts: OperatorVault (Service, Event)_

- [x] 4.2 (P) Operator Vault 単体テスト
  - depositUSDC テスト（approve + depositUSDC、Deposit イベント確認）
  - withdraw テスト（owner のみ、balance確認、Withdraw イベント確認）
  - balanceOf テスト
  - ゼロアドレス・ゼロamount バリデーションテスト
  - 非 owner からの withdraw が revert することを確認
  - _Requirements: 3.6, 6.3, 7.2_

- [x] 4.3 (P) ReentrancyGuard テスト
  - depositUSDC の再入攻撃防止テスト
  - withdraw の再入攻撃防止テスト
  - _Requirements: 7.6_

---

### 5. 統合テスト

- [x] 5. 統合テスト実装（2.1, 3.1, 4.1に依存）
  - CPT Token + Mock Oracle の連携テスト（稼働率に基づくシミュレーション）
  - Operator Vault + USDC Token の連携テスト（入出金フロー）
  - _Requirements: 6.4_

---

### 6. デプロイスクリプト実装

- [x] 6.1 DeployCore Script 実装（2.1, 3.1, 4.1に依存）
  - Foundry Script を継承した DeployCore スクリプトを実装
  - 環境変数から DEPLOYER_PRIVATE_KEY, CHAIN_NAME, USDC_ADDRESS を読み込む
  - CHAIN_NAME に基づいて CPT Token, Mock Oracle（L2）または Operator Vault（Arc）をデプロイ
  - デプロイしたコントラクトアドレスをコンソールに出力
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Contracts: DeployCore (Script)_

- [x] 6.2 環境変数設定
  - .env.example を作成（BASE_SEPOLIA_RPC_URL, WORLDCOIN_SEPOLIA_RPC_URL, ARC_RPC_URL, DEPLOYER_PRIVATE_KEY, USDC_ADDRESS）
  - .gitignore に .env を追加
  - _Requirements: 4.6, 7.3, 7.4_

- [x] 6.3 デプロイアドレス記録
  - デプロイ結果を contract/deployed-addresses.json に記録する仕組みを実装
  - Base Sepolia, World Chain Sepolia, Arc の3チェーン分のアドレスを記録
  - _Requirements: 4.4_

---

### 7. セキュリティ検証

- [x] 7.1 権限管理確認（2.1, 4.1に依存）
  - CPT Token の mint 権限が owner のみであることを確認
  - Operator Vault の withdraw 権限が owner のみであることを確認
  - 非 owner からの操作が revert することを確認
  - _Requirements: 7.1, 7.2, 7.5_

- [x] 7.2 (P) 環境変数セキュリティ確認
  - 秘密鍵・APIキーがハードコードされていないことを確認
  - .env ファイルが .gitignore に含まれることを確認
  - _Requirements: 7.3, 7.4_

---

### 8. エラーハンドリング実装

- [x] 8. (P) エラーハンドリング確認（2.1, 3.1, 4.1に依存）
  - すべてのパブリック関数で適切なエラーハンドリングが実装されていることを確認
  - require 文で明確なエラーメッセージを提供
  - 重要な処理にイベントログを発行（Mint, Transfer, Deposit, Withdraw, UtilizationUpdated）
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

### 9. テストカバレッジ確認

- [x] 9. テストカバレッジ測定（2.2, 3.2, 4.2, 4.3, 5に依存）
  - forge coverage を実行してカバレッジレポートを生成
  - 最低80%カバレッジを確認
  - mint, depositUSDC, withdraw は 100% カバレッジを確認
  - _Requirements: 6.5, 6.6_

---

### 10. Testnet デプロイ検証

- [x] 10. Testnet デプロイ実行（6.1, 6.2に依存）
  - Base Sepolia に CPT Token と Mock Oracle をデプロイ ✅ (cpt: 0x68eBAd847A016bB830B3607e0eEeA516A09EA5e6, oracle: 0xe6230b8D99491dAd48e1de70156b4fd8b7b66b6f)
  - World Chain Sepolia に CPT Token と Mock Oracle をデプロイ ✅ (cpt: 0x9eCE03F901dFC53544E4abf610b6813c6305f262, oracle: 0xA0e9F77a3E1311301E5a29AEFfDa73113eD316E9)
  - Sepolia に CPT Token と Mock Oracle をデプロイ ✅ (cpt: 0x7BED4A835afd83BEf0F959780eDAE8Da4c22Bd11, oracle: 0xa1BbAFF1cC20A12eBB1B50D515373ABAa6a476DA)
  - Unichain Sepolia に CPT Token と Mock Oracle をデプロイ ✅ (cpt: 0x67ADc29278d87D87b212C59fDffd2749fe7418c4, oracle: 0x9eCE03F901dFC53544E4abf610b6813c6305f262)
  - Arc Testnet に Operator Vault をデプロイ ✅ (vault: 0x9eCE03F901dFC53544E4abf610b6813c6305f262)
  - デプロイ結果を deployed-addresses.json に記録 ✅
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Note: USDC Testnet Addresses - Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7E, Arc: 0x3600000000000000000000000000000000000000 (ERC-20, 6 decimals)_

---

## Requirements Coverage

| Requirement | Description | Covered by Tasks |
|-------------|-------------|------------------|
| 1.1-1.7 | CPT Token 発行・管理 | 1, 2.1, 2.2, 7.1 |
| 2.1-2.6 | Mock Oracle 稼働率シグナル | 1, 3.1, 3.2 |
| 3.1-3.7 | Operator Vault USDC管理 | 1, 4.1, 4.2, 4.3, 7.1 |
| 4.1-4.6 | デプロイ・初期化 | 6.1, 6.2, 6.3, 10 |
| 5.1-5.4 | エラーハンドリング・ログ | 8 |
| 6.1-6.6 | テスト・品質保証 | 2.2, 3.2, 4.2, 4.3, 5, 9 |
| 7.1-7.6 | セキュリティ・権限管理 | 1, 4.1, 4.3, 7.1, 7.2 |

---

## Parallel Execution Strategy

### 並列実行可能グループ

**Phase 1: セットアップ（並列可能）**:
- 1 (OpenZeppelin 導入)

**Phase 2: コントラクト実装（並列可能）**:
- 2.1 (CPT Token 実装)
- 2.2 (CPT Token テスト)
- 3.1 (Mock Oracle 実装)
- 3.2 (Mock Oracle テスト)
- 4.1 (Operator Vault 実装)
- 4.2 (Operator Vault テスト)
- 4.3 (ReentrancyGuard テスト)

**Phase 3: セキュリティ確認（並列可能）**:
- 7.2 (環境変数セキュリティ確認)
- 8 (エラーハンドリング確認)

**Phase 4: 順序依存タスク**:
- 5 (統合テスト) - 2.1, 3.1, 4.1に依存
- 6.1 (DeployCore Script) - 2.1, 3.1, 4.1に依存
- 6.2, 6.3 (環境変数・アドレス記録) - 6.1に依存
- 7.1 (権限管理確認) - 2.1, 4.1に依存
- 9 (テストカバレッジ確認) - 2.2, 3.2, 4.2, 4.3, 5に依存
- 10 (Testnet デプロイ検証) - 6.1, 6.2に依存

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. OpenZeppelin 導入（1）
2. コントラクト実装（2.1, 3.1, 4.1）
3. 単体テスト（2.2, 3.2, 4.2, 4.3）
4. デプロイスクリプト（6.1, 6.2, 6.3）
5. セキュリティ検証（7.1, 7.2）
6. Testnet デプロイ（10）

**Should Have（時間があれば）**:
- 5: 統合テスト（他の仕様との統合時に実施可能）
- 8: エラーハンドリング確認（実装時に組み込み済み）
- 9: テストカバレッジ確認（継続的に改善）

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| OpenZeppelin 導入 | 0.25日 |
| コントラクト実装 | 0.5-1日 |
| 単体テスト | 0.5日 |
| デプロイスクリプト | 0.5日 |
| セキュリティ検証 | 0.25日 |
| Testnet デプロイ | 0.25日 |
| **合計** | **1.5-2.5日** |

---

## Key Design References

本実装タスクは以下の設計ドキュメントに基づいています：

- **Architecture Pattern**: Domain-Separated Contracts（CPT Token, Mock Oracle, Operator Vault）
- **Technology Stack**: Solidity 0.8.26, OpenZeppelin Contracts v5.x, Foundry
- **USDC Testnet Addresses**:
  - Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7E`
  - Arc Testnet: `0x3600000000000000000000000000000000000000` (ERC-20, 6 decimals)
  - World Chain Sepolia: CCTP経由でブリッジ（デモ準備時）
- **Security Patterns**: OpenZeppelin Ownable (initialOwner), ReentrancyGuard, Input Validation

詳細は `/Users/harukikondo/git/hack-money-2026/.kiro/specs/core-token-system/design.md` および `research.md` を参照してください。

---

## Dependencies on Other Specifications

- **uniswap-v4-integration**: Mock Oracle 完成後、Utilization Hook 実装で使用
- **settlement-layer**: Operator Vault 完成後、決済処理で使用
- **dashboard-demo**: CPT Token と Operator Vault 完成後、Dashboard で表示

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. ✅ すべてのタスクが完了している（チェックボックスがすべて✓）
2. ✅ CPT Token, Mock Oracle, Operator Vault が Base Sepolia, World Chain Sepolia, Arc Testnet にデプロイされている
3. ✅ すべてのテストがパスしている（カバレッジ >= 80%）
4. ✅ デプロイスクリプトが自動化され、コントラクトアドレスが deployed-addresses.json に記録されている
5. ✅ セキュリティチェックがすべて完了している（権限管理、環境変数管理）
6. ✅ OpenZeppelin Contracts が導入され、セキュリティベストプラクティスが適用されている

---

## Next Steps

本仕様完了後、以下の仕様に進むことを推奨します：

1. **uniswap-v4-integration**: Utilization Hook 実装、Pool 初期化
2. **offchain-arbitrage-engine**: 価格監視・裁定ロジック実装（並行可能）
3. **settlement-layer**: Arc + Circle 決済統合
4. **dashboard-demo**: Dashboard UI、デモスクリプト
