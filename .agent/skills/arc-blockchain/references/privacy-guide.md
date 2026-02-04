# Arc Opt-in Privacy Guide

Arcのオプトインプライバシー機能によるコンプライアンス対応の機密トランザクション。

## 概要

Arcのプライバシーは**選択的**かつ**コンプライアンス対応**:

- **オプトイン**: ユーザーが明示的に選択
- **選択的開示**: View Keysで監査人・規制当局に開示可能
- **モジュラー設計**: 複数のプライバシー技術をサポート

## プライバシーモデル

```
┌─────────────────────────────────────────────────────────────┐
│              Arc Privacy Spectrum                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Fully Transparent          Selective Privacy    Full Private│
│        │                         │                    │      │
│        │      ┌─────────────────┐│                    │      │
│        │      │   ARC MODEL     ││                    │      │
│        │      │  Confidential   ││                    │      │
│        │      │  + View Keys    ││                    │      │
│        │      └─────────────────┘│                    │      │
│        ▼                         ▼                    ▼      │
│   Ethereum              Arc Privacy             Zcash        │
│   (Public)              (Compliant)            (Shielded)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Confidential Transfers

### 概要

最初のプライバシー機能として、**Confidential Transfers**を提供:

- **金額を秘匿**: トランザクション金額が非公開
- **アドレスは可視**: 送信者・受信者アドレスは公開
- **選択的開示**: View Keysで金額を開示可能

### ユースケース

| シナリオ | 利点 |
|---------|------|
| 企業間決済 | 取引額の競合他社への非開示 |
| 給与支払い | 従業員間の給与情報保護 |
| M&A関連送金 | 機密取引の保護 |
| 大口取引 | フロントランニング防止 |

### 技術実装

現在のアーキテクチャ:

```
┌─────────────────────────────────────────────────────────────┐
│           Confidential Transfer Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Sender ─────> TEE (Trusted Execution Environment)          │
│                  │                                           │
│                  ├── Encrypt Amount                          │
│                  ├── Generate Proof                          │
│                  └── Create View Key Share                   │
│                  │                                           │
│                  ▼                                           │
│              Blockchain                                      │
│              (Encrypted Data)                                │
│                  │                                           │
│                  ▼                                           │
│  Recipient <──── Decrypt with View Key                      │
│                                                              │
│  Auditor <────── Decrypt with Shared View Key (Optional)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## View Keys

### 概要

View Keysは、プライバシーを保ちながら必要な相手にのみ情報を開示するメカニズム。

### 種類

| Key Type | 用途 |
|----------|------|
| **Personal View Key** | 自分のトランザクション履歴確認 |
| **Recipient View Key** | 受信者への金額開示 |
| **Auditor View Key** | 監査人への読み取り専用アクセス |
| **Regulator View Key** | 規制当局への開示 |

### 実装例

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ViewKeyManager
/// @notice View Keysの管理（概念的な実装）
contract ViewKeyManager {
    // View Key構造体
    struct ViewKey {
        bytes32 keyId;
        address owner;
        address grantee;
        uint256 validUntil;
        bytes32 scope; // トランザクション範囲
    }

    mapping(bytes32 => ViewKey) public viewKeys;
    mapping(address => bytes32[]) public userViewKeys;

    event ViewKeyGranted(
        bytes32 indexed keyId,
        address indexed owner,
        address indexed grantee,
        uint256 validUntil
    );

    event ViewKeyRevoked(bytes32 indexed keyId);

    /// @notice View Keyの発行
    function grantViewKey(
        address grantee,
        uint256 duration,
        bytes32 scope
    ) external returns (bytes32 keyId) {
        keyId = keccak256(abi.encode(msg.sender, grantee, block.timestamp, scope));

        viewKeys[keyId] = ViewKey({
            keyId: keyId,
            owner: msg.sender,
            grantee: grantee,
            validUntil: block.timestamp + duration,
            scope: scope
        });

        userViewKeys[msg.sender].push(keyId);

        emit ViewKeyGranted(keyId, msg.sender, grantee, block.timestamp + duration);
    }

    /// @notice View Keyの取り消し
    function revokeViewKey(bytes32 keyId) external {
        require(viewKeys[keyId].owner == msg.sender, "Not owner");
        delete viewKeys[keyId];
        emit ViewKeyRevoked(keyId);
    }

    /// @notice View Keyの有効性確認
    function isValidViewKey(bytes32 keyId) external view returns (bool) {
        ViewKey memory vk = viewKeys[keyId];
        return vk.owner != address(0) && block.timestamp < vk.validUntil;
    }
}
```

### オフチェーン統合

```typescript
// View Key管理のクライアント側実装
interface ViewKeyService {
    // View Key生成
    createViewKey(params: {
        grantee: string;
        duration: number;
        scope: 'ALL' | 'RANGE' | 'SPECIFIC';
        transactionIds?: string[];
    }): Promise<ViewKey>;

    // View Keyでデータ取得
    decryptWithViewKey(
        encryptedData: string,
        viewKey: ViewKey
    ): Promise<DecryptedTransaction>;

