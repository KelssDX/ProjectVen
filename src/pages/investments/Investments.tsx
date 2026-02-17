import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { mockPosts } from '@/data/mockPosts';
import {
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Target,
  PieChart,
  Search,
  CheckCircle,
  Briefcase,
  Lightbulb,
  MessageCircle,
  ExternalLink,
  Link as LinkIcon,
  Paperclip,
  PlayCircle,
} from 'lucide-react';

interface CrowdfundingComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: Date;
  isAnonymous: boolean;
  amount: number;
}

interface PitchAssetsProps {
  pitch?: {
    videoUrl?: string;
    deckUrl?: string;
    attachments?: { name: string; url: string }[];
    links?: { label: string; url: string }[];
  };
}

const Investments = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investComment, setInvestComment] = useState('');
  const [investAnonymous, setInvestAnonymous] = useState(false);
  const [crowdfundingComments, setCrowdfundingComments] = useState<Record<string, CrowdfundingComment[]>>({
    '2': [
      {
        id: 'cf-1',
        authorName: 'Anonymous Investor',
        content: 'Excited to support this mission. Keep the updates coming.',
        createdAt: new Date('2026-01-18T10:00:00'),
        isAnonymous: true,
        amount: 2500,
      },
      {
        id: 'cf-2',
        authorName: 'Lerato Mokoena',
        content: 'Great traction numbers. The market is ready for this.',
        createdAt: new Date('2026-01-20T15:30:00'),
        isAnonymous: false,
        amount: 5000,
      },
    ],
  });

  const crowdfundingPosts = mockPosts.filter(p => p.type === 'crowdfunding' && p.crowdfunding);
  const investorPosts = mockPosts.filter(p => p.type === 'investment' && p.investment);
  const investeePosts = mockPosts.filter(p => p.type === 'investment' && p.investmentRequest);

  const filteredCrowdfunding = crowdfundingPosts.filter(p => {
    const matchesSearch = p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.author.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleInvest = (post: any) => {
    setSelectedCampaign(post);
    setInvestAmount(post.crowdfunding?.minInvestment?.toString() || '100');
    setInvestComment('');
    setInvestAnonymous(false);
    setIsInvestDialogOpen(true);
  };

  const currencySymbol = (currency?: string) => {
    if (!currency) return '$';
    return currency === 'ZAR' ? 'R' : '$';
  };

  const handleConfirmInvestment = () => {
    if (!selectedCampaign) return;

    if (investComment.trim()) {
      const comment: CrowdfundingComment = {
        id: `cf-${Date.now()}`,
        authorName: investAnonymous ? 'Anonymous Investor' : 'Demo User',
        content: investComment.trim(),
        createdAt: new Date(),
        isAnonymous: investAnonymous,
        amount: Number(investAmount || 0),
      };

      setCrowdfundingComments((prev) => ({
        ...prev,
        [selectedCampaign.id]: [comment, ...(prev[selectedCampaign.id] || [])],
      }));
    }

    setIsInvestDialogOpen(false);
    alert(`Investment of ${currencySymbol(selectedCampaign.crowdfunding?.currency)}${investAmount} confirmed!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[var(--brand-secondary)]" />
            Funding & Investment
          </h2>
          <p className="text-gray-600 mt-1">
            Discover investment opportunities or find funding for your startup
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Briefcase className="w-4 h-4 mr-2" />
            My Investments
          </Button>
          <Button className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]">
            <DollarSign className="w-4 h-4 mr-2" />
            Raise Funds
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total Raised</p>
            <p className="text-2xl font-bold">$50M+</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Active Campaigns</p>
            <p className="text-2xl font-bold">{filteredCrowdfunding.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total Investors</p>
            <p className="text-2xl font-bold">2,450</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Avg. Return</p>
            <p className="text-2xl font-bold text-green-600">24%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search startups, industries, or founders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="crowdfunding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="crowdfunding" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Crowdfunding ({filteredCrowdfunding.length})
          </TabsTrigger>
          <TabsTrigger value="investors" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Investors ({investorPosts.length})
          </TabsTrigger>
          <TabsTrigger value="investees" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Investees ({investeePosts.length})
          </TabsTrigger>
          <TabsTrigger value="my-deals" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            My Deals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crowdfunding" className="space-y-4">
          {filteredCrowdfunding.length === 0 ? (
            <Card className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active campaigns</h3>
              <p className="text-gray-600">Check back later for new investment opportunities</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCrowdfunding.map((post) => (
                <CrowdfundingCard
                  key={post.id}
                  post={post}
                  onInvest={() => handleInvest(post)}
                  comments={crowdfundingComments[post.id] || []}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="investors" className="space-y-4">
          {investorPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No investors found</h3>
              <p className="text-gray-600">Try adjusting your search</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {investorPosts.map((post) => (
                <InvestorCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="investees" className="space-y-4">
          {investeePosts.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No investees found</h3>
              <p className="text-gray-600">Check back soon for new pitches</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {investeePosts.map((post) => (
                <InvesteeCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-deals" className="space-y-4">
          <Card className="p-12 text-center">
            <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals yet</h3>
            <p className="text-gray-600 mb-4">Start exploring investment opportunities</p>
            <Button className="bg-[var(--brand-secondary)]">
              Browse Campaigns
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invest Dialog */}
      <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>Invest in {selectedCampaign.author.company}</DialogTitle>
                <DialogDescription>
                  Support this startup and become a shareholder
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Campaign Summary */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedCampaign.author.avatar} />
                      <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                        {selectedCampaign.author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedCampaign.author.company}</p>
                      <p className="text-sm text-gray-500">{selectedCampaign.author.name}</p>
                    </div>
                  </div>
                  <Progress
                    value={(selectedCampaign.crowdfunding.raised / selectedCampaign.crowdfunding.target) * 100}
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>
                      {currencySymbol(selectedCampaign.crowdfunding.currency)}
                      {selectedCampaign.crowdfunding.raised.toLocaleString()} raised
                    </span>
                    <span>
                      {currencySymbol(selectedCampaign.crowdfunding.currency)}
                      {selectedCampaign.crowdfunding.target.toLocaleString()} goal
                    </span>
                  </div>
                </div>

                {/* Investment Amount */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Investment Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="pl-10"
                      min={selectedCampaign.crowdfunding.minInvestment}
                      max={selectedCampaign.crowdfunding.maxInvestment}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum investment: {currencySymbol(selectedCampaign.crowdfunding.currency)}
                    {selectedCampaign.crowdfunding.minInvestment.toLocaleString()}
                    {selectedCampaign.crowdfunding.maxInvestment
                      ? `, max ${currencySymbol(selectedCampaign.crowdfunding.currency)}${selectedCampaign.crowdfunding.maxInvestment.toLocaleString()}`
                      : ''}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add a comment (optional)</Label>
                  <Textarea
                    value={investComment}
                    onChange={(e) => setInvestComment(e.target.value)}
                    placeholder="Share why you are investing..."
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="invest-anon"
                      checked={investAnonymous}
                      onCheckedChange={(checked) => setInvestAnonymous(Boolean(checked))}
                    />
                    <Label htmlFor="invest-anon" className="text-sm">
                      Post comment as anonymous
                    </Label>
                  </div>
                </div>

                {/* Investment Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Investment Amount</span>
                    <span className="font-medium">
                      {currencySymbol(selectedCampaign.crowdfunding.currency)}
                      {parseInt(investAmount || '0').toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee (2%)</span>
                    <span className="font-medium">
                      {currencySymbol(selectedCampaign.crowdfunding.currency)}
                      {(parseInt(investAmount || '0') * 0.02).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      {currencySymbol(selectedCampaign.crowdfunding.currency)}
                      {(parseInt(investAmount || '0') * 1.02).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-[var(--brand-secondary)]"
                  onClick={handleConfirmInvestment}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Investment
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PitchAssets = ({ pitch }: PitchAssetsProps) => {
  if (!pitch) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {pitch.videoUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={pitch.videoUrl} target="_blank" rel="noreferrer">
              <PlayCircle className="w-4 h-4 mr-1" />
              Demo Video
            </a>
          </Button>
        )}
        {pitch.deckUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={pitch.deckUrl} target="_blank" rel="noreferrer">
              <Paperclip className="w-4 h-4 mr-1" />
              Pitch Deck
            </a>
          </Button>
        )}
      </div>
      {pitch.attachments && pitch.attachments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Attachments</p>
          <div className="flex flex-wrap gap-2">
            {pitch.attachments.map((attachment) => (
              <Button key={attachment.name} variant="ghost" size="sm" asChild>
                <a href={attachment.url} target="_blank" rel="noreferrer">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {attachment.name}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}
      {pitch.links && pitch.links.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Links</p>
          <div className="flex flex-wrap gap-2">
            {pitch.links.map((link) => (
              <Button key={link.label} variant="ghost" size="sm" asChild>
                <a href={link.url} target="_blank" rel="noreferrer">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface CrowdfundingCardProps {
  post: any;
  onInvest: () => void;
  comments: CrowdfundingComment[];
  currencySymbol: (currency?: string) => string;
}

const CrowdfundingCard = ({ post, onInvest, comments, currencySymbol }: CrowdfundingCardProps) => {
  const progress = (post.crowdfunding.raised / post.crowdfunding.target) * 100;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-[var(--brand-primary)] text-white text-lg">
              {post.author.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{post.author.company}</h3>
            <p className="text-sm text-gray-500">{post.author.name}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{post.author.userType}</Badge>
            </div>
          </div>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-3">{post.content}</p>

        {post.crowdfunding?.pitch && (
          <div className="mb-4 rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-[var(--brand-secondary)]" />
              <p className="text-sm font-semibold">Pitch Assets</p>
            </div>
            <PitchAssets pitch={post.crowdfunding.pitch} />
          </div>
        )}

        {/* Funding Progress */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">Raised</p>
              <p className="text-xl font-bold text-[var(--brand-secondary)]">
                {currencySymbol(post.crowdfunding.currency)}
                {post.crowdfunding.raised.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Target</p>
              <p className="text-xl font-bold">
                {currencySymbol(post.crowdfunding.currency)}
                {post.crowdfunding.target.toLocaleString()}
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {post.crowdfunding.backers} backers
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.crowdfunding.daysLeft} days left
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Min. Investment</p>
            <p className="font-semibold">
              {currencySymbol(post.crowdfunding.currency)}
              {post.crowdfunding.minInvestment.toLocaleString()}
            </p>
            {post.crowdfunding.maxInvestment && (
              <p className="text-xs text-gray-500">
                Max {currencySymbol(post.crowdfunding.currency)}
                {post.crowdfunding.maxInvestment.toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-1" />
              Contact
            </Button>
            <Button 
              size="sm" 
              className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]"
              onClick={onInvest}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Invest
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Investor Comments</p>
            <Badge variant="secondary">{comments.length}</Badge>
          </div>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Be the first to comment after investing.</p>
          ) : (
            <div className="space-y-2">
              {comments.slice(0, 2).map((comment) => (
                <div key={comment.id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{comment.isAnonymous ? 'Anonymous Investor' : comment.authorName}</span>
                    <span>
                      {currencySymbol(post.crowdfunding.currency)}
                      {comment.amount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface InvestorCardProps {
  post: any;
}

const InvestorCard = ({ post }: InvestorCardProps) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="w-14 h-14">
          <AvatarImage src={post.author.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-lg">
            {post.author.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{post.author.name}</h3>
          <p className="text-sm text-gray-500">{post.author.company}</p>
          <div className="flex gap-2 mt-1">
            <Badge className="bg-emerald-100 text-emerald-700">
              <DollarSign className="w-3 h-3 mr-1" />
              Investor
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{post.content}</p>

      <div className="bg-emerald-50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-emerald-800">Investment Range</span>
        </div>
        <p className="text-lg font-bold text-emerald-700">
          ${post.investment.amount.min.toLocaleString()} - ${post.investment.amount.max.toLocaleString()}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Preferred Stages</p>
          <div className="flex flex-wrap gap-1">
            {post.investment.stage.map((s: string) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Industries</p>
          <div className="flex flex-wrap gap-1">
            {post.investment.industries.map((i: string) => (
              <Badge key={i} variant="outline">{i}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <MessageCircle className="w-4 h-4 mr-1" />
          Connect
        </Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
          <Lightbulb className="w-4 h-4 mr-1" />
          Pitch
        </Button>
      </div>
    </CardContent>
  </Card>
);

interface InvesteeCardProps {
  post: any;
}

const InvesteeCard = ({ post }: InvesteeCardProps) => {
  const request = post.investmentRequest;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-[var(--brand-primary)] text-white text-lg">
              {post.author.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{post.author.company}</h3>
            <p className="text-sm text-gray-500">{post.author.name}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{post.author.userType}</Badge>
              <Badge className="bg-blue-100 text-blue-700">
                <Target className="w-3 h-3 mr-1" />
                Investee
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-gray-700">{post.content}</p>

        {request && (
          <div className="rounded-lg border border-border/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Briefcase className="w-4 h-4 text-[var(--brand-secondary)]" />
              Funding Request
            </div>
            <p className="text-lg font-bold text-[var(--brand-secondary)]">
              ${request.amount.min.toLocaleString()} - ${request.amount.max.toLocaleString()}
            </p>
            {request.timeline && (
              <p className="text-sm text-muted-foreground">Timeline: {request.timeline}</p>
            )}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Stage</p>
                <div className="flex flex-wrap gap-1">
                  {request.stage.map((stage: string) => (
                    <Badge key={stage} variant="secondary">
                      {stage}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Industries</p>
                <div className="flex flex-wrap gap-1">
                  {request.industries.map((industry: string) => (
                    <Badge key={industry} variant="outline">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {request?.pitch && (
          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-[var(--brand-primary)]" />
              <p className="text-sm font-semibold">Pitch & Attachments</p>
            </div>
            <PitchAssets pitch={request.pitch} />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <ExternalLink className="w-4 h-4 mr-1" />
            Review Pitch
          </Button>
          <Button className="flex-1 bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]">
            <CheckCircle className="w-4 h-4 mr-1" />
            Accept Pitch
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Investments;
