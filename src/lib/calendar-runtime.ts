import { format, isToday } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
  calendarApi,
  type CalendarEventDto,
  type CalendarProviderDto,
  type CalendarEventUpsertInput,
  type CalendarIntegrationDto,
} from '@/api/calendar';
import {
  calendarEvents,
  calendarIntegrations,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarIntegration,
  type CalendarSource,
} from '@/data/mockCalendar';

export const USE_REAL_CALENDAR =
  import.meta.env.VITE_FEATURE_USE_REAL_CALENDAR === 'true';

export interface CalendarEventDraft {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  type: CalendarEventType;
  meetingMode?: CalendarEvent['meetingMode'];
  meetingLink?: string;
  link?: string;
}

const integrationNames: Record<'google' | 'microsoft', string> = {
  google: 'Google Calendar',
  microsoft: 'Microsoft Outlook',
};

const defaultLinks: Record<CalendarEventType, string> = {
  meeting: '/dashboard/calendar',
  deadline: '/dashboard/calendar',
  event: '/dashboard/feed',
  booking: '/dashboard/marketplace',
  reminder: '/dashboard/calendar',
};

function cloneFallbackEvents(): CalendarEvent[] {
  return calendarEvents.map((event) => ({
    ...event,
    start: new Date(event.start),
    end: event.end ? new Date(event.end) : undefined,
  }));
}

function cloneFallbackIntegrations(): CalendarIntegration[] {
  return calendarIntegrations.map((integration) => ({ ...integration }));
}

function sortEvents(items: CalendarEvent[]): CalendarEvent[] {
  return [...items].sort((left, right) => {
    const delta = left.start.getTime() - right.start.getTime();
    if (delta !== 0) {
      return delta;
    }

    return left.title.localeCompare(right.title);
  });
}

function formatTimeLabel(start: Date, end?: Date): string {
  const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && !end;
  if (isAllDay) {
    return 'All day';
  }

  if (end) {
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  }

  return format(start, 'h:mm a');
}

function formatLastSync(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (isToday(parsed)) {
    return `Today, ${format(parsed, 'HH:mm')}`;
  }

  return format(parsed, 'MMM d, HH:mm');
}

function mapEventDto(dto: CalendarEventDto): CalendarEvent {
  const start = new Date(dto.startAt);
  const end = dto.endAt ? new Date(dto.endAt) : undefined;

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? undefined,
    location:
      dto.location ?? (dto.meetingMode === 'virtual' ? 'Virtual' : undefined),
    start,
    end,
    timeLabel: formatTimeLabel(start, end),
    type: dto.eventType,
    source: dto.source,
    link: dto.sourceLink ?? defaultLinks[dto.eventType],
    meetingMode: dto.meetingMode ?? undefined,
    meetingLink: dto.meetingLink ?? undefined,
  };
}

function mapIntegrationDto(dto: CalendarIntegrationDto): CalendarIntegration {
  return {
    id: dto.provider as CalendarSource,
    name: integrationNames[dto.provider],
    connected: dto.connected,
    lastSync: dto.connected ? formatLastSync(dto.lastSyncAt) : undefined,
  };
}

