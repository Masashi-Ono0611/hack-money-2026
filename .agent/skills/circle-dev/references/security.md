# Security Best Practices for Circle Development

Critical security patterns and checklist for building secure applications with Circle.

## Security Checklist

### ✅ Before Production Deployment

- [ ] API keys stored in environment variables (never in code)
- [ ] Entity secrets encrypted and managed securely
- [ ] Webhook signature verification implemented
- [ ] Rate limiting on API requests
- [ ] Input validation for all user-provided addresses and amounts
- [ ] Testnet testing completed (Sepolia, Amoy, etc.)
- [ ] Smart contracts audited (if custom)
- [ ] Transaction amount limits implemented
- [ ] Multi-signature approvals for high-value transactions
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented
- [ ] Regular security updates scheduled

---

## 1. API Key Management

### ❌ NEVER Do This

```typescript
// WRONG: Hardcoded API key
const client = initiateDeveloperControlledWalletsClient({
  apiKey: 'QVBJX0tFWTpkZmY2OWI1Yi00ZTRkLTQ5YzEtOGY5Zi1lZjE0ZmY3NmVlYmI6MWY5MGQxYzFkODFhODU5ZjVjNzg5YzZkMmU0MTA5ZGE='
});

// WRONG: Committed to repository
const API_KEY = 'your-api-key-here';
```

### ✅ Best Practice

```typescript
// CORRECT: Environment variables
import dotenv from 'dotenv';
dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.ENTITY_SECRET!
});

// CORRECT: Validation
if (!process.env.CIRCLE_API_KEY) {
  throw new Error('CIRCLE_API_KEY environment variable is required');
}
```

**.env file** (add to .gitignore):
```bash
CIRCLE_API_KEY=your_api_key_here
ENTITY_SECRET=your_entity_secret_here
```

**.gitignore**:
```
.env
.env.local
.env.production
```

---

## 2. Entity Secret Encryption

Entity secrets are used to encrypt/decrypt wallet private keys. Treat them like private keys.

### Storage Options

**Option 1: AWS Secrets Manager**
```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

async function getEntitySecret(): Promise<string> {
  const client = new SecretsManager({ region: 'us-east-1' });

  const response = await client.getSecretValue({
    SecretId: 'circle/entity-secret'
  });

  return response.SecretString!;
}

const entitySecret = await getEntitySecret();
```

**Option 2: Environment Variables (Development Only)**
```typescript
// Only for development/testing
const entitySecret = process.env.ENTITY_SECRET!;

if (process.env.NODE_ENV === 'production') {
  // Use secure key management in production
  throw new Error('Use AWS Secrets Manager in production');
}
```

**Option 3: HashiCorp Vault**
```typescript
import vault from 'node-vault';

async function getEntitySecret(): Promise<string> {
  const client = vault({
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN
  });

  const result = await client.read('secret/data/circle');
  return result.data.data.entity_secret;
}
```

---

## 3. Webhook Signature Verification

Always verify that webhooks are from Circle to prevent spoofing attacks.

### Verification Implementation

```typescript
import crypto from 'crypto';

interface CircleWebhook {
  notificationId: string;
  notificationType: string;
  notification: any;
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Express.js example
app.post('/webhooks/circle', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['circle-signature'] as string;
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const webhook: CircleWebhook = JSON.parse(payload);
  console.log('Verified webhook:', webhook.notificationType);

  res.sendStatus(200);
});
```

---

## 4. Transaction Validation

### Input Validation

