import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCalendarRuntime } from '@/lib/calendar-runtime';
import { Separator } from '@/components/ui/separator';
import {
  CalendarDays,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Users,
  Target,
  Briefcase,
  Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  type CalendarEvent,
  type CalendarEventType,
} from '@/data/mockCalendar';

const typeLabels: Record<CalendarEventType, string> = {
  meeting: 'Meeting',
  deadline: 'Deadline',
  event: 'Event',
  booking: 'Booking',
  reminder: 'Reminder',
};

const typeIcons: Record<CalendarEventType, LucideIcon> = {
  meeting: Users,
  deadline: Target,
  event: CalendarDays,
  booking: Briefcase,
  reminder: Clock,
};

const CalendarPanel = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const {
    addEventToVendromCalendar,
    actionError,
    createEvent: persistCalendarEvent,
    disconnectIntegration: persistIntegrationDisconnect,
    events,
    integrations,
    isLoading,
    loadError,
    startOauthIntegration,
  } = useCalendarRuntime();
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');

  const eventsForDay = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(
      (event) => event.start.toDateString() === selectedDate.toDateString()
    );
  }, [events, selectedDate]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((event) => event.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [events]);

  const handleQuickAdd = async (event: CalendarEvent) => {
    try {
      const addedEvent = await addEventToVendromCalendar(event);
      setSelectedDate(addedEvent.start);
    } catch {
      setSelectedDate(event.start);
    }
  };

  const handleAddEvent = async () => {
    if (!newEventTitle || !newEventDate) return;

    const date = new Date(newEventDate);
    if (newEventTime) {
      const [hours, minutes] = newEventTime.split(':').map(Number);
      date.setHours(hours, minutes || 0, 0, 0);
    }

    try {
      await persistCalendarEvent({
        title: newEventTitle,
        description: newEventLocation ? `Location: ${newEventLocation}` : undefined,
        location: newEventLocation || undefined,
        start: date,
        type: 'event',
        link: '/dashboard/briefboard',
      });

      setNewEventTitle('');
      setNewEventDate(undefined);
      setNewEventTime('');
      setNewEventLocation('');
    } catch {
      // Hook error state drives the inline message.
    }
  };

  const handleToggleIntegration = async (id: typeof integrations[number]['id']) => {
    try {
      const current = integrations.find((item) => item.id === id);
      if (current?.connected) {
        await persistIntegrationDisconnect(id);
        return;
      }

      const authUrl = await startOauthIntegration(id);
      if (authUrl) {
        window.location.assign(authUrl);
      }
    } catch {
      // Hook error state drives the inline message.
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Calendar
          </CardTitle>
          <CardDescription>Events and bookings across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isLoading || loadError || actionError) && (
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {isLoading
                ? 'Loading live calendar data...'
                : actionError ?? loadError}
            </div>
          )}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />

          <div>
            <p className="text-sm font-medium text-foreground">
              {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
            </p>
            <div className="mt-3 space-y-3">
              {eventsForDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events on this day.</p>
              ) : (
                eventsForDay.map((event) => {
                  const Icon = typeIcons[event.type];
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.timeLabel}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add to Calendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Event title"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Calendar
                    mode="single"
                    selected={newEventDate}
                    onSelect={setNewEventDate}
                    className="rounded-md border mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Time</label>
                    <Input
                      type="time"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      placeholder="Optional"
                      value={newEventLocation}
                      onChange={(e) => setNewEventLocation(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                  onClick={handleAddEvent}
                  disabled={!newEventTitle || !newEventDate}
                >
                  Save Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Calendar Sync
          </CardTitle>
          <CardDescription>Connect external calendars</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{integration.name}</p>
                {integration.connected ? (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {integration.lastSync}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>
              <Button
                size="sm"
                variant={integration.connected ? 'outline' : 'default'}
                onClick={() => void handleToggleIntegration(integration.id)}
              >
                {integration.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Upcoming
          </CardTitle>
          <CardDescription>Linked to Briefboard and bookings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.map((event) => {
            const Icon = typeIcons[event.type];
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{event.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabels[event.type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(event.start, 'MMM d')} - {event.timeLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAdd(event)}
                    >
                      {event.type === 'booking' ? 'Book' : 'Add to calendar'}
                    </Button>
                    {event.link && (
                      <Link
                        to={event.link}
                        className="text-xs text-primary inline-flex items-center gap-1"
                      >
                        View
                        <LinkIcon className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {upcomingEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          )}
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
};

export default CalendarPanel;
