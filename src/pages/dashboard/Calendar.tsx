import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementType } from 'react';
import {
  addMinutes,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfWeek,
  format,
  isSameDay,
  parse,
  setMonth,
  setYear,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { DayButton as DayButtonComponent } from 'react-day-picker';
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  MapPin,
  Plus,
  RefreshCw,
  Target,
  Users,
  Briefcase,
  Video,
} from 'lucide-react';
import {
  calendarEvents,
  calendarIntegrations,
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

const typeDots: Record<CalendarEventType, string> = {
  meeting: 'bg-blue-500',
  deadline: 'bg-red-500',
  event: 'bg-purple-500',
  booking: 'bg-emerald-500',
  reminder: 'bg-amber-500',
};

const typeIcons: Record<CalendarEventType, ElementType> = {
  meeting: Users,
  deadline: Target,
  event: CalendarDays,
  booking: Briefcase,
  reminder: Clock,
};

const typeChips: Record<CalendarEventType, string> = {
  meeting: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  deadline: 'bg-red-500/10 text-red-700 dark:text-red-300',
  event: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  booking: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  reminder: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
};

type CalendarView = 'day' | 'week' | 'month' | 'year';
type MeetingMode = 'virtual' | 'physical';

const viewOptions: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>(calendarEvents);
  const [integrations, setIntegrations] = useState(calendarIntegrations);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEventType>('meeting');
  const [newMeetingMode, setNewMeetingMode] = useState<MeetingMode>('virtual');
  const [newMeetingLink, setNewMeetingLink] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning' | 'info'; message: string } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'meeting' | 'event'>('meeting');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editType, setEditType] = useState<CalendarEventType>('meeting');
  const [editMeetingMode, setEditMeetingMode] = useState<MeetingMode>('virtual');
  const [editMeetingLink, setEditMeetingLink] = useState('');

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const key = dateKey(event.start);
      acc[key] = acc[key] || [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [events]);

  const daysWithEvents = useMemo(() => {
    return Object.keys(eventsByDate).map((key) => parse(key, 'yyyy-MM-dd', new Date()));
  }, [eventsByDate]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[dateKey(selectedDate)] || [];
  }, [eventsByDate, selectedDate]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((event) => event.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 8);
  }, [events]);

  const handleSelectDate = (date?: Date) => {
    setSelectedDate(date);
    if (date) {
      setCurrentDate(date);
      if (view === 'month') {
        setView('day');
      }
    }
  };

  const focusDate = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setView('day');
  };

  const startOfCurrentWeek = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfCurrentWeek, index)),
    [startOfCurrentWeek]
  );

  const timeSlots = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 7), []);

  const yearMonths = useMemo(() => {
    const year = currentDate.getFullYear();
    return Array.from({ length: 12 }, (_, index) => setMonth(setYear(new Date(), year), index));
  }, [currentDate]);

  const currentLabel = useMemo(() => {
    if (view === 'day') {
      return format(currentDate, 'PPPP');
    }
    if (view === 'week') {
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(startOfCurrentWeek, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    if (view === 'year') {
      return format(currentDate, 'yyyy');
    }
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate, startOfCurrentWeek, view]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index.toString(),
        label: format(setMonth(new Date(), index), 'MMMM'),
      })),
    []
  );

  const yearOptions = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  }, [currentDate]);

  const handleNavigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1;
    let nextDate = currentDate;
    if (view === 'day') {
      nextDate = delta === -1 ? subDays(currentDate, 1) : addDays(currentDate, 1);
    } else if (view === 'week') {
      nextDate = delta === -1 ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
    } else if (view === 'year') {
      nextDate = delta === -1 ? subYears(currentDate, 1) : addYears(currentDate, 1);
    } else {
      nextDate = delta === -1 ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    }
    setCurrentDate(nextDate);
    setSelectedDate(nextDate);
  };

  const handleMonthSelect = (value: string) => {
    const nextDate = setMonth(currentDate, Number(value));
    setCurrentDate(nextDate);
    setSelectedDate(nextDate);
  };

  const handleYearSelect = (value: string) => {
    const nextDate = setYear(currentDate, Number(value));
    setCurrentDate(nextDate);
    setSelectedDate(nextDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleAddEvent = () => {
    if (!newEventTitle || !newEventDate) return;

    const start = new Date(newEventDate);
    if (newEventTime) {
      const [hours, minutes] = newEventTime.split(':').map(Number);
      start.setHours(hours, minutes || 0, 0, 0);
    }

    let end: Date | undefined;
    if (newEventEndTime) {
      const [endHours, endMinutes] = newEventEndTime.split(':').map(Number);
      end = new Date(newEventDate);
      end.setHours(endHours, endMinutes || 0, 0, 0);
    }

    const timeLabel = newEventTime
      ? newEventEndTime
        ? `${format(start, 'h:mm a')} - ${format(end!, 'h:mm a')}`
        : format(start, 'h:mm a')
      : 'All day';

    const isMeeting = newEventType === 'meeting';
    const meetingMode = isMeeting ? newMeetingMode : undefined;

    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: newEventTitle,
      description: newEventLocation ? `Location: ${newEventLocation}` : undefined,
      location: newEventLocation || undefined,
      start,
      end,
      timeLabel,
      type: newEventType,
      source: 'vendrom',
      link: '/dashboard/briefboard',
      meetingMode,
      meetingLink: meetingMode === 'virtual' ? newMeetingLink : undefined,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setNewEventTitle('');
    setNewEventDate(undefined);
    setNewEventTime('');
    setNewEventEndTime('');
    setNewEventLocation('');
    setNewEventType('meeting');
    setNewMeetingMode('virtual');
    setNewMeetingLink('');
    setIsCreateDialogOpen(false);
  };

  const openCreateDialog = (mode: 'meeting' | 'event') => {
    setCreateMode(mode);
    setNewEventType(mode === 'meeting' ? 'meeting' : 'event');
    if (mode === 'event') {
      setNewMeetingMode('virtual');
      setNewMeetingLink('');
    }
    setIsCreateDialogOpen(true);
  };

  const formatTimeInput = (date?: Date) => (date ? format(date, 'HH:mm') : '');

  const openEditDialog = (event: CalendarEvent) => {
    setEditEvent(event);
    setEditTitle(event.title);
    setEditDate(new Date(event.start));
    setEditStartTime(formatTimeInput(event.start));
    setEditEndTime(event.end ? formatTimeInput(event.end) : '');
    setEditLocation(event.location ?? '');
    setEditType(event.type);
    setEditMeetingMode(event.meetingMode ?? 'virtual');
    setEditMeetingLink(event.meetingLink ?? '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editEvent || !editTitle || !editDate) return;

    const start = new Date(editDate);
    if (editStartTime) {
      const [hours, minutes] = editStartTime.split(':').map(Number);
      start.setHours(hours, minutes || 0, 0, 0);
    }

    let end: Date | undefined;
    if (editEndTime) {
      const [endHours, endMinutes] = editEndTime.split(':').map(Number);
      end = new Date(editDate);
      end.setHours(endHours, endMinutes || 0, 0, 0);
    }

    const timeLabel = editStartTime
      ? editEndTime && end
        ? `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
        : format(start, 'h:mm a')
      : 'All day';

    const meetingMode = editType === 'meeting' ? editMeetingMode : undefined;

    const updatedEvent: CalendarEvent = {
      ...editEvent,
      title: editTitle,
      start,
      end,
      timeLabel,
      type: editType,
      location: editLocation || undefined,
      meetingMode,
      meetingLink: meetingMode === 'virtual' ? editMeetingLink : undefined,
    };

    setEvents((prev) => prev.map((event) => (event.id === editEvent.id ? updatedEvent : event)));
    setIsEditDialogOpen(false);
    setEditEvent(null);
  };

  const getEventWindow = (event: CalendarEvent) => {
    const start = event.start;
    const end = event.end ?? addMinutes(event.start, 60);
    return { start, end };
  };

  const findConflicts = (candidate: CalendarEvent) => {
    const { start, end } = getEventWindow(candidate);
    return events.filter((event) => {
      if (event.id === candidate.id) return false;
      if (!isSameDay(event.start, start)) return false;
      const { start: otherStart, end: otherEnd } = getEventWindow(event);
      return start < otherEnd && end > otherStart;
    });
  };

  const handleUpcomingAction = (event: CalendarEvent) => {
    if (event.source === 'vendrom') {
      focusDate(event.start);
      setNotice({
        tone: 'info',
        message: 'This event is already on your Vendrom calendar.',
      });
      return;
    }

    const clonedEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`,
      source: 'vendrom',
    };
    const conflicts = findConflicts(clonedEvent);

    setEvents((prev) => [clonedEvent, ...prev]);
    focusDate(clonedEvent.start);
    setNotice({
      tone: conflicts.length > 0 ? 'warning' : 'success',
      message:
        conflicts.length > 0
          ? `Added, but this overlaps with ${conflicts.length} event${conflicts.length === 1 ? '' : 's'}.`
          : 'Added to your calendar.',
    });
  };

  const toggleIntegration = (id: typeof integrations[number]['id']) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              connected: !item.connected,
              lastSync: item.connected ? undefined : 'Just now',
            }
          : item
      )
    );
  };

  const DayButton = ({
    className,
    day,
    modifiers,
    ...props
  }: ComponentProps<typeof DayButtonComponent>) => {
    const ref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);

    const key = dateKey(day.date);
    const dayEvents = eventsByDate[key] || [];
    const visibleEvents = dayEvents.slice(0, 2);
    const extraCount = dayEvents.length - visibleEvents.length;

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="default"
        data-day={day.date.toLocaleDateString()}
        data-selected-single={
          modifiers.selected &&
          !modifiers.range_start &&
          !modifiers.range_end &&
          !modifiers.range_middle
        }
        data-range-start={modifiers.range_start}
        data-range-end={modifiers.range_end}
        data-range-middle={modifiers.range_middle}
        className={cn(
          "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex h-full w-full min-h-0 min-w-0 flex-col items-start justify-start gap-1 rounded-none px-2 py-2 text-left leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] overflow-hidden",
          className
        )}
        {...props}
      >
        <span className="text-xs font-semibold text-foreground flex-shrink-0">
          {day.date.getDate()}
        </span>
        {visibleEvents.length > 0 && (
          <div className="flex w-full flex-1 min-h-0 flex-col gap-1 overflow-hidden">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium',
                  typeChips[event.type]
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', typeDots[event.type])} />
                <span className="truncate">{event.title}</span>
              </div>
            ))}
            {extraCount > 0 && (
              <span className="text-[10px] text-muted-foreground">+{extraCount} more</span>
            )}
          </div>
        )}
      </Button>
    );
  };

  const getEventsForDate = (date: Date) =>
    events
      .filter((event) => isSameDay(event.start, date))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  const getEventsForSlot = (date: Date, hour: number) =>
    getEventsForDate(date).filter((event) => event.start.getHours() === hour);

  const formatHour = (hour: number) => format(new Date(2024, 0, 1, hour), 'ha');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View meetings, bookings, and platform events in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
              onClick={() => openCreateDialog('meeting')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Set Meeting
            </Button>
            <Button variant="outline" onClick={() => openCreateDialog('event')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-border px-1">
            <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold px-2">{currentLabel}</span>
            <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearSelect}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {viewOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={view === option.value ? 'default' : 'ghost'}
                onClick={() => setView(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditEvent(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editType === 'meeting' ? 'Edit Meeting' : 'Edit Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input
                placeholder="Event title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Select
                  value={editType}
                  onValueChange={(value) => setEditType(value as CalendarEventType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editType === 'meeting' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Meeting Mode</Label>
                  <Select
                    value={editMeetingMode}
                    onValueChange={(value) => setEditMeetingMode(value as MeetingMode)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="physical">Physical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Date</Label>
              <Calendar
                mode="single"
                selected={editDate}
                onSelect={setEditDate}
                className="rounded-md border mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Time</Label>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">End Time</Label>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>
            {editType === 'meeting' && editMeetingMode === 'virtual' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Meeting Link</Label>
                <Input
                  placeholder="https://"
                  value={editMeetingLink}
                  onChange={(e) => setEditMeetingLink(e.target.value)}
                />
              </div>
            )}
            {(editType !== 'meeting' || editMeetingMode === 'physical') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location</Label>
                <Input
                  placeholder="Optional"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                onClick={handleSaveEdit}
                disabled={!editTitle || !editDate}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{createMode === 'meeting' ? 'Set Meeting' : 'Add Event'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <Input
                  placeholder={createMode === 'meeting' ? 'Meeting title' : 'Event title'}
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <Select
                    value={newEventType}
                    onValueChange={(value) => setNewEventType(value as CalendarEventType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newEventType === 'meeting' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Meeting Mode</Label>
                    <Select
                      value={newMeetingMode}
                      onValueChange={(value) => setNewMeetingMode(value as MeetingMode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="physical">Physical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Date</Label>
                <Calendar
                  mode="single"
                  selected={newEventDate}
                  onSelect={setNewEventDate}
                  className="rounded-md border mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Time</Label>
                  <Input
                    type="time"
                    value={newEventEndTime}
                    onChange={(e) => setNewEventEndTime(e.target.value)}
                  />
                </div>
              </div>
              {newEventType === 'meeting' && newMeetingMode === 'virtual' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Meeting Link</Label>
                  <Input
                    placeholder="https://"
                    value={newMeetingLink}
                    onChange={(e) => setNewMeetingLink(e.target.value)}
                  />
                </div>
              )}
              {(newEventType !== 'meeting' || newMeetingMode === 'physical') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Location</Label>
                  <Input
                    placeholder="Optional"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                  />
                </div>
              )}
              <Button
                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                onClick={handleAddEvent}
                disabled={!newEventTitle || !newEventDate}
              >
                {newEventType === 'meeting' ? 'Save Meeting' : 'Save Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {viewOptions.find((option) => option.value === view)?.label} View
            </CardTitle>
            <CardDescription>
              Click a day to see the full schedule and create meetings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {view === 'month' && (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                month={currentDate}
                numberOfMonths={1}
                className="w-full h-full [--cell-size:--spacing(16)]"
                classNames={{
                  root: 'w-full h-full flex flex-col',
                  months: 'w-full h-full',
                  month: 'w-full h-full flex flex-col',
                  table: 'w-full h-full flex flex-col',
                  month_caption: 'flex items-center justify-center h-(--cell-size)',
                  weekdays: 'grid w-full grid-cols-7 border-b border-border/40 pb-2',
                  weekday:
                    'text-xs font-medium uppercase tracking-wide text-muted-foreground text-left pl-2',
                  weeks: 'flex flex-col flex-1',
                  week: 'grid grid-cols-7 w-full flex-1',
                  day: 'relative w-full p-0 text-left h-full min-h-0 border-border/40 border-b border-r last:border-r-0 overflow-hidden',
                }}
                modifiers={{ hasEvents: daysWithEvents }}
                components={{ DayButton }}
              />
            )}
            {view === 'week' && (
              <div className="overflow-auto">
                <div className="grid grid-cols-[80px_repeat(7,minmax(140px,1fr))] gap-px bg-border/40 rounded-lg overflow-hidden">
                  <div className="bg-background p-2 text-xs font-medium text-muted-foreground">Time</div>
                  {weekDays.map((day) => (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day);
                        setCurrentDate(day);
                        setView('day');
                      }}
                      className="bg-background p-2 text-left hover:bg-muted"
                    >
                      <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                      <p className="text-sm font-semibold">{format(day, 'MMM d')}</p>
                    </button>
                  ))}
                  {timeSlots.map((hour) => (
                    <div key={`row-${hour}`} className="contents">
                      <div className="bg-background p-2 text-xs text-muted-foreground">
                        {formatHour(hour)}
                      </div>
                      {weekDays.map((day) => {
                        const slotEvents = getEventsForSlot(day, hour);
                        return (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className="bg-background p-2 min-h-[90px] border-l border-border/40"
                          >
                            {slotEvents.map((event) => (
                              <button
                                type="button"
                                onClick={() => openEditDialog(event)}
                                key={event.id}
                                className={cn(
                                  'rounded-md border border-border/60 px-2 py-1 text-xs mb-1 text-left w-full',
                                  typeChips[event.type]
                                )}
                              >
                                <p className="font-semibold truncate">{event.title}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {event.timeLabel}
                                </p>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'day' && (
              <div className="grid grid-cols-[80px_1fr] gap-px bg-border/40 rounded-lg overflow-hidden">
                {timeSlots.map((hour) => {
                  const slotEvents = selectedDate ? getEventsForSlot(selectedDate, hour) : [];
                  return (
                    <div key={`day-${hour}`} className="contents">
                      <div className="bg-background p-2 text-xs text-muted-foreground">
                        {formatHour(hour)}
                      </div>
                      <div className="bg-background p-3 min-h-[90px]">
                        {slotEvents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No meetings</p>
                        ) : (
                          slotEvents.map((event) => (
                            <button
                              type="button"
                              onClick={() => openEditDialog(event)}
                              key={event.id}
                              className={cn(
                                'rounded-md border border-border/60 px-2 py-1 text-xs mb-2 text-left w-full',
                                typeChips[event.type]
                              )}
                            >
                              <p className="font-semibold">{event.title}</p>
                              <p className="text-[10px] text-muted-foreground">{event.timeLabel}</p>
                              {event.meetingMode && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  {event.meetingMode === 'virtual' ? (
                                    <Video className="w-3 h-3" />
                                  ) : (
                                    <MapPin className="w-3 h-3" />
                                  )}
                                  <span>{event.meetingMode === 'virtual' ? 'Virtual' : 'Physical'}</span>
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {view === 'year' && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {yearMonths.map((month) => (
                  <button
                    key={month.toISOString()}
                    type="button"
                    onClick={() => {
                      setCurrentDate(month);
                      setSelectedDate(month);
                      setView('month');
                    }}
                    className="rounded-lg border border-border/60 p-4 text-left hover:border-primary/60 transition"
                  >
                    <p className="text-sm font-semibold">{format(month, 'MMMM')}</p>
                    <p className="text-xs text-muted-foreground">{format(month, 'yyyy')}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {notice && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between gap-3 ${
                notice.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : notice.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              <span>{notice.message}</span>
              <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Agenda
              </CardTitle>
              <CardDescription>
                {selectedDate ? format(selectedDate, 'PPPP') : 'Pick a date'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled.</p>
              ) : (
                selectedDayEvents.map((event) => {
                  const Icon = typeIcons[event.type];
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{event.title}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {typeLabels[event.type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{event.timeLabel}</p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground">{event.location}</p>
                        )}
                      {event.meetingMode && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          {event.meetingMode === 'virtual' ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <MapPin className="w-3 h-3" />
                          )}
                          <span>
                            {event.meetingMode === 'virtual' ? 'Virtual meeting' : 'Physical meeting'}
                          </span>
                          {event.meetingLink && (
                            <span className="text-primary">Link available</span>
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                        onClick={() => openEditDialog(event)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Upcoming
              </CardTitle>
              <CardDescription>Next events across the platform</CardDescription>
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
                        <Badge variant="outline" className="text-[10px]">
                          {event.source}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(event.start, 'MMM d')} - {event.timeLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpcomingAction(event)}
                        >
                          {event.type === 'booking' ? 'Book' : 'Add to calendar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(event)}
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => focusDate(event.start)}
                        >
                          View day
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Calendar Sync
              </CardTitle>
              <CardDescription>Connect Google or Microsoft calendars</CardDescription>
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
                    onClick={() => toggleIntegration(integration.id)}
                  >
                    {integration.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />
    </div>
  );
};

export default CalendarPage;
