import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Check,
  CheckCheck,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import { messagesApi, type ConversationDto, type MessageDto } from '@/api/messages';
import {
  createRealtimeSocket,
  type RealtimeMessageCreatedEvent,
  type RealtimeMessageReadEvent,
  type RealtimeSocket,
} from '@/api/realtime';
import { getAccessToken } from '@/api/session';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';

const USE_REAL_MESSAGES = import.meta.env.VITE_FEATURE_USE_REAL_MESSAGES === 'true';

type DeliveryStatus = 'sent' | 'delivered' | 'read';

interface ConversationViewUser {
  id: string;
  name: string;
  company: string;
  avatar?: string;
}

interface ConversationView {
  id: string;
  connectionId: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  unreadCount: number;
  otherUser: ConversationViewUser;
  lastMessage: {
    id: string;
    senderId: string;
    content: string;
    createdAt: Date;
  } | null;
}

interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  deliveryStatus: DeliveryStatus;
}

const DELIVERY_STATUS_RANK: Record<DeliveryStatus, number> = {
  sent: 0,
  delivered: 1,
  read: 2,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Message request failed.';
}

function sortConversations(items: ConversationView[]): ConversationView[] {
  return [...items].sort((left, right) => {
    const rightTime = right.lastMessageAt?.getTime() ?? right.createdAt.getTime();
    const leftTime = left.lastMessageAt?.getTime() ?? left.createdAt.getTime();
    return rightTime - leftTime;
  });
}

function sortMessages(items: MessageView[]): MessageView[] {
  return [...items].sort((left, right) => {
    const timeDiff = left.createdAt.getTime() - right.createdAt.getTime();
    return timeDiff !== 0 ? timeDiff : left.id.localeCompare(right.id);
  });
}

function mergeDeliveryStatus(current: DeliveryStatus, next: DeliveryStatus): DeliveryStatus {
  return DELIVERY_STATUS_RANK[next] > DELIVERY_STATUS_RANK[current] ? next : current;
}

function buildConversationLastMessage(message: MessageView): ConversationView['lastMessage'] {
  return {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt,
  };
}

function upsertConversationMessage(messages: MessageView[], nextMessage: MessageView): MessageView[] {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex === -1) {
    return sortMessages([...messages, nextMessage]);
  }

  const current = messages[existingIndex];
  const nextMessages = [...messages];
  nextMessages[existingIndex] = {
    ...current,
    ...nextMessage,
    deliveryStatus: mergeDeliveryStatus(current.deliveryStatus, nextMessage.deliveryStatus),
  };

  return sortMessages(nextMessages);
}

function updateMessageDeliveryStatus(
  messages: MessageView[],
  messageIds: string[],
  status: DeliveryStatus,
): MessageView[] {
  const targetIds = new Set(messageIds);

  return messages.map((message) =>
    targetIds.has(message.id)
      ? {
          ...message,
          deliveryStatus: mergeDeliveryStatus(message.deliveryStatus, status),
        }
      : message,
  );
}

function mapConversationDto(dto: ConversationDto): ConversationView {
  return {
    id: dto.id,
    connectionId: dto.connectionId,
    createdAt: new Date(dto.createdAt),
    lastMessageAt: dto.lastMessageAt ? new Date(dto.lastMessageAt) : null,
    unreadCount: dto.unreadCount,
    otherUser: {
      id: dto.otherUser.id,
      name: dto.otherUser.name,
      company: dto.otherUser.company,
      avatar: dto.otherUser.avatar ?? undefined,
    },
    lastMessage: dto.lastMessage
      ? {
          id: dto.lastMessage.id,
          senderId: dto.lastMessage.senderId,
          content: dto.lastMessage.content,
          createdAt: new Date(dto.lastMessage.createdAt),
        }
      : null,
  };
}

function mapMessageDto(
  dto: MessageDto,
  currentUserId?: string,
  options?: { markAsSent?: boolean },
): MessageView {
  const isOwnMessage = dto.senderId === currentUserId;
  const deliveryStatus: DeliveryStatus = isOwnMessage
    ? dto.isReadByOtherParticipant
      ? 'read'
      : options?.markAsSent
        ? 'sent'
        : 'delivered'
    : dto.isReadByViewer
      ? 'read'
      : 'delivered';

  return {
    id: dto.id,
    conversationId: dto.conversationId,
    senderId: dto.senderId,
    content: dto.content,
    createdAt: new Date(dto.createdAt),
    editedAt: dto.editedAt ? new Date(dto.editedAt) : null,
    deliveryStatus,
  };
}

