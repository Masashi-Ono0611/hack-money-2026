import React, { useState, useEffect } from 'react';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createGetLedgerBalancesMessage,
  parseRPCResponse,
  RPCMethod,
  MessageSigner,
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';

const CLEARNODE_URL = 'wss://clearnet.yellow.com/ws';

interface Balance {
  asset: string;
  amount: string;
}

function YellowProtocolApp() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appSessionId, setAppSessionId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Wallet state (in production, use a proper wallet connection)
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);

  // Initialize wallet (for demo purposes only - in production, connect to user's wallet)
  useEffect(() => {
    const sessionWallet = ethers.Wallet.createRandom();
    setWallet(sessionWallet);
  }, []);

  // Message signer
  const messageSigner: MessageSigner = async (payload) => {
    if (!wallet) throw new Error('Wallet not initialized');

    try {
      const message = JSON.stringify(payload);
      const digestHex = ethers.id(message);
      const messageBytes = ethers.getBytes(digestHex);
      const { serialized: signature } = wallet.signingKey.sign(messageBytes);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  // Connect to ClearNode
  const connect = async () => {
    if (!wallet) {
      setError('Wallet not initialized');
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      const websocket = new WebSocket(CLEARNODE_URL);

      websocket.onopen = async () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setWs(websocket);

        // Start authentication
        try {
          const authRequest = await createAuthRequestMessage({
            address: wallet.address,
            session_key: wallet.address,
            application: window.location.hostname,
            expires_at: (Math.floor(Date.now() / 1000) + 3600).toString(),
            scope: 'console',
            allowances: [],
          });

          websocket.send(authRequest);
        } catch (err: any) {
          setError(`Authentication request failed: ${err.message}`);
        }
      };

      websocket.onmessage = async (event) => {
        try {
          const message = parseRPCResponse(event.data);
          console.log('Received message:', message);

          // Handle different message types
          switch (message.method) {
            case RPCMethod.AuthChallenge:
              // For simplicity, we'll skip EIP-712 signing in this example
              // In production, you should use createEIP712AuthMessageSigner
              const authVerifyMsg = await createAuthVerifyMessage(
                messageSigner,
                message
              );
              websocket.send(authVerifyMsg);
              break;

            case RPCMethod.AuthVerify:
              if (message.params.success) {
                console.log('Authentication successful');
                setIsAuthenticated(true);
                if (message.params.jwtToken) {
                  sessionStorage.setItem('clearnode_jwt', message.params.jwtToken);
                }
              } else {
                setError('Authentication failed');
              }
              break;

            case RPCMethod.CreateAppSession:
              if (message.params.app_session_id) {
                console.log('App session created:', message.params.app_session_id);
                setAppSessionId(message.params.app_session_id);
                sessionStorage.setItem('app_session_id', message.params.app_session_id);
              }
              break;

            case RPCMethod.CloseAppSession:
              console.log('App session closed');
              setAppSessionId(null);
              sessionStorage.removeItem('app_session_id');
              break;

            case RPCMethod.GetLedgerBalances:
              console.log('Balances received:', message.params);
              setBalances(message.params || []);
              break;

            case RPCMethod.Error:
              setError(message.params.error);
              break;
          }
        } catch (err: any) {
          console.error('Error handling message:', err);
          setError(`Message handling error: ${err.message}`);
        }
      };

      websocket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setIsAuthenticated(false);
        setWs(null);
      };
    } catch (err: any) {
      setError(`Connection error: ${err.message}`);
      setConnectionStatus('disconnected');
    }
  };

  // Disconnect from ClearNode
  const disconnect = () => {
    if (ws) {
      ws.close(1000, 'User initiated disconnect');
      setWs(null);
    }
  };

  // Create application session
  const createSession = async () => {
    if (!ws || !wallet) {
      setError('Not connected');
      return;
    }

    try {
      // For demo purposes, using same wallet for both participants
      // In production, you'd have different participants
      const participantA = wallet.address;
      const participantB = wallet.address; // Would be different in production

      const appDefinition = {
        protocol: 'nitroliterpc',
        participants: [participantA, participantB],
        weights: [100, 0],
        quorum: 100,
        challenge: 0,
        nonce: Date.now(),
      };

      const allocations = [
        { participant: participantA, asset: 'usdc', amount: '1000000' }, // 1 USDC
        { participant: participantB, asset: 'usdc', amount: '0' },
      ];

      const signedMessage = await createAppSessionMessage(
        messageSigner,
        [{ definition: appDefinition, allocations }]
      );

      ws.send(signedMessage);
    } catch (err: any) {
      setError(`Session creation error: ${err.message}`);
    }
  };

  // Close application session
  const closeSession = async () => {
    if (!ws || !wallet || !appSessionId) {
      setError('No active session');
      return;
    }

    try {
      const participantA = wallet.address;
      const participantB = wallet.address;

      const closeRequest = {
        app_session_id: appSessionId,
        allocations: [
          { participant: participantA, asset: 'usdc', amount: '0' },
          { participant: participantB, asset: 'usdc', amount: '1000000' }, // Transfer to B
        ],
      };

      const signedMessage = await createCloseAppSessionMessage(
        messageSigner,
        [closeRequest]
      );

      ws.send(signedMessage);
    } catch (err: any) {
      setError(`Session close error: ${err.message}`);
    }
  };

  // Get balances
  const getBalances = async () => {
    if (!ws || !wallet) {
      setError('Not connected');
      return;
    }

    try {
      const message = await createGetLedgerBalancesMessage(
        messageSigner,
        wallet.address
      );

      ws.send(message);
    } catch (err: any) {
      setError(`Get balances error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Yellow Protocol Demo</h1>

      {/* Connection Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p><strong>Status:</strong> {connectionStatus}</p>
        <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        <p><strong>Wallet:</strong> {wallet?.address.slice(0, 10)}...</p>
        {appSessionId && <p><strong>Session ID:</strong> {appSessionId.slice(0, 20)}...</p>}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px', color: '#d32f2f' }}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '10px' }}>Clear</button>
        </div>
      )}

      {/* Connection Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Connection</h2>
        <button
          onClick={connect}
          disabled={connectionStatus !== 'disconnected' || !wallet}
          style={{ marginRight: '10px' }}
        >
          Connect
        </button>
        <button
          onClick={disconnect}
          disabled={connectionStatus === 'disconnected'}
        >
          Disconnect
        </button>
      </div>

      {/* Session Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Session Management</h2>
        <button
          onClick={createSession}
          disabled={!isAuthenticated || appSessionId !== null}
          style={{ marginRight: '10px' }}
        >
          Create Session
        </button>
        <button
          onClick={closeSession}
          disabled={!appSessionId}
        >
          Close Session
        </button>
      </div>

      {/* Balance Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Balances</h2>
        <button
          onClick={getBalances}
          disabled={!isAuthenticated}
        >
          Get Balances
        </button>

        {balances.length > 0 && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <h3>Current Balances:</h3>
            {balances.map((balance, index) => (
              <div key={index}>
                {balance.asset.toUpperCase()}: {balance.amount}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default YellowProtocolApp;
