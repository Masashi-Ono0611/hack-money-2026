// Chainlink Functions source
// Fixed args schema:
// args[0] = chainId
// args[1] = blockWindow
// args[2] = rpcPrimary
// args[3] = rpcFallback

function toNumber(hex) {
  return Number.parseInt(hex, 16);
}

async function fetchBlock(rpcUrl, blockTag) {
  const response = await Functions.makeHttpRequest({
    url: rpcUrl,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBlockByNumber',
      params: [blockTag, false],
    },
  });

  if (response.error) {
    throw new Error(`RPC error: ${String(response.error)}`);
  }

  return response.data.result;
}

async function fetchBlocksWithFallback(primaryRpc, fallbackRpc, window) {
  try {
    return await fetchBlocks(primaryRpc, window);
  } catch (_) {
    return fetchBlocks(fallbackRpc, window);
  }
}

async function fetchBlocks(rpcUrl, window) {
  const latest = await fetchBlock(rpcUrl, 'latest');
  const latestNumber = toNumber(latest.number);

  const blocks = [];
  for (let i = 0; i < window; i++) {
    const n = `0x${(latestNumber - i).toString(16)}`;
    const block = await fetchBlock(rpcUrl, n);
    blocks.push({
      gasUsed: toNumber(block.gasUsed),
      gasLimit: toNumber(block.gasLimit),
    });
  }

  return blocks;
}

function calculateEmaUtilization(blocks) {
  if (blocks.length === 0) {
    return 0;
  }
  const alpha = 2 / (blocks.length + 1);

  let ema = blocks[0].gasUsed / blocks[0].gasLimit;
  for (let i = 1; i < blocks.length; i++) {
    const ratio = blocks[i].gasUsed / blocks[i].gasLimit;
    ema = alpha * ratio + (1 - alpha) * ema;
  }

  const utilization = Math.round(ema * 100);
  return Math.max(0, Math.min(100, utilization));
}

if (args.length < 4) {
  throw new Error('Invalid args: expected [chainId, blockWindow, rpcPrimary, rpcFallback]');
}

const chainId = Number.parseInt(args[0], 10);
const blockWindow = Number.parseInt(args[1], 10);
const rpcPrimary = args[2];
const rpcFallback = args[3];

if (!Number.isFinite(chainId) || !Number.isFinite(blockWindow)) {
  throw new Error('Invalid args: chainId and blockWindow must be numeric');
}

const blocks = await fetchBlocksWithFallback(rpcPrimary, rpcFallback, blockWindow);
const utilization = calculateEmaUtilization(blocks);

return Functions.encodeUint256(utilization);
