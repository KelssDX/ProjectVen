import { randomUUID } from 'node:crypto';
import type { CalendarProvider } from '../contracts/calendar';

export interface ProviderTokenBundle {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
}

export interface ProviderAccountProfile {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface ProviderCalendarEvent {
  externalEventId: string;
  status: 'confirmed' | 'cancelled';
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  meetingLink: string | null;
  sourceLink: string | null;
}

export interface ProviderCalendarSyncResult {
  items: ProviderCalendarEvent[];
  nextCursor: string | null;
}

export interface GoogleWebhookMetadata {
  channelId: string;
  resourceId: string;
  expirationAt: string | null;
}

export interface MicrosoftWebhookMetadata {
  subscriptionId: string;
  expirationAt: string | null;
}

function parseTokenBundle(payload: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}): ProviderTokenBundle {
  return {
    accessToken: payload.access_token ?? '',
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null,
    scope: payload.scope ?? null,
  };
}

function requireOk(response: Response, context: string): Promise<unknown> {
  if (response.ok) {
    return response.json();
  }

  return response.text().then((text) => {
    throw new Error(`${context}: ${response.status} ${text}`);
  });
}

function parseGoogleDateTime(value?: { dateTime?: string; date?: string }): string | null {
  if (!value?.dateTime && !value?.date) {
    return null;
  }

  if (value.dateTime) {
    return new Date(value.dateTime).toISOString();
  }

  return new Date(`${value.date}T00:00:00.000Z`).toISOString();
}

function parseMicrosoftDateTime(value?: { dateTime?: string; timeZone?: string }): string | null {
  if (!value?.dateTime) {
    return null;
  }

  if (value.dateTime.endsWith('Z')) {
    return new Date(value.dateTime).toISOString();
  }

  return new Date(`${value.dateTime}${value.timeZone === 'UTC' ? 'Z' : ''}`).toISOString();
}

async function fetchJson(
  url: string,
  init: RequestInit,
  context: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  return (await requireOk(response, context)) as Record<string, unknown>;
}

async function fetchPaginatedMicrosoftDelta(
  accessToken: string,
  startAt: string,
  endAt: string,
  cursor: string | null,
): Promise<ProviderCalendarSyncResult> {
  let nextUrl: string | null =
    cursor ??
    `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${encodeURIComponent(
      startAt,
    )}&endDateTime=${encodeURIComponent(
      endAt,
    )}&$top=200&$select=id,subject,bodyPreview,location,start,end,webLink,isAllDay,onlineMeeting,lastModifiedDateTime`;
  const items: ProviderCalendarEvent[] = [];
  let deltaLink: string | null = null;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
      },
    });
    const payload = (await requireOk(
      response,
      'Failed to sync Microsoft calendar delta',
    )) as Record<string, unknown>;
    const pageItems = Array.isArray(payload.value)
      ? (payload.value as Record<string, unknown>[])
      : [];

    for (const entry of pageItems) {
      const externalEventId = String(entry.id ?? '');
      if (!externalEventId) {
        continue;
      }

      if (entry['@removed']) {
        items.push({
          externalEventId,
          status: 'cancelled',
          title: '',
          description: null,
          location: null,
          startAt: new Date().toISOString(),
          endAt: null,
          meetingLink: null,
          sourceLink: null,
        });
        continue;
      }

      const onlineMeeting = (entry.onlineMeeting ?? null) as
        | Record<string, unknown>
        | null;
      items.push({
        externalEventId,
        status: 'confirmed',
        title: String(entry.subject ?? 'Untitled event'),
        description: entry.bodyPreview ? String(entry.bodyPreview) : null,
        location:
          typeof entry.location === 'object' &&
          entry.location &&
          'displayName' in entry.location
            ? String((entry.location as { displayName?: string }).displayName ?? '')
            : null,
        startAt:
          parseMicrosoftDateTime(
            (entry.start ?? undefined) as { dateTime?: string; timeZone?: string },
          ) ?? new Date().toISOString(),
        endAt: parseMicrosoftDateTime(
          (entry.end ?? undefined) as { dateTime?: string; timeZone?: string },
        ),
        meetingLink:
          typeof onlineMeeting?.joinUrl === 'string'
            ? onlineMeeting.joinUrl
            : null,
        sourceLink: typeof entry.webLink === 'string' ? entry.webLink : null,
      });
    }

    nextUrl =
      typeof payload['@odata.nextLink'] === 'string'
        ? payload['@odata.nextLink']
        : null;
    deltaLink =
      typeof payload['@odata.deltaLink'] === 'string'
        ? payload['@odata.deltaLink']
        : deltaLink;
  }

  return {
    items,
    nextCursor: deltaLink,
  };
}

