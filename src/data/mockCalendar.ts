export type CalendarSource = 'vendrom' | 'google' | 'microsoft';

export type CalendarEventType =
  | 'meeting'
  | 'deadline'
  | 'event'
  | 'booking'
  | 'reminder';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  timeLabel: string;
  type: CalendarEventType;
  source: CalendarSource;
  link?: string;
  meetingMode?: 'virtual' | 'physical';
  meetingLink?: string;
}

export interface CalendarIntegration {
  id: CalendarSource;
  name: string;
  connected: boolean;
  lastSync?: string;
}

export const calendarIntegrations: CalendarIntegration[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    connected: true,
    lastSync: 'Today, 09:15',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Outlook',
    connected: false,
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Investor Coffee Chat',
    description: 'Follow-up with Horizon Ventures',
    location: 'Downtown Cafe',
    start: new Date('2026-02-05T15:00:00'),
    end: new Date('2026-02-05T16:00:00'),
    timeLabel: '3:00 PM',
    type: 'meeting',
    source: 'google',
    link: '/dashboard/briefboard',
    meetingMode: 'physical',
  },
  {
    id: 'event-2',
    title: 'Marketplace Booking',
    description: 'Product demo with Vendorly',
    location: 'Virtual',
    start: new Date('2026-02-06T11:30:00'),
    end: new Date('2026-02-06T12:30:00'),
    timeLabel: '11:30 AM',
    type: 'booking',
    source: 'vendrom',
    link: '/dashboard/marketplace',
  },
  {
    id: 'event-3',
    title: 'Funding Application Deadline',
    description: 'SME Growth Fund submission',
    start: new Date('2026-02-07T17:00:00'),
    timeLabel: '5:00 PM',
    type: 'deadline',
    source: 'microsoft',
    link: '/dashboard/investments',
  },
  {
    id: 'event-4',
    title: 'Vendrome Networking Summit',
    description: 'Annual virtual networking event',
    start: new Date('2026-03-15T10:00:00'),
    end: new Date('2026-03-15T12:00:00'),
    timeLabel: '10:00 AM',
    type: 'event',
    source: 'vendrom',
    link: '/dashboard/feed',
    meetingMode: 'virtual',
    meetingLink: 'https://meet.vendrom.com/summit',
  },
  {
    id: 'event-5',
    title: 'Marketing Campaign Review',
    description: 'Quarterly performance review',
    start: new Date('2026-02-10T14:00:00'),
    end: new Date('2026-02-10T15:00:00'),
    timeLabel: '2:00 PM',
    type: 'reminder',
    source: 'vendrom',
    link: '/dashboard/marketing',
  },
];
