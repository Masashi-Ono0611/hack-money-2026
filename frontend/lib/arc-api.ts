import crypto from "crypto";

// ---------------------------------------------------------------------------
// Serverless-compatible Circle Programmable Wallets API client
// Uses only fetch + Node.js crypto (no execSync, no openssl CLI)
// ---------------------------------------------------------------------------

const BASE = "https://api.circle.com/v1/w3s";

interface ArcApiConfig {
  apiKey: string;
  sourceWalletId: string;
  entitySecretHex: string;
}

export interface WalletBalance {
  token: { id: string; blockchain: string; name: string; symbol: string; decimals: number };
  amount: string;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  status?: string;
  amount?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfig(): ArcApiConfig {
  const apiKey = process.env.ARC_API_KEY ?? "";
  const sourceWalletId = process.env.ARC_WALLET_ID_SOURCE ?? "";
  const entitySecretHex = process.env.ENTITY_SECRET_HEX ?? "";
  return { apiKey, sourceWalletId, entitySecretHex };
}

async function circleGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Circle API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function circlePost<T>(path: string, apiKey: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Circle API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// RSA-OAEP encryption of entity secret using Node.js crypto (no openssl CLI)
// ---------------------------------------------------------------------------

async function fetchPublicKey(apiKey: string): Promise<string> {
  const res = await circleGet<{ data: { publicKey: string } }>(
    "/config/entity/publicKey",
    apiKey,
  );
  return res.data.publicKey;
}

function encryptEntitySecret(entitySecretHex: string, publicKeyPem: string): string {
  const secretBuf = Buffer.from(entitySecretHex, "hex");
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    secretBuf,
  );
  return encrypted.toString("base64");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getBalance(walletId: string): Promise<WalletBalance[]> {
  const { apiKey } = getConfig();
  if (!apiKey || !walletId) throw new Error("Missing ARC_API_KEY or walletId");
  const res = await circleGet<{ data: { tokenBalances: WalletBalance[] } }>(
    `/wallets/${walletId}/balances`,
    apiKey,
  );
  return res.data.tokenBalances ?? [];
}

export async function getWalletAddress(walletId: string): Promise<string> {
  const { apiKey } = getConfig();
  if (!apiKey || !walletId) throw new Error("Missing ARC_API_KEY or walletId");
  const res = await circleGet<{ data: { wallet: { address: string } } }>(
    `/wallets/${walletId}`,
    apiKey,
  );
  return res.data.wallet.address;
}

export async function transfer(params: {
  tokenId: string;
  amount: string;
  destinationAddress: string;
}): Promise<TransferResult> {
  const { apiKey, sourceWalletId, entitySecretHex } = getConfig();
  if (!apiKey || !sourceWalletId || !entitySecretHex) {
    throw new Error("Missing ARC_API_KEY, ARC_WALLET_ID_SOURCE, or ENTITY_SECRET_HEX");
  }

  const publicKeyPem = await fetchPublicKey(apiKey);
  const ciphertext = encryptEntitySecret(entitySecretHex, publicKeyPem);
  const idempotencyKey = crypto.randomUUID();

  const payload = {
    idempotencyKey,
    walletId: sourceWalletId,
    tokenId: params.tokenId,
    destinationAddress: params.destinationAddress,
    amounts: [params.amount],
    feeLevel: "MEDIUM",
    entitySecretCiphertext: ciphertext,
  };

  const res = await circlePost<{ data: { id: string } }>(
    "/developer/transactions/transfer",
    apiKey,
    payload,
  );

  return { success: true, transactionId: res.data.id, amount: params.amount };
}

export async function waitForTransaction(
  transactionId: string,
  maxAttempts = 10,
  intervalMs = 5_000,
): Promise<TransferResult> {
  const { apiKey } = getConfig();

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await circleGet<{
      data: { transaction: { txHash?: string; state: string } };
    }>(`/transactions/${transactionId}`, apiKey);

    const tx = res.data.transaction;
    if (tx.state === "COMPLETE") {
      return { success: true, transactionId, txHash: tx.txHash, status: tx.state };
    }
    if (tx.state === "FAILED" || tx.state === "CANCELLED") {
      return { success: false, transactionId, status: tx.state, error: `Transaction ${tx.state}` };
    }
  }

  return { success: false, transactionId, error: `Timeout after ${maxAttempts} attempts` };
}
