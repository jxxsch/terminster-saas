// Widget styles with theme support
import { CSSProperties } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

interface ThemeColors {
  background: string
  backgroundSecondary: string
  backgroundHover: string
  border: string
  text: string
  textMuted: string
  success: string
  successBg: string
  error: string
  errorBg: string
}

const darkTheme: ThemeColors = {
  background: '#18181B',
  backgroundSecondary: '#27272A',
  backgroundHover: '#3F3F46',
  border: '#27272A',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  success: '#22C55E',
  successBg: '#22C55E22',
  error: '#EF4444',
  errorBg: '#EF444422',
}

const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F4F4F5',
  backgroundHover: '#E4E4E7',
  border: '#E4E4E7',
  text: '#18181B',
  textMuted: '#71717A',
  success: '#16A34A',
  successBg: '#DCFCE7',
  error: '#DC2626',
  errorBg: '#FEE2E2',
}

export function getThemeColors(theme: Theme): ThemeColors {
  if (theme === 'auto') {
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme
    }
    return darkTheme
  }
  return theme === 'dark' ? darkTheme : lightTheme
}

export function createStyles(primaryColor: string, theme: Theme) {
  const colors = getThemeColors(theme)

  return {
    container: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      color: colors.text,
      maxWidth: '420px',
      width: '100%',
      boxSizing: 'border-box',
    } as CSSProperties,

    header: {
      marginBottom: '20px',
    } as CSSProperties,

    title: {
      fontSize: '20px',
      fontWeight: 600,
      margin: 0,
      marginBottom: '12px',
    } as CSSProperties,

    progress: {
      display: 'flex',
      gap: '6px',
    } as CSSProperties,

    progressBar: (active: boolean): CSSProperties => ({
      flex: 1,
      height: '4px',
      borderRadius: '2px',
      backgroundColor: active ? primaryColor : colors.border,
      transition: 'background-color 0.3s ease',
    }),

    subtitle: {
      fontSize: '15px',
      color: colors.textMuted,
      margin: '0 0 16px 0',
    } as CSSProperties,

    card: (selected: boolean): CSSProperties => ({
      padding: '14px 16px',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: selected ? `${primaryColor}15` : 'transparent',
      border: `1px solid ${selected ? primaryColor : colors.border}`,
    }),

    cardHover: {
      backgroundColor: colors.backgroundHover,
    } as CSSProperties,

    avatar: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      backgroundColor: colors.backgroundSecondary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: 500,
      color: colors.textMuted,
      overflow: 'hidden',
    } as CSSProperties,

    avatarImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    } as CSSProperties,

    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.background,
      color: colors.text,
      fontSize: '15px',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s ease',
    } as CSSProperties,

    inputFocus: {
      borderColor: primaryColor,
    } as CSSProperties,

    label: {
      display: 'block',
      fontSize: '13px',
      color: colors.textMuted,
      marginBottom: '6px',
    } as CSSProperties,

    button: {
      padding: '12px 20px',
      borderRadius: '10px',
      fontWeight: 600,
      fontSize: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    } as CSSProperties,

    primaryButton: {
      backgroundColor: primaryColor,
      color: theme === 'light' ? '#000' : '#000',
    } as CSSProperties,

    primaryButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    } as CSSProperties,

    secondaryButton: {
      backgroundColor: 'transparent',
      color: colors.text,
      border: `1px solid ${colors.border}`,
    } as CSSProperties,

    dateGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px',
    } as CSSProperties,

    dateButton: (selected: boolean, disabled: boolean): CSSProperties => ({
      padding: '8px 4px',
      textAlign: 'center',
      borderRadius: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.3 : 1,
      backgroundColor: selected ? primaryColor : 'transparent',
      color: selected ? '#000' : colors.text,
      border: 'none',
      transition: 'all 0.2s ease',
    }),

    dateDayName: (selected: boolean): CSSProperties => ({
      fontSize: '11px',
      color: selected ? '#000' : colors.textMuted,
      marginBottom: '2px',
    }),

    dateDayNum: {
      fontWeight: 500,
      fontSize: '14px',
    } as CSSProperties,

    timeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
    } as CSSProperties,

    slotButton: (selected: boolean): CSSProperties => ({
      padding: '12px 8px',
      textAlign: 'center',
      borderRadius: '8px',
      cursor: 'pointer',
      backgroundColor: selected ? primaryColor : 'transparent',
      color: selected ? '#000' : colors.text,
      border: `1px solid ${selected ? primaryColor : colors.border}`,
      fontSize: '14px',
      fontWeight: 500,
      transition: 'all 0.2s ease',
    }),

    summaryBox: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: '10px',
      padding: '14px 16px',
      marginTop: '16px',
    } as CSSProperties,

    summaryLabel: {
      fontSize: '13px',
      color: colors.textMuted,
      marginBottom: '8px',
    } as CSSProperties,

    successContainer: {
      textAlign: 'center',
      padding: '24px 16px',
    } as CSSProperties,

    successIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: colors.successBg,
      color: colors.success,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: '32px',
    } as CSSProperties,

    successTitle: {
      fontSize: '22px',
      fontWeight: 600,
      marginBottom: '8px',
    } as CSSProperties,

    successMessage: {
      color: colors.textMuted,
      marginBottom: '20px',
    } as CSSProperties,

    errorBox: {
      backgroundColor: colors.errorBg,
      border: `1px solid ${colors.error}50`,
      color: colors.error,
      padding: '12px 14px',
      borderRadius: '10px',
      marginBottom: '16px',
      fontSize: '14px',
    } as CSSProperties,

    loadingContainer: {
      textAlign: 'center',
      padding: '32px 16px',
    } as CSSProperties,

    spinner: (color: string): CSSProperties => ({
      width: '28px',
      height: '28px',
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'terminster-spin 1s linear infinite',
      margin: '0 auto',
    }),

    loadingText: {
      marginTop: '12px',
      color: colors.textMuted,
    } as CSSProperties,

    nav: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '20px',
      gap: '12px',
    } as CSSProperties,

    priceTag: {
      color: primaryColor,
      fontWeight: 600,
    } as CSSProperties,

    serviceName: {
      fontWeight: 500,
      marginBottom: '2px',
    } as CSSProperties,

    serviceDuration: {
      fontSize: '13px',
      color: colors.textMuted,
    } as CSSProperties,

    anyBarberIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      backgroundColor: `${primaryColor}20`,
      color: primaryColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    } as CSSProperties,

    shopCard: (selected: boolean): CSSProperties => ({
      padding: '14px 16px',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: selected ? `${primaryColor}15` : 'transparent',
      border: `1px solid ${selected ? primaryColor : colors.border}`,
    }),

    shopAddress: {
      fontSize: '13px',
      color: colors.textMuted,
      marginTop: '2px',
    } as CSSProperties,

    sectionHeader: {
      fontSize: '12px',
      fontWeight: 600,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px',
      marginTop: '16px',
    } as CSSProperties,
  }
}

// CSS animation keyframes (injected once)
export const globalStyles = `
@keyframes terminster-spin {
  to { transform: rotate(360deg); }
}
`
