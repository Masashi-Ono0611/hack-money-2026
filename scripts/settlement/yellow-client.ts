import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createGetChannelsMessage,
  createGetLedgerBalancesMessage,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
} from '@erc7824/nitrolite';
import type { Hex, Address } from 'viem';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YellowClientConfig {
  wsUrl?: string;
  privateKey: Hex;
  application?: string;
  connectionTimeoutMs?: number;
}

export interface ChannelInfo {
  channel_id: string;
  participant: string;
  status: string;
  token: string;
  amount: string;
  chain_id: number;
}

export interface LedgerBalance {
  asset: string;
  amount: string;
}

export interface SessionAllocation {
  participant: Address;
  asset: string;
  amount: string;
}

// ---------------------------------------------------------------------------
// YellowClient – ClearNode connection, auth, session management
// ---------------------------------------------------------------------------

const DEFAULT_WS_URL = 'wss://clearnet-sandbox.yellow.com/ws';

export class YellowClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly privateKey: Hex;
  private readonly address: Address;
  private sessionSigner!: ReturnType<typeof createECDSAMessageSigner>;
  private sessionAddress!: Address;
  private _isConnected = false;
  private _isAuthenticated = false;
  private readonly wsUrl: string;
  private readonly application: string;
  private readonly connectionTimeoutMs: number;

  constructor(config: YellowClientConfig) {
    super();
    this.wsUrl = config.wsUrl ?? DEFAULT_WS_URL;
    this.privateKey = config.privateKey;
    this.address = privateKeyToAccount(config.privateKey).address;
    this.application = config.application ?? 'ghost-yield';
    this.connectionTimeoutMs = config.connectionTimeoutMs ?? 15_000;
  }

  // ---- connect & authenticate --------------------------------------------

  async connect(): Promise<void> {
    const sessionPrivateKey = generatePrivateKey();
    this.sessionSigner = createECDSAMessageSigner(sessionPrivateKey);
    this.sessionAddress = privateKeyToAccount(sessionPrivateKey).address;

    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const authParams = {
      session_key: this.sessionAddress,
      allowances: [{ asset: 'ytest.usd', amount: '1000000000' }],
      expires_at: expiresAt,
      scope: 'console',
    };

    const authRequestMsg = await createAuthRequestMessage({
      address: this.address,
      application: this.application,
      ...authParams,
    });

    return new Promise((resolve, reject) => {
      if (this.ws) this.ws.close();

      console.log(`[YellowClient] Connecting to ${this.wsUrl}...`);
      this.ws = new WebSocket(this.wsUrl);

      const timeout = setTimeout(() => {
        if (!this._isAuthenticated) {
          this.ws?.close();
          reject(new Error('Connection/auth timeout'));
        }
      }, this.connectionTimeoutMs);

      this.ws.on('open', () => {
        this._isConnected = true;
        console.log('[YellowClient] WebSocket connected');
        this.ws!.send(authRequestMsg);
        console.log(`[YellowClient] Auth request sent (wallet=${this.address}, session=${this.sessionAddress})`);
      });

      this.ws.on('message', async (data) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString();
          const response = JSON.parse(raw);
          const messageType = response.res?.[1];

          switch (messageType) {
            case 'auth_challenge': {
              const challenge = response.res[2].challenge_message;
              console.log('[YellowClient] Challenge received:', challenge);

              const account = privateKeyToAccount(this.privateKey);
              const walletClient = createWalletClient({
                account,
                chain: sepolia,
                transport: http(),
              });

              const eip712Signer = createEIP712AuthMessageSigner(
                walletClient,
                authParams,
                { name: this.application },
              );

              const verifyMsg = await createAuthVerifyMessageFromChallenge(
                eip712Signer,
                challenge,
              );
              this.ws!.send(verifyMsg);
              console.log('[YellowClient] EIP-712 auth_verify sent');
              break;
            }
            case 'auth_verify': {
              clearTimeout(timeout);
              this._isAuthenticated = true;
              const sessionKey = response.res[2]?.session_key;
              console.log('[YellowClient] Authenticated (session_key:', sessionKey, ')');
              this.emit('authenticated');
              resolve();
              break;
            }
            case 'get_channels':
              this.emit('channels', response.res[2]);
              break;
            case 'get_ledger_balances':
              this.emit('balances', response.res[2]);
              break;
            case 'create_channel':
              this.emit('create-channel', response.res[2]);
              break;
            case 'resize_channel':
              this.emit('resize-channel', response.res[2]);
              break;
            case 'app_session':
              this.emit('session-created', response.res[2]);
              break;
            case 'close_app_session':
              this.emit('session-closed', response.res[2]);
              break;
            case 'error': {
              const errMsg = response.res[2]?.error ?? 'unknown error';
              console.error('[YellowClient] RPC Error:', errMsg);
              this.emit('rpc-error', errMsg);
              if (!this._isAuthenticated) {
                clearTimeout(timeout);
                reject(new Error(`Auth failed: ${errMsg}`));
              }
              break;
            }
            default:
              this.emit('message', response);
          }
        } catch (err) {
          console.error('[YellowClient] Message parse error:', err);
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        this.emit('ws-error', err);
        reject(err);
      });

      this.ws.on('close', () => {
        this._isConnected = false;
        this._isAuthenticated = false;
        this.emit('disconnected');
      });
    });
  }

  // ---- disconnect --------------------------------------------------------

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // ---- channels ----------------------------------------------------------

  async getChannels(): Promise<ChannelInfo[]> {
    this.ensureReady();
    const message = await createGetChannelsMessage(
      this.sessionSigner,
      this.address,
    );
    return this.sendAndWait<ChannelInfo[]>('channels', message);
  }

  // ---- balances ----------------------------------------------------------

  async getBalances(participant?: Address): Promise<LedgerBalance[]> {
    this.ensureReady();
    const message = await createGetLedgerBalancesMessage(
      this.sessionSigner,
      participant ?? this.address,
    );
    return this.sendAndWait<LedgerBalance[]>('balances', message);
  }

  // ---- channel create (off-chain request) --------------------------------

  async requestCreateChannel(chainId: number, token: Address): Promise<any> {
    this.ensureReady();
    const message = await createCreateChannelMessage(
      this.sessionSigner,
      { chain_id: chainId, token },
    );
    return this.sendAndWait<any>('create-channel', message, 30_000);
  }

  // ---- channel resize (off-chain request) ---------------------------------

  async requestResize(channelId: Hex, allocateAmount: bigint, fundsDestination: Address): Promise<any> {
    this.ensureReady();
    const message = await createResizeChannelMessage(
      this.sessionSigner,
      {
        channel_id: channelId,
        allocate_amount: allocateAmount,
        funds_destination: fundsDestination,
      } as any,
    );
    return this.sendAndWait<any>('resize-channel', message, 30_000);
  }

  // ---- session create ----------------------------------------------------

  async createSession(
    participantB: Address,
    amount: string,
    asset = 'ytest.usd',
  ): Promise<string> {
    this.ensureReady();

    const appDefinition = {
      protocol: 'payment-app-v1' as const,
      participants: [this.address, participantB] as [Address, Address],
      weights: [50, 50] as [number, number],
      quorum: 100,
      challenge: 0,
      nonce: BigInt(Date.now()),
    };

    const allocations: SessionAllocation[] = [
      { participant: this.address, asset, amount },
      { participant: participantB, asset, amount: '0' },
    ];

    const signedMessage = await createAppSessionMessage(
      this.sessionSigner,
      [{ definition: appDefinition, allocations }] as any,
    );

    const result = await this.sendAndWait<{ app_session_id: string }>(
      'session-created',
      signedMessage,
    );
    return result.app_session_id;
  }

  // ---- session close -----------------------------------------------------

  async closeSession(
    sessionId: string,
    finalAllocations: SessionAllocation[],
  ): Promise<void> {
    this.ensureReady();
    const signedMessage = await createCloseAppSessionMessage(
      this.sessionSigner,
      [{ app_session_id: sessionId, allocations: finalAllocations }] as any,
    );
    await this.sendAndWait('session-closed', signedMessage);
  }

  // ---- helpers -----------------------------------------------------------

  getAddress(): Address {
    return this.address;
  }

  getPrivateKey(): Hex {
    return this.privateKey;
  }

  isReady(): boolean {
    return this._isConnected && this._isAuthenticated;
  }

  private ensureReady(): void {
    if (!this.isReady()) {
      throw new Error('YellowClient is not connected/authenticated');
    }
  }

  private sendAndWait<T>(event: string, message: string, timeoutMs = 15_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(event, handler);
        reject(new Error(`Timeout waiting for ${event}`));
      }, timeoutMs);

      const handler = (data: T) => {
        clearTimeout(timer);
        resolve(data);
      };

      this.once(event, handler);
      this.ws!.send(message);
    });
  }
}
