import React, { createContext, useCallback, useContext, useState } from 'react';

interface CalendarPanelContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const CalendarPanelContext = createContext<CalendarPanelContextValue | undefined>(undefined);

export const CalendarPanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <CalendarPanelContext.Provider value={{ isOpen, openPanel, closePanel, togglePanel }}>
      {children}
    </CalendarPanelContext.Provider>
  );
};

export const useCalendarPanel = () => {
  const context = useContext(CalendarPanelContext);
  if (!context) {
    return {
      isOpen: false,
      openPanel: () => undefined,
      closePanel: () => undefined,
      togglePanel: () => undefined,
    };
  }
  return context;
};
