import { useParams } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import LockIcon from '@mui/icons-material/Lock';
import { useChatSocket } from '../hooks/useChatSocket';
import ChatWindow from '../components/ChatWindow';
import { UploadProgress } from '@/features/media/components/UploadProgress';

const C = {
  accentDark: '#7C3AED',
  accent: '#9B6DFF',
  teal: '#22D3EE',
  gold: '#FBBF24',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
} as const;

function ChatWelcome() {
  return (
    <Box
      data-testid="page-chat"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 4,
        background: `radial-gradient(ellipse at 30% 30%, ${alpha(C.accentDark, 0.12)} 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, ${alpha(C.teal, 0.07)} 0%, transparent 50%)`,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED 0%, #9B6DFF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 40px ${alpha(C.accent, 0.3)}`,
          mb: 1,
        }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 34, color: '#fff' }} />
      </Box>
      <Typography variant="h6" sx={{ color: C.txt1, fontWeight: 700, textAlign: 'center' }}>
        Linkora
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: C.txt2, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}
      >
        Select a conversation to start messaging. Your messages are end-to-end encrypted.
      </Typography>
      <Box
        sx={{
          mt: 1,
          px: 2,
          py: 0.75,
          border: `1px solid rgba(139,92,246,0.2)`,
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        <LockIcon sx={{ fontSize: 13, color: C.accent }} />
        <Typography sx={{ fontSize: 12, color: C.txt2 }}>End-to-end encrypted</Typography>
      </Box>
    </Box>
  );
}

export default function ChatPage() {
  const { id } = useParams<{ id?: string }>();
  const {
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    sendRead,
    sendDeleteMessage,
    sendReactToMessage,
  } = useChatSocket();

  if (!id) return <ChatWelcome />;

  // With-id: wrap in a flex column so ChatWindow fills the available height.
  return (
    <Box data-testid="page-chat" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatWindow
        conversationId={id}
        sendMessage={sendMessage}
        sendTypingStart={sendTypingStart}
        sendTypingStop={sendTypingStop}
        sendRead={sendRead}
        sendDeleteMessage={sendDeleteMessage}
        sendReactToMessage={sendReactToMessage}
      />
      <UploadProgress />
    </Box>
  );
}
