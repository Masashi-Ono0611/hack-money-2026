# Troubleshooting and Best Practices

## Common Issues and Solutions

### Authentication Issues

#### Issue: "Authentication failed" error

**Possible Causes:**
- Invalid wallet address or session key
- Incorrect EIP-712 signature
- Expired authentication token
- Wrong domain configuration

**Solutions:**

1. Verify wallet address and session key are correct:
```javascript
console.log('Wallet:', wallet.address);
console.log('Session Key:', sessionKey);
```

2. Check EIP-712 domain configuration:
```javascript
const eip712MessageSigner = createEIP712AuthMessageSigner(
  walletClient,
  authParams,
  { name: 'YourAppDomain' } // Must match your application domain
);
```

3. Ensure the expires_at timestamp is in the future:
```javascript
const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
console.log('Expires at:', new Date(expiresAt * 1000));
```

4. Verify you're signing the message correctly without EIP-191 prefix:
```javascript
// CORRECT - Sign raw message digest
const messageBytes = ethers.utils.arrayify(ethers.utils.id(JSON.stringify(payload)));
const flatSignature = await wallet._signingKey().signDigest(messageBytes);

// INCORRECT - Don't use signMessage (adds EIP-191 prefix)
const signature = await wallet.signMessage(payload); // ❌
```

#### Issue: JWT token not working on reconnection

**Solution:**

```javascript
// Store JWT token after successful authentication
if (message.method === RPCMethod.AuthVerify && message.params.success) {
  const jwtToken = message.params.jwtToken;
  if (jwtToken) {
    // Store securely (not in localStorage for production)
    sessionStorage.setItem('clearnode_jwt', jwtToken);
  }
}

// Use JWT on reconnection
const jwtToken = sessionStorage.getItem('clearnode_jwt');
if (jwtToken) {
  const authMsg = await createAuthVerifyMessageWithJWT(jwtToken);
  ws.send(authMsg);
} else {
  // Fall back to full authentication flow
  initiateFullAuth();
}
```

### Connection Issues

#### Issue: WebSocket connection fails or drops frequently

**Solutions:**

1. Implement proper reconnection logic:
```javascript
class ConnectionManager {
  private reconnectAttempts = 0;
  private maxAttempts = 5;
  private baseDelay = 3000;

  async connect() {
    try {
      await this.establishConnection();
      this.reconnectAttempts = 0;
    } catch (error) {
      if (this.reconnectAttempts < this.maxAttempts) {
        const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxAttempts})`);

        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
      } else {
        throw new Error('Max reconnection attempts reached');
      }
    }
  }

  private establishConnection() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://clearnet.yellow.com/ws');

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }
}
```

2. Add heartbeat/ping mechanism:
```javascript
class HeartbeatManager {
  private intervalId: NodeJS.Timeout | null = null;
  private lastPong = Date.now();

  start(ws: WebSocket, interval = 30000) {
    this.intervalId = setInterval(() => {
      if (Date.now() - this.lastPong > interval * 2) {
        console.log('Connection appears dead, reconnecting...');
        ws.close();
        return;
      }

      // Send ping (implementation depends on your protocol)
      ws.send(JSON.stringify({ type: 'ping' }));
    }, interval);

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'pong') {
        this.lastPong = Date.now();
      }
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

#### Issue: "WebSocket not connected" error

**Solution:**

```javascript
function ensureConnected(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', reject, { once: true });
      return;
    }

    reject(new Error('WebSocket is closed'));
  });
}

// Usage
async function sendMessage(ws: WebSocket, message: string) {
  await ensureConnected(ws);
  ws.send(message);
}
```

### Message Handling Issues

#### Issue: Messages not being received or parsed incorrectly

**Solutions:**

1. Proper message parsing with error handling:
```javascript
ws.onmessage = (event) => {
  try {
    const message = parseRPCResponse(event.data);

    // Validate message structure
    if (!message.method) {
      console.warn('Received message without method:', message);
      return;
    }

    // Handle specific message types
    switch (message.method) {
      case RPCMethod.AuthVerify:
        handleAuthVerify(message);
        break;
      case RPCMethod.CreateAppSession:
        handleCreateAppSession(message);
        break;
      case RPCMethod.Error:
        handleError(message);
        break;
      default:
        console.log('Unhandled message type:', message.method);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
    console.error('Raw message:', event.data);
  }
};
```

2. Track request-response pairs:
```javascript
class RequestTracker {
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  async send(ws: WebSocket, message: string, timeoutMs = 10000): Promise<any> {
    const parsed = JSON.parse(message);
    const requestId = parsed.req[0];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} timed out`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      ws.send(message);
    });
  }

  handleResponse(message: any) {
    const requestId = message.res?.[0];
    if (!requestId) return;

    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(message);
      this.pendingRequests.delete(requestId);
    }
  }

  cleanup() {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}
