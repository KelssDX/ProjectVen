import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { postsApi, type BookmarkDto } from '@/api/posts';

const USE_REAL_FEED = import.meta.env.VITE_FEATURE_USE_REAL_FEED === 'true';

export type BookmarkCategory =
  | 'all'
  | 'business'
  | 'networking'
  | 'investment'
  | 'mentorship'
  | 'marketing'
  | 'news'
  | 'resources'
  | 'inspiration';

export interface Bookmark {
  id: string;
  sourceId?: string;
  title: string;
  description?: string;
  url?: string;
  type: 'post' | 'profile' | 'article' | 'resource' | 'opportunity';
  category: BookmarkCategory;
  tags: string[];
  imageUrl?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: Date;
  savedAt: Date;
}

interface BookmarkContextType {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'savedAt'>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  getBookmarksByCategory: (category: BookmarkCategory) => Bookmark[];
  getBookmarksByTag: (tag: string) => Bookmark[];
  searchBookmarks: (query: string) => Bookmark[];
  categories: { value: BookmarkCategory; label: string; icon: string }[];
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const defaultCategories = [
  { value: 'all' as BookmarkCategory, label: 'All Bookmarks', icon: 'Bookmark' },
  { value: 'business' as BookmarkCategory, label: 'Business', icon: 'Briefcase' },
  { value: 'networking' as BookmarkCategory, label: 'Networking', icon: 'Users' },
  { value: 'investment' as BookmarkCategory, label: 'Investment', icon: 'TrendingUp' },
  { value: 'mentorship' as BookmarkCategory, label: 'Mentorship', icon: 'GraduationCap' },
  { value: 'marketing' as BookmarkCategory, label: 'Marketing', icon: 'Megaphone' },
  { value: 'news' as BookmarkCategory, label: 'Industry News', icon: 'Newspaper' },
  { value: 'resources' as BookmarkCategory, label: 'Resources', icon: 'FolderOpen' },
  { value: 'inspiration' as BookmarkCategory, label: 'Inspiration', icon: 'Sparkles' },
];

const sampleBookmarks: Bookmark[] = [
  {
    id: '1',
    title: '10 Growth Strategies for SMEs in 2024',
    description: 'Essential strategies to scale your business effectively',
    type: 'article',
    category: 'business',
    tags: ['growth', 'strategy', 'sme'],
    authorName: 'Sarah Johnson',
    authorAvatar: '/avatar-1.jpg',
    createdAt: new Date('2024-01-15'),
    savedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    title: 'TechStart Inc. - Series A Funding',
    description: 'Looking for investors in the AI space',
    type: 'opportunity',
    category: 'investment',
    tags: ['funding', 'ai', 'startup'],
    authorName: 'Michael Chen',
    authorAvatar: '/avatar-2.jpg',
    createdAt: new Date('2024-01-18'),
    savedAt: new Date('2024-01-19'),
  },
  {
    id: '3',
    title: 'How to Build a Strong Network',
    description: 'Networking tips from industry experts',
    type: 'article',
    category: 'networking',
    tags: ['networking', 'tips', 'connections'],
    authorName: 'Emily Rodriguez',
    authorAvatar: '/avatar-3.jpg',
    createdAt: new Date('2024-01-10'),
    savedAt: new Date('2024-01-16'),
  },
];

function mapApiBookmark(bookmark: BookmarkDto): Bookmark {
  return {
    id: bookmark.id,
    sourceId: bookmark.sourceId ?? undefined,
    title: bookmark.title,
    description: bookmark.description ?? undefined,
    url: bookmark.url ?? undefined,
    type: bookmark.type,
    category: bookmark.category,
    tags: bookmark.tags,
    imageUrl: bookmark.imageUrl ?? undefined,
    authorName: bookmark.authorName ?? undefined,
    authorAvatar: bookmark.authorAvatar ?? undefined,
    createdAt: new Date(bookmark.createdAt),
    savedAt: new Date(bookmark.savedAt),
  };
}

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(USE_REAL_FEED ? [] : sampleBookmarks);

  const loadBookmarks = useCallback(async () => {
    if (!USE_REAL_FEED) return;

    try {
      const { data } = await postsApi.getBookmarks({ limit: 200 });
      setBookmarks(data.items.map(mapApiBookmark));
    } catch (error) {
      console.error('Failed to load bookmarks from API:', error);
      setBookmarks([]);
    }
  }, []);

  useEffect(() => {
    if (!USE_REAL_FEED) return;
    void loadBookmarks();
  }, [loadBookmarks]);

  const addBookmark = useCallback(
    (bookmark: Omit<Bookmark, 'id' | 'savedAt'>) => {
      if (USE_REAL_FEED && bookmark.type === 'post' && bookmark.sourceId) {
        const sourceId = bookmark.sourceId;
        const existing = bookmarks.some((item) => item.id === sourceId || item.sourceId === sourceId);
        if (existing) {
          return;
        }

        void (async () => {
          try {
            await postsApi.toggleBookmark(sourceId);
            await loadBookmarks();
          } catch (error) {
            console.error('Failed to add bookmark via API:', error);
          }
        })();
        return;
      }

      const newBookmark: Bookmark = {
        ...bookmark,
        id: Math.random().toString(36).slice(2, 11),
        savedAt: new Date(),
      };
      setBookmarks((prev) => [newBookmark, ...prev]);
    },
    [bookmarks, loadBookmarks],
  );

  const removeBookmark = useCallback(
    (id: string) => {
      const matched = bookmarks.find((bookmark) => bookmark.id === id || bookmark.sourceId === id);
      if (!matched) {
        return;
      }

      setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id && bookmark.sourceId !== id));

      if (!USE_REAL_FEED) {
        return;
      }

      void (async () => {
        try {
          await postsApi.deleteBookmark(matched.id);
        } catch (error) {
          console.error('Failed to remove bookmark via API:', error);
          await loadBookmarks();
        }
      })();
    },
    [bookmarks, loadBookmarks],
  );

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((bookmark) => bookmark.id === id || bookmark.sourceId === id),
    [bookmarks],
  );

  const getBookmarksByCategory = useCallback(
    (category: BookmarkCategory) => {
      if (category === 'all') return bookmarks;
      return bookmarks.filter((bookmark) => bookmark.category === category);
    },
    [bookmarks],
  );

  const getBookmarksByTag = useCallback(
    (tag: string) => bookmarks.filter((bookmark) => bookmark.tags.includes(tag.toLowerCase())),
    [bookmarks],
  );

  const searchBookmarks = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      return bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(lowerQuery) ||
          bookmark.description?.toLowerCase().includes(lowerQuery) ||
          bookmark.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          bookmark.authorName?.toLowerCase().includes(lowerQuery),
      );
    },
    [bookmarks],
  );

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        addBookmark,
        removeBookmark,
        isBookmarked,
        getBookmarksByCategory,
        getBookmarksByTag,
        searchBookmarks,
        categories: defaultCategories,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};
