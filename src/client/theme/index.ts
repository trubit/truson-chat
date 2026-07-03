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

const INPUT_BG_DARK   = 'rgba(255,255,255,0.04)';
const INPUT_BG_LIGHT  = 'rgba(0,0,0,0.028)';
const AUTOFILL_BG_DARK  = '#0D1B29';
const AUTOFILL_BG_LIGHT = '#EAF9F5';

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
        background: mode === 'light' ? '#C0D0DF' : '#1C3045',
        borderRadius: 3,
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: mode === 'light' ? '#8FA8BD' : '#243C55',
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
        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(16,196,160,0.35)' },
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
              borderColor: mode === 'dark' ? 'rgba(16,196,160,0.5)' : 'rgba(16,196,160,0.38)',
            },
          },
          '&.Mui-focused': {
            backgroundColor: mode === 'dark' ? 'rgba(16,196,160,0.04)' : 'rgba(16,196,160,0.025)',
            boxShadow: mode === 'dark'
              ? '0 0 0 3px rgba(16,196,160,0.18), 0 4px 20px rgba(16,196,160,0.06)'
              : '0 0 0 3px rgba(16,196,160,0.12), 0 4px 16px rgba(16,196,160,0.06)',
            '& fieldset': {
              borderWidth: 1.5,
              borderColor: '#10C4A0',
            },
          },
          '&.Mui-disabled': {
            opacity: 0.55,
          },
          '&.Mui-focused .MuiInputAdornment-positionStart .MuiSvgIcon-root': {
            color: '#10C4A0',
          },
        },
        '& .MuiInputLabel-outlined': {
          fontSize: '0.9rem',
          fontWeight: 500,
          '&.Mui-focused': { color: '#10C4A0' },
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
        border: `1px solid ${mode === 'light' ? 'rgba(13,27,41,0.12)' : 'rgba(143,168,189,0.13)'}`,
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
        backgroundColor: mode === 'light' ? '#D4E0EC' : '#1C3045',
        color: mode === 'light' ? '#3A5570' : '#8FA8BD',
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
        borderColor: mode === 'light' ? 'rgba(13,27,41,0.12)' : 'rgba(143,168,189,0.13)',
      },
    },
  },
});

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#10C4A0',
      light: '#3DD4B8',
      dark: '#0D9E80',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E87830',
      light: '#EE9A5C',
      dark: '#C96020',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F0F4F8',
      paper: '#ffffff',
    },
    text: {
      primary: '#0D1B29',
      secondary: '#3A5570',
      disabled: '#8FA8BD',
    },
    divider: 'rgba(13,27,41,0.12)',
    error: { main: '#dc3545', light: '#f1707b', dark: '#b02a37' },
    warning: { main: '#ffc107', light: '#ffcd38', dark: '#d39e00' },
    info: { main: '#0dcaf0', light: '#3fd5f4', dark: '#0aa2c0' },
    success: { main: '#198754', light: '#2fb774', dark: '#146c43' },
    neutral: {
      main: '#567390',
      light: '#8FA8BD',
      dark: '#3A5570',
      contrastText: '#ffffff',
    },
    action: {
      hover: 'rgba(16,196,160,0.06)',
      selected: 'rgba(16,196,160,0.1)',
      focus: 'rgba(16,196,160,0.12)',
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
      main: '#10C4A0',
      light: '#3DD4B8',
      dark: '#0D9E80',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E87830',
      light: '#EE9A5C',
      dark: '#C96020',
      contrastText: '#ffffff',
    },
    background: {
      default: '#07101C',
      paper: '#0D1B29',
    },
    text: {
      primary: '#E8EFF5',
      secondary: '#8FA8BD',
      disabled: '#567390',
    },
    divider: 'rgba(143,168,189,0.13)',
    error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
    warning: { main: '#EAB308', light: '#FDE047', dark: '#CA8A04' },
    info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0284C7' },
    success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A' },
    neutral: {
      main: '#8FA8BD',
      light: '#C0D0DF',
      dark: '#567390',
      contrastText: '#0D1B29',
    },
    action: {
      hover: 'rgba(16,196,160,0.08)',
      selected: 'rgba(16,196,160,0.14)',
      focus: 'rgba(16,196,160,0.16)',
    },
  },
  typography: baseTypography,
  shape: baseShape,
  components: baseComponents('dark'),
});
