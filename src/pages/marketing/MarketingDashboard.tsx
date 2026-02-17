import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockCampaigns, campaignTypes } from '@/data/mockCampaigns';
import {
  Plus,
  Eye,
  MousePointer,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  Megaphone,
  Pause,
  Play,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MarketingDashboard = () => {
  const [campaigns] = useState(mockCampaigns);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      draft: 'bg-gray-100 text-gray-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (type: string) => {
    return campaignTypes.find(t => t.value === type)?.label || type;
  };

  // Calculate totals
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-[var(--brand-secondary)]" />
            Marketing Center
          </h2>
          <p className="text-gray-600 mt-1">
            Promote your business and reach your target audience
          </p>
        </div>
        <Button asChild className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]">
          <Link to="/dashboard/marketing/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Budget</p>
                <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[var(--brand-primary)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Impressions</p>
                <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clicks</p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conversions</p>
                <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Click-Through Rate (CTR)</span>
                <span className="text-sm font-semibold">{avgCTR.toFixed(2)}%</span>
              </div>
              <Progress value={avgCTR * 5} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Industry avg: 2.5%</p>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Conversion Rate (CVR)</span>
                <span className="text-sm font-semibold">{avgCVR.toFixed(2)}%</span>
              </div>
              <Progress value={avgCVR * 10} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Industry avg: 3.2%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeCampaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active campaigns</h3>
              <p className="text-gray-600 mb-4">Create your first campaign to start reaching your audience</p>
              <Button asChild className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]">
                <Link to="/dashboard/marketing/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Link>
              </Button>
            </Card>
          ) : (
            activeCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                getStatusColor={getStatusColor}
                getTypeLabel={getTypeLabel}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              getStatusColor={getStatusColor}
              getTypeLabel={getTypeLabel}
            />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {campaigns
            .filter(c => c.status === 'completed')
            .map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                getStatusColor={getStatusColor}
                getTypeLabel={getTypeLabel}
              />
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface CampaignCardProps {
  campaign: typeof mockCampaigns[0];
  getStatusColor: (status: string) => string;
  getTypeLabel: (type: string) => string;
}

const CampaignCard = ({ campaign, getStatusColor, getTypeLabel }: CampaignCardProps) => {
  const ctr = campaign.impressions > 0
    ? (campaign.clicks / campaign.impressions) * 100
    : 0;
  const cpc = campaign.clicks > 0
    ? campaign.budget / campaign.clicks
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{campaign.name}</h3>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
              <Badge variant="outline">{getTypeLabel(campaign.type)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {campaign.duration.start.toLocaleDateString()} - {campaign.duration.end.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Budget: ${campaign.budget.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{campaign.impressions.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Impressions</p>
              </div>
              <div>
                <p className="text-lg font-bold">{campaign.clicks.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Clicks</p>
              </div>
              <div>
                <p className="text-lg font-bold">{ctr.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">CTR</p>
              </div>
              <div>
                <p className="text-lg font-bold">${cpc.toFixed(2)}</p>
                <p className="text-xs text-gray-500">CPC</p>
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
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
                {campaign.status === 'active' ? (
                  <DropdownMenuItem>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Campaign
                  </DropdownMenuItem>
                ) : campaign.status === 'paused' ? (
                  <DropdownMenuItem>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Campaign
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem className="text-red-600">
                  Stop Campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress bar for active campaigns */}
        {campaign.status === 'active' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Campaign Progress</span>
              <span className="font-medium">
                {Math.round(
                  ((new Date().getTime() - campaign.duration.start.getTime()) /
                    (campaign.duration.end.getTime() - campaign.duration.start.getTime())) *
                    100
                )}%
              </span>
            </div>
            <Progress
              value={
                ((new Date().getTime() - campaign.duration.start.getTime()) /
                  (campaign.duration.end.getTime() - campaign.duration.start.getTime())) *
                100
              }
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketingDashboard;
