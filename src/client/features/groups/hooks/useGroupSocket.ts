import { useEffect } from 'react';
import { useSocketStore } from '@/store';
import { useGroupStore } from '@/store/groupStore';
import { getChatSocket } from '@/features/chat/hooks/useChatSocket';
import type { GroupMessage, GroupMemberSummary } from '@shared/types';

export function useGroupSocket(groupId: string | null) {
  const isConnected = useSocketStore((s) => s.isConnected);
  const store       = useGroupStore();

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !groupId) return;

    // Join the socket room
    socket.emit('group:join', { groupId });

    const onMessage = (msg: GroupMessage) => {
      if (msg.groupId !== groupId) return;
      store.upsertMessage(groupId, msg);
      store.updateLastMessage(groupId, msg.createdAt);
      // Unread increment is handled by the global listener in useChatSocket
    };
    const onMsgUpdated   = (msg: Partial<GroupMessage> & { _id: string; groupId: string }) => {
      if (msg.groupId === groupId) {
        const existing = store.messages.get(groupId)?.find((m) => m._id === msg._id);
        if (existing) store.upsertMessage(groupId, { ...existing, ...msg });
      }
    };
    const onMsgDeleted   = ({ groupId: gid, messageId }: { groupId: string; messageId: string }) => {
      if (gid === groupId) store.deleteMessage(groupId, messageId);
    };
    const onTypingStart  = ({ userId }: { groupId: string; userId: string }) => store.setTyping(groupId, userId, true);
    const onTypingStop   = ({ userId }: { groupId: string; userId: string }) => store.setTyping(groupId, userId, false);
    const onMemberJoined = ({ member }: { groupId: string; member: GroupMemberSummary }) => store.upsertMember(groupId, member);
    const onMemberLeft   = ({ userId }: { groupId: string; userId: string }) => store.removeMember(groupId, userId);

    socket.on('group:message:new',     onMessage);
    socket.on('group:message:updated', onMsgUpdated);
    socket.on('group:message:deleted', onMsgDeleted);
    socket.on('group:typing:start',    onTypingStart);
    socket.on('group:typing:stop',     onTypingStop);
    socket.on('group:member:joined',   onMemberJoined);
    socket.on('group:member:left',     onMemberLeft);

    return () => {
      socket.emit('group:leave', { groupId });
      socket.off('group:message:new',     onMessage);
      socket.off('group:message:updated', onMsgUpdated);
      socket.off('group:message:deleted', onMsgDeleted);
      socket.off('group:typing:start',    onTypingStart);
      socket.off('group:typing:stop',     onTypingStop);
      socket.off('group:member:joined',   onMemberJoined);
      socket.off('group:member:left',     onMemberLeft);
    };
  }, [isConnected, groupId]);
}
