/**
 * LI.FI Widget Theme Templates
 *
 * Production-ready theme configurations for various use cases
 */

import type { WidgetConfig } from '@lifi/widget';

// ============================================================================
// Base Theme Interface
// ============================================================================

export interface ThemeConfig {
  palette: {
    mode?: 'light' | 'dark';
    primary: { main: string; light?: string; dark?: string };
    secondary: { main: string; light?: string; dark?: string };
    background: { default: string; paper: string };
    text: { primary: string; secondary: string };
    grey?: Record<number, string>;
  };
  shape?: {
    borderRadius: number;
    borderRadiusSecondary?: number;
  };
  typography?: {
    fontFamily: string;
  };
  container?: {
    boxShadow?: string;
    borderRadius?: string;
  };
}

// ============================================================================
// Pre-built Themes
// ============================================================================

/**
 * Clean & Minimal (Default-style)
 */
export const cleanMinimalTheme: ThemeConfig = {
  palette: {
    mode: 'light',
    primary: { main: '#6366f1' }, // Indigo
    secondary: { main: '#8b5cf6' }, // Purple
    background: {
      default: '#ffffff',
      paper: '#f9fafb',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
  },
  shape: {
    borderRadius: 12,
    borderRadiusSecondary: 8,
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

/**
 * Dark Mode (Modern)
 */
export const darkModeTheme: ThemeConfig = {
  palette: {
    mode: 'dark',
    primary: { main: '#818cf8' }, // Light indigo
    secondary: { main: '#a78bfa' }, // Light purple
    background: {
      default: '#0f172a', // Slate 900
      paper: '#1e293b', // Slate 800
    },
    text: {
      primary: '#f1f5f9', // Slate 100
      secondary: '#94a3b8', // Slate 400
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      700: '#334155',
      800: '#1e293b',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
};

/**
 * Vibrant & Playful
 */
export const vibrantTheme: ThemeConfig = {
  palette: {
    mode: 'light',
    primary: { main: '#ec4899' }, // Pink
    secondary: { main: '#f59e0b' }, // Amber
    background: {
      default: '#fef3c7', // Amber 100
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937', // Gray 800
      secondary: '#6b7280', // Gray 500
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
  },
  container: {
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  },
};

/**
 * Professional & Corporate
 */
export const professionalTheme: ThemeConfig = {
  palette: {
    mode: 'light',
    primary: { main: '#0369a1' }, // Sky 700
    secondary: { main: '#0891b2' }, // Cyan 600
    background: {
      default: '#f8fafc', // Slate 50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate 900
      secondary: '#475569', // Slate 600
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
  container: {
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
  },
};

/**
 * Neon/Crypto Style
 */
export const neonTheme: ThemeConfig = {
  palette: {
    mode: 'dark',
    primary: { main: '#06b6d4' }, // Cyan
    secondary: { main: '#a855f7' }, // Purple
    background: {
      default: '#000000',
      paper: '#0a0a0a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa', // Zinc 400
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "'Space Grotesk', monospace",
  },
  container: {
    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
  },
};

/**
 * Soft & Pastel
 */
export const pastelTheme: ThemeConfig = {
  palette: {
    mode: 'light',
    primary: { main: '#93c5fd' }, // Blue 300
    secondary: { main: '#fda4af' }, // Rose 300
    background: {
      default: '#faf5ff', // Purple 50
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Slate 800
      secondary: '#64748b', // Slate 500
    },
  },
  shape: {
    borderRadius: 24,
  },
  typography: {
    fontFamily: "'Quicksand', sans-serif",
  },
};

/**
 * High Contrast (Accessibility)
 */
export const highContrastTheme: ThemeConfig = {
  palette: {
    mode: 'light',
    primary: { main: '#000000' },
    secondary: { main: '#1f2937' }, // Gray 800
    background: {
      default: '#ffffff',
      paper: '#f3f4f6', // Gray 100
    },
    text: {
      primary: '#000000',
      secondary: '#374151', // Gray 700
    },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: "'Arial', 'Helvetica', sans-serif",
  },
};

// ============================================================================
// Theme Utilities
// ============================================================================

/**
 * Create complete widget config from theme
 */
export function createWidgetConfig(
  integrator: string,
  theme: ThemeConfig,
  additionalConfig?: Partial<WidgetConfig>
): WidgetConfig {
  return {
    integrator,
    theme,
    ...additionalConfig,
  };
}

/**
 * Merge themes
 */
export function mergeThemes(base: ThemeConfig, override: Partial<ThemeConfig>): ThemeConfig {
  return {
    palette: {
      ...base.palette,
      ...override.palette,
      primary: { ...base.palette.primary, ...override.palette?.primary },
      secondary: { ...base.palette.secondary, ...override.palette?.secondary },
      background: { ...base.palette.background, ...override.palette?.background },
      text: { ...base.palette.text, ...override.palette?.text },
    },
    shape: { ...base.shape, ...override.shape },
    typography: { ...base.typography, ...override.typography },
    container: { ...base.container, ...override.container },
  };
}

/**
 * Create theme from brand colors
 */
export function createThemeFromBrandColors(
  primaryColor: string,
  secondaryColor: string,
  mode: 'light' | 'dark' = 'light'
): ThemeConfig {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
      primary: { main: primaryColor },
      secondary: { main: secondaryColor },
      background: {
        default: isDark ? '#0f172a' : '#ffffff',
        paper: isDark ? '#1e293b' : '#f9fafb',
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#111827',
        secondary: isDark ? '#94a3b8' : '#6b7280',
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
    },
  };
}

/**
 * Toggle theme mode
 */
export function toggleThemeMode(theme: ThemeConfig): ThemeConfig {
  const newMode = theme.palette.mode === 'dark' ? 'light' : 'dark';

  if (newMode === 'dark') {
    return {
      ...theme,
      palette: {
        ...theme.palette,
        mode: 'dark',
        background: {
          default: '#0f172a',
          paper: '#1e293b',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
        },
      },
    };
  } else {
    return {
      ...theme,
      palette: {
        ...theme.palette,
        mode: 'light',
        background: {
          default: '#ffffff',
          paper: '#f9fafb',
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
        },
      },
    };
  }
}

// ============================================================================
// Export Presets
// ============================================================================

export const themePresets = {
  cleanMinimal: cleanMinimalTheme,
  darkMode: darkModeTheme,
  vibrant: vibrantTheme,
  professional: professionalTheme,
  neon: neonTheme,
  pastel: pastelTheme,
  highContrast: highContrastTheme,
};

export default themePresets;

// ============================================================================
// Usage Examples
// ============================================================================

/*
// Example 1: Use preset theme
import { themePresets, createWidgetConfig } from './widget-theme-template';

const config = createWidgetConfig('my-app', themePresets.darkMode);

<LiFiWidget config={config} />


// Example 2: Create custom theme from brand colors
import { createThemeFromBrandColors } from './widget-theme-template';

const myTheme = createThemeFromBrandColors('#FF6B6B', '#4ECDC4', 'light');

<LiFiWidget config={{ integrator: 'my-app', theme: myTheme }} />


// Example 3: Merge themes
import { mergeThemes, themePresets } from './widget-theme-template';

const customTheme = mergeThemes(themePresets.cleanMinimal, {
  palette: {
    primary: { main: '#FF6B6B' },
  },
  shape: {
    borderRadius: 20,
  },
});

<LiFiWidget config={{ integrator: 'my-app', theme: customTheme }} />


// Example 4: Toggle dark mode
import { useState } from 'react';
import { toggleThemeMode, themePresets } from './widget-theme-template';

function App() {
  const [theme, setTheme] = useState(themePresets.cleanMinimal);

  return (
    <>
      <button onClick={() => setTheme(toggleThemeMode(theme))}>
        Toggle Dark Mode
      </button>

      <LiFiWidget config={{ integrator: 'my-app', theme }} />
    </>
  );
}
*/
