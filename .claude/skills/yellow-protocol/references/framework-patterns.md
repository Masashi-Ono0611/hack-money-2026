# Framework-Specific Implementation Patterns

## React Patterns

### Custom Hook for ClearNode Connection

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  parseRPCResponse,
  RPCMethod,
  MessageSigner,
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';

interface UseClearNodeOptions {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useClearNode(options: UseClearNodeOptions) {
  const { url, autoConnect = true, reconnectAttempts = 5, reconnectInterval = 3000 } = options;

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(async (walletAddress: string, sessionKey: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = async () => {
      setConnectionStatus('connected');
      reconnectCountRef.current = 0;

      try {
        // Start authentication
        const authRequest = await createAuthRequestMessage({
          address: walletAddress,
          session_key: sessionKey,
          application: window.location.hostname,
          expires_at: (Math.floor(Date.now() / 1000) + 3600).toString(),
          scope: 'console',
          allowances: [],
        });

        ws.send(authRequest);
      } catch (err) {
        setError(`Authentication request failed: ${err.message}`);
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = parseRPCResponse(event.data);

        // Handle authentication flow
        if (message.method === RPCMethod.AuthChallenge) {
          // Handle challenge (implementation depends on wallet client)
          // This is a simplified example
        } else if (message.method === RPCMethod.AuthVerify) {
          if (message.params.success) {
            setIsAuthenticated(true);
            if (message.params.jwtToken) {
              localStorage.setItem('clearnode_jwt', message.params.jwtToken);
            }
          } else {
            setError('Authentication failed');
          }
        } else if (message.method === RPCMethod.Error) {
          setError(message.params.error);
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    };

    ws.onerror = (err) => {
      setError('WebSocket error');
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setIsAuthenticated(false);

      // Attempt reconnection
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        setTimeout(() => {
          connect(walletAddress, sessionKey);
        }, reconnectInterval * Math.pow(2, reconnectCountRef.current - 1));
      }
    };
  }, [url, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
      return true;
    }
    setError('WebSocket not connected');
    return false;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    isAuthenticated,
    error,
    ws: wsRef.current,
    connect,
    disconnect,
    sendMessage,
  };
}
```

### Application Session Hook

```typescript
import { useCallback, useState } from 'react';
import {
  createAppSessionMessage,
  createCloseAppSessionMessage,
  MessageSigner,
} from '@erc7824/nitrolite';

export function useAppSession(messageSigner: MessageSigner, sendMessage: (msg: string) => boolean) {
  const [appSessionId, setAppSessionId] = useState<string | null>(
    localStorage.getItem('app_session_id')
  );

  const createSession = useCallback(
    async (participantA: string, participantB: string, amount: string) => {
      try {
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
          messageSigner,
          [{ definition: appDefinition, allocations }]
        );

        const success = sendMessage(signedMessage);
        return success;
      } catch (error) {
        console.error('Error creating session:', error);
        return false;
      }
    },
    [messageSigner, sendMessage]
  );

  const closeSession = useCallback(
    async (finalAllocations: Array<{ participant: string; asset: string; amount: string }>) => {
      if (!appSessionId) {
        console.error('No active session');
        return false;
      }

      try {
        const closeRequest = {
          app_session_id: appSessionId,
          allocations: finalAllocations,
        };

        const signedMessage = await createCloseAppSessionMessage(
          messageSigner,
          [closeRequest]
        );

        const success = sendMessage(signedMessage);
        if (success) {
          localStorage.removeItem('app_session_id');
          setAppSessionId(null);
        }
        return success;
      } catch (error) {
        console.error('Error closing session:', error);
        return false;
      }
    },
    [appSessionId, messageSigner, sendMessage]
  );

  return {
    appSessionId,
    setAppSessionId,
    createSession,
    closeSession,
  };
}
```

## Vue.js Patterns

### Composable for ClearNode

```typescript
// useClearNode.ts
import { ref, onMounted, onUnmounted } from 'vue';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  parseRPCResponse,
  RPCMethod,
} from '@erc7824/nitrolite';

