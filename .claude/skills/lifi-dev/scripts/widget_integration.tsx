/**
 * LI.FI Widget Integration Examples
 *
 * Complete examples for integrating LI.FI Widget into React, Next.js, Vue, and Svelte applications
 */

// ============================================================================
// React Integration
// ============================================================================

import { LiFiWidget, WidgetConfig } from '@lifi/widget';
import { useState } from 'react';

/**
 * Basic React Integration
 */
export function BasicWidgetExample() {
  const widgetConfig: WidgetConfig = {
    integrator: 'your-app-name', // Required!
  };

  return (
    <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
      <LiFiWidget config={widgetConfig} />
    </div>
  );
}

/**
 * Customized Widget with Theme
 */
export function CustomThemeWidget() {
  const widgetConfig: WidgetConfig = {
    integrator: 'your-app-name',

    // Variant
    variant: 'wide', // 'default' | 'wide' | 'drawer' | 'expandable'

    // Custom theme
    theme: {
      palette: {
        primary: { main: '#6366f1' }, // Indigo
        secondary: { main: '#ec4899' }, // Pink
        background: {
          default: '#f9fafb',
          paper: '#ffffff',
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
        },
      },
      shape: {
        borderRadius: 16,
        borderRadiusSecondary: 12,
      },
      typography: {
        fontFamily: "'Inter', -apple-system, sans-serif",
      },
    },

    // Chain filtering
    fromChain: 1, // Ethereum
    toChain: 137, // Polygon

    // Slippage and fees
    slippage: 0.005, // 0.5%
    fee: 0.03, // 3% integrator fee
  };

  return (
    <div className="widget-container">
      <LiFiWidget config={widgetConfig} />
    </div>
  );
}

/**
 * Widget with Event Handlers
 */
export function WidgetWithEvents() {
  const [swapStatus, setSwapStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');

  const widgetConfig: WidgetConfig = {
    integrator: 'your-app-name',

    // Event handlers
    onRouteExecutionStarted: (route) => {
      console.log('Swap started:', route.id);
      setSwapStatus('pending');

      // Track in analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'swap_started', {
          from_chain: route.fromChainId,
          to_chain: route.toChainId,
          from_token: route.fromToken.symbol,
          to_token: route.toToken.symbol,
          amount: route.fromAmount,
        });
      }
    },

    onRouteExecutionUpdated: (route) => {
      const currentStep = route.steps.find((s) => s.execution?.status === 'PENDING');
      if (currentStep) {
        console.log('Executing step:', currentStep.id);
      }
    },

    onRouteExecutionCompleted: (route) => {
      console.log('Swap completed!', route.id);
      setSwapStatus('completed');

      // Show success notification
      alert(`Swap completed! You received ${route.toAmount} ${route.toToken.symbol}`);

      // Track completion
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'swap_completed', {
          route_id: route.id,
          output_amount: route.toAmount,
        });
      }
    },

    onRouteExecutionFailed: (route, error) => {
      console.error('Swap failed:', error);
      setSwapStatus('failed');

      // Show error notification
      alert(`Swap failed: ${error.message}`);

      // Track failure
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'swap_failed', {
          route_id: route.id,
          error: error.message,
        });
      }
    },

    // High value loss warning
    onRouteHighValueLoss: (route, valueLoss) => {
      const shouldContinue = confirm(
        `Warning: This route will result in ${valueLoss}% value loss due to slippage or fees. Do you want to continue?`
      );
      return shouldContinue;
    },
  };

  return (
    <div>
      <div className="status-indicator">
        Status: <span className={`status-${swapStatus}`}>{swapStatus}</span>
      </div>

      <LiFiWidget config={widgetConfig} />
    </div>
  );
}

/**
 * Dark Mode Widget
 */
