import type { ReactNode } from 'react';
import { FormControl, FormLabel, FormHelperText } from '@mui/material';

interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function FormField({
  label,
  error,
  helperText,
  required,
  children,
  htmlFor,
}: FormFieldProps) {
  return (
    <FormControl fullWidth error={Boolean(error)} sx={{ mb: 0 }}>
      <FormLabel
        required={required}
        htmlFor={htmlFor}
        sx={{ mb: 0.5, fontWeight: 500, fontSize: '0.875rem', color: 'text.primary' }}
      >
        {label}
      </FormLabel>
      {children}
      {(error ?? helperText) && <FormHelperText>{error ?? helperText}</FormHelperText>}
    </FormControl>
  );
}
