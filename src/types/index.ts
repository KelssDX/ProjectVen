// User Types
export type UserType = 'sme' | 'entrepreneur' | 'investor' | 'mentor';

export type VerificationBadge =
  | 'buyer'
  | 'entrepreneur'
  | 'company'
  | 'mentor'
  | 'investor'
  | 'seller'
  | 'promoter';

export interface VerificationStatus {
  level: 'basic' | 'verified' | 'trusted';
  badges: VerificationBadge[];
  venScore: number;
  businessScore: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  avatar?: string;
  isVerified: boolean;
  verification?: VerificationStatus;
  createdAt: Date;
}

// Profile Types
export interface BusinessProfile {
  id: string;
  userId: string;
  companyName: string;
  tagline?: string;
  description: string;
  industry: string;
  subIndustry?: string;
  location: {
    city: string;
    country: string;
  };
  website?: string;
  foundedYear?: number;
  teamSize?: string;
  stage: 'idea' | 'seed' | 'early' | 'growth' | 'established';
  fundingNeeded?: boolean;
  fundingAmount?: number;
  skills: string[];
  lookingFor: string[];
  achievements: string[];
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  coverImage?: string;
  logo?: string;
  isPublic: boolean;
  views: number;
  connections: number;
}

// For Entrepreneurs
export interface EntrepreneurProfile extends BusinessProfile {
  businessModel: 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'saas' | 'other';
  revenueModel: string[];
  targetMarket: string;
  traction?: string;
}

// For Investors
export interface InvestorProfile {
  id: string;
  userId: string;
  investorType: 'angel' | 'vc' | 'pe' | 'corporate' | 'crowdfunding';
  companyName: string;
  description: string;
  location: {
    city: string;
    country: string;
  };
  investmentRange: {
    min: number;
    max: number;
  };
  preferredStages: string[];
  preferredIndustries: string[];
  portfolioSize: number;
  successfulExits: number;
  isActive: boolean;
}

// For Mentors
export interface MentorProfile {
  id: string;
  userId: string;
  expertise: string[];
  industries: string[];
  experience: number;
  bio: string;
  availability: 'full-time' | 'part-time' | 'ad-hoc';
  mentoringStyle: string[];
  pastMentees: number;
  rating: number;
  reviews: number;
  hourlyRate?: number;
  isAvailable: boolean;
}

// Connection/Messaging
export interface Connection {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

// Marketing/Campaign
export interface MarketingCampaign {
  id: string;
  userId: string;
  name: string;
  type: 'banner' | 'featured' | 'newsletter' | 'sponsored';
  targetAudience: {
    industries?: string[];
    locations?: string[];
    userTypes?: UserType[];
  };
  duration: {
    start: Date;
    end: Date;
  };
  budget: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
  conversions: number;
}

// Trending/Analytics
export interface TrendingBusiness {
  profileId: string;
  profile: BusinessProfile;
  score: number;
  viewsLastWeek: number;
  connectionsLastWeek: number;
  rank: number;
  category: string;
}

// Search/Filter
export interface SearchFilters {
  query?: string;
  userType?: UserType[];
  industry?: string[];
  location?: string;
  stage?: string[];
  skills?: string[];
  fundingNeeded?: boolean;
  verifiedOnly?: boolean;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Social Feed Types
export type PostType = 
  | 'update' 
  | 'product' 
  | 'service' 
  | 'idea' 
  | 'crowdfunding' 
  | 'investment' 
  | 'mentorship' 
  | 'promo';

export interface PostAuthor {
  id: string;
  name: string;
  company: string;
  avatar?: string;
  userType: UserType;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

export interface PitchLink {
  label: string;
  url: string;
}

export interface PitchAttachment {
  name: string;
  url: string;
}

export interface PitchInfo {
  videoUrl?: string;
  deckUrl?: string;
  attachments?: PitchAttachment[];
  links?: PitchLink[];
}

export interface Product {
  name: string;
  price: number;
  currency: string;
  description: string;
  category: string;
  inStock: boolean;
  quantity?: number;
}

export interface Service {
  name: string;
  price: number;
  currency: string;
  priceType: 'hourly' | 'project' | 'monthly';
  description: string;
  category: string;
  availability: 'immediate' | '1-week' | '2-weeks' | '1-month';
}

export interface CrowdfundingInfo {
  target: number;
  raised: number;
  backers: number;
  daysLeft: number;
  minInvestment: number;
  maxInvestment?: number;
  currency?: string;
  equity?: string;
  pitch?: PitchInfo;
}

export interface InvestmentInfo {
  amount: {
    min: number;
    max: number;
  };
  stage: string[];
  industries: string[];
}

export interface InvestmentRequest {
  amount: {
    min: number;
    max: number;
  };
  stage: string[];
  industries: string[];
  pitch?: PitchInfo;
  timeline?: string;
}

export interface MentorshipInfo {
  expertise: string[];
  commitment: 'full-time' | 'part-time' | 'ad-hoc';
  duration: string;
}

export interface PromoInfo {
  discount: number;
  code: string;
  validUntil: Date;
}

export interface Post {
  id: string;
  userId: string;
  author: PostAuthor;
  type: PostType;
  content: string;
  media?: MediaItem[];
  pitch?: PitchInfo;
  product?: Product;
  service?: Service;
  crowdfunding?: CrowdfundingInfo;
  investment?: InvestmentInfo;
  investmentRequest?: InvestmentRequest;
  mentorship?: MentorshipInfo;
  promo?: PromoInfo;
  likes: number;
  loves?: number;
  interests?: number;
  bookmarks?: number;
  reposts?: number;
  comments: number;
  shares: number;
  createdAt: Date;
  isLiked?: boolean;
  isLoved?: boolean;
  isInterested?: boolean;
  isReposted?: boolean;
  isShared?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  author: {
    name: string;
    avatar?: string;
  };
  content: string;
  likes: number;
  createdAt: Date;
}

// Order Types
export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  postId: string;
  type: 'product' | 'service';
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  currency: string;
  createdAt: Date;
  notes?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

// Booking Types
export interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  date: Date;
  duration: number;
  price: number;
  currency: string;
  notes?: string;
  createdAt: Date;
}

// Investment Types
export interface Investment {
  id: string;
  investorId: string;
  startupId: string;
  campaignId: string;
  amount: number;
  equity?: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
}

// Mentorship Types
export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'pending' | 'active' | 'completed';
  expertise: string[];
  startDate: Date;
  endDate?: Date;
  sessionsCompleted: number;
  rating?: number;
  review?: string;
}
