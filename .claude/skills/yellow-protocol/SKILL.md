---
name: yellow-protocol
description: >
  Comprehensive development support for Yellow Protocol (ERC7824) using Nitrolite SDK.
  Use when users need to: (1) Build applications with state channels,
  (2) Implement ClearNode WebSocket connections and authentication,
  (3) Create and manage application sessions,
  (4) Handle off-chain balance management,
  (5) Work with React, Vue.js, Angular, or Node.js backends,
  (6) Debug Yellow Protocol integration issues, or
  (7) Learn ERC7824 implementation patterns.
  Provides code examples, troubleshooting guides, and framework-specific patterns
  for complete Yellow Protocol application development.
---

# Yellow Protocol Development Skill

Support building applications with Yellow Protocol (ERC7824) and Nitrolite SDK.

## Quick Reference

- **SDK Package**: `@erc7824/nitrolite` (npm/yarn/pnpm)
- **ClearNode URL**: `wss://clearnet.yellow.com/ws`
- **Channel Setup**: [apps.yellow.com](https://apps.yellow.com)
- **Protocol**: NitroliteRPC over WebSocket
- **Documentation**: See [references/quickstart.md](references/quickstart.md) for complete API reference

## Core Development Workflow

```
1. Create channel at apps.yellow.com
2. Connect to ClearNode via WebSocket
3. Authenticate using EIP-712 signatures
4. Create application session
5. Perform operations
6. Close session
```

## When to Use This Skill

Use this skill when the user asks about:

- Setting up Yellow Protocol / Nitrolite SDK
- Connecting to ClearNode or establishing WebSocket connections
- Authentication flows and EIP-712 signatures
- Creating or closing application sessions
- Managing off-chain balances
- Framework integration (React, Vue, Angular, Node.js)
- Troubleshooting Yellow Protocol issues
- ERC7824 state channel implementation

## Key Resources

### Quick Start Guide

For complete setup and workflow, see [references/quickstart.md](references/quickstart.md):

- Installation and configuration
- Essential imports and types
- Authentication patterns
- Session management
- Balance retrieval
- Error handling
- Best practices

### Framework-Specific Patterns

For framework integration, see [references/framework-patterns.md](references/framework-patterns.md):

- **React**: Custom hooks for ClearNode and sessions
- **Vue.js**: Composables and reactive patterns
- **Node.js**: Backend connection classes and event handling
- **Angular**: Services and observables

### Troubleshooting

For debugging and best practices, see [references/troubleshooting.md](references/troubleshooting.md):

- Common authentication issues
- Connection problems
- Message handling errors
- Session management issues
- Security best practices
- Performance optimization
- Testing strategies

### Example Applications

Complete working examples in [assets/examples/](assets/examples/):

- **basic-react-app.tsx**: Full React application with session management
- **basic-nodejs-server.ts**: Node.js backend server implementation

## Common Tasks

### Initial Setup

1. Install SDK:
```bash
npm install @erc7824/nitrolite
```

2. Create channel at [apps.yellow.com](https://apps.yellow.com)

3. Connect to ClearNode (see [references/quickstart.md](references/quickstart.md) for authentication flow)

### Creating a Session

See [references/quickstart.md](references/quickstart.md#application-session-management) for:
- Session definition structure
- Allocation patterns
- Participant configuration

### Managing Balances

See [references/quickstart.md](references/quickstart.md#data-retrieval-patterns) for:
- Getting ledger balances
- Handling decimal precision
- Balance validation

### Framework Integration

Choose your framework in [references/framework-patterns.md](references/framework-patterns.md):
- React hooks and components
- Vue composables
- Angular services
- Node.js classes

### Troubleshooting

Common issues and solutions in [references/troubleshooting.md](references/troubleshooting.md):
- Authentication failures
- Connection drops
- Message parsing errors
- Session not found errors

## Implementation Approach

1. **Understand requirements**: Identify if user needs frontend, backend, or both
2. **Choose framework**: Recommend appropriate pattern from framework-patterns.md
3. **Provide code**: Use complete examples from references or assets
4. **Handle authentication**: Guide through EIP-712 signing and JWT tokens
5. **Test connection**: Verify WebSocket connection and authentication
6. **Implement sessions**: Create and manage application sessions
7. **Add error handling**: Implement retry logic and proper cleanup
8. **Optimize**: Add caching, connection pooling if needed

## Important Notes

### Security

- Never expose private keys in code
- Use session keys for temporary operations
- Store JWT tokens securely (not localStorage in production)
- Validate all inputs (addresses, amounts)
- Use `wss://` for WebSocket connections

### Message Signing

- For authentication: Use EIP-712 signatures
- For other operations: Sign raw JSON (not EIP-191)
- Session keys recommended over main wallet keys

### Connection Management

- Implement reconnection logic with exponential backoff
- Clean up event listeners to prevent memory leaks
- Monitor connection health
- Handle disconnections gracefully

### Session Lifecycle

- Store session IDs securely
- Close sessions when operations complete
- Handle session expiration
- Validate allocations before closing

## Development Tips

1. **Start with examples**: Use complete examples from assets/ as starting point
2. **Read references sequentially**: Start with quickstart.md, then framework-patterns.md
3. **Test incrementally**: Verify connection, auth, then sessions
4. **Log everything during development**: Enable verbose logging for debugging
5. **Use TypeScript**: Better type safety with SDK types
6. **Handle errors properly**: See troubleshooting.md for patterns
7. **Monitor metrics**: Track connection health and message flow

## Response Guidelines

When assisting users:

1. **Assess the context**: Determine if frontend, backend, or full-stack
2. **Identify framework**: Ask if not clear, recommend based on context
3. **Provide complete code**: Use examples from references or assets
4. **Explain key concepts**: Authentication flow, session lifecycle
5. **Add error handling**: Include try-catch and cleanup
6. **Reference docs**: Point to specific sections in references
7. **Test guidance**: Suggest how to verify implementation works

## Common User Requests

### "How do I connect to Yellow Protocol?"

1. Guide to channel creation at apps.yellow.com
2. Show WebSocket connection pattern from quickstart.md
3. Explain authentication flow with EIP-712
4. Provide framework-specific example

### "How do I create a session?"

1. Show session definition structure
2. Explain allocations and participants
3. Provide createAppSessionMessage example
4. Show response handling

### "I'm getting authentication errors"

1. Check troubleshooting.md for auth issues
2. Verify EIP-712 signature implementation
3. Check domain configuration
4. Validate expires_at timestamp

### "How do I handle reconnections?"

1. Show reconnection logic from framework-patterns.md
2. Explain exponential backoff
3. Discuss JWT token reuse
4. Provide cleanup patterns

### "What's the best way to structure my app?"

1. Recommend framework based on requirements
2. Show complete example from assets/
3. Discuss separation of concerns
4. Suggest error handling strategy

## Framework Selection Guide

- **React**: Most common for frontend, use hooks from framework-patterns.md
- **Vue.js**: Modern reactive patterns, use composables
- **Angular**: Enterprise apps with dependency injection
- **Node.js**: Backend services, API servers, multi-session management

## Testing Recommendations

1. Use testnet tokens before production
2. Mock WebSocket for unit tests (see troubleshooting.md)
3. Integration tests for full flow
4. Monitor connection metrics
5. Log all RPC interactions during development

## Additional Resources

- Official Docs: [erc7824.org](https://erc7824.org)
- Channel Management: [apps.yellow.com](https://apps.yellow.com)
- NPM Package: [@erc7824/nitrolite](https://www.npmjs.com/package/@erc7824/nitrolite)
