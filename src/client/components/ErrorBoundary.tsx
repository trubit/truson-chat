import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: '#060914',
          color: '#F1F5F9',
          px: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#10C4A0' }}>
          Something went wrong
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 400, textAlign: 'center' }}>
          {this.state.error.message}
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
          sx={{ bgcolor: '#10C4A0', '&:hover': { bgcolor: '#0D9E80' } }}
        >
          Reload page
        </Button>
      </Box>
    );
  }
}
