import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookmarks } from '@/context/BookmarkContext';
import { useEngagement } from '@/context/EngagementContext';
import { mockPosts } from '@/data/mockPosts';
import type { Post as FeedPost } from '@/types';
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar,
  Briefcase,
  GraduationCap,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  Repeat2,
  Edit3,
  Image as ImageIcon,
  Grid3X3,
  List,
  CheckCircle2,
  Star,
  BarChart3,
} from 'lucide-react';

interface ProfilePost {
  id: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked?: boolean;
}

interface Experience {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
}

const Profile = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isFollowing, setIsFollowing] = useState(false);
  const { bookmarks } = useBookmarks();
  const {
    state: engagementState,
  } = useEngagement();

  const likedPosts = useMemo(() => {
    const likedIds = new Set([
      ...engagementState.liked,
      ...engagementState.loved,
    ]);
    return mockPosts.filter((post) => likedIds.has(post.id));
  }, [engagementState.liked, engagementState.loved]);
  const sharedPosts = useMemo(
    () => mockPosts.filter((post) => engagementState.shared.includes(post.id)),
    [engagementState.shared]
  );
  const repostedPosts = useMemo(
    () => mockPosts.filter((post) => engagementState.reposted.includes(post.id)),
    [engagementState.reposted]
  );
  const interestedPosts = useMemo(
    () => mockPosts.filter((post) => engagementState.interested.includes(post.id)),
    [engagementState.interested]
  );
  const interestTypes = useMemo(
    () => Array.from(new Set(interestedPosts.map((post) => post.type))),
    [interestedPosts]
  );
  const savedPosts = useMemo(
    () => bookmarks.filter((bookmark) => bookmark.type === 'post'),
    [bookmarks]
  );

  // Sample profile data (in real app, this would come from API)
  const profile = {
    name: 'Alex Thompson',
    handle: '@alexthompson',
    bio: 'Entrepreneur | Building the future of SME networking | Investor in 15+ startups | Speaker | Mentor',
    location: 'San Francisco, CA',
    website: 'alexthompson.co',
    joinedDate: 'March 2022',
    followers: 12500,
    following: 890,
    connections: 450,
    role: 'Founder & CEO',
    company: 'Vendrome',
    verified: true,
    verification: {
      badges: ['entrepreneur', 'seller', 'buyer'],
      venScore: 4.8,
      businessScore: 92,
    },
    bannerImage: '/banner-1.jpg',
    avatar: '/avatar-user.jpg',
  };

  const verificationBadgeLabels: Record<string, string> = {
    buyer: 'Buyer Verified',
    entrepreneur: 'Entrepreneur Verified',
    company: 'Company Verified',
    mentor: 'Mentor Verified',
    investor: 'Investor Verified',
    seller: 'Seller Verified',
    promoter: 'Promoter Verified',
  };

  const userPosts: ProfilePost[] = [
    {
      id: '1',
      content: 'Just hit 10,000 connections on Vendrome! 🎉\n\nIt\'s incredible to see how this community has grown. Every connection has taught me something new. Here\'s to many more meaningful relationships!\n\n#Milestone #Networking #Grateful',
      likes: 456,
      comments: 78,
      shares: 123,
      timestamp: '2 days ago',
      isLiked: true,
    },
    {
      id: '2',
      content: 'Excited to announce our latest investment in @GreenTech - a startup revolutionizing renewable energy storage.\n\nThe team\'s vision and execution are world-class. Can\'t wait to see what they build! 🌱\n\n#Investment #CleanTech #Startup',
      images: ['/post-image-1.jpg', '/post-image-2.jpg'],
      likes: 892,
      comments: 156,
      shares: 445,
      timestamp: '1 week ago',
    },
    {
      id: '3',
      content: '5 lessons I\'ve learned building Vendrome:\n\n1. Your network is your net worth\n2. Listen more than you speak\n3. Fail fast, learn faster\n4. Surround yourself with people smarter than you\n5. Give before you ask\n\nWhat\'s your #1 business lesson?',
      likes: 1234,
      comments: 234,
      shares: 567,
      timestamp: '2 weeks ago',
    },
  ];

  const experiences: Experience[] = [
    {
      id: '1',
      role: 'Founder & CEO',
      company: 'Vendrome',
      location: 'San Francisco, CA',
      startDate: '2022',
      current: true,
      description: 'Building the ultimate platform for SMEs and entrepreneurs to connect, collaborate, and grow.',
    },
    {
      id: '2',
      role: 'Partner',
      company: 'Horizon Ventures',
      location: 'Palo Alto, CA',
      startDate: '2018',
      endDate: '2022',
      description: 'Led investments in 30+ early-stage startups across fintech, SaaS, and marketplace sectors.',
    },
    {
      id: '3',
      role: 'Product Manager',
      company: 'TechGiant Inc.',
      location: 'Seattle, WA',
      startDate: '2015',
      endDate: '2018',
    },
  ];

  const education: Education[] = [
    {
      id: '1',
      school: 'Stanford University',
      degree: 'MBA',
      field: 'Business Administration',
      startDate: '2013',
      endDate: '2015',
    },
    {
      id: '2',
      school: 'MIT',
      degree: 'BS',
      field: 'Computer Science',
      startDate: '2009',
      endDate: '2013',
    },
  ];

  const skills = [
    'Entrepreneurship', 'Venture Capital', 'Product Strategy', 'Leadership',
    'Business Development', 'Strategic Planning', 'Team Building', 'Public Speaking',
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderEngagementList = (items: FeedPost[], emptyLabel: string) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    return (
      <div className="space-y-3">
        {items.map((post) => (
          <div key={post.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                {post.author.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{post.author.name}</p>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {post.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{post.author.company}</p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.content}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBookmarkList = () => {
    if (savedPosts.length === 0) {
      return <p className="text-sm text-muted-foreground">No bookmarks saved yet.</p>;
    }

    return (
      <div className="space-y-3">
        {savedPosts.map((bookmark) => (
          <div key={bookmark.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={bookmark.authorAvatar} />
              <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                {bookmark.authorName?.[0] ?? 'B'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{bookmark.title}</p>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {bookmark.category}
                </Badge>
              </div>
              {bookmark.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {bookmark.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative h-48 md:h-64 rounded-xl overflow-hidden">
        <img 
          src={profile.bannerImage} 
          alt="Profile Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Profile Header */}
      <Card className="-mt-20 mx-4 relative z-10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="relative -mt-16">
              <Avatar className="w-32 h-32 border-4 border-background">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-3xl">{profile.name[0]}</AvatarFallback>
              </Avatar>
              {profile.verified && (
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    {profile.name}
                  </h1>
                  <p className="text-muted-foreground">{profile.handle}</p>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Briefcase className="w-4 h-4" />
                    {profile.role} at {profile.company}
                  </p>
                  {profile.verification && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profile.verification.badges.map((badge) => (
                        <Badge key={badge} variant="secondary">
                          {verificationBadgeLabels[badge] ?? badge}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        Ven {profile.verification.venScore.toFixed(1)}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-primary" />
                        Business {profile.verification.businessScore}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button 
                    size="sm"
                    variant={isFollowing ? 'outline' : 'default'}
                    onClick={() => setIsFollowing(!isFollowing)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              </div>

              {/* Bio */}
              <p className="mt-4 text-foreground">{profile.bio}</p>

              {/* Meta */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </span>
                <span className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a href={`https://${profile.website}`} className="text-primary hover:underline">
                    {profile.website}
                  </a>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {profile.joinedDate}
                </span>
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <p className="font-bold text-lg">{formatNumber(profile.followers)}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{formatNumber(profile.following)}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{formatNumber(profile.connections)}</p>
                  <p className="text-sm text-muted-foreground">Connections</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="w-full flex flex-wrap h-auto gap-2">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          <TabsTrigger value="interests" className="flex-1">Interests</TabsTrigger>
          <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
          <TabsTrigger value="experience" className="flex-1">Experience</TabsTrigger>
          <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {/* View Toggle */}
          <div className="flex justify-end gap-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>

          {/* Posts */}
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : 'space-y-4'}>
            {userPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="whitespace-pre-wrap mb-4">{post.content}</p>
                  
                  {post.images && (
                    <div className={`grid gap-2 mb-4 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {post.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="rounded-lg w-full h-48 object-cover" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t text-sm">
                    <Button variant="ghost" size="sm" className={post.isLiked ? 'text-red-500' : ''}>
                      <Heart className={`w-4 h-4 mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
                      {formatNumber(post.likes)}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {formatNumber(post.comments)}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      {formatNumber(post.shares)}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Bookmark className="w-4 h-4 mr-2" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">{post.timestamp}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Private</Badge>
            <p className="text-sm text-muted-foreground">Only you can see this activity.</p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Likes
              </CardTitle>
              <Badge variant="secondary">{likedPosts.length}</Badge>
            </CardHeader>
            <CardContent>{renderEngagementList(likedPosts, 'No liked posts yet.')}</CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[var(--brand-primary)]" />
                Shares
              </CardTitle>
              <Badge variant="secondary">{sharedPosts.length}</Badge>
            </CardHeader>
            <CardContent>{renderEngagementList(sharedPosts, 'No shared posts yet.')}</CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Repeat2 className="w-5 h-5 text-emerald-600" />
                Reposts
              </CardTitle>
              <Badge variant="secondary">{repostedPosts.length}</Badge>
            </CardHeader>
            <CardContent>{renderEngagementList(repostedPosts, 'No reposts yet.')}</CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[var(--brand-primary)]" />
                Bookmarks
              </CardTitle>
              <Badge variant="secondary">{savedPosts.length}</Badge>
            </CardHeader>
            <CardContent>{renderBookmarkList()}</CardContent>
          </Card>
        </TabsContent>

        {/* Interests Tab */}
        <TabsContent value="interests" className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Private</Badge>
            <p className="text-sm text-muted-foreground">Only you can see your saved interests.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {interestTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interestTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="capitalize">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
              {renderEngagementList(interestedPosts, 'No interests saved yet.')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-6">
          {/* Bio Section */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{profile.bio}</p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.role}</p>
                    <p className="text-sm text-muted-foreground">{profile.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.location}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {education.map((edu) => (
                <div key={edu.id} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{edu.school}</p>
                    <p className="text-foreground">{edu.degree} in {edu.field}</p>
                    <p className="text-sm text-muted-foreground">
                      {edu.startDate} - {edu.endDate || 'Present'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-4">
          {experiences.map((exp) => (
            <Card key={exp.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{exp.role}</p>
                    <p className="text-foreground">{exp.company}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3" />
                      {exp.location}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </p>
                    {exp.current && (
                      <Badge className="mt-2 bg-green-100 text-green-700">Current</Badge>
                    )}
                    {exp.description && (
                      <p className="mt-3 text-muted-foreground">{exp.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Photos & Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userPosts.filter(p => p.images).flatMap(p => p.images || []).map((img, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                ))}
                {/* Placeholder images */}
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={`placeholder-${i}`} className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
