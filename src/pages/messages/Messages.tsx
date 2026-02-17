import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { mockConnections, mockMessages, connectionUsers } from '@/data/mockMessages';
import type { Message } from '@/types';
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';

const Messages = () => {
  const { user } = useAuth();
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connections = mockConnections.filter(
    c => c.senderId === user?.id || c.receiverId === user?.id
  );

  const filteredConnections = connections.filter((conn) => {
    const otherUser = connectionUsers.find(
      u => u.id === (conn.senderId === user?.id ? conn.receiverId : conn.senderId)
    );
    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeMessages = messages.filter(
    m => m.connectionId === selectedConnection
  );

  const selectedUser = selectedConnection
    ? connectionUsers.find(
        u =>
          u.id ===
          (connections.find(c => c.id === selectedConnection)?.senderId === user?.id
            ? connections.find(c => c.id === selectedConnection)?.receiverId
            : connections.find(c => c.id === selectedConnection)?.senderId)
      )
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConnection) return;

    const message: Message = {
      id: String(Date.now()),
      connectionId: selectedConnection,
      senderId: user?.id || '',
      content: newMessage,
      createdAt: new Date(),
      isRead: false,
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const getUnreadCount = (connectionId: string) => {
    return messages.filter(
      m => m.connectionId === connectionId && m.senderId !== user?.id && !m.isRead
    ).length;
  };

  const getLastMessage = (connectionId: string) => {
    return messages
      .filter(m => m.connectionId === connectionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Card className="h-full overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar - Connections List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold mb-4">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {filteredConnections.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConnections.map((connection) => {
                    const otherUser = connectionUsers.find(
                      u => u.id === (connection.senderId === user?.id ? connection.receiverId : connection.senderId)
                    );
                    const lastMessage = getLastMessage(connection.id);
                    const unreadCount = getUnreadCount(connection.id);

                    return (
                      <button
                        key={connection.id}
                        onClick={() => setSelectedConnection(connection.id)}
                        className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
                          selectedConnection === connection.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={otherUser?.avatar} />
                            <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                              {otherUser?.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--brand-secondary)] text-white text-xs rounded-full flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 truncate">
                              {otherUser?.name}
                            </h4>
                            {lastMessage && (
                              <span className="text-xs text-gray-400">
                                {format(lastMessage.createdAt, 'h:mm a')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{otherUser?.company}</p>
                          {lastMessage && (
                            <p className={`text-sm truncate mt-1 ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                              {lastMessage.senderId === user?.id ? 'You: ' : ''}
                              {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          {selectedConnection && selectedUser ? (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                      {selectedUser.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {activeMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
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
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                {format(message.createdAt, 'MMMM d, yyyy')}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                isMe
                                  ? 'bg-[var(--brand-primary)] text-white rounded-br-md'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
                              }`}
                            >
                              <p>{message.content}</p>
                              <div
                                className={`flex items-center gap-1 mt-1 text-xs ${
                                  isMe ? 'text-white/70' : 'text-gray-400'
                                }`}
                              >
                                <span>{format(message.createdAt, 'h:mm a')}</span>
                                {isMe && (
                                  message.isRead ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )
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

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a contact from the list to start messaging
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
