import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { calendarApi, type CalendarProviderDto } from '@/api/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const providerLabels: Record<CalendarProviderDto, string> = {
  google: 'Google Calendar',
  microsoft: 'Microsoft Outlook',
};

const CalendarOAuthCallback = () => {
  const { provider } = useParams<{ provider: CalendarProviderDto }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    if (provider !== 'google' && provider !== 'microsoft') {
      setError('Unsupported calendar provider.');
      return;
    }

    const code = search.get('code');
    const state = search.get('state');
    const providerError = search.get('error');

    if (providerError) {
      setError(`Provider returned an error: ${providerError}.`);
      return;
    }

    if (!code || !state) {
      setError('Calendar authorization response is incomplete.');
      return;
    }

    let cancelled = false;

    const completeOauth = async () => {
      try {
        const redirectUri = new URL(location.pathname, window.location.origin).toString();
        await calendarApi.completeOauth(provider, {
          code,
          state,
          redirectUri,
        });
        if (cancelled) {
          return;
        }

        navigate(`/dashboard/calendar?calendar_oauth=success&provider=${provider}`, {
          replace: true,
        });
      } catch (completionError) {
        if (cancelled) {
          return;
        }

        setError(
          completionError instanceof Error
            ? completionError.message
            : 'Failed to complete calendar connection.',
        );
      }
    };

    void completeOauth();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate, provider, search]);

  if (!error) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Connecting Calendar</CardTitle>
            <CardDescription>
              Finalizing your {provider && provider in providerLabels ? providerLabels[provider as CalendarProviderDto] : 'calendar'} integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for the provider exchange to complete...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Calendar Connection Failed</CardTitle>
          <CardDescription>
            The provider callback did not complete successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/dashboard/calendar', { replace: true })}>
            Back to Calendar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarOAuthCallback;