export function buildOauthAuthorizationUrl(input: {
  provider: CalendarProvider;
  clientId: string;
  redirectUri: string;
  state: string;
  microsoftTenantId?: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    state: input.state,
  });

  if (input.provider === 'google') {
    params.set('access_type', 'offline');
    params.set('include_granted_scopes', 'true');
    params.set('prompt', 'consent');
    params.set(
      'scope',
      [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar',
      ].join(' '),
    );

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  params.set('response_mode', 'query');
  params.set(
    'scope',
    ['offline_access', 'openid', 'email', 'profile', 'User.Read', 'Calendars.ReadWrite'].join(' '),
  );

  const tenantId = input.microsoftTenantId?.trim() || 'common';
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeOauthCode(input: {
  provider: CalendarProvider;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  microsoftTenantId?: string;
}): Promise<ProviderTokenBundle> {
  const url =
    input.provider === 'google'
      ? 'https://oauth2.googleapis.com/token'
      : `https://login.microsoftonline.com/${input.microsoftTenantId?.trim() || 'common'}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
  });

  if (input.provider === 'microsoft') {
    body.set(
      'scope',
      'offline_access openid email profile User.Read Calendars.ReadWrite',
    );
  }

  const payload = await fetchJson(
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    `Failed to exchange ${input.provider} OAuth code`,
  );

  return parseTokenBundle(payload as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  });
}

export async function refreshOauthToken(input: {
  provider: CalendarProvider;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  microsoftTenantId?: string;
}): Promise<ProviderTokenBundle> {
  const url =
    input.provider === 'google'
      ? 'https://oauth2.googleapis.com/token'
      : `https://login.microsoftonline.com/${input.microsoftTenantId?.trim() || 'common'}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    refresh_token: input.refreshToken,
    grant_type: 'refresh_token',
  });

  if (input.provider === 'microsoft') {
    body.set(
      'scope',
      'offline_access openid email profile User.Read Calendars.ReadWrite',
    );
  }

  const payload = await fetchJson(
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    `Failed to refresh ${input.provider} access token`,
  );

  const bundle = parseTokenBundle(payload as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  });

  return {
    ...bundle,
    refreshToken: bundle.refreshToken ?? input.refreshToken,
  };
}

export async function fetchProviderAccountProfile(input: {
  provider: CalendarProvider;
  accessToken: string;
}): Promise<ProviderAccountProfile> {
  if (input.provider === 'google') {
    const payload = await fetchJson(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: 'application/json',
        },
      },
      'Failed to fetch Google account profile',
    );

    return {
      providerUserId: String(payload.sub ?? ''),
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: Boolean(payload.email_verified),
      displayName: typeof payload.name === 'string' ? payload.name : null,
    };
  }

  const payload = await fetchJson(
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
    {
      method: 'GET',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        accept: 'application/json',
      },
    },
    'Failed to fetch Microsoft account profile',
  );

  const email =
    typeof payload.mail === 'string'
      ? payload.mail
      : typeof payload.userPrincipalName === 'string'
        ? payload.userPrincipalName
        : null;

  return {
    providerUserId: String(payload.id ?? ''),
    email,
    emailVerified: Boolean(email),
    displayName: typeof payload.displayName === 'string' ? payload.displayName : null,
  };
}

export async function fetchProviderCalendarDelta(input: {
  provider: CalendarProvider;
  accessToken: string;
  cursor: string | null;
  startAt: string;
  endAt: string;
}): Promise<ProviderCalendarSyncResult> {
  if (input.provider === 'google') {
    const params = new URLSearchParams({
      showDeleted: 'true',
      singleEvents: 'true',
      maxResults: '2500',
    });

    if (input.cursor) {
      params.set('syncToken', input.cursor);
    } else {
      params.set('timeMin', input.startAt);
      params.set('timeMax', input.endAt);
      params.set('orderBy', 'startTime');
    }

    const payload = await fetchJson(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: 'application/json',
        },
      },
      'Failed to sync Google calendar events',
    );

    const items = Array.isArray(payload.items)
      ? (payload.items as Record<string, unknown>[])
      : [];

    return {
      items: items
        .map((entry) => {
          const externalEventId = String(entry.id ?? '');
          if (!externalEventId) {
            return null;
          }

          return {
            externalEventId,
            status:
              entry.status === 'cancelled' ? 'cancelled' : 'confirmed',
            title:
              entry.status === 'cancelled'
                ? ''
                : String(entry.summary ?? 'Untitled event'),
            description:
              typeof entry.description === 'string' ? entry.description : null,
            location: typeof entry.location === 'string' ? entry.location : null,
            startAt:
              parseGoogleDateTime(
                entry.start as { dateTime?: string; date?: string } | undefined,
              ) ?? new Date().toISOString(),
            endAt: parseGoogleDateTime(
              entry.end as { dateTime?: string; date?: string } | undefined,
            ),
            meetingLink:
              typeof entry.hangoutLink === 'string' ? entry.hangoutLink : null,
            sourceLink: typeof entry.htmlLink === 'string' ? entry.htmlLink : null,
          } satisfies ProviderCalendarEvent;
        })
        .filter((item): item is ProviderCalendarEvent => item !== null),
      nextCursor:
        typeof payload.nextSyncToken === 'string' ? payload.nextSyncToken : null,
    };
  }

  return fetchPaginatedMicrosoftDelta(
    input.accessToken,
    input.startAt,
    input.endAt,
    input.cursor,
  );
}

