import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary'];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
  }
}

const baseTypography = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'sans-serif',
  ].join(','),
  h1: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2 },
  h2: { fontWeight: 700, fontSize: '1.875rem', lineHeight: 1.25 },
  h3: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
  h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35 },
  h5: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
  subtitle1: { fontWeight: 500, fontSize: '0.9375rem', lineHeight: 1.5 },
  subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
  body1: { fontWeight: 400, fontSize: '0.9375rem', lineHeight: 1.6 },
  body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.57 },
  button: { fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' as const },
  caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.5 },
  overline: { fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
};

const baseShape = {
  borderRadius: 12,
};

const INPUT_BG_DARK   = 'rgba(255,255,255,0.045)';
const INPUT_BG_LIGHT  = 'rgba(0,0,0,0.028)';
const AUTOFILL_BG_DARK  = '#1c1c38';
const AUTOFILL_BG_LIGHT = '#f3f0ff';

const baseComponents = (mode: 'light' | 'dark') => ({
  MuiCssBaseline: {
    styleOverrides: {
      '*': { boxSizing: 'border-box' },
      html: { height: '100%' },
      body: { height: '100%', margin: 0 },
      '#root': { height: '100%', display: 'flex', flexDirection: 'column' },
      '::-webkit-scrollbar': { width: 6, height: 6 },
      '::-webkit-scrollbar-track': { background: 'transparent' },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'light' ? '#dee2e6' : '#2d3748',
        borderRadius: 3,
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: mode === 'light' ? '#6c757d' : '#4a5568',
      },
      /* Override browser autofill teal/yellow injection */
      'input:-webkit-autofill': {
        WebkitBoxShadow: `0 0 0px 1000px ${mode === 'dark' ? AUTOFILL_BG_DARK : AUTOFILL_BG_LIGHT} inset !important`,
        WebkitTextFillColor: `${mode === 'dark' ? '#e9ecef' : '#212529'} !important`,
        caretColor: mode === 'dark' ? '#e9ecef' : '#212529',
        transition: 'background-color 5000s ease-in-out 0s',
        borderRadius: '14px !important',
      },
      'input:-webkit-autofill:hover': {
        WebkitBoxShadow: `0 0 0px 1000px ${mode === 'dark' ? AUTOFILL_BG_DARK : AUTOFILL_BG_LIGHT} inset !important`,
      },
      'input:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0px 1000px ${mode === 'dark' ? AUTOFILL_BG_DARK : AUTOFILL_BG_LIGHT} inset !important`,
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 10,
        fontWeight: 600,
        fontSize: '0.875rem',
        textTransform: 'none' as const,
        padding: '8px 20px',
        transition: 'all 0.2s ease',
      },
      sizeSmall: {
        padding: '4px 12px',
        fontSize: '0.8125rem',
        borderRadius: 8,
      },
      sizeLarge: {
        padding: '12px 28px',
        fontSize: '1rem',
        borderRadius: 12,
      },
      contained: {
        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(108,99,255,0.35)' },
        '&:active': { transform: 'translateY(0)' },
      },
      outlined: {
        borderWidth: 1.5,
        '&:hover': { borderWidth: 1.5 },
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined' as const,
      size: 'small' as const,
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 14,
          backgroundColor: mode === 'dark' ? INPUT_BG_DARK : INPUT_BG_LIGHT,
          transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
          '& fieldset': {
            borderWidth: 1.5,
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.13)',
            transition: 'border-color 0.25s ease',
          },
          '&:hover:not(.Mui-disabled)': {
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.045)',
            '& fieldset': {
              borderColor: mode === 'dark' ? 'rgba(108,99,255,0.5)' : 'rgba(108,99,255,0.38)',
            },
          },
          '&.Mui-focused': {
            backgroundColor: mode === 'dark' ? 'rgba(108,99,255,0.05)' : 'rgba(108,99,255,0.025)',
            boxShadow: mode === 'dark'
              ? '0 0 0 3px rgba(108,99,255,0.18), 0 4px 20px rgba(108,99,255,0.08)'
              : '0 0 0 3px rgba(108,99,255,0.12), 0 4px 16px rgba(108,99,255,0.06)',
            '& fieldset': {
              borderWidth: 1.5,
              borderColor: '#6c63ff',
            },
          },
          '&.Mui-disabled': {
            opacity: 0.55,
          },
          /* Tint the start adornment icon on focus */
          '&.Mui-focused .MuiInputAdornment-positionStart .MuiSvgIcon-root': {
            color: '#6c63ff',
          },
        },
        '& .MuiInputLabel-outlined': {
          fontSize: '0.9rem',
          fontWeight: 500,
          '&.Mui-focused': { color: '#6c63ff' },
        },
        '& .MuiInputBase-input': {
          fontSize: '0.9375rem',
          fontWeight: 450,
        },
      },
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 16,
        border: `1px solid ${mode === 'light' ? '#e9ecef' : '#2d3748'}`,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: mode === 'light'
            ? '0 4px 20px rgba(0,0,0,0.08)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        },
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: 20,
        '&:last-child': { paddingBottom: 20 },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
        fontSize: '0.8125rem',
      },
      sizeSmall: {
        height: 24,
        fontSize: '0.75rem',
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        fontSize: '0.875rem',
      },
      colorDefault: {
        backgroundColor: mode === 'light' ? '#e9ecef' : '#2d3748',
        color: mode === 'light' ? '#495057' : '#adb5bd',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        marginBottom: 2,
        transition: 'all 0.15s ease',
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        transition: 'all 0.15s ease',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      arrow: true,
    },
    styleOverrides: {
      tooltip: {
        fontSize: '0.75rem',
        fontWeight: 500,
        borderRadius: 6,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        fontSize: '1.125rem',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: mode === 'light' ? '#e9ecef' : '#2d3748',
      },
    },
  },
});

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6c63ff',
      light: '#8b84ff',
      dark: '#5a52d5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#03dac6',
      light: '#4dede0',
      dark: '#00b3a4',
      contrastText: '#000000',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      disabled: '#adb5bd',
    },
    divider: '#e9ecef',
    error: { main: '#dc3545', light: '#f1707b', dark: '#b02a37' },
    warning: { main: '#ffc107', light: '#ffcd38', dark: '#d39e00' },
    info: { main: '#0dcaf0', light: '#3fd5f4', dark: '#0aa2c0' },
    success: { main: '#198754', light: '#2fb774', dark: '#146c43' },
    neutral: {
      main: '#6c757d',
      light: '#adb5bd',
      dark: '#495057',
      contrastText: '#ffffff',
    },
    action: {
      hover: 'rgba(108,99,255,0.06)',
      selected: 'rgba(108,99,255,0.1)',
      focus: 'rgba(108,99,255,0.12)',
    },
  },
  typography: baseTypography,
  shape: baseShape,
  components: baseComponents('light'),
});

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6c63ff',
      light: '#8b84ff',
      dark: '#5a52d5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#03dac6',
      light: '#4dede0',
      dark: '#00b3a4',
      contrastText: '#000000',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
    text: {
      primary: '#e9ecef',
      secondary: '#adb5bd',
      disabled: '#6c757d',
    },
    divider: '#2d3748',
    error: { main: '#f1707b', light: '#f5949c', dark: '#dc3545' },
    warning: { main: '#ffcd38', light: '#ffd760', dark: '#ffc107' },
    info: { main: '#3fd5f4', light: '#6fdef7', dark: '#0dcaf0' },
    success: { main: '#2fb774', light: '#57c98f', dark: '#198754' },
    neutral: {
      main: '#adb5bd',
      light: '#ced4da',
      dark: '#6c757d',
      contrastText: '#212529',
    },
    action: {
      hover: 'rgba(108,99,255,0.1)',
      selected: 'rgba(108,99,255,0.16)',
      focus: 'rgba(108,99,255,0.18)',
    },
  },
  typography: baseTypography,
  shape: baseShape,
  components: baseComponents('dark'),
});