export function DarkModeWidget() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const widgetConfig: WidgetConfig = {
    integrator: 'your-app-name',

    theme: {
      palette: {
        mode: isDarkMode ? 'dark' : 'light',
        primary: {
          main: isDarkMode ? '#bb86fc' : '#6366f1',
        },
        secondary: {
          main: isDarkMode ? '#03dac6' : '#ec4899',
        },
        background: {
          default: isDarkMode ? '#121212' : '#ffffff',
          paper: isDarkMode ? '#1e1e1e' : '#f5f5f5',
        },
        text: {
          primary: isDarkMode ? '#ffffff' : '#000000',
          secondary: isDarkMode ? '#b0b0b0' : '#666666',
        },
      },
    },
  };

  return (
    <div>
      <button onClick={() => setIsDarkMode(!isDarkMode)}>
        Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
      </button>

      <LiFiWidget config={widgetConfig} />
    </div>
  );
}

/**
 * Modal Integration
 */
export function WidgetModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const widgetConfig: WidgetConfig = {
    integrator: 'your-app-name',
    variant: 'default',

    onRouteExecutionCompleted: () => {
      // Auto-close modal after successful swap
      setTimeout(() => onClose(), 2000);
    },
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <LiFiWidget config={widgetConfig} />
      </div>
    </div>
  );
}

// ============================================================================
// Next.js Integration (App Router)
// ============================================================================

'use client';

import { LiFiWidget } from '@lifi/widget';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

/**
 * Next.js with Dynamic Import (Recommended)
 */
const DynamicWidget = dynamic(
  () => import('@lifi/widget').then((m) => m.LiFiWidget),
  {
    ssr: false, // Disable server-side rendering
    loading: () => <div>Loading widget...</div>,
  }
);

export function NextJsWidget() {
  const config: WidgetConfig = {
    integrator: 'nextjs-app',
  };

  return (
    <div className="container">
      <h1>Swap Tokens</h1>
      <DynamicWidget config={config} />
    </div>
  );
}

/**
 * Next.js with Suspense
 */
export function NextJsWidgetWithSuspense() {
  const config: WidgetConfig = {
    integrator: 'nextjs-app',
  };

  return (
    <Suspense fallback={<div>Loading LI.FI Widget...</div>}>
      <LiFiWidget config={config} />
    </Suspense>
  );
}

// ============================================================================
// Vue 3 Integration (Composition API)
// ============================================================================

/**
 * Vue 3 Component with TypeScript
 *
 * Save as: SwapWidget.vue
 */

/*
<template>
  <div class="swap-container">
    <h1>Token Swap</h1>

    <div v-if="swapStatus === 'pending'" class="status-banner">
      Swap in progress...
    </div>

    <div class="widget-wrapper">
      <LiFiWidget :config="widgetConfig" />
    </div>

    <div v-if="swapStatus === 'completed'" class="success-message">
      ✅ Swap completed successfully!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LiFiWidget } from '@lifi/widget';
import type { WidgetConfig } from '@lifi/widget';

const swapStatus = ref<'idle' | 'pending' | 'completed' | 'failed'>('idle');

const widgetConfig: WidgetConfig = {
  integrator: 'vue-app',

  variant: 'wide',

  theme: {
    palette: {
      primary: { main: '#42b883' }, // Vue green
      secondary: { main: '#35495e' },
    },
  },

  onRouteExecutionStarted: (route) => {
    console.log('Swap started:', route.id);
    swapStatus.value = 'pending';
  },

  onRouteExecutionCompleted: (route) => {
    console.log('Swap completed:', route.id);
    swapStatus.value = 'completed';

    setTimeout(() => {
      swapStatus.value = 'idle';
    }, 5000);
  },

  onRouteExecutionFailed: (route, error) => {
    console.error('Swap failed:', error);
    swapStatus.value = 'failed';
  },
};
</script>

<style scoped>
.swap-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.widget-wrapper {
  margin: 2rem 0;
}

.status-banner {
  padding: 1rem;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.success-message {
  padding: 1rem;
  background: #d1fae5;
  border-radius: 8px;
  margin-top: 1rem;
  color: #065f46;
}
</style>
*/

// ============================================================================
// Svelte Integration
// ============================================================================

/**
 * Svelte Component
 *
 * Save as: SwapWidget.svelte
 */