function mapRealtimeMessage(
  payload: RealtimeMessageCreatedEvent,
  currentUserId?: string,
): MessageView {
  return {
    id: payload.message.id,
    conversationId: payload.message.conversationId,
    senderId: payload.message.senderId,
    content: payload.message.content,
    createdAt: new Date(payload.message.createdAt),
    editedAt: payload.message.editedAt ? new Date(payload.message.editedAt) : null,
    deliveryStatus: payload.senderId === currentUserId ? 'sent' : 'delivered',
  };
}

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, MessageView[]>
  >({});
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(USE_REAL_MESSAGES);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    USE_REAL_MESSAGES ? null : 'Live messaging is disabled for this environment.',
  );
  const [messageError, setMessageError] = useState<string | null>(null);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, boolean>>({});
  const [typingByConversation, setTypingByConversation] = useState<
    Record<string, string | null>
  >({});
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<RealtimeSocket | null>(null);
  const conversationsRef = useRef<ConversationView[]>([]);
  const selectedConversationIdRef = useRef<string | null>(null);
  const joinedConversationIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const activeTypingConversationRef = useRef<string | null>(null);
  const markReadInFlightRef = useRef(new Set<string>());
  const requestedConversationId = searchParams.get('conversationId');
  const requestedConnectionId = searchParams.get('connectionId');

  const visibleConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        if (!deferredSearchQuery) {
          return true;
        }

        return (
          conversation.otherUser.name.toLowerCase().includes(deferredSearchQuery) ||
          conversation.otherUser.company.toLowerCase().includes(deferredSearchQuery)
        );
      }),
    [conversations, deferredSearchQuery],
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const activeMessages = selectedConversationId
    ? messagesByConversation[selectedConversationId] ?? []
    : [];

  const selectedTypingUserId = selectedConversationId
    ? typingByConversation[selectedConversationId] ?? null
    : null;
  const isOtherUserTyping =
    !!selectedConversation &&
    selectedTypingUserId === selectedConversation.otherUser.id;
  const isOtherUserOnline = selectedConversation
    ? presenceByUserId[selectedConversation.otherUser.id] ?? false
    : false;

  const stopTyping = useCallback((conversationId?: string | null) => {
    const targetConversationId = conversationId ?? activeTypingConversationRef.current;
    const socket = socketRef.current;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (socket?.connected && targetConversationId) {
      socket.emit('typing.stop', { conversationId: targetConversationId });
    }

    if (
      !targetConversationId ||
      activeTypingConversationRef.current === targetConversationId
    ) {
      activeTypingConversationRef.current = null;
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!USE_REAL_MESSAGES || !user?.id) {
      return [];
    }

    const { data } = await messagesApi.getConversations({ limit: 100 });
    const nextConversations = sortConversations(data.items.map(mapConversationDto));
    setConversations(nextConversations);
    return nextConversations;
  }, [user?.id]);

  const markConversationReadLive = useCallback(
    async (conversationId: string) => {
      if (!USE_REAL_MESSAGES || !user?.id) {
        return;
      }

      if (markReadInFlightRef.current.has(conversationId)) {
        return;
      }

      markReadInFlightRef.current.add(conversationId);

      try {
        const { data } = await messagesApi.markConversationRead(conversationId);
        if (data.readCount === 0) {
          return;
        }

        setConversations((previousState) =>
          previousState.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );

        setMessagesByConversation((previousState) => {
          const messages = previousState[conversationId];
          if (!messages) {
            return previousState;
          }

          return {
            ...previousState,
            [conversationId]: messages.map((message) =>
              message.senderId === user.id
                ? message
                : { ...message, deliveryStatus: 'read' },
            ),
          };
        });
      } catch (error) {
        console.error('Failed to mark conversation read:', error);
      } finally {
        markReadInFlightRef.current.delete(conversationId);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  useEffect(() => {
    setSelectedConversationId((current) => {
      const requestedConversation = conversations.find((conversation) => {
        if (requestedConversationId && conversation.id === requestedConversationId) {
          return true;
        }

        if (
          requestedConnectionId &&
          conversation.connectionId === requestedConnectionId
        ) {
          return true;
        }

        return false;
      });

      if (requestedConversation) {
        return requestedConversation.id;
      }

      if (current && conversations.some((conversation) => conversation.id === current)) {
        return current;
      }

      return conversations[0]?.id ?? null;
    });
  }, [conversations, requestedConnectionId, requestedConversationId]);

  useEffect(() => {
    if (!USE_REAL_MESSAGES || !user?.id) {
      setIsLoadingConversations(false);
      return;
    }

    let isCancelled = false;

    const loadConversations = async () => {
      setIsLoadingConversations(true);
      setLoadError(null);

      try {
        const nextConversations = await refreshConversations();
        if (isCancelled) {
          return;
        }

        if (nextConversations.length === 0) {
          setMessagesByConversation({});
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error('Failed to load live conversations:', error);
        setLoadError('Unable to load live conversations right now.');
        setConversations([]);
        setMessagesByConversation({});
      } finally {
        if (!isCancelled) {
          setIsLoadingConversations(false);
        }
      }
    };

    void loadConversations();

    return () => {
      isCancelled = true;
    };
  }, [refreshConversations, user?.id]);

  useEffect(() => {
    if (!USE_REAL_MESSAGES || !selectedConversationId || !user?.id) {
      return;
    }

    let isCancelled = false;

    const loadConversationMessages = async () => {
      setIsLoadingMessages(true);
      setMessageError(null);

      try {
        const { data } = await messagesApi.getMessages(selectedConversationId, { limit: 100 });
        if (isCancelled) {
          return;
        }

        setMessagesByConversation((previousState) => ({
          ...previousState,
          [selectedConversationId]: data.items.map((item) => mapMessageDto(item, user.id)),
        }));

        const currentConversation = conversations.find(
          (conversation) => conversation.id === selectedConversationId,
        );

        if (currentConversation?.unreadCount) {
          await markConversationReadLive(selectedConversationId);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error('Failed to load live messages:', error);
        setMessageError('Unable to load messages for this conversation.');
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadConversationMessages();

    return () => {
      isCancelled = true;
    };
  }, [conversations, markConversationReadLive, selectedConversationId, user?.id]);

  useEffect(() => {
    if (!USE_REAL_MESSAGES || !user?.id) {
      setIsRealtimeConnected(false);
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      return;
    }

    const socket = createRealtimeSocket(accessToken);
    socketRef.current = socket;

    const heartbeat = () => {
      socket.emit('presence.heartbeat');
    };

    socket.on('connect', () => {
      setIsRealtimeConnected(true);
      heartbeat();

      const activeConversationId = selectedConversationIdRef.current;
      if (activeConversationId) {
        socket.emit('conversation.join', { conversationId: activeConversationId });
        joinedConversationIdRef.current = activeConversationId;
      }
    });

    socket.on('disconnect', () => {
      setIsRealtimeConnected(false);
    });

    socket.on('message.created', (payload) => {
      const nextMessage = mapRealtimeMessage(payload, user.id);
      const conversationExists = conversationsRef.current.some(
        (conversation) => conversation.id === payload.conversationId,
      );

      setMessagesByConversation((previousState) => ({
        ...previousState,
        [payload.conversationId]: upsertConversationMessage(
          previousState[payload.conversationId] ?? [],
          nextMessage,
        ),
      }));

      const isActiveAndVisible =
        payload.conversationId === selectedConversationIdRef.current &&
        document.visibilityState === 'visible';

      setConversations((previousState) => {
        const nextConversations = previousState.map((conversation) => {
          if (conversation.id !== payload.conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessageAt: nextMessage.createdAt,
            lastMessage: buildConversationLastMessage(nextMessage),
            unreadCount:
              payload.senderId === user.id
                ? conversation.unreadCount
                : isActiveAndVisible
                  ? 0
                  : conversation.unreadCount + 1,
          };
        });

        return sortConversations(nextConversations);
      });

      if (!conversationExists) {
        void refreshConversations().catch(() => undefined);
      }

      if (payload.senderId !== user.id) {
        socket.emit('message.delivered', {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
        });

        if (isActiveAndVisible) {
          void markConversationReadLive(payload.conversationId);
        }
      }
    });

    socket.on('message.delivered', (payload) => {
      setMessagesByConversation((previousState) => {
        const messages = previousState[payload.conversationId];
        if (!messages) {
          return previousState;
        }

        return {
          ...previousState,
          [payload.conversationId]: updateMessageDeliveryStatus(
            messages,
            [payload.messageId],
            'delivered',
          ),
        };
      });
    });

    socket.on('message.read', (payload: RealtimeMessageReadEvent) => {
      setMessagesByConversation((previousState) => {
        const messages = previousState[payload.conversationId];
        if (!messages) {
          return previousState;
        }

        return {
          ...previousState,
          [payload.conversationId]: updateMessageDeliveryStatus(
            messages,
            payload.messageIds,
            'read',
          ),
        };
      });

      if (payload.readByUserId === user.id) {
        setConversations((previousState) =>
          previousState.map((conversation) =>
            conversation.id === payload.conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      }
    });

    socket.on('typing.started', (payload) => {
      if (payload.userId === user.id) {
        return;
      }

      setTypingByConversation((previousState) => ({
        ...previousState,
        [payload.conversationId]: payload.userId,
      }));
    });

    socket.on('typing.stopped', (payload) => {
      if (payload.userId === user.id) {
        return;
      }

      setTypingByConversation((previousState) =>
        previousState[payload.conversationId] === payload.userId
          ? {
              ...previousState,
              [payload.conversationId]: null,
            }
          : previousState,
      );
    });

    socket.on('presence.updated', (payload) => {
      setPresenceByUserId((previousState) => ({
        ...previousState,
        [payload.userId]: payload.isOnline,
      }));
    });

    const heartbeatInterval = window.setInterval(heartbeat, 30_000);

    return () => {
      window.clearInterval(heartbeatInterval);
      stopTyping(activeTypingConversationRef.current);

      if (socket.connected && joinedConversationIdRef.current) {
        socket.emit('conversation.leave', {
          conversationId: joinedConversationIdRef.current,
        });
      }

      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      joinedConversationIdRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, [markConversationReadLive, refreshConversations, stopTyping, user?.id]);

  useEffect(() => {
    if (!USE_REAL_MESSAGES) {
      return;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }

    const previousConversationId = joinedConversationIdRef.current;

    if (
      previousConversationId &&
      previousConversationId !== selectedConversationId
    ) {
      socket.emit('conversation.leave', {
        conversationId: previousConversationId,
      });
      setTypingByConversation((previousState) => ({
        ...previousState,
        [previousConversationId]: null,
      }));
    }

    if (selectedConversationId) {
      socket.emit('conversation.join', {
        conversationId: selectedConversationId,
      });
      void markConversationReadLive(selectedConversationId);
    }

    joinedConversationIdRef.current = selectedConversationId;
  }, [markConversationReadLive, selectedConversationId]);

  useEffect(() => {
    if (!USE_REAL_MESSAGES || !selectedConversationId || !isRealtimeConnected) {
      stopTyping();
      return;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }

    const trimmedMessage = newMessage.trim();
    const activeConversationId = activeTypingConversationRef.current;

    if (!trimmedMessage) {
      stopTyping(activeConversationId);
      return;
    }

    if (activeConversationId && activeConversationId !== selectedConversationId) {
      stopTyping(activeConversationId);
    }

    if (!activeTypingConversationRef.current) {
      socket.emit('typing.start', { conversationId: selectedConversationId });
      activeTypingConversationRef.current = selectedConversationId;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping(selectedConversationId);
    }, 1500);
  }, [isRealtimeConnected, newMessage, selectedConversationId, stopTyping]);

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!USE_REAL_MESSAGES || !content || !selectedConversationId || !user?.id) {
      return;
    }

    setIsSendingMessage(true);
    setMessageError(null);

    try {
      const { data } = await messagesApi.sendMessage(selectedConversationId, content);
      const nextMessage = mapMessageDto(data, user.id, { markAsSent: true });

      setMessagesByConversation((previousState) => ({
        ...previousState,
        [selectedConversationId]: upsertConversationMessage(
          previousState[selectedConversationId] ?? [],
          nextMessage,
        ),
      }));

      setConversations((previousState) =>
        sortConversations(
          previousState.map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  lastMessageAt: nextMessage.createdAt,
                  lastMessage: buildConversationLastMessage(nextMessage),
                }
              : conversation,
          ),
        ),
      );

      setNewMessage('');
      stopTyping(selectedConversationId);
    } catch (error) {
      console.error('Failed to send live message:', error);
      setMessageError(toErrorMessage(error));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const headerStatus = selectedConversation
    ? isOtherUserTyping
      ? 'Typing...'
      : USE_REAL_MESSAGES
        ? `${selectedConversation.otherUser.company} - ${
            isRealtimeConnected
              ? isOtherUserOnline
                ? 'Online'
                : 'Offline'
              : 'Connecting...'
          }`
        : selectedConversation.otherUser.company
    : '';

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Card className="h-full overflow-hidden">
        <div className="flex h-full">
          <div className="flex w-80 flex-col border-r border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Messages</h2>
                {USE_REAL_MESSAGES && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      isRealtimeConnected
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isRealtimeConnected ? 'Live' : 'Connecting'}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>

              {loadError && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {loadError}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1">
              {USE_REAL_MESSAGES && isLoadingConversations ? (
                <div className="p-4 text-center text-gray-500">
                  Loading conversations...
                </div>
              ) : visibleConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="font-medium text-gray-700">No conversations yet</p>
                  <p className="mt-1 text-sm">
                    Accepted connections will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50 ${
                        selectedConversationId === conversation.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conversation.otherUser.avatar} />
                          <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                            {conversation.otherUser.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            presenceByUserId[conversation.otherUser.id]
                              ? 'bg-emerald-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        {conversation.unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-secondary)] text-xs text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="truncate font-medium text-gray-900">
                            {conversation.otherUser.name}
                          </h4>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-400">
                              {format(conversation.lastMessage.createdAt, 'h:mm a')}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500">
                          {conversation.otherUser.company}
                        </p>

                        {conversation.lastMessage && (
                          <p
                            className={`mt-1 truncate text-sm ${
                              conversation.unreadCount > 0
                                ? 'font-medium text-gray-900'
                                : 'text-gray-500'
                            }`}
                          >
                            {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedConversation ? (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.otherUser.avatar} />
                    <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                      {selectedConversation.otherUser.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedConversation.otherUser.name}</h3>
                    <p className="text-sm text-gray-500">{headerStatus}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messageError && (
                    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {messageError}
                    </div>
                  )}

                  {USE_REAL_MESSAGES && isLoadingMessages && activeMessages.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <p>Loading messages...</p>
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation.</p>
                    </div>
                  ) : (
                    activeMessages.map((message, index) => {
                      const isMe = message.senderId === user?.id;
                      const showDate =
                        index === 0 ||
                        format(message.createdAt, 'yyyy-MM-dd') !==
                          format(activeMessages[index - 1].createdAt, 'yyyy-MM-dd');

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">
                                {format(message.createdAt, 'MMMM d, yyyy')}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isMe
                                  ? 'rounded-br-md bg-[var(--brand-primary)] text-white'
                                  : 'rounded-bl-md bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p>{message.content}</p>
                              <div
                                className={`mt-1 flex items-center gap-1 text-xs ${
                                  isMe ? 'text-white/70' : 'text-gray-400'
                                }`}
                              >
                                <span>{format(message.createdAt, 'h:mm a')}</span>
                                {isMe && message.deliveryStatus === 'read' && (
                                  <CheckCheck className="h-3 w-3" />
                                )}
                                {isMe && message.deliveryStatus === 'delivered' && (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey && !isSendingMessage) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={!newMessage.trim() || isSendingMessage || !USE_REAL_MESSAGES}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <Send className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {USE_REAL_MESSAGES ? 'Select a conversation' : 'Live messaging disabled'}
                </h3>
                <p className="text-gray-500">
                  {USE_REAL_MESSAGES
                    ? 'Choose a contact from the list to start messaging.'
                    : 'Enable VITE_FEATURE_USE_REAL_MESSAGES to use backend chat.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Messages;
