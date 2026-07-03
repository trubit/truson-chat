import { useCallback } from 'react';
import { Box, Typography, Avatar, Button } from '@mui/material';
import ContactsIcon from '@mui/icons-material/Contacts';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

const C = {
  border:  'rgba(139,92,246,0.12)',
  txt1:    '#F1F5F9',
  txt2:    '#94A3B8',
  txt3:    '#475569',
  bg:      'rgba(13,18,37,0.9)',
  accent:  '#9B6DFF',
  accentDark: '#7C3AED',
} as const;

function downloadVCard(
  name: string,
  phones: { number: string }[],
  emails?: { email: string }[],
): void {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:${name};;;`];
  phones.forEach((p) => lines.push(`TEL:${p.number}`));
  (emails ?? []).forEach((e) => lines.push(`EMAIL:${e.email}`));
  lines.push('END:VCARD');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ContactCard({
  displayName,
  phones = [],
  emails,
  avatar,
}: {
  displayName: string;
  phones?: { number: string; type: string }[];
  emails?: { email: string }[];
  avatar?: string;
}) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSave = useCallback(() => {
    downloadVCard(displayName, phones, emails);
  }, [displayName, phones, emails]);

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        bgcolor: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        maxWidth: 280,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
        <Avatar
          src={avatar}
          sx={{
            width: 40,
            height: 40,
            fontSize: 14,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
          }}
        >
          {!avatar && initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: C.txt1 }}>
            {displayName}
          </Typography>
          {phones[0] && (
            <Typography sx={{ fontSize: 12, color: C.txt3 }}>{phones[0].number}</Typography>
          )}
        </Box>
        <ContactsIcon sx={{ fontSize: 20, color: C.txt3 }} />
      </Box>

      {/* Phones */}
      {phones.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 0.5 }}>
          {phones.map((p, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PhoneIcon sx={{ fontSize: 14, color: C.txt3 }} />
              <Typography sx={{ fontSize: 12, color: C.txt2 }}>{p.number}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Emails */}
      {emails && emails.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 0.75 }}>
          {emails.map((e, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <EmailIcon sx={{ fontSize: 14, color: C.txt3 }} />
              <Typography
                sx={{
                  fontSize: 12,
                  color: C.txt2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {e.email}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Save button */}
      <Button
        size="small"
        onClick={handleSave}
        variant="outlined"
        fullWidth
        sx={{
          mt: 0.5,
          fontSize: 12,
          color: C.accent,
          borderColor: C.border,
          textTransform: 'none',
          borderRadius: '8px',
          '&:hover': { borderColor: C.accent, bgcolor: 'rgba(155,109,255,0.07)' },
        }}
      >
        Save Contact
      </Button>
    </Box>
  );
}
