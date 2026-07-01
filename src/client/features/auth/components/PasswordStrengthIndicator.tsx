import { Box, LinearProgress, Typography } from '@mui/material';
import { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type Strength = 'Weak' | 'Fair' | 'Good' | 'Strong';

interface StrengthResult {
  label: Strength;
  score: number; // 0–4
  color: 'error' | 'warning' | 'success';
  value: number; // 0–100 for LinearProgress
}

function getStrength(password: string): StrengthResult {
  if (!password) {
    return { label: 'Weak', score: 0, color: 'error', value: 0 };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', score, color: 'error', value: 20 };
  if (score === 2) return { label: 'Fair', score, color: 'warning', value: 45 };
  if (score === 3 || score === 4)
    return { label: 'Good', score, color: 'success', value: 70 };
  return { label: 'Strong', score, color: 'success', value: 100 };
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={strength.value}
        color={strength.color}
        sx={{ height: 6, borderRadius: 3 }}
        aria-label="Password strength"
      />
      <Typography
        variant="caption"
        color={`${strength.color}.main`}
        sx={{ mt: 0.5, display: 'block' }}
      >
        {strength.label}
      </Typography>
    </Box>
  );
}