```typescript
import { isAddress } from 'viem';

function validateTransferParams(
  destinationAddress: string,
  amount: string
): void {
  // Validate address format
  if (!isAddress(destinationAddress)) {
    throw new Error('Invalid destination address');
  }

  // Validate amount
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount');
  }

  // Check amount limits
  const MAX_TRANSFER = 10000; // $10k limit
  if (numAmount > MAX_TRANSFER) {
    throw new Error(`Amount exceeds maximum of ${MAX_TRANSFER} USDC`);
  }

  // Check minimum
  const MIN_TRANSFER = 0.01;
  if (numAmount < MIN_TRANSFER) {
    throw new Error(`Amount below minimum of ${MIN_TRANSFER} USDC`);
  }
}

// Usage
try {
  validateTransferParams(userInputAddress, userInputAmount);

  const transfer = await client.createTransaction({
    walletId: walletId,
    blockchain: 'ETH-SEPOLIA',
    destinationAddress: userInputAddress,
    amount: [userInputAmount]
  });
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Transaction Confirmation

```typescript
async function confirmHighValueTransfer(
  amount: string,
  destination: string
): Promise<boolean> {
  const numAmount = parseFloat(amount);

  // Require additional confirmation for high-value transfers
  if (numAmount > 1000) {
    console.log(`High-value transfer detected: ${amount} USDC`);
    console.log(`Destination: ${destination}`);

    // Implement 2FA, email confirmation, or multi-sig here
    const confirmed = await requestUserConfirmation();
    return confirmed;
  }

  return true;
}
```

---

## 5. Rate Limiting

Implement rate limiting to prevent API abuse and manage costs.

```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Stricter limits for wallet creation
const walletCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 wallets per hour per IP
  message: 'Wallet creation limit exceeded'
});

app.post('/api/wallets', walletCreationLimiter, async (req, res) => {
  // Create wallet
});
```

---

## 6. Smart Contract Security

### CCTP Integration Security

```solidity
// CORRECT: Validate CCTP message sender
contract SecureCCTPReceiver {
    address public immutable messageTransmitter;

    constructor(address _messageTransmitter) {
        messageTransmitter = _messageTransmitter;
    }

    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external {
        // CRITICAL: Only accept calls from legitimate MessageTransmitter
        require(
            msg.sender == messageTransmitter,
            "Invalid message transmitter"
        );

        // Process message
        // ...
    }
}
```

### Access Control

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract SecureContract is Ownable {
    // Only owner can call
    function criticalOperation() external onlyOwner {
        // Critical logic
    }

    // Multi-sig for high-value operations
    mapping(address => bool) public admins;
    uint256 public requiredSignatures = 2;

    function executeWithMultiSig(
        bytes calldata data,
        bytes[] calldata signatures
    ) external {
        require(signatures.length >= requiredSignatures, "Insufficient signatures");

        // Verify signatures
        // Execute operation
    }
}
```

---

## 7. Reentrancy Protection

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureWallet is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant {
        // Protected from reentrancy
        require(balance[msg.sender] >= amount, "Insufficient balance");

        balance[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

---

## 8. Monitoring & Alerting

### Transaction Monitoring

```typescript
async function monitorTransaction(transactionId: string): Promise<void> {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    const tx = await client.getTransaction({ id: transactionId });

    if (tx.data.state === 'COMPLETE') {
      console.log('Transaction successful:', transactionId);
      return;
    }

    if (tx.data.state === 'FAILED') {
      // Alert on failure
      await sendAlert({
        type: 'TRANSACTION_FAILED',
        transactionId,
        reason: tx.data.errorReason
      });

      throw new Error('Transaction failed');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  // Alert on timeout
  await sendAlert({
    type: 'TRANSACTION_TIMEOUT',
    transactionId
  });

  throw new Error('Transaction monitoring timeout');
}

async function sendAlert(alert: any): Promise<void> {
  // Send to monitoring service (e.g., PagerDuty, Slack, email)
  console.error('ALERT:', alert);

  // Example: Send to Slack
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Alert: ${alert.type} - Transaction: ${alert.transactionId}`
    })
  });
}
```

---

## 9. Error Handling

### Graceful Error Handling

```typescript
import { CircleError } from '@circle-fin/developer-controlled-wallets';