    // 監査レポート生成
    generateAuditReport(
        viewKey: ViewKey,
        startDate: Date,
        endDate: Date
    ): Promise<AuditReport>;
}
```

## コンプライアンス統合

### Travel Rule対応

```solidity
/// @notice Travel Rule準拠の送金
struct TravelRuleData {
    string originatorName;
    string originatorAddress;
    string beneficiaryName;
    string beneficiaryAddress;
    // 暗号化された状態で保存
    bytes encryptedData;
}

function confidentialTransferWithTravelRule(
    address recipient,
    uint256 amount,
    TravelRuleData calldata travelData
) external {
    // 金額は秘匿
    // Travel Ruleデータは規制当局のView Keyで復号可能
    _executeConfidentialTransfer(recipient, amount, travelData);
}
```

### 監査フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    Audit Flow                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Auditor requests access                                  │
│         │                                                    │
│         ▼                                                    │
│  2. Company grants time-limited View Key                     │
│         │                                                    │
│         ▼                                                    │
│  3. Auditor retrieves encrypted transactions                 │
│         │                                                    │
│         ▼                                                    │
│  4. Auditor decrypts with View Key                          │
│         │                                                    │
│         ▼                                                    │
│  5. Auditor completes review                                 │
│         │                                                    │
│         ▼                                                    │
│  6. View Key expires automatically                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 技術ロードマップ

### 現在（Phase 1）

**Trusted Execution Environments (TEEs)**

- Intel SGX / AMD SEV ベース
- 高性能、実用的
- ハードウェア依存

### 将来（Phase 2+）

| 技術 | 説明 | ユースケース |
|------|------|-------------|
| **MPC** (Multi-Party Computation) | 複数パーティで計算を分散 | 閾値署名、共同計算 |
| **FHE** (Fully Homomorphic Encryption) | 暗号化したまま計算 | プライベートスマートコントラクト |
| **ZK Proofs** | 知識証明なしで証明 | 残高証明、範囲証明 |

### 高度なプライバシー機能（計画中）

| 機能 | 説明 |
|------|------|
| **Private State** | コントラクト状態の秘匿 |
| **Confidential Computation** | 秘匿計算 |
| **Private Order Book** | プライベート注文帳 |
| **Automated Treasury** | 秘匿トレジャリー管理 |

## プライバシー vs 透明性のトレードオフ

```
┌─────────────────────────────────────────────────────────────┐
│              Privacy Configuration Options                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Setting          │ Amount │ Sender │ Recipient │ Auditable│
│  ─────────────────┼────────┼────────┼───────────┼──────────│
│  Full Transparent │ Public │ Public │ Public    │ Yes      │
│  Amount Private   │ Hidden │ Public │ Public    │ w/Key    │
│  Sender Private   │ Hidden │ Hidden │ Public    │ w/Key    │
│  Full Private     │ Hidden │ Hidden │ Hidden    │ w/Key    │
│                                                              │
│  Note: Arc currently supports "Amount Private" mode         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 使用例

### 1. 機密送金

```typescript
// 秘密の金額で送金
async function confidentialTransfer(
    recipient: string,
    amount: bigint
): Promise<string> {
    // 金額を暗号化
    const encryptedAmount = await encryptAmount(amount, recipientPublicKey);

    // トランザクション送信
    const tx = await arcPrivacyContract.confidentialTransfer(
        recipient,
        encryptedAmount
    );

    return tx.hash;
}
```

### 2. 監査用View Key発行

```typescript
// 監査人にView Key発行
async function grantAuditorAccess(
    auditorAddress: string,
    fiscalYear: number
): Promise<ViewKey> {
    const viewKey = await viewKeyManager.createViewKey({
        grantee: auditorAddress,
        duration: 90 * 24 * 60 * 60, // 90日
        scope: 'RANGE',
        startDate: new Date(fiscalYear, 0, 1),
        endDate: new Date(fiscalYear, 11, 31),
    });

    return viewKey;
}
```

### 3. 規制対応レポート

```typescript
// 規制当局向けレポート生成
async function generateRegulatoryReport(
    viewKey: ViewKey
): Promise<Report> {
    // View Keyで全トランザクションを復号
    const transactions = await fetchAndDecrypt(viewKey);

    // レポート生成
    const report = {
        totalVolume: calculateTotal(transactions),
        transactionCount: transactions.length,
        largeTransactions: filterLarge(transactions),
        // ...
    };

    return report;
}
```

## セキュリティ考慮事項

### 1. View Keyの保護

```typescript
// View Keyは機密情報として扱う
const viewKey = await viewKeyManager.createViewKey(...);

// 安全な保存
await secureStorage.store(viewKey, {
    encryption: 'AES-256',
    accessControl: 'BIOMETRIC',
});

// 使用後は安全に削除
await secureStorage.secureDelete(viewKey);
```

### 2. TEEの限界

- ハードウェア脆弱性のリスク
- サイドチャネル攻撃の可能性
- 将来的にはZK/FHEへ移行予定

### 3. メタデータ保護

- 金額は秘匿されるが、トランザクションの存在は公開
- タイミング分析への対策が必要
- ダミートランザクションの検討

## 参考リンク

- Arc公式ドキュメント: https://docs.arc.network/arc/concepts/opt-in-privacy
- Circle プライバシーブログ: https://www.circle.com/blog/introducing-arc-an-open-layer-1-blockchain-purpose-built-for-stablecoin-finance