export function useClearNode(url: string) {
  const ws = ref<WebSocket | null>(null);
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const isAuthenticated = ref(false);
  const error = ref<string | null>(null);

  const connect = async (walletAddress: string, sessionKey: string) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    connectionStatus.value = 'connecting';
    error.value = null;

    const newWs = new WebSocket(url);
    ws.value = newWs;

    newWs.onopen = async () => {
      connectionStatus.value = 'connected';

      try {
        const authRequest = await createAuthRequestMessage({
          address: walletAddress,
          session_key: sessionKey,
          application: window.location.hostname,
          expires_at: (Math.floor(Date.now() / 1000) + 3600).toString(),
          scope: 'console',
          allowances: [],
        });

        newWs.send(authRequest);
      } catch (err) {
        error.value = `Authentication failed: ${err.message}`;
      }
    };

    newWs.onmessage = async (event) => {
      try {
        const message = parseRPCResponse(event.data);

        if (message.method === RPCMethod.AuthVerify && message.params.success) {
          isAuthenticated.value = true;
          if (message.params.jwtToken) {
            localStorage.setItem('clearnode_jwt', message.params.jwtToken);
          }
        } else if (message.method === RPCMethod.Error) {
          error.value = message.params.error;
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    };

    newWs.onerror = () => {
      error.value = 'WebSocket error';
      connectionStatus.value = 'error';
    };

    newWs.onclose = () => {
      connectionStatus.value = 'disconnected';
      isAuthenticated.value = false;
    };
  };

  const disconnect = () => {
    if (ws.value) {
      ws.value.close(1000, 'User initiated disconnect');
      ws.value = null;
    }
  };

  const sendMessage = (message: string): boolean => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(message);
      return true;
    }
    error.value = 'WebSocket not connected';
    return false;
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    ws,
    connectionStatus,
    isAuthenticated,
    error,
    connect,
    disconnect,
    sendMessage,
  };
}
```

## Node.js Backend Patterns

### ClearNode Connection Class

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  parseRPCResponse,
  RPCMethod,
  MessageSigner,
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';

interface ClearNodeOptions {
  url: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export class ClearNodeConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnected = false;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private requestMap = new Map<number, any>();
  private wallet: ethers.Wallet;

  constructor(options: ClearNodeOptions, privateKey: string) {
    super();
    this.url = options.url;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectInterval = options.reconnectInterval ?? 3000;
    this.wallet = new ethers.Wallet(privateKey);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.close();
      }

      this.emit('connecting');
      this.ws = new WebSocket(this.url);

      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.ws.on('open', async () => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');

        try {
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
          this.emit('error', `Authentication request failed: ${error.message}`);
          reject(error);
        }
      });

      this.ws.on('message', async (data) => {
        try {
          const message = parseRPCResponse(data.toString());
          this.emit('message', message);

          if (message.method === RPCMethod.AuthVerify && message.params.success) {
            this.isAuthenticated = true;
            this.emit('authenticated');
            resolve();
          } else if (message.method === RPCMethod.Error) {
            const error = new Error(`Authentication failed: ${message.params.error}`);
            this.emit('error', error.message);
            reject(error);
          }

          // Handle request responses
          if (message.res && message.res[0]) {
            const requestId = message.res[0];
            const handler = this.requestMap.get(requestId);
            if (handler) {
              handler.resolve(message);
              this.requestMap.delete(requestId);
            }
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        this.emit('error', `WebSocket error: ${error.message}`);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        this.isConnected = false;
        this.isAuthenticated = false;
        this.emit('disconnected', { code, reason: reason.toString() });
        this.attemptReconnect();
      });
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', 'Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      this.connect().catch(error => {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }

  async sendRequest(method: string, params: any[] = []): Promise<any> {
    if (!this.isConnected || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    const requestId = Date.now();
    const timestamp = Date.now();
    const requestData = [requestId, method, params, timestamp];
    const request = { req: requestData };

    // Sign the request
    const message = JSON.stringify(request);
    const digestHex = ethers.id(message);
    const messageBytes = ethers.getBytes(digestHex);
    const { serialized: signature } = this.wallet.signingKey.sign(messageBytes);
    request.sig = [signature];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestMap.delete(requestId);
        reject(new Error(`Request timeout for ${method}`));
      }, 30000);

      this.requestMap.set(requestId, {
        resolve: (response: any) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject,
        timeout,
      });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeout);
        this.requestMap.delete(requestId);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      for (const [requestId, handler] of this.requestMap.entries()) {
        clearTimeout(handler.timeout);
        handler.reject(new Error('Connection closed'));
        this.requestMap.delete(requestId);
      }

      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.isAuthenticated;
  }
}
```

### Usage Example

