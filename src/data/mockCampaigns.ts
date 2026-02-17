import type { MarketingCampaign } from '@/types';

export const mockCampaigns: MarketingCampaign[] = [
  {
    id: '1',
    userId: '1',
    name: 'Summer Product Launch',
    type: 'featured',
    targetAudience: {
      industries: ['Technology', 'Retail'],
      locations: ['USA', 'UK'],
      userTypes: ['sme', 'entrepreneur'],
    },
    duration: {
      start: new Date('2024-06-01'),
      end: new Date('2024-08-31'),
    },
    budget: 5000,
    status: 'active',
    impressions: 45000,
    clicks: 2300,
    conversions: 145,
  },
  {
    id: '2',
    userId: '1',
    name: 'Investor Outreach Q3',
    type: 'banner',
    targetAudience: {
      industries: ['Finance', 'Technology'],
      userTypes: ['investor'],
    },
    duration: {
      start: new Date('2024-07-01'),
      end: new Date('2024-09-30'),
    },
    budget: 10000,
    status: 'active',
    impressions: 78000,
    clicks: 4200,
    conversions: 89,
  },
  {
    id: '3',
    userId: '2',
    name: 'Partnership Drive',
    type: 'newsletter',
    targetAudience: {
      industries: ['Energy', 'Technology'],
      userTypes: ['sme', 'entrepreneur'],
    },
    duration: {
      start: new Date('2024-05-15'),
      end: new Date('2024-06-15'),
    },
    budget: 2500,
    status: 'completed',
    impressions: 12000,
    clicks: 890,
    conversions: 56,
  },
];

export const campaignTypes = [
  { value: 'banner', label: 'Banner Ad', description: 'Display ad on platform pages', pricePerDay: 50 },
  { value: 'featured', label: 'Featured Listing', description: 'Priority placement in search results', pricePerDay: 100 },
  { value: 'newsletter', label: 'Newsletter Feature', description: 'Featured in weekly newsletter', pricePerDay: 200 },
  { value: 'sponsored', label: 'Sponsored Content', description: 'Native content promotion', pricePerDay: 300 },
];

export const targetLocations = [
  'USA',
  'UK',
  'Canada',
  'Germany',
  'France',
  'Nigeria',
  'Kenya',
  'South Africa',
  'India',
  'Singapore',
  'Australia',
  'UAE',
];

export const calculateCampaignCost = (
  type: string,
  startDate: Date,
  endDate: Date
): number => {
  const campaignType = campaignTypes.find(t => t.value === type);
  if (!campaignType) return 0;
  
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return campaignType.pricePerDay * Math.max(1, days);
};
