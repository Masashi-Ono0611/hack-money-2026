# Arc Development Environment Setup

Arc開発環境のセットアップガイド。Foundry、Hardhat、フロントエンド統合をカバー。

## 前提条件

- Node.js 18+
- Git
- ウォレット（MetaMask等）

## 1. Foundry セットアップ（推奨）

### インストール

```bash
# Foundryインストール
curl -L https://foundry.paradigm.xyz | bash
foundryup

# バージョン確認
forge --version
cast --version
anvil --version
```

### プロジェクト作成

```bash
# 新規プロジェクト
forge init my-arc-project
cd my-arc-project

# 既存プロジェクトにFoundry追加
cd existing-project
forge init --force
```

### 依存関係

```bash
# OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# CCTP（クロスチェーン）
forge install circlefin/evm-cctp-contracts

# remappings設定
cat > remappings.txt << 'EOF'
@openzeppelin/=lib/openzeppelin-contracts/
@circlefin/=lib/evm-cctp-contracts/
EOF
```

### foundry.toml設定

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
arc_testnet = "https://arc-testnet.drpc.org"

[etherscan]
arc_testnet = { key = "${ETHERSCAN_API_KEY}", url = "https://explorer.arc.network/api" }

[fmt]
line_length = 120
tab_width = 4
bracket_spacing = true
```

### 環境変数

```bash
# .env ファイル作成
cat > .env << 'EOF'
PRIVATE_KEY=your_private_key_here
ARC_RPC_URL=https://arc-testnet.drpc.org
ETHERSCAN_API_KEY=your_api_key_here
EOF

# .envを読み込み
source .env
```

## 2. Hardhat セットアップ

### インストール

```bash
mkdir my-arc-project && cd my-arc-project
npm init -y

# Hardhat + ツールボックス
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 初期化
npx hardhat init
# "Create a TypeScript project" を選択
```

### hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_RPC_URL || "https://arc-testnet.drpc.org",
      chainId: 1244,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 1244,
        urls: {
          apiURL: "https://explorer.arc.network/api",
          browserURL: "https://explorer.arc.network",
        },
      },
    ],
  },
};

export default config;
```

### 依存関係

```bash
# OpenZeppelin
npm install @openzeppelin/contracts

# 環境変数
npm install dotenv

# TypeScript型定義
npm install --save-dev @types/node
```

## 3. ウォレット設定

### MetaMask

1. MetaMaskを開く
2. ネットワーク → ネットワークを追加 → ネットワークを手動で追加

```
Network Name: Arc Testnet
RPC URL: https://arc-testnet.drpc.org
Chain ID: 1244
Currency Symbol: USDC
Block Explorer URL: https://explorer.arc.network
```

### 秘密鍵の取得

```bash
# MetaMaskから秘密鍵をエクスポート
# Settings → Security & Privacy → Reveal Secret Recovery Phrase
# または個別アカウント → Account Details → Show Private Key
```

### 開発用ウォレット作成（推奨）

```bash
# Foundry の cast を使用
cast wallet new

# 出力例:
# Address: 0x...
# Private Key: 0x...
```

## 4. テストネットUSDC取得

### Circle Faucet

1. https://faucet.circle.com/ にアクセス
2. "Arc Testnet" を選択
3. "USDC" または "EURC" を選択
4. ウォレットアドレスを入力
5. "Get Tokens" をクリック

**制限**: 20 USDC / 2時間 / アドレス

### 残高確認

```bash
# Foundry
cast balance $WALLET_ADDRESS --rpc-url https://arc-testnet.drpc.org

# ERC-20残高
cast call 0x3600000000000000000000000000000000000000 \
  "balanceOf(address)(uint256)" \
  $WALLET_ADDRESS \
  --rpc-url https://arc-testnet.drpc.org
```

## 5. Hello Worldコントラクト

