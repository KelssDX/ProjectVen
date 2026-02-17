import React, { createContext, useContext, useState, useCallback } from 'react';

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

// Sample bookmarks data
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

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(sampleBookmarks);

  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'id' | 'savedAt'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: Math.random().toString(36).substr(2, 9),
      savedAt: new Date(),
    };
    setBookmarks((prev) => [newBookmark, ...prev]);
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id && b.sourceId !== id));
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return bookmarks.some((b) => b.id === id || b.sourceId === id);
  }, [bookmarks]);

  const getBookmarksByCategory = useCallback((category: BookmarkCategory) => {
    if (category === 'all') return bookmarks;
    return bookmarks.filter((b) => b.category === category);
  }, [bookmarks]);

  const getBookmarksByTag = useCallback((tag: string) => {
    return bookmarks.filter((b) => b.tags.includes(tag.toLowerCase()));
  }, [bookmarks]);

  const searchBookmarks = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(lowerQuery) ||
        b.description?.toLowerCase().includes(lowerQuery) ||
        b.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        b.authorName?.toLowerCase().includes(lowerQuery)
    );
  }, [bookmarks]);

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
