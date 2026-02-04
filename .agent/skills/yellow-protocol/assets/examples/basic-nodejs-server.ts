import WebSocket from 'ws';
import { ethers } from 'ethers';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createGetChannelsMessage,
  createGetLedgerBalancesMessage,
  parseRPCResponse,
  RPCMethod,
  MessageSigner,
} from '@erc7824/nitrolite';
import { EventEmitter } from 'events';

const CLEARNODE_URL = 'wss://clearnet.yellow.com/ws';

interface SessionData {
  appSessionId: string;
  participantA: string;
  participantB: string;
  createdAt: number;
}

class YellowProtocolServer extends EventEmitter {
  private ws: WebSocket | null = null;
  private wallet: ethers.Wallet;
  private isConnected = false;
  private isAuthenticated = false;
  private activeSessions = new Map<string, SessionData>();

  constructor(privateKey: string) {
    super();
    this.wallet = new ethers.Wallet(privateKey);
  }

  // Message signer
  private async messageSigner(payload: any): Promise<string> {
    try {
      const message = JSON.stringify(payload);
      const digestHex = ethers.id(message);
      const messageBytes = ethers.getBytes(digestHex);
      const { serialized: signature } = this.wallet.signingKey.sign(messageBytes);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  // Connect to ClearNode
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Connecting to ClearNode...');

      this.ws = new WebSocket(CLEARNODE_URL);

      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.ws.on('open', async () => {
        clearTimeout(timeout);
        this.isConnected = true;
        console.log('WebSocket connected');
        this.emit('connected');

        try {
          // Start authentication
          const authRequest = await createAuthRequestMessage({
            address: this.wallet.address,
            session_key: this.wallet.address,
            application: 'backend-service',
            expires_at: (Math.floor(Date.now() / 1000) + 3600).toString(),
            scope: 'console',
            allowances: [],
          });

          this.ws!.send(authRequest);
        } catch (error) {
          console.error('Authentication request failed:', error);
          reject(error);
        }
      });

      this.ws.on('message', async (data) => {
        try {
          const rawData = typeof data === 'string' ? data : data.toString();
          const message = parseRPCResponse(rawData);

          console.log('Received message:', message.method);

          switch (message.method) {
            case RPCMethod.AuthChallenge:
              // Handle authentication challenge
              const authVerifyMsg = await createAuthVerifyMessage(
                (payload) => this.messageSigner(payload),
                message
              );
              this.ws!.send(authVerifyMsg);
              break;

            case RPCMethod.AuthVerify:
              if (message.params.success) {
                this.isAuthenticated = true;
                console.log('Authentication successful');
                this.emit('authenticated');
                resolve();
              } else {
                const error = new Error('Authentication failed');
                console.error('Authentication failed');
                reject(error);
              }
              break;

            case RPCMethod.CreateAppSession:
              if (message.params.app_session_id) {
                console.log('App session created:', message.params.app_session_id);
                this.emit('session-created', message.params.app_session_id);
              }
              break;

            case RPCMethod.CloseAppSession:
              console.log('App session closed');
              this.emit('session-closed');
              break;

            case RPCMethod.GetChannels:
              console.log('Channels received:', message.params);
              this.emit('channels', message.params);
              break;

            case RPCMethod.GetLedgerBalances:
              console.log('Balances received:', message.params);
              this.emit('balances', message.params);
              break;

            case RPCMethod.Error:
              console.error('RPC Error:', message.params.error);
              this.emit('error', message.params.error);
              break;
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.isAuthenticated = false;
        this.emit('disconnected');
      });
    });
  }

  // Disconnect from ClearNode
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Server shutdown');
      this.ws = null;
    }
  }

  // Create application session
  async createSession(
    participantA: string,
    participantB: string,
    amount: string
  ): Promise<string> {
    if (!this.ws || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    const appDefinition = {
      protocol: 'nitroliterpc',
      participants: [participantA, participantB],
      weights: [100, 0],
      quorum: 100,
      challenge: 0,
      nonce: Date.now(),
    };

    const allocations = [
      { participant: participantA, asset: 'usdc', amount },
      { participant: participantB, asset: 'usdc', amount: '0' },
    ];

    const signedMessage = await createAppSessionMessage(
      (payload) => this.messageSigner(payload),
      [{ definition: appDefinition, allocations }]
    );

    return new Promise((resolve, reject) => {
      const handleSessionCreated = (sessionId: string) => {
        this.activeSessions.set(sessionId, {
          appSessionId: sessionId,
          participantA,
          participantB,
          createdAt: Date.now(),
        });
        this.removeListener('session-created', handleSessionCreated);
        resolve(sessionId);
      };

      this.once('session-created', handleSessionCreated);

      setTimeout(() => {
        this.removeListener('session-created', handleSessionCreated);
        reject(new Error('Session creation timeout'));
      }, 10000);

      this.ws!.send(signedMessage);
    });
  }

  // Close application session
  async closeSession(
    sessionId: string,
    allocations: Array<{ participant: string; asset: string; amount: string }>
  ): Promise<void> {
    if (!this.ws || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    const closeRequest = {
      app_session_id: sessionId,
      allocations,
    };

    const signedMessage = await createCloseAppSessionMessage(
      (payload) => this.messageSigner(payload),
      [closeRequest]
    );

    return new Promise((resolve, reject) => {
      const handleSessionClosed = () => {
        this.activeSessions.delete(sessionId);
        this.removeListener('session-closed', handleSessionClosed);
        resolve();
      };

      this.once('session-closed', handleSessionClosed);

      setTimeout(() => {
        this.removeListener('session-closed', handleSessionClosed);
        reject(new Error('Session close timeout'));
      }, 10000);

      this.ws!.send(signedMessage);
    });
  }

  // Get channels
  async getChannels(): Promise<any[]> {
    if (!this.ws || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    const message = await createGetChannelsMessage(
      (payload) => this.messageSigner(payload),
      this.wallet.address
    );

    return new Promise((resolve, reject) => {
      const handleChannels = (channels: any[]) => {
        this.removeListener('channels', handleChannels);
        resolve(channels);
      };

      this.once('channels', handleChannels);

      setTimeout(() => {
        this.removeListener('channels', handleChannels);
        reject(new Error('Get channels timeout'));
      }, 10000);

      this.ws!.send(message);
    });
  }

  // Get balances
  async getBalances(participant: string): Promise<any[]> {
    if (!this.ws || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    const message = await createGetLedgerBalancesMessage(
      (payload) => this.messageSigner(payload),
      participant
    );

    return new Promise((resolve, reject) => {
      const handleBalances = (balances: any[]) => {
        this.removeListener('balances', handleBalances);
        resolve(balances);
      };

      this.once('balances', handleBalances);

      setTimeout(() => {
        this.removeListener('balances', handleBalances);
        reject(new Error('Get balances timeout'));
      }, 10000);

      this.ws!.send(message);
    });
  }

  // Get wallet address
  getAddress(): string {
    return this.wallet.address;
  }

  // Get active sessions
  getActiveSessions(): Map<string, SessionData> {
    return new Map(this.activeSessions);
  }

  // Check if connected and authenticated
  isReady(): boolean {
    return this.isConnected && this.isAuthenticated;
  }
}

// Example usage
async function main() {
  // Load private key from environment variable
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  const server = new YellowProtocolServer(privateKey);

  // Set up event handlers
  server.on('connected', () => {
    console.log('Server connected to ClearNode');
  });

  server.on('authenticated', () => {
    console.log('Server authenticated');
  });

  server.on('disconnected', () => {
    console.log('Server disconnected');
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  try {
    // Connect to ClearNode
    await server.connect();
    console.log('Server is ready');
    console.log('Server address:', server.getAddress());

    // Get channels
    const channels = await server.getChannels();
    console.log(`Found ${channels.length} channels`);

    if (channels.length > 0) {
      channels.forEach((channel, index) => {
        console.log(`\nChannel ${index + 1}:`);
        console.log(`  ID: ${channel.channel_id}`);
        console.log(`  Status: ${channel.status}`);
        console.log(`  Participant: ${channel.participant}`);
      });
    }

    // Get balances
    const balances = await server.getBalances(server.getAddress());
    console.log('\nBalances:');
    balances.forEach((balance) => {
      console.log(`  ${balance.asset}: ${balance.amount}`);
    });

    // Example: Create a session (uncomment to use)
    // const sessionId = await server.createSession(
    //   server.getAddress(),
    //   '0xOtherParticipantAddress',
    //   '1000000' // 1 USDC
    // );
    // console.log('Session created:', sessionId);

    // Example: Close a session (uncomment to use)
    // await server.closeSession(sessionId, [
    //   { participant: server.getAddress(), asset: 'usdc', amount: '0' },
    //   { participant: '0xOtherParticipantAddress', asset: 'usdc', amount: '1000000' },
    // ]);
    // console.log('Session closed');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Keep the server running or disconnect
    // server.disconnect();

    // Or keep running and handle cleanup on signals
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      server.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down...');
      server.disconnect();
      process.exit(0);
    });
  }
}

// Run the server
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { YellowProtocolServer };