### src/HelloArc.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title HelloArc
/// @notice Arcでの最初のスマートコントラクト
contract HelloArc {
    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    string public greeting;
    address public owner;

    event GreetingChanged(string newGreeting, address indexed changer);

    constructor(string memory _greeting) {
        greeting = _greeting;
        owner = msg.sender;
    }

    /// @notice 挨拶を変更
    function setGreeting(string memory _greeting) external {
        greeting = _greeting;
        emit GreetingChanged(_greeting, msg.sender);
    }

    /// @notice USDC残高を確認
    function getUSDCBalance(address account) external view returns (uint256) {
        return USDC.balanceOf(account);
    }

    /// @notice コントラクト情報を取得
    function getInfo() external view returns (
        string memory _greeting,
        address _owner,
        uint256 _usdcBalance
    ) {
        return (greeting, owner, USDC.balanceOf(address(this)));
    }
}
```

### テスト

```solidity
// test/HelloArc.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/HelloArc.sol";

contract HelloArcTest is Test {
    HelloArc public helloArc;

    function setUp() public {
        helloArc = new HelloArc("Hello, Arc!");
    }

    function test_InitialGreeting() public view {
        assertEq(helloArc.greeting(), "Hello, Arc!");
    }

    function test_SetGreeting() public {
        helloArc.setGreeting("New greeting");
        assertEq(helloArc.greeting(), "New greeting");
    }

    function test_Owner() public view {
        assertEq(helloArc.owner(), address(this));
    }

    function testFuzz_SetGreeting(string memory _greeting) public {
        helloArc.setGreeting(_greeting);
        assertEq(helloArc.greeting(), _greeting);
    }
}
```

### テスト実行

```bash
# ローカルテスト
forge test -vvv

# Arc Testnetフォーク
forge test --fork-url https://arc-testnet.drpc.org -vvv

# ガスレポート
forge test --gas-report

# カバレッジ
forge coverage
```

## 6. デプロイ

### デプロイスクリプト

```solidity
// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/HelloArc.sol";

contract DeployScript is Script {
    function run() external returns (HelloArc) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        HelloArc helloArc = new HelloArc("Hello, Arc!");
        console.log("HelloArc deployed to:", address(helloArc));

        vm.stopBroadcast();

        return helloArc;
    }
}
```

### デプロイ実行

```bash
# ドライラン（実際にはデプロイしない）
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://arc-testnet.drpc.org \
  --private-key $PRIVATE_KEY

# 本番デプロイ
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://arc-testnet.drpc.url \
  --private-key $PRIVATE_KEY \
  --broadcast

# 検証付きデプロイ
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://arc-testnet.drpc.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## 7. コントラクト操作

### cast を使用

```bash
# 読み取り
cast call $CONTRACT_ADDRESS "greeting()(string)" --rpc-url https://arc-testnet.drpc.org

# 書き込み
cast send $CONTRACT_ADDRESS "setGreeting(string)" "New greeting" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://arc-testnet.drpc.org

# トランザクション確認
cast receipt $TX_HASH --rpc-url https://arc-testnet.drpc.org
```

## 8. フロントエンド統合

### viem + wagmi

```bash
npm install viem wagmi @tanstack/react-query
```

```typescript
// config.ts
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 1244,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://arc-testnet.drpc.org'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.network' },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(),
  },
});
```

```tsx
// App.tsx
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### ethers.js v6

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://arc-testnet.drpc.org');
const signer = new ethers.Wallet(privateKey, provider);

// コントラクト操作
const contract = new ethers.Contract(contractAddress, abi, signer);
const greeting = await contract.greeting();
```

## トラブルシューティング

### ガス不足

```bash
# USDC残高確認
cast balance $WALLET_ADDRESS --rpc-url https://arc-testnet.drpc.org

# Faucetから追加取得
# https://faucet.circle.com/
```

### トランザクション失敗

```bash
# トランザクションデバッグ
cast run $TX_HASH --rpc-url https://arc-testnet.drpc.org

# ガス見積もり
cast estimate $CONTRACT_ADDRESS "setGreeting(string)" "test" \
  --rpc-url https://arc-testnet.drpc.org
```

### RPC接続エラー

```bash
# 接続テスト
cast chain-id --rpc-url https://arc-testnet.drpc.org

# 別のRPCを試す
# dRPC: https://arc-testnet.drpc.org
# Quicknode, Alchemy等のプレミアムエンドポイント
```

## 次のステップ

- [deploy-contracts.md](deploy-contracts.md) - コントラクトデプロイの詳細
- [bridge-usdc.md](bridge-usdc.md) - CCTP統合
- [../references/usdc-integration.md](../references/usdc-integration.md) - USDC統合ガイド
