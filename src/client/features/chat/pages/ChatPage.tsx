import { useParams } from 'react-router-dom';
import { Box, alpha } from '@mui/material';
import { useChatSocket } from '../hooks/useChatSocket';
import ChatWindow from '../components/ChatWindow';

const C = {
  accentDark: '#7C3AED',
  teal: '#22D3EE',
} as const;

function ChatWelcome() {
  return (
    <Box
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
    />
  );
}

export default function ChatPage() {
  const { id } = useParams<{ id?: string }>();
  const { sendMessage, sendTypingStart, sendTypingStop, sendRead } = useChatSocket();

  if (!id) {
    return <ChatWelcome />;
  }

  return (
    <ChatWindow
      conversationId={id}
      sendMessage={sendMessage}
      sendTypingStart={sendTypingStart}
      sendTypingStop={sendTypingStop}
      sendRead={sendRead}
    />
  );
}