/*
<script lang="ts">
  import { LiFiWidget } from '@lifi/widget';
  import type { WidgetConfig } from '@lifi/widget';

  let swapStatus: 'idle' | 'pending' | 'completed' | 'failed' = 'idle';

  const widgetConfig: WidgetConfig = {
    integrator: 'svelte-app',

    variant: 'default',

    theme: {
      palette: {
        primary: { main: '#ff3e00' }, // Svelte orange
        secondary: { main: '#676778' },
      },
    },

    onRouteExecutionStarted: (route) => {
      console.log('Swap started:', route.id);
      swapStatus = 'pending';
    },

    onRouteExecutionCompleted: (route) => {
      console.log('Swap completed:', route.id);
      swapStatus = 'completed';

      setTimeout(() => {
        swapStatus = 'idle';
      }, 5000);
    },

    onRouteExecutionFailed: (route, error) => {
      console.error('Swap failed:', error);
      swapStatus = 'failed';
    },
  };
</script>

<div class="container">
  <h1>Token Swap</h1>

  {#if swapStatus === 'pending'}
    <div class="status-banner">Swap in progress...</div>
  {/if}

  <div class="widget">
    <LiFiWidget config={widgetConfig} />
  </div>

  {#if swapStatus === 'completed'}
    <div class="success">✅ Swap completed!</div>
  {/if}
</div>

<style>
  .container {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
  }

  .widget {
    margin: 2rem 0;
  }

  .status-banner {
    padding: 1rem;
    background: #fef3c7;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .success {
    padding: 1rem;
    background: #d1fae5;
    border-radius: 8px;
    margin-top: 1rem;
    color: #065f46;
  }
</style>
*/

// ============================================================================
// Advanced Patterns
// ============================================================================

/**
 * Conditional Widget Loading (Performance Optimization)
 */
export function LazyLoadWidget() {
  const [showWidget, setShowWidget] = useState(false);

  // Preload widget on hover
  const preloadWidget = () => {
    import('@lifi/widget');
  };

  return (
    <div>
      {!showWidget ? (
        <button
          onMouseEnter={preloadWidget}
          onClick={() => setShowWidget(true)}
          className="cta-button"
        >
          Start Swapping
        </button>
      ) : (
        <LiFiWidget
          config={{
            integrator: 'your-app',
          }}
        />
      )}
    </div>
  );
}

/**
 * Multi-Widget Dashboard
 */
export function MultiWidgetDashboard() {
  const [activeTab, setActiveTab] = useState<'ethereum' | 'polygon'>('ethereum');

  const ethereumConfig: WidgetConfig = {
    integrator: 'dashboard-app',
    fromChain: 1,
    toChain: 137,
    variant: 'wide',
  };

  const polygonConfig: WidgetConfig = {
    integrator: 'dashboard-app',
    fromChain: 137,
    toChain: 42161, // Arbitrum
    variant: 'wide',
  };

  return (
    <div>
      <div className="tabs">
        <button
          className={activeTab === 'ethereum' ? 'active' : ''}
          onClick={() => setActiveTab('ethereum')}
        >
          Ethereum → Polygon
        </button>
        <button
          className={activeTab === 'polygon' ? 'active' : ''}
          onClick={() => setActiveTab('polygon')}
        >
          Polygon → Arbitrum
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'ethereum' ? (
          <LiFiWidget config={ethereumConfig} />
        ) : (
          <LiFiWidget config={polygonConfig} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Styles (CSS Module Example)
// ============================================================================

/**
 * styles.module.css
 */

/*
.widget-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
}

.status-idle { color: #6b7280; }
.status-pending { color: #f59e0b; }
.status-completed { color: #10b981; }
.status-failed { color: #ef4444; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 90%;
  max-height: 90vh;
  overflow: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
}

.cta-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.cta-button:hover {
  transform: translateY(-2px);
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.tabs button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #6b7280;
  transition: all 0.2s;
}

.tabs button.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}

.tab-content {
  padding: 1rem 0;
}
*/

export default {
  BasicWidgetExample,
  CustomThemeWidget,
  WidgetWithEvents,
  DarkModeWidget,
  WidgetModal,
  NextJsWidget,
  LazyLoadWidget,
  MultiWidgetDashboard,
};
