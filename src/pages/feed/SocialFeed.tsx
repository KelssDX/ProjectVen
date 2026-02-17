import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
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
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SocialFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Use user to avoid unused variable warning
  void user;

  const filteredPosts = activeTab === 'all' 
    ? posts 
    : posts.filter(p => p.type === activeTab);

  const handleLike = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1,
          isLiked: !p.isLiked,
        };
      }
      return p;
    }));
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
    
    // Update post comment count
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Feed</h2>
          <p className="text-gray-600 mt-1">
            Discover products, services, ideas, and opportunities
          </p>
        </div>
        <Button 
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="product">Products</TabsTrigger>
          <TabsTrigger value="service">Services</TabsTrigger>
          <TabsTrigger value="crowdfunding">Crowdfunding</TabsTrigger>
          <TabsTrigger value="investment">Investment</TabsTrigger>
          <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
          <TabsTrigger value="idea">Ideas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Posts Feed */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => handleLike(post.id)}
            onCommentClick={() => setSelectedPost(post)}
            getPostTypeIcon={getPostTypeIcon}
            getPostTypeColor={getPostTypeColor}
          />
        ))}
      </div>

      {/* Comments Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comments ({selectedPost?.comments})</DialogTitle>
          </DialogHeader>
          
          {selectedPost && (
            <div className="space-y-4">
              {/* Original Post */}
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

              {/* Comments List */}
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

              {/* Add Comment */}
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

      {/* Create Post Dialog */}
      <CreatePostDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        user={user}
      />
    </div>
  );
};

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onCommentClick: () => void;
  getPostTypeIcon: (type: PostType) => React.ElementType;
  getPostTypeColor: (type: PostType) => string;
}

const PostCard = ({ post, onLike, onCommentClick, getPostTypeIcon, getPostTypeColor }: PostCardProps) => {
  const TypeIcon = getPostTypeIcon(post.type);
  const typeConfig = postTypeConfig[post.type];

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Bookmark className="w-4 h-4 mr-2" />
                Save Post
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              Commitment: {post.mentorship.commitment} • Duration: {post.mentorship.duration}
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
          <div className="flex items-center gap-6">
            <button
              onClick={onLike}
              className={`flex items-center gap-2 transition-colors ${
                post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
              <span>{post.likes}</span>
            </button>
            <button
              onClick={onCommentClick}
              className="flex items-center gap-2 text-gray-500 hover:text-[var(--brand-primary)] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-[var(--brand-primary)] transition-colors">
              <Share2 className="w-5 h-5" />
              <span>{post.shares}</span>
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

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

const CreatePostDialog = ({ open, onOpenChange, user }: CreatePostDialogProps) => {
  const [postType, setPostType] = useState<PostType>('update');
  const [content, setContent] = useState('');
  
  // Use user to avoid unused variable warning
  void user;

  const handleSubmit = () => {
    // Handle post creation
    onOpenChange(false);
    setContent('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        
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

          {/* Type-specific fields would go here */}

          <Button 
            onClick={handleSubmit}
            className="w-full bg-[var(--brand-primary)]"
            disabled={!content.trim()}
          >
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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

export default SocialFeed;