```typescript
import { ClearNodeConnection } from './ClearNodeConnection';

async function main() {
  const connection = new ClearNodeConnection(
    { url: 'wss://clearnet.yellow.com/ws' },
    process.env.PRIVATE_KEY!
  );

  connection.on('connected', () => console.log('Connected'));
  connection.on('authenticated', () => console.log('Authenticated'));
  connection.on('error', (error) => console.error('Error:', error));

  try {
    await connection.connect();

    // Use the connection
    const response = await connection.sendRequest('get_channels', [
      { participant: connection.getWallet().address }
    ]);

    console.log('Channels:', response);
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    connection.disconnect();
  }
}

main();
```

## Angular Patterns

### ClearNode Service

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  parseRPCResponse,
  RPCMethod,
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class ClearNodeService {
  private ws: WebSocket | null = null;
  private connectionStatusSource = new BehaviorSubject<string>('disconnected');
  private isAuthenticatedSource = new BehaviorSubject<boolean>(false);
  private errorSource = new BehaviorSubject<string | null>(null);
  private messageSubject = new BehaviorSubject<any>(null);

  public connectionStatus$ = this.connectionStatusSource.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSource.asObservable();
  public error$ = this.errorSource.asObservable();
  public message$ = this.messageSubject.asObservable();

  async connect(url: string, walletAddress: string, sessionKey: string): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }

    this.connectionStatusSource.next('connecting');
    this.errorSource.next(null);

    this.ws = new WebSocket(url);

    this.ws.onopen = async () => {
      this.connectionStatusSource.next('connected');

      try {
        const authRequest = await createAuthRequestMessage({
          address: walletAddress,
          session_key: sessionKey,
          application: window.location.hostname,
          expires_at: (Math.floor(Date.now() / 1000) + 3600).toString(),
          scope: 'console',
          allowances: [],
        });

        this.ws!.send(authRequest);
      } catch (err: any) {
        this.errorSource.next(`Authentication request failed: ${err.message}`);
      }
    };

    this.ws.onmessage = async (event) => {
      try {
        const message = parseRPCResponse(event.data);
        this.messageSubject.next(message);

        if (message.method === RPCMethod.AuthVerify && message.params.success) {
          this.isAuthenticatedSource.next(true);
          if (message.params.jwtToken) {
            localStorage.setItem('clearnode_jwt', message.params.jwtToken);
          }
        } else if (message.method === RPCMethod.Error) {
          this.errorSource.next(message.params.error);
        }
      } catch (err: any) {
        console.error('Error handling message:', err);
      }
    };

    this.ws.onerror = () => {
      this.errorSource.next('WebSocket error');
      this.connectionStatusSource.next('error');
    };

    this.ws.onclose = () => {
      this.connectionStatusSource.next('disconnected');
      this.isAuthenticatedSource.next(false);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
  }

  sendMessage(message: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.errorSource.next('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(message);
      return true;
    } catch (error: any) {
      this.errorSource.next(`Error sending message: ${error.message}`);
      return false;
    }
  }
}
```

## Common Patterns Across All Frameworks

### Promise-based Message Sending

```typescript
function sendMessageWithResponse<T>(
  ws: WebSocket,
  message: string,
  expectedMethod: RPCMethod,
  timeout = 10000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      reject(new Error('Request timeout'));
    }, timeout);

    const handleMessage = (event: MessageEvent) => {
      try {
        const response = parseRPCResponse(event.data);

        if (response.method === expectedMethod) {
          clearTimeout(timeoutId);
          ws.removeEventListener('message', handleMessage);
          resolve(response.params as T);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    ws.send(message);
  });
}
```

### Reconnection Logic

```typescript
class ReconnectionManager {
  private attempts = 0;
  private maxAttempts: number;
  private baseInterval: number;

  constructor(maxAttempts = 5, baseInterval = 3000) {
    this.maxAttempts = maxAttempts;
    this.baseInterval = baseInterval;
  }

  shouldReconnect(): boolean {
    return this.attempts < this.maxAttempts;
  }

  getDelay(): number {
    return this.baseInterval * Math.pow(2, this.attempts);
  }

  increment(): void {
    this.attempts++;
  }

  reset(): void {
    this.attempts = 0;
  }
}
```

### Event Listener Cleanup

```typescript
class MessageHandler {
  private listeners = new Map<string, Set<Function>>();

  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => callback(...args));
  }
}
```
