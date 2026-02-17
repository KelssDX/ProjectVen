import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bookmark, 
  Search, 
  Filter, 
  Trash2, 
  ExternalLink,
  FolderOpen,
  Briefcase,
  Users,
  TrendingUp,
  GraduationCap,
  Megaphone,
  Newspaper,
  Sparkles,
  Tag,
  MoreVertical
} from 'lucide-react';
import { useBookmarks, type BookmarkCategory } from '@/context/BookmarkContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const categoryIcons: Record<BookmarkCategory, React.ElementType> = {
  all: Bookmark,
  business: Briefcase,
  networking: Users,
  investment: TrendingUp,
  mentorship: GraduationCap,
  marketing: Megaphone,
  news: Newspaper,
  resources: FolderOpen,
  inspiration: Sparkles,
};

const Bookmarks = () => {
  const { 
    bookmarks, 
    categories, 
    removeBookmark, 
    getBookmarksByCategory, 
    searchBookmarks 
  } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<BookmarkCategory>('all');

  const filteredBookmarks = searchQuery 
    ? searchBookmarks(searchQuery)
    : activeCategory === 'all' 
      ? bookmarks 
      : getBookmarksByCategory(activeCategory);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <div className="w-2 h-2 rounded-full bg-blue-500" />;
      case 'profile': return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case 'article': return <div className="w-2 h-2 rounded-full bg-purple-500" />;
      case 'resource': return <div className="w-2 h-2 rounded-full bg-amber-500" />;
      case 'opportunity': return <div className="w-2 h-2 rounded-full bg-red-500" />;
      default: return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Bookmarks</h1>
          <p className="text-muted-foreground mt-1">
            {bookmarks.length} saved items across {categories.length - 1} categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as BookmarkCategory)}>
        <TabsList className="flex flex-wrap h-auto gap-2">
          {categories.map((category) => {
            const Icon = categoryIcons[category.value];
            const count = category.value === 'all' 
              ? bookmarks.length 
              : bookmarks.filter(b => b.category === category.value).length;
            return (
              <TabsTrigger 
                key={category.value} 
                value={category.value}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredBookmarks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No bookmarks found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery 
                    ? 'Try a different search term' 
                    : 'Start saving items by clicking the bookmark icon'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredBookmarks.map((bookmark) => {
                const CategoryIcon = categoryIcons[bookmark.category];
                return (
                  <Card key={bookmark.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Type Indicator */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                          {getTypeIcon(bookmark.type)}
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {getTypeLabel(bookmark.type)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {bookmark.title}
                              </h3>
                              {bookmark.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {bookmark.description}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => removeBookmark(bookmark.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            {/* Category */}
                            <Badge variant="outline" className="flex items-center gap-1">
                              <CategoryIcon className="w-3 h-3" />
                              {categories.find(c => c.value === bookmark.category)?.label}
                            </Badge>

                            {/* Tags */}
                            {bookmark.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}

                            {/* Author */}
                            {bookmark.authorName && (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={bookmark.authorAvatar} />
                                  <AvatarFallback className="text-[10px]">
                                    {bookmark.authorName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">
                                  {bookmark.authorName}
                                </span>
                              </div>
                            )}

                            {/* Date */}
                            <span className="text-xs text-muted-foreground ml-auto">
                              Saved {new Date(bookmark.savedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {bookmark.url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Bookmarks;
