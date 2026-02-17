import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useBookmarks, type BookmarkCategory } from '@/context/BookmarkContext';
import { useCalendarPanel } from '@/context/CalendarPanelContext';
import { useEngagement } from '@/context/EngagementContext';
import { mockPosts, mockComments, postTypeConfig } from '@/data/mockPosts';
import type { Post, PostType, Comment } from '@/types';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Send,
  Image as ImageIcon,
  Video,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  Briefcase,
  Lightbulb,
  Tag,
  MessageSquare,
  Clock,
  ShoppingCart,
  Calendar,
  CheckCircle,
  Bookmark,
  ExternalLink,
  Search,
  Plus,
  Filter,
  Hash,
  User,
  Quote,
  Flame,
  Megaphone,
  Newspaper,
  Trophy,
  Briefcase as BriefcaseIcon,
  Sparkles,
  Repeat2,
  Star,
  Rocket,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TheHub = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [activeTab, setActiveTab] = useState<'my-feed' | 'explore' | 'search'>('explore');
  const [searchTab, setSearchTab] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { openPanel } = useCalendarPanel();
  const {
    state: engagementState,
    isLiked,
    isInterested,
    isShared,
    isReposted,
    toggleLike,
    toggleInterest,
    toggleShare,
    toggleRepost,
  } = useEngagement();

  const interestedIds = useMemo(
    () => new Set(engagementState.interested),
    [engagementState.interested]
  );

  const interestedTypes = useMemo(() => {
    const types = new Set<PostType>();
    posts.forEach((post) => {
      if (interestedIds.has(post.id)) {
        types.add(post.type);
      }
    });
    return types;
  }, [posts, interestedIds]);

  const feedPosts = useMemo(() => {
    const list = [...posts];
    list.sort((a, b) => {
      const scoreA =
        (interestedIds.has(a.id) ? 3 : 0) + (interestedTypes.has(a.type) ? 1 : 0);
      const scoreB =
        (interestedIds.has(b.id) ? 3 : 0) + (interestedTypes.has(b.type) ? 1 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    return list;
  }, [posts, interestedIds, interestedTypes]);

  const connectedAuthorIds = useMemo(() => ['2', '3', '5', '7'], []);

  const followingPosts = useMemo(
    () => posts.filter((post) => connectedAuthorIds.includes(post.author.id)),
    [posts, connectedAuthorIds]
  );

  const trendingPosts = useMemo(() => {
    const score = (post: Post) =>
      post.likes + post.comments + post.shares + (post.reposts ?? 0) + (post.interests ?? 0);
    return [...posts].sort((a, b) => score(b) - score(a)).slice(0, 3);
  }, [posts]);

  const explorePosts = useMemo(() => {
    const combined = [...trendingPosts, ...feedPosts];
    const seen = new Set<string>();
    return combined.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [feedPosts, trendingPosts]);

  const activeFeedPosts = activeTab === 'my-feed' ? followingPosts : explorePosts;

  const handleLike = (postId: string) => {
    const wasLiked = isLiked(postId);
    toggleLike(postId);
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, likes: Math.max(0, post.likes + (wasLiked ? -1 : 1)) }
          : post
      )
    );
  };

  const handleInterest = (postId: string) => {
    const wasInterested = isInterested(postId);
    toggleInterest(postId);
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              interests: Math.max(0, (post.interests ?? 0) + (wasInterested ? -1 : 1)),
            }
          : post
      )
    );
  };

  const handleShare = (post: Post) => {
    const wasShared = isShared(post.id);
    toggleShare(post.id);
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? {
              ...item,
              shares: Math.max(0, item.shares + (wasShared ? -1 : 1)),
            }
          : item
      )
    );
    setSharePost(post);
  };

  const handleRepost = (postId: string) => {
    const wasReposted = isReposted(postId);
    toggleRepost(postId);
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              reposts: Math.max(0, (post.reposts ?? 0) + (wasReposted ? -1 : 1)),
            }
          : post
      )
    );
  };

  const handleBookmarkToggle = (postId: string, wasBookmarked: boolean) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              bookmarks: Math.max(0, (post.bookmarks ?? 0) + (wasBookmarked ? -1 : 1)),
            }
          : post
      )
    );
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedPost) return;
    
    const comment: Comment = {
      id: String(Date.now()),
      postId: selectedPost.id,
      userId: user?.id || '',
      author: {
        name: `${user?.firstName} ${user?.lastName}`,
        avatar: user?.avatar,
      },
      content: newComment,
      likes: 0,
      createdAt: new Date(),
    };
    
    setComments([...comments, comment]);
    setNewComment('');
    
    setPosts(posts.map(p => 
      p.id === selectedPost.id 
        ? { ...p, comments: p.comments + 1 } 
        : p
    ));
  };

  const getPostComments = (postId: string) => {
    return comments.filter(c => c.postId === postId).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  };

  const getPostTypeIcon = (type: PostType) => {
    const icons: Record<string, React.ElementType> = {
      update: MessageSquare,
      product: Package,
      service: Briefcase,
      idea: Lightbulb,
      crowdfunding: TrendingUp,
      investment: DollarSign,
      mentorship: Users,
      promo: Tag,
    };
    return icons[type] || MessageSquare;
  };

  const getPostTypeColor = (type: PostType) => {
    return postTypeConfig[type]?.color || 'bg-gray-100 text-gray-700';
  };

  // Mock data for the sidebar
  const trendingTopics = [
    { tag: '#StartupFunding', posts: '2.4k' },
    { tag: '#AIInnovation', posts: '1.8k' },
    { tag: '#GreenEnergy', posts: '956' },
    { tag: '#RemoteWork', posts: '743' },
    { tag: '#VentureCapital', posts: '621' },
  ];

  const whoToFollow = [
    { name: 'Sarah Chen', company: 'TechVentures', avatar: '/avatar-1.jpg' },
    { name: 'Marcus Johnson', company: 'GrowthLabs', avatar: '/avatar-2.jpg' },
    { name: 'Emma Williams', company: 'InnovateCo', avatar: '/avatar-3.jpg' },
  ];

  const newsUpdates = [
    { type: 'news', title: 'Fed Announces New Interest Rate Decision', time: '2h ago', icon: Newspaper },
    { type: 'sports', title: 'Tech Giants Report Strong Q4 Earnings', time: '4h ago', icon: Trophy },
    { type: 'opportunity', title: 'New Grant Program for Green Startups', time: '6h ago', icon: Sparkles },
    { type: 'event', title: 'Vendrome Networking Summit - March 15', time: '1d ago', icon: Calendar },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Main Content - Posts Feed */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header with Create Post Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">The Hub</h2>
              <p className="text-gray-600 mt-1">
                Connect, share, and discover opportunities
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                  <Plus className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Post</DialogTitle>
                </DialogHeader>
                <CreatePostForm 
                  onClose={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Main Tabs: My Feed | Explore | Search */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-feed" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Feed
              </TabsTrigger>
              <TabsTrigger value="explore" className="flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Explorer
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </TabsTrigger>
            </TabsList>

            {/* My Feed Tab Content */}
            <TabsContent value="my-feed" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Filter className="w-3 h-3 mr-1" />
                  All
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Products
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Services
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Investment
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Mentorship
                </Button>
              </div>

              <div className="space-y-4">
                {activeFeedPosts.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Your feed is empty. Connect with people to see their updates here.
                    </CardContent>
                  </Card>
                ) : (
                  activeFeedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      isLiked={isLiked(post.id)}
                      isInterested={isInterested(post.id)}
                      isShared={isShared(post.id)}
                      isReposted={isReposted(post.id)}
                      onLike={() => handleLike(post.id)}
                      onInterest={() => handleInterest(post.id)}
                      onShare={() => handleShare(post)}
                      onRepost={() => handleRepost(post.id)}
                      onBookmarkToggle={(wasBookmarked) => handleBookmarkToggle(post.id, wasBookmarked)}
                      onCommentClick={() => setSelectedPost(post)}
                      getPostTypeIcon={getPostTypeIcon}
                      getPostTypeColor={getPostTypeColor}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Explorer Tab Content */}
            <TabsContent value="explore" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Filter className="w-3 h-3 mr-1" />
                  All
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Products
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Services
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Investment
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-gray-600">
                  Mentorship
                </Button>
              </div>

              <div className="space-y-4">
                {activeFeedPosts.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No posts found. Try updating your interests.
                    </CardContent>
                  </Card>
                ) : (
                  activeFeedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      isLiked={isLiked(post.id)}
                      isInterested={isInterested(post.id)}
                      isShared={isShared(post.id)}
                      isReposted={isReposted(post.id)}
                      onLike={() => handleLike(post.id)}
                      onInterest={() => handleInterest(post.id)}
                      onShare={() => handleShare(post)}
                      onRepost={() => handleRepost(post.id)}
                      onBookmarkToggle={(wasBookmarked) => handleBookmarkToggle(post.id, wasBookmarked)}
                      onCommentClick={() => setSelectedPost(post)}
                      getPostTypeIcon={getPostTypeIcon}
                      getPostTypeColor={getPostTypeColor}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Search Tab Content */}
            <TabsContent value="search" className="space-y-4 mt-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search hashtags, topics, profiles, or quotes..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Search Category Tabs */}
              <Tabs value={searchTab} onValueChange={setSearchTab}>
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="all" className="flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="hashtags" className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Hashtags
                  </TabsTrigger>
                  <TabsTrigger value="topics" className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Topics
                  </TabsTrigger>
                  <TabsTrigger value="profiles" className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Profiles
                  </TabsTrigger>
                  <TabsTrigger value="quotes" className="flex items-center gap-1">
                    <Quote className="w-3 h-3" />
                    Quotes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a search term to find content across The Hub</p>
                  </div>
                </TabsContent>

                <TabsContent value="hashtags" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {trendingTopics.map((topic) => (
                      <Card key={topic.tag} className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Hash className="w-5 h-5 text-[var(--brand-primary)]" />
                            <span className="font-medium">{topic.tag}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{topic.posts} posts</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="profiles" className="mt-4">
                  <div className="space-y-3">
                    {whoToFollow.map((profile) => (
                      <Card key={profile.name} className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={profile.avatar} />
                              <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                                {profile.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{profile.name}</p>
                              <p className="text-sm text-gray-500">{profile.company}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Follow</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          {/* Comments Dialog */}
          <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Comments ({selectedPost?.comments})</DialogTitle>
              </DialogHeader>
              
              {selectedPost && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedPost.author.avatar} />
                        <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                          {selectedPost.author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{selectedPost.author.name}</p>
                        <p className="text-sm text-gray-500">{selectedPost.author.company}</p>
                      </div>
                    </div>
                    <p className="text-gray-700">{selectedPost.content}</p>
                  </div>

                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {getPostComments(selectedPost.id).map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.author.avatar} />
                            <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
                              {comment.author.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-gray-100 rounded-lg p-3">
                              <p className="font-medium text-sm">{comment.author.name}</p>
                              <p className="text-gray-700">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
                              <button className="hover:text-[var(--brand-primary)]">
                                Like ({comment.likes})
                              </button>
                              <button className="hover:text-[var(--brand-primary)]">Reply</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment();
                      }}
                    />
                    <Button onClick={handleAddComment} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Share Dialog */}
          <Dialog open={!!sharePost} onOpenChange={(open) => !open && setSharePost(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share post</DialogTitle>
              </DialogHeader>
              {sharePost && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-sm font-semibold">{sharePost.author.name}</p>
                    <p className="text-xs text-muted-foreground">{sharePost.author.company}</p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sharePost.content}</p>
                  </div>
                  <div className="grid gap-2">
                    <Button className="w-full bg-[var(--brand-primary)]">
                      Share externally
                    </Button>
                    <Button variant="outline" className="w-full">
                      Send via message
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Trending Topics */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold">Trending Topics</h3>
              </div>
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <div key={topic.tag} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-400">{index + 1}</span>
                      <span className="text-sm font-medium hover:text-[var(--brand-primary)] cursor-pointer">
                        {topic.tag}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{topic.posts}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Who to Follow */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-4">Who to Follow</h3>
              <div className="space-y-4">
                {whoToFollow.map((profile) => (
                  <div key={profile.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile.avatar} />
                        <AvatarFallback className="bg-[var(--brand-primary)] text-white text-sm">
                          {profile.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{profile.name}</p>
                        <p className="text-xs text-gray-500">{profile.company}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Events, News & Opportunities Panel */}
          <Card className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-secondary)]/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
                <h3 className="font-bold">Discover</h3>
              </div>
              
              <div className="space-y-4">
                {/* News & Updates */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Newspaper className="w-3 h-3" />
                    Headlines
                  </h4>
                  <div className="space-y-2">
                    {newsUpdates.slice(0, 2).map((item, index) => (
                      <div key={index} className="bg-white/50 rounded-lg p-2 hover:bg-white/80 transition-colors cursor-pointer">
                        <div className="flex items-start gap-2">
                          <item.icon className="w-4 h-4 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Events */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Upcoming Events
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openPanel}
                      className="text-xs"
                    >
                      Add to calendar
                    </Button>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3 hover:bg-white/80 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">Vendrome Networking Summit</p>
                    <p className="text-xs text-gray-500 mt-1">March 15, 2026 - Virtual</p>
                  </div>
                </div>

                {/* Opportunities */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BriefcaseIcon className="w-3 h-3" />
                    Opportunities
                  </h4>
                  <div className="bg-emerald-50 rounded-lg p-3 hover:bg-emerald-100 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-emerald-800">$50K Grant for Green Startups</p>
                    <p className="text-xs text-emerald-600 mt-1">Apply by Feb 28</p>
                  </div>
                </div>

                {/* Sponsored */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    Sponsored
                  </h4>
                  <div className="bg-white/50 rounded-lg p-3 hover:bg-white/80 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">Scale with Cloud Solutions</p>
                    <p className="text-xs text-gray-500">TechCloud Pro</p>
                  </div>
                </div>

                {/* Sports Scores */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Sports
                  </h4>
                  <div className="bg-white/50 rounded-lg p-2">
                    <p className="text-xs text-gray-600">NBA: Lakers 112 - Warriors 108</p>
                    <p className="text-xs text-gray-500">Final</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  isInterested: boolean;
  isShared: boolean;
  isReposted: boolean;
  onLike: () => void;
  onInterest: () => void;
  onShare: () => void;
  onRepost: () => void;
  onBookmarkToggle: (wasBookmarked: boolean) => void;
  onCommentClick: () => void;
  getPostTypeIcon: (type: PostType) => React.ElementType;
  getPostTypeColor: (type: PostType) => string;
}

const PostCard = ({
  post,
  isLiked,
  isInterested,
  isShared,
  isReposted,
  onLike,
  onInterest,
  onShare,
  onRepost,
  onBookmarkToggle,
  onCommentClick,
  getPostTypeIcon,
  getPostTypeColor,
}: PostCardProps) => {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const TypeIcon = getPostTypeIcon(post.type);
  const typeConfig = postTypeConfig[post.type];
  const bookmarked = isBookmarked(post.id);

  const getBookmarkCategory = (type: PostType): BookmarkCategory => {
    switch (type) {
      case 'product':
      case 'service':
        return 'business';
      case 'idea':
        return 'inspiration';
      case 'crowdfunding':
      case 'investment':
        return 'investment';
      case 'mentorship':
        return 'mentorship';
      case 'promo':
        return 'marketing';
      default:
        return 'networking';
    }
  };

  const handleBookmarkToggle = () => {
    const wasBookmarked = bookmarked;
    if (bookmarked) {
      removeBookmark(post.id);
      onBookmarkToggle(wasBookmarked);
      return;
    }

    const title = post.product?.name || post.service?.name || post.content.split('\n')[0];

    addBookmark({
      title,
      description: post.content,
      type: 'post',
      category: getBookmarkCategory(post.type),
      tags: [post.type],
      imageUrl: post.media?.[0]?.url,
      authorName: post.author.name,
      authorAvatar: post.author.avatar,
      createdAt: post.createdAt,
      url: '/dashboard/feed',
      sourceId: post.id,
    });

    onBookmarkToggle(wasBookmarked);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                {post.author.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{post.author.name}</h4>
                <Badge className={getPostTypeColor(post.type)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig?.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{post.author.company}</p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(post.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBookmarkToggle}
              className={bookmarked ? 'text-[var(--brand-primary)]' : 'text-gray-500'}
              aria-label={bookmarked ? 'Remove bookmark' : 'Save post'}
            >
              <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBookmarkToggle}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  {bookmarked ? 'Remove Bookmark' : 'Save Post'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {post.media.map((m, i) => (
              <img
                key={i}
                src={m.url}
                alt="Post media"
                className="rounded-lg w-full h-48 object-cover"
              />
            ))}
          </div>
        )}

        {/* Product Card */}
        {post.product && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-semibold">{post.product.name}</h5>
                <p className="text-sm text-gray-500">{post.product.description}</p>
                <Badge variant="outline" className="mt-2">{post.product.category}</Badge>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[var(--brand-primary)]">
                  ${post.product.price}
                </p>
                <p className="text-xs text-gray-500">{post.product.currency}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="flex-1 bg-[var(--brand-primary)]">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Order Now
              </Button>
              <Button size="sm" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        )}

        {/* Service Card */}
        {post.service && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-semibold">{post.service.name}</h5>
                <p className="text-sm text-gray-500">{post.service.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{post.service.category}</Badge>
                  <Badge variant="secondary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {post.service.availability === 'immediate' ? 'Available Now' : post.service.availability}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[var(--brand-primary)]">
                  ${post.service.price}
                </p>
                <p className="text-xs text-gray-500">/{post.service.priceType}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="flex-1 bg-[var(--brand-primary)]">
                <Calendar className="w-4 h-4 mr-2" />
                Book Now
              </Button>
              <Button size="sm" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        )}

        {/* Crowdfunding Card */}
        {post.crowdfunding && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 mb-4 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Target</p>
                <p className="text-lg font-bold">${post.crowdfunding.target.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Raised</p>
                <p className="text-lg font-bold text-[var(--brand-secondary)]">
                  ${post.crowdfunding.raised.toLocaleString()}
                </p>
              </div>
            </div>
            <Progress 
              value={(post.crowdfunding.raised / post.crowdfunding.target) * 100} 
              className="h-2 mb-3"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {post.crowdfunding.backers} backers
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.crowdfunding.daysLeft} days left
              </span>
              <span>Min: ${post.crowdfunding.minInvestment.toLocaleString()}</span>
            </div>
            <Button className="w-full mt-3 bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]">
              <DollarSign className="w-4 h-4 mr-2" />
              Invest Now
            </Button>
          </div>
        )}

        {/* Investment Card */}
        {post.investment && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 mb-4 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h5 className="font-semibold text-emerald-800">Investment Opportunity</h5>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Looking to invest ${post.investment.amount.min.toLocaleString()} - ${post.investment.amount.max.toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-2">
              {post.investment.stage.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
              {post.investment.industries.map((i) => (
                <Badge key={i} variant="outline">{i}</Badge>
              ))}
            </div>
            <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Pitch Your Startup
            </Button>
          </div>
        )}

        {/* Mentorship Card */}
        {post.mentorship && (
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 mb-4 border border-pink-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-pink-600" />
              <h5 className="font-semibold text-pink-800">Mentorship Request</h5>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {post.mentorship.expertise.map((e) => (
                <Badge key={e} variant="secondary">{e}</Badge>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              Commitment: {post.mentorship.commitment} - Duration: {post.mentorship.duration}
            </p>
            <Button className="w-full mt-3 bg-pink-600 hover:bg-pink-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Offer Mentorship
            </Button>
          </div>
        )}

        {/* Promo Card */}
        {post.promo && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 mb-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-600 text-xl">{post.promo.discount}% OFF</span>
              </div>
              <div className="bg-red-600 text-white px-3 py-1 rounded font-mono">
                {post.promo.code}
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Valid until {format(post.promo.validUntil, 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onLike}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{post.likes}</span>
            </button>
            <button
              onClick={onInterest}
              className={`flex items-center gap-2 transition-colors ${
                isInterested ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'
              }`}
            >
              <Star className={`w-5 h-5 ${isInterested ? 'fill-current' : ''}`} />
              <span>{post.interests ?? 0}</span>
            </button>
            <button
              onClick={onCommentClick}
              className="flex items-center gap-2 text-gray-500 hover:text-[var(--brand-primary)] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments}</span>
            </button>
            <button
              onClick={onShare}
              className={`flex items-center gap-2 transition-colors ${
                isShared ? 'text-[var(--brand-primary)]' : 'text-gray-500 hover:text-[var(--brand-primary)]'
              }`}
            >
              <Share2 className={`w-5 h-5 ${isShared ? 'fill-current' : ''}`} />
              <span>{post.shares}</span>
            </button>
            <button
              onClick={onRepost}
              className={`flex items-center gap-2 transition-colors ${
                isReposted ? 'text-emerald-600' : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <Repeat2 className={`w-5 h-5 ${isReposted ? 'fill-current' : ''}`} />
              <span>{post.reposts ?? 0}</span>
            </button>
            <button
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-2 transition-colors ${
                bookmarked ? 'text-[var(--brand-primary)]' : 'text-gray-500 hover:text-[var(--brand-primary)]'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
              <span>{post.bookmarks ?? 0}</span>
            </button>
          </div>
          <Button variant="ghost" size="sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            Comment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface CreatePostFormProps {
  onClose: () => void;
}

const CreatePostForm = ({ onClose }: CreatePostFormProps) => {
  const [postType, setPostType] = useState<PostType>('update');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    onClose();
    setContent('');
  };

  const getPostTypeIcon = (type: PostType): React.ElementType => {
    const icons: Record<string, React.ElementType> = {
      update: MessageSquare,
      product: Package,
      service: Briefcase,
      idea: Lightbulb,
      crowdfunding: TrendingUp,
      investment: DollarSign,
      mentorship: Users,
      promo: Tag,
    };
    return icons[type] || MessageSquare;
  };

  return (
    <div className="space-y-4">
      {/* Post Type Selection */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(postTypeConfig) as PostType[]).map((type) => {
          const Icon = getPostTypeIcon(type);
          return (
            <button
              key={type}
              onClick={() => setPostType(type)}
              className={`p-2 rounded-lg text-center transition-colors ${
                postType === type 
                  ? 'bg-[var(--brand-primary)] text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">{postTypeConfig[type].label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Textarea
        placeholder={postTypeConfig[postType].placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
      />

      {/* Media Upload */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <ImageIcon className="w-4 h-4 mr-2" />
          Add Image
        </Button>
        <Button variant="outline" size="sm">
          <Video className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </div>

      <Button 
        onClick={handleSubmit}
        className="w-full bg-[var(--brand-primary)]"
        disabled={!content.trim()}
      >
        Post
      </Button>
    </div>
  );
};

export default TheHub;
