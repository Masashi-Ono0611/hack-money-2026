// Minimal ABIs for on-chain reads

export const MockOracleAbi = [
  {
    inputs: [],
    name: "getUtilization",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PoolManagerAbi = [
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "getSlot0",
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20Abi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
