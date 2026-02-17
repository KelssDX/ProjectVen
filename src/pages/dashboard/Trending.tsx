import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { profileService } from '@/services/profileService';
import { industries } from '@/data/mockProfiles';
import { mockPosts } from '@/data/mockPosts';
import type { TrendingBusiness } from '@/types';
import {
  TrendingUp,
  Eye,
  Users,
  ArrowRight,
  Filter,
  Trophy,
  Flame,
  Star,
  ShoppingBag,
  MessageCircle,
  Repeat2,
  Bookmark,
  Sparkles,
} from 'lucide-react';

const Trending = () => {
  const [trending, setTrending] = useState<TrendingBusiness[]>([]);
  const [filteredTrending, setFilteredTrending] = useState<TrendingBusiness[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const data = await profileService.getTrendingBusinesses(20);
        setTrending(data);
        setFilteredTrending(data);
      } catch (error) {
        console.error('Error loading trending:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrending();
  }, []);

  useEffect(() => {
    if (selectedIndustry === 'all') {
      setFilteredTrending(trending);
    } else {
      setFilteredTrending(
        trending.filter((item) => item.profile.industry === selectedIndustry)
      );
    }
  }, [selectedIndustry, trending]);

  const viralPosts = useMemo(() => {
    const score = (post: typeof mockPosts[number]) =>
      post.likes +
      post.comments +
      post.shares +
      (post.reposts ?? 0) +
      (post.loves ?? 0);
    return [...mockPosts]
      .sort((a, b) => score(b) - score(a))
      .slice(0, 4);
  }, []);

  const crowdfundingPosts = useMemo(() => {
    return mockPosts
      .filter((post) => post.type === 'crowdfunding' && post.crowdfunding)
      .sort((a, b) => {
        const aRatio = (a.crowdfunding?.raised ?? 0) / (a.crowdfunding?.target ?? 1);
        const bRatio = (b.crowdfunding?.raised ?? 0) / (b.crowdfunding?.target ?? 1);
        return bRatio - aRatio;
      })
      .slice(0, 3);
  }, []);

  const marketplacePosts = useMemo(() => {
    return mockPosts
      .filter((post) => post.product || post.service)
      .sort((a, b) => {
        const aScore = (a.bookmarks ?? 0) + (a.interests ?? 0);
        const bScore = (b.bookmarks ?? 0) + (b.interests ?? 0);
        return bScore - aScore;
      })
      .slice(0, 3);
  }, []);

  const entrepreneurPosts = useMemo(() => {
    return mockPosts
      .filter((post) => post.author.userType === 'entrepreneur')
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3);
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center font-bold text-gray-400">{rank}</span>;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
    return 'bg-white';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flame className="w-7 h-7 text-[var(--brand-secondary)]" />
            Trending This Week
          </h2>
          <p className="text-gray-600 mt-1">
            Businesses, crowdfunders, entrepreneurs, and posts gaining momentum this week
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Total Views This Week</p>
                <p className="text-2xl font-bold">24.5K</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--brand-secondary)] to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white/80 text-sm">New Connections</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Top Rated</p>
                <p className="text-2xl font-bold">4.8/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Industry Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedIndustry === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedIndustry('all')}
          className={selectedIndustry === 'all' ? 'bg-[var(--brand-primary)]' : ''}
        >
          <Filter className="w-4 h-4 mr-1" />
          All Industries
        </Button>
        {industries.slice(0, 8).map((industry) => (
          <Button
            key={industry}
            variant={selectedIndustry === industry ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedIndustry(industry)}
            className={selectedIndustry === industry ? 'bg-[var(--brand-primary)]' : ''}
          >
            {industry}
          </Button>
        ))}
      </div>

      {/* Trending List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTrending.length === 0 ? (
          <Card className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trending businesses</h3>
            <p className="text-gray-600">Try selecting a different industry</p>
          </Card>
        ) : (
          filteredTrending.map((item, index) => (
            <Link
              key={item.profileId}
              to={`/dashboard/profiles/${item.profileId}`}
              className="block"
            >
              <Card
                className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${getRankStyle(
                  index + 1
                )}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-16 h-16 rounded-xl">
                      <AvatarImage src={item.profile.logo} />
                      <AvatarFallback className="bg-[var(--brand-primary)] text-white text-xl rounded-xl">
                        {item.profile.companyName[0]}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900 hover:text-[var(--brand-primary)] transition-colors">
                          {item.profile.companyName}
                        </h3>
                        <Badge variant="secondary">{item.profile.industry}</Badge>
                        <Badge className={
                          item.profile.stage === 'growth'
                            ? 'bg-orange-100 text-orange-700'
                            : item.profile.stage === 'established'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }>
                          {item.profile.stage}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mt-1 line-clamp-1">
                        {item.profile.tagline || item.profile.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.viewsLastWeek} views this week
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {item.connectionsLastWeek} new connections
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Score: {item.score}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-5 h-5 text-gray-400 hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-gray-900">Viral Posts</h3>
            </div>
            <div className="space-y-4">
              {viralPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
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
                    <p className="text-xs text-gray-500">{post.author.company}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.content}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {post.loves ?? 0} loves
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments} comments
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="w-3 h-3" />
                        {post.reposts ?? 0} reposts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--brand-secondary)]" />
              <h3 className="font-bold text-gray-900">Crowdfunding Momentum</h3>
            </div>
            <div className="space-y-4">
              {crowdfundingPosts.map((post) => {
                const ratio = (post.crowdfunding?.raised ?? 0) / (post.crowdfunding?.target ?? 1);
                return (
                  <div key={post.id} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{post.author.company}</p>
                        <p className="text-xs text-muted-foreground">{post.crowdfunding?.equity ?? 'Community round'}</p>
                      </div>
                      <Badge variant="secondary">{Math.round(ratio * 100)}% funded</Badge>
                    </div>
                    <Progress value={ratio * 100} className="h-2 mt-3" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                      <span>
                        Raised {(post.crowdfunding?.raised ?? 0).toLocaleString()} {post.crowdfunding?.currency ?? 'USD'}
                      </span>
                      <span>{post.crowdfunding?.backers ?? 0} backers</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
              <h3 className="font-bold text-gray-900">Entrepreneurs To Watch</h3>
            </div>
            <div className="space-y-4">
              {entrepreneurPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                      {post.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{post.author.name}</p>
                    <p className="text-xs text-gray-500">{post.author.company}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {post.loves ?? 0} loves
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        {post.bookmarks ?? 0} saves
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[var(--brand-secondary)]" />
              <h3 className="font-bold text-gray-900">Marketplace Hot Picks</h3>
            </div>
            <div className="space-y-4">
              {marketplacePosts.map((post) => (
                <div key={post.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {post.product?.name ?? post.service?.name ?? post.author.company}
                    </p>
                    <p className="text-xs text-gray-500">{post.author.company}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        {post.bookmarks ?? 0} bookmarks
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {post.interests ?? 0} interests
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {post.product
                      ? `${post.product.price} ${post.product.currency}`
                      : post.service
                        ? `${post.service.price} ${post.service.currency}`
                        : 'Featured'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Trending;
