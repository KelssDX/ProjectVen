import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import CalendarPanel from '@/components/dashboard/CalendarPanel';
import { cn } from '@/lib/utils';

interface CalendarPanelDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  overlayClassName?: string;
}

const CalendarPanelDrawer = ({
  open,
  onClose,
  title = 'Calendar',
  className,
  overlayClassName,
}: CalendarPanelDrawerProps) => {
  if (!open) return null;

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-black/30 lg:hidden', overlayClassName)}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-16 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-xl flex flex-col',
          className
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close calendar panel">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CalendarPanel />
        </div>
      </aside>
    </>
  );
};

export default CalendarPanelDrawer;