```

#### Issue: Timeout errors on slow operations

**Solution:**

```javascript
// Use appropriate timeouts for different operations
const TIMEOUTS = {
  AUTH: 15000,
  CREATE_SESSION: 20000,
  CLOSE_SESSION: 20000,
  GET_CHANNELS: 10000,
  GET_BALANCES: 10000,
  DEFAULT: 10000,
};

async function sendWithTimeout(
  ws: WebSocket,
  message: string,
  method: string,
  customTimeout?: number
): Promise<any> {
  const timeout = customTimeout || TIMEOUTS[method] || TIMEOUTS.DEFAULT;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation ${method} timed out after ${timeout}ms`));
    }, timeout);

    // ... message handling logic ...
  });
}
```

### Session Management Issues

#### Issue: "Session not found" error

**Solutions:**

1. Verify session ID is stored and retrieved correctly:
```javascript
class SessionManager {
  private readonly STORAGE_KEY = 'app_session_id';

  saveSession(sessionId: string) {
    try {
      localStorage.setItem(this.STORAGE_KEY, sessionId);
      console.log('Session saved:', sessionId);
    } catch (error) {
      console.error('Failed to save session:', error);
      // Fallback to in-memory storage
      this.inMemorySessionId = sessionId;
    }
  }

  getSession(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY) || this.inMemorySessionId;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return this.inMemorySessionId;
    }
  }

  clearSession() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.inMemorySessionId = null;
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  private inMemorySessionId: string | null = null;
}
```

2. Handle session expiration gracefully:
```javascript
async function closeSessionWithRetry(sessionId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await closeSession(sessionId);
      return;
    } catch (error) {
      if (error.message.includes('session not found')) {
        console.log('Session already closed or expired');
        // Clean up local storage
        sessionManager.clearSession();
        return;
      }

      if (i === maxRetries - 1) {
        throw error;
      }

      console.log(`Retry ${i + 1}/${maxRetries} closing session`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### Issue: Memory leaks from unclosed sessions or event listeners

**Solutions:**

1. Proper cleanup on component unmount:
```typescript
// React
useEffect(() => {
  const connection = new ClearNodeConnection(url);

  return () => {
    connection.disconnect();
  };
}, []);

// Vue
onUnmounted(() => {
  clearNodeConnection.value?.disconnect();
});

// Angular
ngOnDestroy() {
  this.clearNodeService.disconnect();
  this.subscriptions.forEach(sub => sub.unsubscribe());
}
```

2. Track and clean up event listeners:
```javascript
class EventListenerManager {
  private listeners = new Map<WebSocket, Map<string, Set<EventListener>>>();

  addEventListener(ws: WebSocket, event: string, listener: EventListener) {
    if (!this.listeners.has(ws)) {
      this.listeners.set(ws, new Map());
    }

    const wsListeners = this.listeners.get(ws)!;
    if (!wsListeners.has(event)) {
      wsListeners.set(event, new Set());
    }

    wsListeners.get(event)!.add(listener);
    ws.addEventListener(event, listener);
  }

  removeAllListeners(ws: WebSocket) {
    const wsListeners = this.listeners.get(ws);
    if (!wsListeners) return;

    for (const [event, listeners] of wsListeners.entries()) {
      for (const listener of listeners) {
        ws.removeEventListener(event, listener);
      }
    }

    this.listeners.delete(ws);
  }
}
```

### Balance and Transaction Issues

#### Issue: Balance mismatch or incorrect amounts

**Solutions:**

1. Handle decimal precision correctly:
```javascript
// USDC has 6 decimals
function formatUSDC(amount: string): string {
  const decimals = 6;
  const num = BigInt(amount);
  const divisor = BigInt(10 ** decimals);

  const integerPart = num / divisor;
  const fractionalPart = num % divisor;

  return `${integerPart}.${fractionalPart.toString().padStart(decimals, '0')}`;
}

function parseUSDC(amount: string): string {
  const decimals = 6;
  const [integerPart, fractionalPart = '0'] = amount.split('.');

  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const result = BigInt(integerPart) * BigInt(10 ** decimals) + BigInt(paddedFractional);

  return result.toString();
}

// Usage
const humanReadable = '1.5'; // 1.5 USDC
const onChainAmount = parseUSDC(humanReadable); // "1500000"

const received = '1000000';
const display = formatUSDC(received); // "1.0"
```

2. Validate allocations before closing session:
```javascript
function validateAllocations(
  initialAllocations: Array<{ participant: string; amount: string }>,
  finalAllocations: Array<{ participant: string; amount: string }>
): boolean {
  // Calculate totals
  const initialTotal = initialAllocations.reduce(
    (sum, alloc) => sum + BigInt(alloc.amount),
    BigInt(0)
  );

  const finalTotal = finalAllocations.reduce(
    (sum, alloc) => sum + BigInt(alloc.amount),
    BigInt(0)
  );

  if (initialTotal !== finalTotal) {
    console.error('Total allocation mismatch:', {
      initial: initialTotal.toString(),
      final: finalTotal.toString(),
    });
    return false;
  }

  return true;
}
```

## Best Practices

### Security

1. **Never expose private keys**
```javascript
// ❌ DON'T
const wallet = new ethers.Wallet('0xYourPrivateKey');

// ✅ DO - Use environment variables
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);