async function safeCreateWallet(params: any) {
  try {
    const wallet = await client.createWallet(params);
    return { success: true, data: wallet };

  } catch (error) {
    if (error instanceof CircleError) {
      // Handle Circle-specific errors
      console.error('Circle API Error:', {
        code: error.code,
        message: error.message,
        details: error.details
      });

      // Don't expose internal errors to users
      return {
        success: false,
        error: 'Failed to create wallet. Please try again.'
      };
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED') {
      console.error('Network error - Circle API unreachable');
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    // Unknown errors
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}
```

---

## 10. Testnet Best Practices

### Always Test Before Mainnet

```typescript
// Configuration for different environments
const CIRCLE_CONFIG = {
  development: {
    apiKey: process.env.CIRCLE_TEST_API_KEY!,
    entitySecret: process.env.TEST_ENTITY_SECRET!,
    blockchain: 'ETH-SEPOLIA',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  },
  production: {
    apiKey: process.env.CIRCLE_PROD_API_KEY!,
    entitySecret: process.env.PROD_ENTITY_SECRET!,
    blockchain: 'ETH',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  }
};

const env = process.env.NODE_ENV || 'development';
const config = CIRCLE_CONFIG[env];

const client = initiateDeveloperControlledWalletsClient({
  apiKey: config.apiKey,
  entitySecret: config.entitySecret
});
```

### Test Checklist

- [ ] Wallet creation
- [ ] USDC transfers (small amounts)
- [ ] CCTP cross-chain transfers
- [ ] Gas Station functionality (if used)
- [ ] Webhook reception and verification
- [ ] Error handling (invalid addresses, insufficient balance, etc.)
- [ ] Rate limiting behavior
- [ ] Transaction failure scenarios

---

## 11. Common Vulnerabilities

### Vulnerability: Exposed API Keys

**Risk**: Attackers can create wallets, execute transactions, drain funds

**Mitigation**:
- Use environment variables
- Never commit secrets to git
- Rotate keys regularly
- Use different keys for dev/prod

### Vulnerability: Unverified Webhooks

**Risk**: Attackers can spoof webhooks to trigger unauthorized actions

**Mitigation**:
- Always verify webhook signatures
- Use HTTPS endpoints
- Implement replay protection (check notification IDs)

### Vulnerability: Insufficient Input Validation

**Risk**: Invalid addresses, amounts can cause failed transactions or loss of funds

**Mitigation**:
- Validate all user inputs
- Use checksummed addresses
- Implement amount limits
- Confirm high-value transactions

### Vulnerability: Missing Rate Limiting

**Risk**: API abuse, high costs, service degradation

**Mitigation**:
- Implement rate limiting on all endpoints
- Monitor API usage
- Set spending alerts

### Vulnerability: Smart Contract Reentrancy

**Risk**: Attackers can drain contract funds via reentrant calls

**Mitigation**:
- Use OpenZeppelin's ReentrancyGuard
- Follow checks-effects-interactions pattern
- Audit contracts before deployment

---

## 12. Compliance Considerations

### KYC/AML

If your application handles significant transaction volumes:

- Implement Know Your Customer (KYC) procedures
- Monitor for suspicious transaction patterns
- Maintain transaction records
- Comply with local regulations (e.g., FinCEN, MiCA)

### Privacy

- Encrypt sensitive user data
- Implement data retention policies
- Provide user data export/deletion
- Comply with GDPR, CCPA if applicable

---

## 13. Incident Response

### Preparation

1. **Document**: Maintain list of critical contacts (Circle support, internal team)
2. **Backup**: Keep backups of entity secrets in secure offline storage
3. **Recovery**: Document wallet recovery procedures
4. **Communication**: Prepare incident communication templates

### Response Plan

```typescript
// Emergency shutdown mechanism
let emergencyShutdown = false;

async function checkEmergencyShutdown(): Promise<void> {
  if (emergencyShutdown) {
    throw new Error('Service temporarily disabled for maintenance');
  }
}

// Can be triggered remotely or via admin panel
app.post('/admin/emergency-shutdown', authenticateAdmin, (req, res) => {
  emergencyShutdown = true;
  console.error('EMERGENCY SHUTDOWN ACTIVATED');

  // Send alerts
  sendAlert({ type: 'EMERGENCY_SHUTDOWN', timestamp: new Date() });

  res.json({ status: 'shutdown activated' });
});
```

---

## Resources

- **Circle Security Docs**: https://developers.circle.com/security
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Smart Contract Security**: https://consensys.github.io/smart-contract-best-practices/
- **Circle Status**: https://status.circle.com/
