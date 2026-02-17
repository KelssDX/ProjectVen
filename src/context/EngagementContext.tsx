import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type EngagementKey = 'liked' | 'loved' | 'shared' | 'reposted' | 'interested';

interface EngagementState {
  liked: string[];
  loved: string[];
  shared: string[];
  reposted: string[];
  interested: string[];
}

interface EngagementContextValue {
  state: EngagementState;
  toggleLike: (id: string) => void;
  toggleLove: (id: string) => void;
  toggleShare: (id: string) => void;
  toggleRepost: (id: string) => void;
  toggleInterest: (id: string) => void;
  isLiked: (id: string) => boolean;
  isLoved: (id: string) => boolean;
  isShared: (id: string) => boolean;
  isReposted: (id: string) => boolean;
  isInterested: (id: string) => boolean;
}

const defaultState: EngagementState = {
  liked: [],
  loved: [],
  shared: [],
  reposted: [],
  interested: [],
};

const STORAGE_KEY = 'vendrom-engagement';

const EngagementContext = createContext<EngagementContextValue | undefined>(undefined);

const loadState = (): EngagementState => {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as EngagementState;
    return {
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      loved: Array.isArray(parsed.loved) ? parsed.loved : [],
      shared: Array.isArray(parsed.shared) ? parsed.shared : [],
      reposted: Array.isArray(parsed.reposted) ? parsed.reposted : [],
      interested: Array.isArray(parsed.interested) ? parsed.interested : [],
    };
  } catch {
    return defaultState;
  }
};

export const EngagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EngagementState>(() => loadState());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggle = (key: EngagementKey, id: string) => {
    setState((prev) => {
      const set = new Set(prev[key]);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return { ...prev, [key]: Array.from(set) };
    });
  };

  const value = useMemo<EngagementContextValue>(() => {
    const has = (key: EngagementKey, id: string) => state[key].includes(id);
    return {
      state,
      toggleLike: (id) => toggle('liked', id),
      toggleLove: (id) => toggle('loved', id),
      toggleShare: (id) => toggle('shared', id),
      toggleRepost: (id) => toggle('reposted', id),
      toggleInterest: (id) => toggle('interested', id),
      isLiked: (id) => has('liked', id),
      isLoved: (id) => has('loved', id),
      isShared: (id) => has('shared', id),
      isReposted: (id) => has('reposted', id),
      isInterested: (id) => has('interested', id),
    };
  }, [state]);

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
};

export const useEngagement = () => {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error('useEngagement must be used within an EngagementProvider');
  }
  return context;
};