// ✅ DO - Use session keys for temporary operations
const sessionWallet = ethers.Wallet.createRandom();
```

2. **Secure token storage**
```javascript
// ❌ DON'T - Store sensitive data in localStorage in production
localStorage.setItem('jwt_token', token);

// ✅ DO - Use secure storage mechanisms
// For web apps: httpOnly cookies, sessionStorage for non-sensitive data
// For mobile: Secure storage APIs
// For backend: Environment variables, secret management services

class SecureStorage {
  static setToken(token: string) {
    // Use appropriate secure storage for your platform
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('clearnode_jwt', token);
    } else {
      // Server-side: use memory or encrypted storage
      this.tokenCache = token;
    }
  }

  private static tokenCache: string | null = null;
}
```

3. **Validate all inputs**
```javascript
function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateAmount(amount: string): boolean {
  try {
    const num = BigInt(amount);
    return num >= 0;
  } catch {
    return false;
  }
}

// Use before creating sessions
if (!validateAddress(participantA) || !validateAddress(participantB)) {
  throw new Error('Invalid participant address');
}

if (!validateAmount(amount)) {
  throw new Error('Invalid amount');
}
```

### Performance

1. **Batch operations when possible**
```javascript
// ❌ DON'T - Multiple sequential requests
for (const channel of channels) {
  await getChannelBalance(channel.id);
}

// ✅ DO - Batch requests if the API supports it
const balances = await Promise.all(
  channels.map(channel => getChannelBalance(channel.id))
);
```

2. **Implement caching for frequently accessed data**
```javascript
class ChannelCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 30000; // 30 seconds

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}
```

3. **Use connection pooling for backend services**
```javascript
class ConnectionPool {
  private connections: ClearNodeConnection[] = [];
  private maxConnections = 5;

  async getConnection(): Promise<ClearNodeConnection> {
    // Reuse existing connection
    const available = this.connections.find(conn => !conn.isBusy());
    if (available) return available;

    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      const conn = new ClearNodeConnection(config);
      await conn.connect();
      this.connections.push(conn);
      return conn;
    }

    // Wait for available connection
    return this.waitForAvailable();
  }

  private waitForAvailable(): Promise<ClearNodeConnection> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const available = this.connections.find(conn => !conn.isBusy());
        if (available) {
          clearInterval(interval);
          resolve(available);
        }
      }, 100);
    });
  }
}
```

### Error Handling

1. **Use typed errors**
```typescript
class YellowProtocolError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'YellowProtocolError';
  }
}

