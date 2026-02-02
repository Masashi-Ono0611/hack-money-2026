# LI.FI Development Skill

Comprehensive development support for LI.FI DEX aggregator integration.

## Overview

This skill provides complete guidance for building applications with LI.FI, covering:

- **Widget Integration**: Drop-in UI component for swaps and bridges
- **SDK Integration**: Programmatic control over routes and execution
- **API Integration**: Direct REST API usage for maximum flexibility
- **Cross-chain Swaps**: Multi-chain token swaps and bridges
- **Gas Subsidy**: LI.Fuel implementation for cold-start problem
- **Fee Monetization**: Revenue generation through integrator fees
- **Security**: Best practices and security patterns

## Quick Start

### For Widget Integration

See [widget_integration.tsx](scripts/widget_integration.tsx) for complete examples.

```typescript
import { LiFiWidget } from '@lifi/widget';

<LiFiWidget
  config={{
    integrator: 'your-app-name',
    theme: { palette: { primary: { main: '#6366f1' } } }
  }}
/>
```

### For SDK Integration

See [sdk_swap_example.ts](scripts/sdk_swap_example.ts) for production-ready code.

```typescript
import { LIFI } from '@lifi/sdk';

const lifi = new LIFI({ integrator: 'your-app' });
const routes = await lifi.getRoutes({ ... });
```

### For API Integration

See [api_routes_example.ts](scripts/api_routes_example.ts) for direct API usage.

```bash
curl "https://li.quest/v1/quote?fromChain=1&toChain=137&..."
```

## File Structure

```
lifi-dev/
├── skill.md                    # Main skill documentation
├── README.md                   # This file
│
├── scripts/                    # Production-ready code examples
│   ├── widget_integration.tsx  # Widget examples (React/Vue/Svelte)
│   ├── sdk_swap_example.ts     # SDK swap examples
│   ├── api_routes_example.ts   # API integration examples
│   └── gas_subsidy_example.ts  # LI.Fuel implementation
│
├── references/                 # Detailed guides
│   ├── widget-guide.md         # Widget customization
│   ├── sdk-guide.md           # SDK comprehensive guide
│   ├── api-reference.md        # Complete API documentation
│   ├── security.md             # Security best practices
│   ├── gas-subsidy-guide.md    # Gas subsidy guide
│   └── monetization-guide.md   # Revenue optimization
│
└── assets/                     # Utilities and templates
    ├── widget-theme-template.ts # Theme presets
    ├── rate-limiter.ts         # Rate limiting utility
    └── error-handler.ts        # Error handling utility
```

## Key Features

### 1. Comprehensive Documentation

- **60+ chains supported**: Ethereum, Polygon, Arbitrum, Solana, and more
- **800+ protocols integrated**: Uniswap, 1inch, Stargate, Across, etc.
- **Complete API reference**: All endpoints documented with examples
- **Security checklist**: Production-ready security guidelines

### 2. Production-Ready Code

All examples are:
- ✅ TypeScript with full type safety
- ✅ Error handling included
- ✅ Security best practices applied
- ✅ Rate limiting implemented
- ✅ Performance optimized

### 3. Multiple Integration Methods

Choose the best approach for your needs:

| Method | Complexity | Control | Best For |
|--------|-----------|---------|----------|
| Widget | ⭐ Easy | Low | Quick integration, standard UX |
| SDK | ⭐⭐ Moderate | High | Custom UX, programmatic control |
| API | ⭐⭐⭐ Advanced | Maximum | Backend integration, any language |

### 4. Revenue Monetization

Earn fees on every swap:
- Configure custom fee percentage
- Track revenue in real-time
- Withdraw to any chain
- See [monetization-guide.md](references/monetization-guide.md)

### 5. Gas Subsidy (LI.Fuel)

Solve the cold-start problem:
- Users receive native gas tokens on destination chain
- Configurable gas amount
- No manual gas acquisition needed
- See [gas-subsidy-guide.md](references/gas-subsidy-guide.md)

## Common Use Cases

### Case 1: Add Swap to DeFi Dashboard

Use **Widget** for fastest integration:

```typescript
<LiFiWidget config={{ integrator: 'my-dashboard' }} />
```

**Time to integrate**: 5 minutes

### Case 2: Custom Swap Flow

Use **SDK** for full control:

```typescript
const routes = await lifi.getRoutes({ ... });
// Custom UI to display routes
const execution = await lifi.executeRoute({ route, walletClient });
```

**Time to integrate**: 1-2 hours

### Case 3: Backend Integration

Use **API** for server-side:

```python
response = requests.get('https://li.quest/v1/quote', params={ ... })
route = response.json()
```

**Time to integrate**: 2-4 hours

## Security Checklist

Before production deployment:

- [ ] Slippage protection enabled
- [ ] Token approval limits set
- [ ] API key protected (backend only)
- [ ] Rate limiting implemented
- [ ] Error handling comprehensive
- [ ] User confirmations shown
- [ ] Transaction monitoring active

See [security.md](references/security.md) for complete checklist.

## Support & Resources

- **Official Docs**: https://docs.li.fi/
- **Portal**: https://portal.li.fi (fee management)
- **Discord**: https://discord.gg/lifi
- **Support**: support@li.fi

## Version History

- **v1.0.0** (2024): Initial release with complete Widget, SDK, and API support

## License

This skill documentation is provided as-is for educational purposes. LI.FI SDK and services are subject to their respective licenses.

## Contributing

Found an issue or want to improve documentation? Submit feedback through:
- GitHub Issues (if skill is public)
- Direct message to skill maintainer
- LI.FI Discord community

---

**Ready to start building?** Check out [skill.md](skill.md) for the complete guide!
