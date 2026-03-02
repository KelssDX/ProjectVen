import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { postsApi, type PostDto } from '@/api/posts';

const USE_REAL_FEED = import.meta.env.VITE_FEATURE_USE_REAL_FEED === 'true';
const STORAGE_KEY = 'vendrom-engagement';

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
  toggleLike: (id: string) => Promise<void>;
  toggleLove: (id: string) => Promise<void>;
  toggleShare: (id: string) => Promise<void>;
  toggleRepost: (id: string) => Promise<void>;
  toggleInterest: (id: string) => Promise<void>;
  refreshFromApi: () => Promise<void>;
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

function buildStateFromPosts(posts: PostDto[]): EngagementState {
  const next: EngagementState = {
    liked: [],
    loved: [],
    shared: [],
    reposted: [],
    interested: [],
  };

  for (const post of posts) {
    if (post.isLiked) next.liked.push(post.id);
    if (post.isLoved) next.loved.push(post.id);
    if (post.isShared) next.shared.push(post.id);
    if (post.isReposted) next.reposted.push(post.id);
    if (post.isInterested) next.interested.push(post.id);
  }

  return next;
}

export const EngagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EngagementState>(() => (USE_REAL_FEED ? defaultState : loadState()));

  const toggleLocal = useCallback((key: EngagementKey, id: string) => {
    setState((previousState) => {
      const values = new Set(previousState[key]);
      if (values.has(id)) {
        values.delete(id);
      } else {
        values.add(id);
      }
      return { ...previousState, [key]: Array.from(values) };
    });
  }, []);

  const applyRemoteToggle = useCallback((key: EngagementKey, id: string, isActive: boolean) => {
    setState((previousState) => {
      const values = new Set(previousState[key]);
      if (isActive) {
        values.add(id);
      } else {
        values.delete(id);
      }
      return { ...previousState, [key]: Array.from(values) };
    });
  }, []);

  const refreshFromApi = useCallback(async () => {
    if (!USE_REAL_FEED) return;

    try {
      const { data } = await postsApi.getFeed({ limit: 100 });
      setState(buildStateFromPosts(data.items));
    } catch (error) {
      console.error('Failed to refresh engagement from API:', error);
    }
  }, []);

  useEffect(() => {
    if (!USE_REAL_FEED) return;
    void refreshFromApi();
  }, [refreshFromApi]);

  useEffect(() => {
    if (USE_REAL_FEED || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleLike = useCallback(
    async (id: string) => {
      if (USE_REAL_FEED) {
        try {
          const { data } = await postsApi.toggleReaction({ postId: id, reaction: 'like' });
          applyRemoteToggle('liked', id, data.isActive);
          return;
        } catch (error) {
          console.error('Failed to toggle like via API:', error);
        }
      }
      toggleLocal('liked', id);
    },
    [applyRemoteToggle, toggleLocal],
  );

  const toggleLove = useCallback(
    async (id: string) => {
      if (USE_REAL_FEED) {
        try {
          const { data } = await postsApi.toggleReaction({ postId: id, reaction: 'love' });
          applyRemoteToggle('loved', id, data.isActive);
          return;
        } catch (error) {
          console.error('Failed to toggle love via API:', error);
        }
      }
      toggleLocal('loved', id);
    },
    [applyRemoteToggle, toggleLocal],
  );

  const toggleShare = useCallback(
    async (id: string) => {
      if (USE_REAL_FEED) {
        try {
          const { data } = await postsApi.toggleShare(id);
          applyRemoteToggle('shared', id, data.isShared);
          return;
        } catch (error) {
          console.error('Failed to toggle share via API:', error);
        }
      }
      toggleLocal('shared', id);
    },
    [applyRemoteToggle, toggleLocal],
  );

  const toggleRepost = useCallback(
    async (id: string) => {
      if (USE_REAL_FEED) {
        try {
          const { data } = await postsApi.toggleRepost(id);
          applyRemoteToggle('reposted', id, data.isReposted);
          return;
        } catch (error) {
          console.error('Failed to toggle repost via API:', error);
        }
      }
      toggleLocal('reposted', id);
    },
    [applyRemoteToggle, toggleLocal],
  );

  const toggleInterest = useCallback(
    async (id: string) => {
      if (USE_REAL_FEED) {
        try {
          const { data } = await postsApi.toggleReaction({ postId: id, reaction: 'interest' });
          applyRemoteToggle('interested', id, data.isActive);
          return;
        } catch (error) {
          console.error('Failed to toggle interest via API:', error);
        }
      }
      toggleLocal('interested', id);
    },
    [applyRemoteToggle, toggleLocal],
  );

  const value = useMemo<EngagementContextValue>(() => {
    const has = (key: EngagementKey, id: string) => state[key].includes(id);
    return {
      state,
      toggleLike,
      toggleLove,
      toggleShare,
      toggleRepost,
      toggleInterest,
      refreshFromApi,
      isLiked: (id) => has('liked', id),
      isLoved: (id) => has('loved', id),
      isShared: (id) => has('shared', id),
      isReposted: (id) => has('reposted', id),
      isInterested: (id) => has('interested', id),
    };
  }, [refreshFromApi, state, toggleInterest, toggleLike, toggleLove, toggleRepost, toggleShare]);

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
};

export const useEngagement = () => {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error('useEngagement must be used within an EngagementProvider');
  }
  return context;
};
