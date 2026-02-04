# LI.FI Widget Customization Guide

Complete guide to integrating and customizing the LI.FI Widget for your application.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Variant Options](#variant-options)
- [Theme Customization](#theme-customization)
- [Configuration Options](#configuration-options)
- [Event Handling](#event-handling)
- [Advanced Customization](#advanced-customization)

## Installation

### React / Next.js

```bash
npm install @lifi/widget
# or
yarn add @lifi/widget
# or
pnpm add @lifi/widget
```

### Vue / Nuxt

```bash
npm install @lifi/widget vue
```

### Svelte / SvelteKit

```bash
npm install @lifi/widget svelte
```

### Vanilla JavaScript (CDN)

```html
<link rel="stylesheet" href="https://unpkg.com/@lifi/widget/dist/widget.css">
<script src="https://unpkg.com/@lifi/widget"></script>
```

## Basic Setup

### React

```typescript
import { LiFiWidget, WidgetConfig } from '@lifi/widget';

const config: WidgetConfig = {
  integrator: 'your-app-name' // Required!
};

function App() {
  return (
    <div style={{ width: '100%', maxWidth: 500 }}>
      <LiFiWidget config={config} />
    </div>
  );
}
```

### Next.js (App Router)

```typescript
'use client';

import { LiFiWidget } from '@lifi/widget';
import dynamic from 'next/dynamic';

// Option 1: Client-side only rendering
const DynamicWidget = dynamic(
  () => import('@lifi/widget').then((m) => m.LiFiWidget),
  { ssr: false }
);

export default function SwapPage() {
  return <DynamicWidget config={{ integrator: 'your-app' }} />;
}

// Option 2: With loading state
export default function SwapPage() {
  return (
    <Suspense fallback={<div>Loading widget...</div>}>
      <LiFiWidget config={{ integrator: 'your-app' }} />
    </Suspense>
  );
}
```

### Vue 3 (Composition API)

```vue
<template>
  <div class="widget-container">
    <LiFiWidget :config="widgetConfig" />
  </div>
</template>

<script setup lang="ts">
import { LiFiWidget } from '@lifi/widget';
import type { WidgetConfig } from '@lifi/widget';

const widgetConfig: WidgetConfig = {
  integrator: 'your-app-name'
};
</script>

<style scoped>
.widget-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>
```

### Svelte

```svelte
<script lang="ts">
  import { LiFiWidget } from '@lifi/widget';
  import type { WidgetConfig } from '@lifi/widget';

  const config: WidgetConfig = {
    integrator: 'your-app-name'
  };
</script>

<div class="widget-container">
  <LiFiWidget {config} />
</div>

<style>
  .widget-container {
    width: 100%;
    max-width: 500px;
  }
</style>
```

## Variant Options

### Default (Compact)

Best for: Sidebars, modal dialogs

```typescript
const config = {
  integrator: 'your-app',
  variant: 'default' // or omit (default)
};
```

Dimensions: ~400px wide × ~600px tall

### Wide

Best for: Main content areas, full-width layouts

```typescript
const config = {
  integrator: 'your-app',
  variant: 'wide'
};
```

Dimensions: ~600px wide × ~600px tall

### Drawer

Best for: Mobile apps, slide-in panels

```typescript
const config = {
  integrator: 'your-app',
  variant: 'drawer'
};
```

Behavior: Full-height drawer from right side

### Expandable

Best for: Dynamic layouts, responsive designs

```typescript
const config = {
  integrator: 'your-app',
  variant: 'expandable'
};
```

Behavior: Starts compact, expands when needed

## Theme Customization

### Built-in Themes

```typescript
const config = {
  integrator: 'your-app',
  theme: {
    palette: {
      // Primary color (buttons, highlights)
      primary: { main: '#3f51b5' },

      // Secondary color (accents)
      secondary: { main: '#f50057' },

      // Background colors
      background: {
        default: '#ffffff',
        paper: '#f5f5f5'
      },

      // Text colors
      text: {
        primary: '#000000',
        secondary: '#666666'
      }
    },

    // Border radius
    shape: {
      borderRadius: 12, // Default: 8
      borderRadiusSecondary: 8 // For inner elements
    },

    // Typography
    typography: {
      fontFamily: 'Inter, sans-serif'
    }
  }
};
```

### Dark Mode

```typescript
const config = {
  integrator: 'your-app',
  theme: {
    palette: {
      mode: 'dark', // 'light' | 'dark'
      primary: { main: '#bb86fc' },
      secondary: { main: '#03dac6' },
      background: {
        default: '#121212',
        paper: '#1e1e1e'
      },
      text: {
        primary: '#ffffff',
        secondary: '#b0b0b0'
      }
    }
  }
};
```

### Custom Theme (Full Control)

```typescript
import type { WidgetConfig } from '@lifi/widget';

const config: WidgetConfig = {
  integrator: 'your-app',
  theme: {
    palette: {
      mode: 'light',
      primary: {
        main: '#6366f1', // Indigo
        light: '#818cf8',
        dark: '#4f46e5'
      },
      secondary: {
        main: '#ec4899', // Pink
        light: '#f472b6',
        dark: '#db2777'
      },
      background: {
        default: '#f9fafb',
        paper: '#ffffff'
      },
      grey: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        700: '#374151',
        800: '#1f2937'
      },
      text: {
        primary: '#111827',
        secondary: '#6b7280'
      }
    },
    shape: {
      borderRadius: 16,
      borderRadiusSecondary: 12
    },
    typography: {
      fontFamily: "'Inter var', -apple-system, sans-serif"
    },
    container: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      borderRadius: '16px'
    }
  }
};
```

## Configuration Options

### Chain Filtering

```typescript
const config = {
  integrator: 'your-app',

  // Limit available chains
  chains: {
    allow: [1, 137, 42161, 10], // Ethereum, Polygon, Arbitrum, Optimism
    // OR
    deny: [56] // Exclude BSC
  },

  // Set default chains
  fromChain: 1, // Default "from" chain
  toChain: 137  // Default "to" chain
};
```

### Token Filtering

```typescript
const config = {
  integrator: 'your-app',

  // Limit available tokens
  tokens: {
    allow: [
      { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC
      { chainId: 1, address: '0x0000000000000000000000000000000000000000' }  // ETH
    ],
    // OR
    deny: [
      { chainId: 1, address: '0x...' } // Exclude specific token
    ]
  },

  // Set default tokens
  fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  toToken: '0x0000000000000000000000000000000000000000'   // ETH
};
```

### Bridge & Exchange Filtering

```typescript
const config = {
  integrator: 'your-app',

  // Control which bridges are available
  bridges: {
    allow: ['stargate', 'across', 'hop'],
    // OR
    deny: ['multichain']
  },

  // Control which DEXs are used
  exchanges: {
    allow: ['uniswap', '1inch', 'sushiswap']
  }
};
```

### Slippage & Fees

```typescript
const config = {
  integrator: 'your-app',

  // Default slippage (0.5% = 0.005)
  slippage: 0.005,

  // Integrator fee (3% = 0.03)
  fee: 0.03,

  // Allow users to adjust slippage
  slippageConfig: {
    defaultSlippage: 0.005,
    minSlippage: 0.001, // 0.1%
    maxSlippage: 0.05   // 5%
  }
};
```

### Language Support

```typescript
const config = {
  integrator: 'your-app',

  // Set language
  language: 'en', // 'en', 'es', 'de', 'fr', 'pt', 'zh', 'ja', 'ko', ...

  // Auto-detect from browser
  languageResources: {
    en: { translation: { ... } },
    es: { translation: { ... } }
  }
};
```

### Wallet Integration

```typescript
const config = {
  integrator: 'your-app',

  // Pre-select wallet
  walletManagement: {
    connect: async () => {
      // Custom wallet connection logic
      const provider = await connectWallet();
      return provider;
    },
    disconnect: async () => {
      // Custom disconnect logic
      await disconnectWallet();
    }
  }
};
```

## Event Handling

### Route Events

```typescript
const config = {
  integrator: 'your-app',

  // Route lifecycle events
  onRouteExecutionStarted: (route) => {
    console.log('Swap started:', route.id);
    analytics.track('swap_started', {
      fromChain: route.fromChainId,
      toChain: route.toChainId,
      amount: route.fromAmount
    });
  },

  onRouteExecutionUpdated: (route) => {
    console.log('Route updated:', route.steps.map(s => s.execution?.status));
  },

  onRouteExecutionCompleted: (route) => {
    console.log('Swap completed!', route.id);
    analytics.track('swap_completed', {
      routeId: route.id,
      outputAmount: route.toAmount
    });

    // Show success message
    toast.success('Swap completed successfully!');
  },

  onRouteExecutionFailed: (route, error) => {
    console.error('Swap failed:', error);
    analytics.track('swap_failed', {
      routeId: route.id,
      error: error.message
    });

    // Show error message
    toast.error(`Swap failed: ${error.message}`);
  },

  // High value loss warning
  onRouteHighValueLoss: (route, valueLoss) => {
    const shouldContinue = confirm(
      `This route will result in ${valueLoss}% value loss. Continue?`
    );
    return shouldContinue;
  }
};
```

### Transaction Events

```typescript
const config = {
  integrator: 'your-app',

  // Transaction sent
  onTransactionSent: (txHash, route, step) => {
    console.log('Transaction sent:', txHash);

    // Track in backend
    fetch('/api/track-transaction', {
      method: 'POST',
      body: JSON.stringify({ txHash, routeId: route.id })
    });
  },

  // Transaction confirmed
  onTransactionConfirmed: (txHash, route, step) => {
    console.log('Transaction confirmed:', txHash);
  },

  // Transaction failed
  onTransactionFailed: (txHash, route, step, error) => {
    console.error('Transaction failed:', error);
  }
};
```

## Advanced Customization

### Custom Containers

```typescript
const config = {
  integrator: 'your-app',

  // Container styling
  containerStyle: {
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  }
};
```

### Hidden UI Elements

```typescript
const config = {
  integrator: 'your-app',

  // Hide specific UI elements
  hiddenUI: [
    'history',      // Transaction history
    'appearance',   // Appearance settings
    'language',     // Language selector
    'walletMenu'    // Wallet menu
  ]
};
```

### Custom Routes

```typescript
const config = {
  integrator: 'your-app',

  // Provide custom routes (advanced)
  routes: async (request) => {
    // Fetch routes from your backend
    const customRoutes = await fetch('/api/routes', {
      method: 'POST',
      body: JSON.stringify(request)
    }).then(r => r.json());

    return customRoutes;
  }
};
```

### Wallet Customization

```typescript
const config = {
  integrator: 'your-app',

  // Custom wallet list
  wallets: {
    featured: ['metamask', 'walletconnect', 'coinbase'],
    popular: ['rainbow', 'trust', 'safe']
  }
};
```

### Gas Preferences

```typescript
const config = {
  integrator: 'your-app',

  // Gas settings
  gasPrice: {
    speed: 'fast' // 'slow' | 'medium' | 'fast'
  },

  // Allow users to adjust gas
  allowUserGasAdjustment: true
};
```

## Responsive Design

### Mobile Optimization

```typescript
const config = {
  integrator: 'your-app',

  // Auto-switch to drawer on mobile
  variant: window.innerWidth < 768 ? 'drawer' : 'wide',

  // Mobile-friendly theme
  theme: {
    shape: {
      borderRadius: window.innerWidth < 768 ? 0 : 16
    }
  }
};
```

### Container Width

```typescript
// Full-width on mobile, fixed on desktop
<div style={{
  width: '100%',
  maxWidth: window.innerWidth < 768 ? '100%' : 500,
  margin: '0 auto'
}}>
  <LiFiWidget config={config} />
</div>
```

## Performance Optimization

### Code Splitting

```typescript
// React lazy loading
import { lazy, Suspense } from 'react';

const LiFiWidget = lazy(() => import('@lifi/widget').then(m => ({ default: m.LiFiWidget })));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LiFiWidget config={config} />
    </Suspense>
  );
}
```

### Preloading

```typescript
// Preload widget when user hovers over swap button
<button
  onMouseEnter={() => {
    import('@lifi/widget');
  }}
  onClick={() => setShowWidget(true)}
>
  Swap Tokens
</button>
```

## Common Patterns

### Modal Integration

```typescript
function SwapModal({ isOpen, onClose }) {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <div style={{ padding: 24, backgroundColor: 'white', borderRadius: 16 }}>
        <LiFiWidget
          config={{
            integrator: 'your-app',
            variant: 'default',
            onRouteExecutionCompleted: () => {
              onClose(); // Close modal after swap
            }
          }}
        />
      </div>
    </Modal>
  );
}
```

### Tab Integration

```typescript
function DeFiDashboard() {
  const [activeTab, setActiveTab] = useState('swap');

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tab label="Swap" value="swap" />
      <Tab label="Portfolio" value="portfolio" />

      {activeTab === 'swap' && (
        <LiFiWidget config={{ integrator: 'your-app' }} />
      )}
    </Tabs>
  );
}
```

## Troubleshooting

### Widget Not Rendering

```typescript
// Check console for errors
// Common issues:
// 1. Missing integrator name
// 2. CSS not imported
// 3. SSR conflict (Next.js)

// Solution for Next.js:
const LiFiWidget = dynamic(
  () => import('@lifi/widget').then(m => m.LiFiWidget),
  { ssr: false }
);
```

### Theme Not Applying

```typescript
// Ensure theme object is properly structured
const config = {
  integrator: 'your-app',
  theme: {
    palette: {  // Note: nested under 'palette'
      primary: { main: '#3f51b5' }
    }
  }
};
```

### Performance Issues

```typescript
// Use code splitting
// Lazy load widget
// Cache configuration object
const config = useMemo(() => ({
  integrator: 'your-app',
  theme: { ... }
}), []); // Empty deps = computed once
```
