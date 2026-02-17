import type { Connection, Message } from '@/types';

export const mockConnections: Connection[] = [
  {
    id: '1',
    senderId: '1',
    receiverId: '2',
    status: 'accepted',
    message: 'Hi Sarah, I would love to connect and explore potential collaboration opportunities.',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    senderId: '3',
    receiverId: '1',
    status: 'accepted',
    message: 'Hello! I am interested in learning more about your investment opportunities.',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    senderId: '4',
    receiverId: '1',
    status: 'pending',
    message: 'Would love to connect and discuss potential partnership.',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
  },
];

export const mockMessages: Message[] = [
  {
    id: '1',
    connectionId: '1',
    senderId: '2',
    content: 'Hi! Thanks for reaching out. I would be happy to discuss collaboration opportunities.',
    createdAt: new Date('2024-01-15T10:30:00'),
    isRead: true,
  },
  {
    id: '2',
    connectionId: '1',
    senderId: '1',
    content: 'Great! When would be a good time for a call next week?',
    createdAt: new Date('2024-01-15T11:00:00'),
    isRead: true,
  },
  {
    id: '3',
    connectionId: '1',
    senderId: '2',
    content: 'How about Tuesday at 2 PM? I will send you a calendar invite.',
    createdAt: new Date('2024-01-15T11:30:00'),
    isRead: false,
  },
  {
    id: '4',
    connectionId: '2',
    senderId: '3',
    content: 'Thank you for connecting! I saw your profile and I am interested in your funding round.',
    createdAt: new Date('2024-01-20T14:00:00'),
    isRead: true,
  },
  {
    id: '5',
    connectionId: '2',
    senderId: '1',
    content: 'Thanks Michael! Let us schedule a meeting to discuss the details.',
    createdAt: new Date('2024-01-20T15:30:00'),
    isRead: true,
  },
];

export const connectionUsers = [
  {
    id: '2',
    name: 'Sarah Johnson',
    company: 'TechStart Solutions',
    avatar: '/avatar-1.jpg',
    role: 'CEO',
  },
  {
    id: '3',
    name: 'Michael Chen',
    company: 'GreenEnergy Innovations',
    avatar: '/avatar-2.jpg',
    role: 'Founder',
  },
  {
    id: '4',
    name: 'Emily Rodriguez',
    company: 'HealthTech Pro',
    avatar: '/avatar-3.jpg',
    role: 'Director',
  },
];
