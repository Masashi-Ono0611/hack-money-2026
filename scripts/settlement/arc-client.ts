import { execSync } from 'child_process';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WalletBalance {
  token: {
    id: string;
    blockchain: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
}

export interface TransferParams {
  tokenId: string;
  amount: string;
  destinationAddress: string;
  idempotencyKey?: string;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  status?: string;
  amount?: string;
  error?: string;
}

export interface ArcClientConfig {
  apiKey: string;
  sourceWalletId: string;
  entitySecretHex: string;
}

// ---------------------------------------------------------------------------
// ArcClient – thin wrapper around Circle Programmable Wallets API
// ---------------------------------------------------------------------------

export class ArcClient {
  private readonly apiKey: string;
  private readonly sourceWalletId: string;
  private readonly entitySecretHex: string;
  private readonly pubKeyPath = '/tmp/arc_pubkey.pem';

  constructor(config?: Partial<ArcClientConfig>) {
    this.apiKey = config?.apiKey ?? process.env.ARC_API_KEY ?? '';
    this.sourceWalletId =
      config?.sourceWalletId ?? process.env.ARC_WALLET_ID_SOURCE ?? '';
    this.entitySecretHex =
      config?.entitySecretHex ?? process.env.ENTITY_SECRET_HEX ?? '';

    if (!this.apiKey) throw new Error('ARC_API_KEY is required');
    if (!this.sourceWalletId)
      throw new Error('ARC_WALLET_ID_SOURCE is required');
    if (!this.entitySecretHex)
      throw new Error('ENTITY_SECRET_HEX is required');
  }

  // ---- helpers ------------------------------------------------------------

  private curl(method: 'GET' | 'POST', url: string, body?: unknown): unknown {
    const headers = `-H "Authorization: Bearer ${this.apiKey}" -H "Content-Type: application/json"`;
    const data = body ? `-d '${JSON.stringify(body)}'` : '';
    const cmd =
      method === 'GET'
        ? `curl -s ${headers} "${url}"`
        : `curl -s -X POST ${headers} ${data} "${url}"`;

    const raw = execSync(cmd, { encoding: 'utf-8' });
    const json = JSON.parse(raw);
    if (json.code) {
      throw new Error(`Arc API ${json.code}: ${json.message}`);
    }
    return json;
  }

  private async fetchPublicKey(): Promise<void> {
    const res = this.curl(
      'GET',
      'https://api.circle.com/v1/w3s/config/entity/publicKey',
    ) as { data: { publicKey: string } };
    fs.writeFileSync(this.pubKeyPath, res.data.publicKey);
  }

  private encryptEntitySecret(): string {
    const binPath = '/tmp/arc_secret.bin';
    const encPath = '/tmp/arc_secret.enc';

    execSync(
      `printf "${this.entitySecretHex}" | xxd -r -p > ${binPath}`,
    );
    execSync(
      `openssl pkeyutl -encrypt -pubin -inkey ${this.pubKeyPath} ` +
        `-pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 ` +
        `-pkeyopt rsa_mgf1_md:sha256 -in ${binPath} -out ${encPath}`,
    );
    return execSync(`openssl base64 -A -in ${encPath}`, {
      encoding: 'utf-8',
    }).trim();
  }

  // ---- public API ---------------------------------------------------------

  getSourceWalletId(): string {
    return this.sourceWalletId;
  }

  async getBalance(walletId: string): Promise<WalletBalance[]> {
    const res = this.curl(
      'GET',
      `https://api.circle.com/v1/w3s/wallets/${walletId}/balances`,
    ) as { data: { tokenBalances: WalletBalance[] } };
    return res.data.tokenBalances ?? [];
  }

  async getWalletAddress(walletId: string): Promise<string> {
    const res = this.curl(
      'GET',
      `https://api.circle.com/v1/w3s/wallets/${walletId}`,
    ) as { data: { wallet: { address: string } } };
    return res.data.wallet.address;
  }

  async transfer(params: TransferParams): Promise<TransferResult> {
    await this.fetchPublicKey();
    const ciphertext = this.encryptEntitySecret();

    const idempotencyKey =
      params.idempotencyKey ??
      execSync('uuidgen', { encoding: 'utf-8' }).trim();

    const payload = {
      idempotencyKey,
      walletId: this.sourceWalletId,
      tokenId: params.tokenId,
      destinationAddress: params.destinationAddress,
      amounts: [params.amount],
      feeLevel: 'MEDIUM',
      entitySecretCiphertext: ciphertext,
    };

    const res = this.curl(
      'POST',
      'https://api.circle.com/v1/w3s/developer/transactions/transfer',
      payload,
    ) as { data: { id: string } };

    const transactionId = res.data.id;
    return { success: true, transactionId, amount: params.amount };
  }

  async waitForTransaction(
    transactionId: string,
    maxAttempts = 10,
    intervalMs = 5_000,
  ): Promise<TransferResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));

      const res = this.curl(
        'GET',
        `https://api.circle.com/v1/w3s/transactions/${transactionId}`,
      ) as {
        data: {
          transaction: { txHash?: string; state: string };
        };
      };

      const tx = res.data.transaction;
      if (tx.state === 'COMPLETE') {
        return {
          success: true,
          transactionId,
          txHash: tx.txHash,
          status: tx.state,
        };
      }
      if (tx.state === 'FAILED' || tx.state === 'CANCELLED') {
        return {
          success: false,
          transactionId,
          status: tx.state,
          error: `Transaction ${tx.state}`,
        };
      }
    }
    return {
      success: false,
      transactionId,
      error: `Timeout after ${maxAttempts} attempts`,
    };
  }
}