export async function upsertProviderCalendarEvent(input: {
  provider: CalendarProvider;
  accessToken: string;
  externalEventId?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  meetingLink?: string | null;
  sourceLink?: string | null;
}): Promise<{ externalEventId: string; sourceLink: string | null }> {
  if (input.provider === 'google') {
    const endpoint = input.externalEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
          input.externalEventId,
        )}`
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const method = input.externalEventId ? 'PUT' : 'POST';
    const response = await fetch(endpoint, {
      method,
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.title,
        description: [input.description, input.meetingLink, input.sourceLink]
          .filter(Boolean)
          .join('\n\n') || undefined,
        location: input.location ?? undefined,
        start: { dateTime: input.startAt, timeZone: 'UTC' },
        end: {
          dateTime:
            input.endAt ??
            new Date(new Date(input.startAt).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
      }),
    });
    const payload = (await requireOk(
      response,
      `Failed to upsert Google event ${input.externalEventId ?? '[new]'}`,
    )) as Record<string, unknown>;
    return {
      externalEventId: String(payload.id ?? ''),
      sourceLink: typeof payload.htmlLink === 'string' ? payload.htmlLink : null,
    };
  }

  const endpoint = input.externalEventId
    ? `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(
        input.externalEventId,
      )}`
    : 'https://graph.microsoft.com/v1.0/me/events';
  const method = input.externalEventId ? 'PATCH' : 'POST';
  const response = await fetch(endpoint, {
    method,
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      accept: 'application/json',
      'content-type': 'application/json',
      Prefer: 'outlook.timezone="UTC"',
    },
    body: JSON.stringify({
      subject: input.title,
      body: {
        contentType: 'Text',
        content: [input.description, input.meetingLink, input.sourceLink]
          .filter(Boolean)
          .join('\n\n'),
      },
      location: input.location ? { displayName: input.location } : undefined,
      start: {
        dateTime: input.startAt.replace(/Z$/, ''),
        timeZone: 'UTC',
      },
      end: {
        dateTime: (
          input.endAt ??
          new Date(new Date(input.startAt).getTime() + 60 * 60 * 1000).toISOString()
        ).replace(/Z$/, ''),
        timeZone: 'UTC',
      },
    }),
  });
  const payload = (await requireOk(
    response,
    `Failed to upsert Microsoft event ${input.externalEventId ?? '[new]'}`,
  )) as Record<string, unknown>;

  return {
    externalEventId: String(payload.id ?? input.externalEventId ?? ''),
    sourceLink: typeof payload.webLink === 'string' ? payload.webLink : null,
  };
}

export async function deleteProviderCalendarEvent(input: {
  provider: CalendarProvider;
  accessToken: string;
  externalEventId: string;
}): Promise<void> {
  const endpoint =
    input.provider === 'google'
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
          input.externalEventId,
        )}`
      : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(
          input.externalEventId,
        )}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      accept: 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to delete ${input.provider} event ${input.externalEventId}: ${response.status} ${await response.text()}`,
    );
  }
}

export async function ensureProviderWebhook(input: {
  provider: CalendarProvider;
  accessToken: string;
  webhookUrl: string | null;
  webhookToken: string;
}): Promise<GoogleWebhookMetadata | MicrosoftWebhookMetadata | null> {
  if (!input.webhookUrl) {
    return null;
  }

  if (input.provider === 'google') {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: randomUUID(),
          type: 'web_hook',
          address: input.webhookUrl,
          token: input.webhookToken,
          params: {
            ttl: '604800',
          },
        }),
      },
    );
    const payload = (await requireOk(
      response,
      'Failed to register Google calendar webhook',
    )) as Record<string, unknown>;

    return {
      channelId: String(payload.id ?? ''),
      resourceId: String(payload.resourceId ?? ''),
      expirationAt:
        typeof payload.expiration === 'string'
          ? new Date(Number(payload.expiration)).toISOString()
          : null,
    };
  }

  const expirationAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      changeType: 'created,updated,deleted',
      notificationUrl: input.webhookUrl,
      resource: '/me/events',
      expirationDateTime: expirationAt,
      clientState: input.webhookToken,
    }),
  });
  const payload = (await requireOk(
    response,
    'Failed to register Microsoft calendar webhook',
  )) as Record<string, unknown>;

  return {
    subscriptionId: String(payload.id ?? ''),
    expirationAt:
      typeof payload.expirationDateTime === 'string'
        ? payload.expirationDateTime
        : expirationAt,
  };
}
