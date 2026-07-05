// Matches the Angular frontend's CSS custom properties in styles.scss
export const colors = {
  primary: '#1565c0',       // --primary (Material Blue 700)
  primaryLight: '#1976d2',  // --primary-light (Material Blue 600)
  primaryDark: '#0d47a1',   // --primary-dark (Material Blue 900)
  accent: '#009688',        // --accent (Material Teal 500)
  accentLight: '#4db6ac',   // --accent-light
  success: '#43a047',       // --success
  warning: '#fb8c00',       // --warning
  error: '#f44336',         // --warn
  background: '#f5f7fa',    // --background
  surface: '#ffffff',       // --surface
  text: {
    primary: '#1a1a2e',     // --on-surface
    secondary: '#6b7280',   // --text-secondary
    disabled: '#9ca3af',
  },
  border: '#e5e7eb',        // --border
  activeTabBg: 'rgba(25, 118, 210, 0.10)',
} as const;
