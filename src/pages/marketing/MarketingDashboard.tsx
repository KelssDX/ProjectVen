import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketingApi, type MarketingCampaignDto } from '@/api/marketing';
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

const USE_REAL_MARKETING =
  import.meta.env.VITE_FEATURE_USE_REAL_MARKETING === 'true';

type CampaignCardModel = typeof mockCampaigns[number];

const mapCampaign = (campaign: MarketingCampaignDto): CampaignCardModel => ({
  id: campaign.id,
  userId: campaign.userId,
  name: campaign.name,
  type: campaign.campaignType,
  targetAudience: {
    industries: campaign.targetAudience.industries,
    locations: campaign.targetAudience.locations,
    userTypes: campaign.targetAudience.userTypes,
  },
  duration: {
    start: new Date(campaign.startAt),
    end: new Date(campaign.endAt),
  },
  budget: campaign.budget,
  status: campaign.status,
  impressions: campaign.impressions,
  clicks: campaign.clicks,
  conversions: campaign.conversions,
});

const MarketingDashboard = () => {
  const [campaigns, setCampaigns] = useState<CampaignCardModel[]>(mockCampaigns);
  const [isLoading, setIsLoading] = useState(USE_REAL_MARKETING);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyCampaignId, setBusyCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_REAL_MARKETING) {
      return;
    }

    let isMounted = true;

    const loadCampaigns = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const { data } = await marketingApi.getCampaigns({ limit: 100 });
        if (!isMounted) {
          return;
        }

        setCampaigns(data.items.map(mapCampaign));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCampaigns(mockCampaigns);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Failed to load live marketing campaigns. Showing fallback data.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      draft: 'bg-gray-100 text-gray-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (type: string) =>
    campaignTypes.find((item) => item.value === type)?.label || type;

  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalImpressions = campaigns.reduce(
    (sum, campaign) => sum + campaign.impressions,
    0,
  );
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const totalConversions = campaigns.reduce(
    (sum, campaign) => sum + campaign.conversions,
    0,
  );
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === 'active'),
    [campaigns],
  );
  const completedCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === 'completed'),
    [campaigns],
  );

  const handleStatusChange = async (
    campaignId: string,
    status: 'active' | 'paused' | 'cancelled',
  ) => {
    if (!USE_REAL_MARKETING) {
      setCampaigns((previous) =>
        previous.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, status } : campaign,
        ),
      );
      return;
    }

    setBusyCampaignId(campaignId);
    try {
      const { data } = await marketingApi.updateStatus(campaignId, status);
      setCampaigns((previous) =>
        previous.map((campaign) =>
          campaign.id === campaignId ? mapCampaign(data) : campaign,
        ),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Failed to update campaign status.',
      );
    } finally {
      setBusyCampaignId(null);
    }
  };

  return (
    <div className="space-y-6">
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

      {USE_REAL_MARKETING && loadError ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{loadError}</CardContent>
        </Card>
      ) : null}

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

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
          <TabsTrigger value="all">All Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedCampaigns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <Card className="p-12 text-center">
              <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading campaigns</h3>
              <p className="text-gray-600">Fetching live marketing campaigns.</p>
            </Card>
          ) : activeCampaigns.length === 0 ? (
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
                onStatusChange={handleStatusChange}
                isBusy={busyCampaignId === campaign.id}
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
              onStatusChange={handleStatusChange}
              isBusy={busyCampaignId === campaign.id}
            />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              getStatusColor={getStatusColor}
              getTypeLabel={getTypeLabel}
              onStatusChange={handleStatusChange}
              isBusy={busyCampaignId === campaign.id}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface CampaignCardProps {
  campaign: CampaignCardModel;
  getStatusColor: (status: string) => string;
  getTypeLabel: (type: string) => string;
  onStatusChange: (
    campaignId: string,
    status: 'active' | 'paused' | 'cancelled',
  ) => void;
  isBusy: boolean;
}

const CampaignCard = ({
  campaign,
  getStatusColor,
  getTypeLabel,
  onStatusChange,
  isBusy,
}: CampaignCardProps) => {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cpc = campaign.clicks > 0 ? campaign.budget / campaign.clicks : 0;
  const progress =
    ((new Date().getTime() - campaign.duration.start.getTime()) /
      (campaign.duration.end.getTime() - campaign.duration.start.getTime())) *
    100;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{campaign.name}</h3>
              <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
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
                <Button variant="ghost" size="icon" disabled={isBusy}>
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
                {campaign.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onStatusChange(campaign.id, 'paused')}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Campaign
                  </DropdownMenuItem>
                ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                  <DropdownMenuItem onClick={() => onStatusChange(campaign.id, 'active')}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Campaign
                  </DropdownMenuItem>
                ) : null}
                {campaign.status !== 'cancelled' ? (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onStatusChange(campaign.id, 'cancelled')}
                  >
                    Stop Campaign
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {campaign.status === 'active' ? (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Campaign Progress</span>
              <span className="font-medium">{Math.max(0, Math.min(100, Math.round(progress)))}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, progress))} className="h-2" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MarketingDashboard;