function toApiEventInput(event: CalendarEventDraft): CalendarEventUpsertInput {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startAt: event.start.toISOString(),
    endAt: event.end?.toISOString(),
    eventType: event.type,
    meetingMode: event.type === 'meeting' ? event.meetingMode : undefined,
    meetingLink:
      event.type === 'meeting' && event.meetingMode === 'virtual'
        ? event.meetingLink
        : undefined,
    sourceLink: event.link,
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function createLocalEvent(event: CalendarEventDraft): CalendarEvent {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : undefined;

  return {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: event.title,
    description: event.description,
    location: event.location,
    start,
    end,
    timeLabel: formatTimeLabel(start, end),
    type: event.type,
    source: 'vendrom',
    link: event.link ?? defaultLinks[event.type],
    meetingMode: event.type === 'meeting' ? event.meetingMode : undefined,
    meetingLink:
      event.type === 'meeting' && event.meetingMode === 'virtual'
        ? event.meetingLink
        : undefined,
  };
}

function mergeIntegrationState(
  previous: CalendarIntegration[],
  next: CalendarIntegration,
): CalendarIntegration[] {
  const existingIndex = previous.findIndex((item) => item.id === next.id);
  if (existingIndex === -1) {
    return [...previous, next];
  }

  const updated = [...previous];
  updated[existingIndex] = next;
  return updated;
}

export function useCalendarRuntime() {
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    sortEvents(cloneFallbackEvents()),
  );
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>(() =>
    cloneFallbackIntegrations(),
  );
  const [isLoading, setIsLoading] = useState(USE_REAL_CALENDAR);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(!USE_REAL_CALENDAR);

  useEffect(() => {
    if (!USE_REAL_CALENDAR) {
      return;
    }

    let isMounted = true;

    const loadCalendar = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [eventsResponse, integrationsResponse] = await Promise.all([
          calendarApi.getEvents({ limit: 250 }),
          calendarApi.getIntegrations(),
        ]);

        if (!isMounted) {
          return;
        }

        setEvents(sortEvents(eventsResponse.data.items.map(mapEventDto)));
        setIntegrations(integrationsResponse.data.items.map(mapIntegrationDto));
        setUsingFallback(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setEvents(sortEvents(cloneFallbackEvents()));
        setIntegrations(cloneFallbackIntegrations());
        setUsingFallback(true);
        setLoadError(
          toErrorMessage(
            error,
            'Failed to load live calendar data. Showing fallback data.',
          ),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCalendar();

    return () => {
      isMounted = false;
    };
  }, []);

  const createEvent = useCallback(
    async (draft: CalendarEventDraft): Promise<CalendarEvent> => {
      setActionError(null);

      if (usingFallback) {
        const localEvent = createLocalEvent(draft);
        setEvents((previous) => sortEvents([localEvent, ...previous]));
        return localEvent;
      }

      try {
        const { data } = await calendarApi.createEvent(toApiEventInput(draft));
        const mapped = mapEventDto(data);
        setEvents((previous) =>
          sortEvents([
            mapped,
            ...previous.filter((item) => item.id !== mapped.id),
          ]),
        );
        return mapped;
      } catch (error) {
        const message = toErrorMessage(error, 'Failed to create calendar event.');
        setActionError(message);
        throw new Error(message);
      }
    },
    [usingFallback],
  );

  const updateEvent = useCallback(
    async (eventId: string, draft: CalendarEventDraft): Promise<CalendarEvent> => {
      setActionError(null);

      if (usingFallback) {
        const updated = createLocalEvent(draft);
        updated.id = eventId;
        updated.source = 'vendrom';

        setEvents((previous) =>
          sortEvents(
            previous.map((item) => (item.id === eventId ? updated : item)),
          ),
        );
        return updated;
      }

      try {
        const { data } = await calendarApi.updateEvent(
          eventId,
          toApiEventInput(draft),
        );
        const mapped = mapEventDto(data);
        setEvents((previous) =>
          sortEvents(
            previous.map((item) => (item.id === eventId ? mapped : item)),
          ),
        );
        return mapped;
      } catch (error) {
        const message = toErrorMessage(error, 'Failed to update calendar event.');
        setActionError(message);
        throw new Error(message);
      }
    },
    [usingFallback],
  );

  const addEventToVendromCalendar = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      if (event.source === 'vendrom') {
        return event;
      }

      return createEvent({
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        type: event.type,
        meetingMode: event.meetingMode,
        meetingLink: event.meetingLink,
        link: event.link,
      });
    },
    [createEvent],
  );

  const startOauthIntegration = useCallback(
    async (provider: CalendarIntegration['id']): Promise<string> => {
      setActionError(null);

      if (usingFallback) {
        const nextIntegration: CalendarIntegration = {
          id: provider,
          name: integrationNames[provider as 'google' | 'microsoft'],
          connected: true,
          lastSync: 'Just now',
        };
        setIntegrations((previous) =>
          mergeIntegrationState(previous, nextIntegration),
        );
        return '';
      }

      try {
        const callbackPath = `/dashboard/calendar/oauth/${provider}`;
        const redirectUri = new URL(callbackPath, window.location.origin).toString();
        const { data } = await calendarApi.beginOauth(
          provider as CalendarProviderDto,
          { redirectUri },
        );
        return data.authUrl;
      } catch (error) {
        const message = toErrorMessage(
          error,
          'Failed to start calendar OAuth.',
        );
        setActionError(message);
        throw new Error(message);
      }
    },
    [usingFallback],
  );

  const disconnectIntegration = useCallback(
    async (provider: CalendarIntegration['id']): Promise<CalendarIntegration> => {
      setActionError(null);

      const current = integrations.find((item) => item.id === provider);

      if (usingFallback) {
        const nextIntegration: CalendarIntegration = {
          id: provider,
          name: current?.name ?? integrationNames[provider as 'google' | 'microsoft'],
          connected: false,
          lastSync: undefined,
        };
        setIntegrations((previous) =>
          mergeIntegrationState(previous, nextIntegration),
        );
        return nextIntegration;
      }

      try {
        const response = await calendarApi.disconnectIntegration(
          provider as CalendarProviderDto,
        );
        const mapped = mapIntegrationDto(response.data);
        setIntegrations((previous) => mergeIntegrationState(previous, mapped));
        setEvents((previous) =>
          previous.filter((event) => event.source !== provider),
        );
        return mapped;
      } catch (error) {
        const message = toErrorMessage(
          error,
          'Failed to disconnect calendar integration.',
        );
        setActionError(message);
        throw new Error(message);
      }
    },
    [integrations, usingFallback],
  );

  const syncIntegration = useCallback(
    async (provider: CalendarIntegration['id']): Promise<void> => {
      setActionError(null);

      if (usingFallback) {
        return;
      }

      try {
        await calendarApi.syncIntegration(provider as CalendarProviderDto);
        const [eventsResponse, integrationsResponse] = await Promise.all([
          calendarApi.getEvents({ limit: 250 }),
          calendarApi.getIntegrations(),
        ]);
        setEvents(sortEvents(eventsResponse.data.items.map(mapEventDto)));
        setIntegrations(integrationsResponse.data.items.map(mapIntegrationDto));
      } catch (error) {
        const message = toErrorMessage(
          error,
          'Failed to sync calendar integration.',
        );
        setActionError(message);
        throw new Error(message);
      }
    },
    [usingFallback],
  );

  const clearLoadError = useCallback(() => {
    setLoadError(null);
  }, []);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    actionError,
    addEventToVendromCalendar,
    clearActionError,
    clearLoadError,
    createEvent,
    disconnectIntegration,
    events,
    integrations,
    isLoading,
    loadError,
    startOauthIntegration,
    syncIntegration,
    updateEvent,
    usingFallback,
  };
}