class AuthenticationError extends YellowProtocolError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
  }
}

class SessionError extends YellowProtocolError {
  constructor(message: string, details?: any) {
    super(message, 'SESSION_ERROR', details);
  }
}

// Usage
try {
  await createSession();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Re-authenticate
    await authenticate();
  } else if (error instanceof SessionError) {
    // Handle session error
    console.error('Session error:', error.details);
  } else {
    // Unknown error
    throw error;
  }
}
```

2. **Implement retry logic with backoff**
```javascript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Should not reach here');
}

// Usage
const result = await retryWithBackoff(
  () => createAppSession(params),
  3,
  1000
);
```

### Logging and Monitoring

1. **Structured logging**
```javascript
class Logger {
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }

  info(message: string, data?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    }));
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...this.context,
      ...data,
    }));
  }
}

// Usage
const logger = new Logger({ service: 'yellow-protocol', userId: '123' });
logger.info('Creating session', { participants: [a, b] });
logger.error('Session creation failed', error, { sessionId });
```

2. **Monitor connection health**
```javascript
class ConnectionMonitor {
  private metrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  };

  recordConnectionAttempt() {
    this.metrics.connectionAttempts++;
  }

  recordConnectionSuccess() {
    this.metrics.successfulConnections++;
  }

  recordConnectionFailure() {
    this.metrics.failedConnections++;
  }

  recordReconnection() {
    this.metrics.reconnections++;
  }

  recordMessageSent() {
    this.metrics.messagesSent++;
  }

  recordMessageReceived() {
    this.metrics.messagesReceived++;
  }

  recordError() {
    this.metrics.errors++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.connectionAttempts > 0
        ? this.metrics.successfulConnections / this.metrics.connectionAttempts
        : 0,
    };
  }

  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });
  }
}
```

### Testing

1. **Mock WebSocket for unit tests**
```javascript
class MockWebSocket {
  readyState = WebSocket.CONNECTING;
  private messageHandlers: Array<(event: MessageEvent) => void> = [];
  private openHandlers: Array<() => void> = [];

  constructor(public url: string) {
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.openHandlers.forEach(handler => handler());
    }, 10);
  }

  addEventListener(event: string, handler: any) {
    if (event === 'message') {
      this.messageHandlers.push(handler);
    } else if (event === 'open') {
      this.openHandlers.push(handler);
    }
  }

  removeEventListener(event: string, handler: any) {
    if (event === 'message') {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) this.messageHandlers.splice(index, 1);
    }
  }

  send(data: string) {
    // Simulate response
    setTimeout(() => {
      const message = JSON.parse(data);
      // Generate mock response based on request
      const response = this.generateMockResponse(message);
      this.simulateMessage(JSON.stringify(response));
    }, 10);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
  }

  private simulateMessage(data: string) {
    const event = { data } as MessageEvent;
    this.messageHandlers.forEach(handler => handler(event));
  }

  private generateMockResponse(request: any) {
    // Generate appropriate mock responses
    return { res: [request.req[0], 'success', {}, Date.now()] };
  }
}

// Use in tests
global.WebSocket = MockWebSocket as any;
```

2. **Integration test patterns**
```javascript
describe('Yellow Protocol Integration', () => {
  let connection: ClearNodeConnection;

  beforeEach(async () => {
    connection = new ClearNodeConnection({
      url: process.env.TEST_CLEARNODE_URL,
    }, process.env.TEST_PRIVATE_KEY);

    await connection.connect();
  });

  afterEach(async () => {
    connection.disconnect();
  });

  it('should create and close a session', async () => {
    const sessionId = await connection.createSession({
      participantA: TEST_ADDRESS_A,
      participantB: TEST_ADDRESS_B,
      amount: '1000000',
    });

    expect(sessionId).toBeDefined();

    const closed = await connection.closeSession(sessionId, {
      allocations: [
        { participant: TEST_ADDRESS_A, asset: 'usdc', amount: '0' },
        { participant: TEST_ADDRESS_B, asset: 'usdc', amount: '1000000' },
      ],
    });

    expect(closed).toBe(true);
  });
});
```
