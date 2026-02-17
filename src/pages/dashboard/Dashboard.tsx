import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useCalendarPanel } from '@/context/CalendarPanelContext';
import { profileService } from '@/services/profileService';
import type { TrendingBusiness } from '@/types';
import { calendarEvents, type CalendarEvent } from '@/data/mockCalendar';
import { recordBriefboardVisit } from '@/utils/briefboard';
import {
  Users,
  DollarSign,
  MessageSquare,
  Target,
  Zap,
  ArrowRight,
  Calendar,
  Bell,
  Bookmark,
  Share2,
  Lightbulb,
  BarChart3,
  Globe,
  Award,
  Clock,
  TrendingUp,
  Eye,
  Briefcase,
} from 'lucide-react';

interface BusinessInsight {
  id: string;
  type: 'opportunity' | 'networking' | 'news' | 'suggestion' | 'alert';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  actionLink?: string;
  timestamp: string;
}

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}

interface NetworkRecommendation {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  mutualConnections: number;
  reason: string;
}

interface GrowthSuggestion {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeToImplement: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [trending, setTrending] = useState<TrendingBusiness[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const { openPanel } = useCalendarPanel();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    recordBriefboardVisit(user?.id);
  }, [user?.id]);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const trendingData = await profileService.getTrendingBusinesses(5);
        setTrending(trendingData);
      } catch (error) {
        console.error('Error loading trending businesses:', error);
      } finally {
        setIsTrendingLoading(false);
      }
    };

    loadTrending();
  }, []);

  // Key metrics for the business brief
  const metrics: Metric[] = [
    { label: 'Network Growth', value: '+24%', change: '+12 this week', trend: 'up', icon: Users },
    { label: 'Profile Views', value: '1,247', change: '+18% vs last week', trend: 'up', icon: BarChart3 },
    { label: 'New Opportunities', value: '8', change: '3 high priority', trend: 'up', icon: Target },
    { label: 'Messages', value: '12', change: '5 unread', trend: 'neutral', icon: MessageSquare },
  ];

  // Priority insights/alerts for the CEO/Manager
  const insights: BusinessInsight[] = [
    {
      id: '1',
      type: 'opportunity',
      title: 'Investment Opportunity: TechStart Inc.',
      description: 'AI startup seeking Series A funding. Matches your investment criteria.',
      priority: 'high',
      action: 'View Details',
      actionLink: '/dashboard/investments',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'networking',
      title: '3 Key People to Connect With',
      description: 'Based on your industry and goals, these connections could accelerate your growth.',
      priority: 'medium',
      action: 'See Recommendations',
      actionLink: '/dashboard/connections',
      timestamp: '4 hours ago',
    },
    {
      id: '3',
      type: 'news',
      title: 'Industry Update: New SME Funding Program',
      description: 'Government announces $500M fund for small businesses. Check eligibility.',
      priority: 'high',
      action: 'Read More',
      actionLink: '/dashboard/feed',
      timestamp: '6 hours ago',
    },
    {
      id: '4',
      type: 'suggestion',
      title: 'Optimize Your Profile for Better Visibility',
      description: 'Adding 2 more skills could increase your profile views by 40%.',
      priority: 'medium',
      action: 'Update Profile',
      actionLink: '/dashboard/profile/edit',
      timestamp: '1 day ago',
    },
  ];

  // Network recommendations
  const networkRecommendations: NetworkRecommendation[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'Venture Capitalist',
      company: 'Horizon Ventures',
      avatar: '/avatar-1.jpg',
      mutualConnections: 12,
      reason: 'Invests in your industry',
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      role: 'CEO',
      company: 'GrowthLabs',
      avatar: '/avatar-2.jpg',
      mutualConnections: 8,
      reason: 'Complementary business',
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      role: 'Marketing Director',
      company: 'ScaleUp Media',
      avatar: '/avatar-3.jpg',
      mutualConnections: 15,
      reason: 'Looking for partners',
    },
  ];

  // Growth suggestions
  const growthSuggestions: GrowthSuggestion[] = [
    {
      id: '1',
      category: 'Networking',
      title: 'Join the SaaS Founders Group',
      description: 'Connect with 500+ founders in your space. Share insights and find partners.',
      impact: 'high',
      timeToImplement: '5 min',
    },
    {
      id: '2',
      category: 'Marketing',
      title: 'Share Your Success Story',
      description: 'Post about your recent milestone to increase visibility and attract opportunities.',
      impact: 'medium',
      timeToImplement: '15 min',
    },
    {
      id: '3',
      category: 'Investment',
      title: 'Review 3 New Funding Opportunities',
      description: 'Startups matching your criteria have posted investment opportunities.',
      impact: 'high',
      timeToImplement: '20 min',
    },
  ];

  const eventIconMap: Record<CalendarEvent['type'], React.ElementType> = {
    meeting: Calendar,
    deadline: Clock,
    event: Users,
    booking: Briefcase,
    reminder: Clock,
  };

  const upcomingItems = calendarEvents
    .filter((event) => event.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      title: event.title,
      time: `${event.start.toLocaleDateString()} - ${event.timeLabel}`,
      icon: eventIconMap[event.type] || Calendar,
      actionLabel: event.type === 'booking' ? 'Book' : 'Add to calendar',
    }));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'networking':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'news':
        return <Globe className="w-5 h-5 text-purple-500" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-amber-500" />;
      case 'alert':
        return <Bell className="w-5 h-5 text-red-500" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}
            {user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your business brief for today</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/bookmarks">
              <Bookmark className="w-4 h-4 mr-2" />
              My Bookmarks
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/dashboard/feed">
              <Share2 className="w-4 h-4 mr-2" />
              Share Update
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  <p
                    className={`text-xs mt-1 ${
                      metric.trend === 'up'
                        ? 'text-green-500'
                        : metric.trend === 'down'
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {metric.change}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <metric.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Priority Insights - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Priority Insights
                  </CardTitle>
                  <CardDescription>Action items requiring your attention</CardDescription>
                </div>
                <Badge variant="secondary">{insights.length} New</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="p-2 bg-background rounded-lg">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{insight.title}</h4>
                      <Badge className={getPriorityColor(insight.priority)}>{insight.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{insight.timestamp}</span>
                      {insight.action && insight.actionLink && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={insight.actionLink}>
                            {insight.action}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Trending This Week (kept from current Briefboard) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--brand-secondary)]" />
                  Trending This Week
                </CardTitle>
                <CardDescription>Businesses gaining momentum right now</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/trending" className="text-[var(--brand-primary)]">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {isTrendingLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex gap-4 p-4 rounded-lg bg-gray-50">
                        <div className="w-12 h-12 rounded-lg bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  trending.slice(0, 3).map((item) => (
                    <Link
                      key={item.profileId}
                      to={`/dashboard/profiles/${item.profileId}`}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="relative">
                        <Avatar className="w-14 h-14 rounded-xl">
                          <AvatarImage src={item.profile.logo} />
                          <AvatarFallback className="bg-[var(--brand-primary)] text-white text-lg rounded-xl">
                            {item.profile.companyName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--brand-secondary)] text-white text-xs font-bold flex items-center justify-center">
                          #{item.rank}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors">
                            {item.profile.companyName}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {item.profile.industry}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{item.profile.tagline}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {item.viewsLastWeek} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.connectionsLastWeek} connections
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Growth Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Growth Suggestions
              </CardTitle>
              <CardDescription>Personalized recommendations to accelerate your success</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {growthSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{suggestion.category}</Badge>
                      <Badge
                        className={
                          suggestion.impact === 'high'
                            ? 'bg-green-100 text-green-700'
                            : suggestion.impact === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                        }
                      >
                        {suggestion.impact} impact
                      </Badge>
                    </div>
                    <h4 className="font-semibold mt-2">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{suggestion.timeToImplement}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Takes 1 column */}
        <div className="space-y-6">
          {/* Network Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Connect With
              </CardTitle>
              <CardDescription>People who could help your business grow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {networkRecommendations.map((person) => (
                <div key={person.id} className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={person.avatar} />
                    <AvatarFallback>{person.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.role} at {person.company}
                    </p>
                    <p className="text-xs text-primary">{person.reason}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </div>
              ))}
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/dashboard/connections">
                  View All Recommendations
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={openPanel}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Check my calendar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={openPanel}>
                    {item.actionLabel}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Your Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <span className="font-medium">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Network Strength</span>
                  <span className="font-medium">Strong</span>
                </div>
                <Progress value={72} className="h-2" />
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Business Score</span>
                  <Badge className="vendrom-gradient text-white">847</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
