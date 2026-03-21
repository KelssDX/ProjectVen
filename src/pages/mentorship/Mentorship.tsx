import { useEffect, useMemo, useState } from 'react';
import {
  mentorshipApi,
  type MentorshipMentorDto,
  type MentorshipRequestDto,
  type MyMentorshipDto,
} from '@/api/mentorship';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { mockPosts } from '@/data/mockPosts';
import {
  Users,
  Star,
  CheckCircle,
  MessageCircle,
  Search,
  Briefcase,
  GraduationCap,
  Award,
  Calendar,
  Clock3,
} from 'lucide-react';

const USE_REAL_MENTORSHIP =
  import.meta.env.VITE_FEATURE_USE_REAL_MENTORSHIP === 'true';

interface MentorCardModel {
  id: string;
  name: string;
  company: string;
  avatar?: string;
  expertise: string[];
  experience: number;
  rating: number;
  reviews: number;
  mentees: number;
  availability: 'full-time' | 'part-time' | 'ad-hoc';
  hourlyRate?: number;
  bio: string;
}

interface MentorshipRequestCardModel {
  postId: string;
  author: {
    name: string;
    company: string;
    avatar?: string;
    userType?: string;
  };
  content: string;
  mentorship: {
    expertise: string[];
    commitment: 'full-time' | 'part-time' | 'ad-hoc';
    duration: string;
  };
}

interface MyMentorshipCardModel {
  id: string;
  role: 'mentor' | 'mentee';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  counterpartName: string;
  counterpartCompany: string;
  counterpartAvatar?: string;
  expertise: string[];
  sessionsCompleted: number;
  startDate?: string | null;
  endDate?: string | null;
  rating?: number;
  review?: string | null;
}

const fallbackMentors: MentorCardModel[] = [
  {
    id: '1',
    name: 'Jennifer Park',
    company: 'Venture Partners',
    avatar: '/avatar-5.jpg',
    expertise: ['Fundraising', 'Strategy', 'Leadership'],
    experience: 15,
    rating: 4.9,
    reviews: 48,
    mentees: 23,
    availability: 'part-time',
    hourlyRate: 250,
    bio: 'Former VC with 15+ years experience helping startups scale from seed to Series B.',
  },
  {
    id: '2',
    name: 'Robert Kim',
    company: 'TechScale Advisors',
    avatar: '/avatar-4.jpg',
    expertise: ['Product', 'Growth', 'Marketing'],
    experience: 12,
    rating: 4.8,
    reviews: 36,
    mentees: 18,
    availability: 'ad-hoc',
    hourlyRate: 200,
    bio: 'Product leader who has scaled 3 startups to acquisition.',
  },
  {
    id: '3',
    name: 'Lisa Thompson',
    company: 'HealthTech Pro',
    avatar: '/avatar-2.jpg',
    expertise: ['Healthcare', 'FDA Approval', 'Compliance'],
    experience: 10,
    rating: 5,
    reviews: 29,
    mentees: 15,
    availability: 'part-time',
    hourlyRate: 300,
    bio: 'Healthcare regulatory expert with 10+ years navigating FDA approvals.',
  },
];

const fallbackRequests: MentorshipRequestCardModel[] = mockPosts
  .filter((post) => post.type === 'mentorship' && post.mentorship)
  .map((post) => ({
    postId: post.id,
    author: {
      name: post.author.name,
      company: post.author.company,
      avatar: post.author.avatar,
      userType: post.author.userType,
    },
    content: post.content,
    mentorship: {
      expertise: post.mentorship!.expertise,
      commitment: post.mentorship!.commitment,
      duration: post.mentorship!.duration,
    },
  }));

const expertiseAreas = [
  'Fundraising',
  'Strategy',
  'Product',
  'Marketing',
  'Sales',
  'Operations',
  'Technology',
  'Healthcare',
  'Finance',
  'Leadership',
];

const mapMentor = (mentor: MentorshipMentorDto): MentorCardModel => ({
  id: mentor.userId,
  name: mentor.name,
  company: mentor.company,
  avatar: mentor.avatar ?? undefined,
  expertise: mentor.expertise,
  experience: mentor.experienceYears,
  rating: mentor.rating,
  reviews: mentor.reviews,
  mentees: mentor.mentees,
  availability: mentor.availability,
  hourlyRate: mentor.hourlyRate,
  bio: mentor.bio,
});

const mapRequest = (request: MentorshipRequestDto): MentorshipRequestCardModel => ({
  postId: request.postId,
  author: {
    name: request.authorName,
    company: request.company,
    avatar: request.avatar ?? undefined,
    userType: request.userType,
  },
  content: request.content,
  mentorship: {
    expertise: request.expertise,
    commitment: request.commitment,
    duration: request.duration,
  },
});

const mapMyMentorship = (item: MyMentorshipDto): MyMentorshipCardModel => ({
  id: item.id,
  role: item.role,
  status: item.status,
  counterpartName: item.counterpartName,
  counterpartCompany: item.counterpartCompany,
  counterpartAvatar: item.counterpartAvatar ?? undefined,
  expertise: item.expertise,
  sessionsCompleted: item.sessionsCompleted,
  startDate: item.startDate,
  endDate: item.endDate,
  rating: item.rating,
  review: item.review,
});

const Mentorship = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('all');
  const [selectedRequest, setSelectedRequest] =
    useState<MentorshipRequestCardModel | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [mentors, setMentors] = useState<MentorCardModel[]>(fallbackMentors);
  const [mentorshipRequests, setMentorshipRequests] = useState<
    MentorshipRequestCardModel[]
  >(fallbackRequests);
  const [myMentorships, setMyMentorships] = useState<MyMentorshipCardModel[]>([]);
  const [isLoading, setIsLoading] = useState(USE_REAL_MENTORSHIP);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  useEffect(() => {
    if (!USE_REAL_MENTORSHIP) {
      return;
    }

    let isMounted = true;

    const loadMentorship = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [mentorResponse, requestResponse, mineResponse] = await Promise.all([
          mentorshipApi.getMentors({ limit: 50 }),
          mentorshipApi.getRequests({ limit: 50 }),
          mentorshipApi.getMine(),
        ]);

        if (!isMounted) {
          return;
        }

        setMentors(mentorResponse.data.items.map(mapMentor));
        setMentorshipRequests(requestResponse.data.items.map(mapRequest));
        setMyMentorships(mineResponse.data.items.map(mapMyMentorship));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMentors(fallbackMentors);
        setMentorshipRequests(fallbackRequests);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Failed to load live mentorship data. Showing fallback data.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadMentorship();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMentors = useMemo(
    () =>
      mentors.filter((mentor) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          mentor.name.toLowerCase().includes(query) ||
          mentor.company.toLowerCase().includes(query) ||
          mentor.expertise.some((expertise) =>
            expertise.toLowerCase().includes(query),
          );
        const matchesExpertise =
          selectedExpertise === 'all' || mentor.expertise.includes(selectedExpertise);

        return matchesSearch && matchesExpertise;
      }),
    [mentors, searchQuery, selectedExpertise],
  );

  const filteredRequests = useMemo(
    () =>
      mentorshipRequests.filter((request) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          request.author.name.toLowerCase().includes(query) ||
          request.author.company.toLowerCase().includes(query) ||
          request.content.toLowerCase().includes(query) ||
          request.mentorship.expertise.some((expertise) =>
            expertise.toLowerCase().includes(query),
          );
        const matchesExpertise =
          selectedExpertise === 'all' ||
          request.mentorship.expertise.includes(selectedExpertise);

        return matchesSearch && matchesExpertise;
      }),
    [mentorshipRequests, searchQuery, selectedExpertise],
  );

  const activeMentorships = myMentorships.filter(
    (item) => item.status === 'active' || item.status === 'pending',
  );
  const averageRating =
    mentors.length > 0
      ? mentors.reduce((sum, mentor) => sum + mentor.rating, 0) / mentors.length
      : 0;
  const totalMenteesHelped = mentors.reduce((sum, mentor) => sum + mentor.mentees, 0);

  const handleRequestMentorship = (request: MentorshipRequestCardModel) => {
    setSelectedRequest(request);
    setRequestMessage('');
    setOfferError(null);
    setIsRequestDialogOpen(true);
  };

  const handleSubmitOffer = async () => {
    if (!selectedRequest) {
      return;
    }

    if (!USE_REAL_MENTORSHIP) {
      setIsRequestDialogOpen(false);
      alert('Mentorship offer sent!');
      return;
    }

    setIsSubmittingOffer(true);
    setOfferError(null);

    try {
      const { data } = await mentorshipApi.createOffer(selectedRequest.postId, {
        message: requestMessage.trim() || undefined,
      });

      setMyMentorships((previous) => [mapMyMentorship(data), ...previous]);
      setIsRequestDialogOpen(false);
      setRequestMessage('');
    } catch (error) {
      setOfferError(
        error instanceof Error
          ? error.message
          : 'Failed to send mentorship offer.',
      );
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-[var(--brand-primary)]" />
            Mentorship
          </h2>
          <p className="text-gray-600 mt-1">
            Find mentors or offer your expertise to help others grow
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            My Mentorships
          </Button>
          <Button className="bg-[var(--brand-primary)]">
            <Award className="w-4 h-4 mr-2" />
            Become a Mentor
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Available Mentors</p>
            <p className="text-2xl font-bold">{filteredMentors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Active Mentorships</p>
            <p className="text-2xl font-bold">{activeMentorships.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Avg. Rating</p>
            <p className="text-2xl font-bold text-yellow-500">
              {averageRating > 0 ? `${averageRating.toFixed(1)}/5` : 'New'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Mentees Helped</p>
            <p className="text-2xl font-bold">{totalMenteesHelped.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search mentors or expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge
            variant={selectedExpertise === 'all' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${selectedExpertise === 'all' ? 'bg-[var(--brand-primary)]' : ''}`}
            onClick={() => setSelectedExpertise('all')}
          >
            All Areas
          </Badge>
          {expertiseAreas.slice(0, 5).map((area) => (
            <Badge
              key={area}
              variant={selectedExpertise === area ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap ${selectedExpertise === area ? 'bg-[var(--brand-primary)]' : ''}`}
              onClick={() => setSelectedExpertise(area)}
            >
              {area}
            </Badge>
          ))}
        </div>
      </div>

      {USE_REAL_MENTORSHIP && loadError ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{loadError}</CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="mentors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mentors" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Find Mentors ({filteredMentors.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Mentorship Requests ({filteredRequests.length})
          </TabsTrigger>
          <TabsTrigger value="my-mentors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            My Mentorships ({myMentorships.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentors" className="space-y-4">
          {isLoading ? (
            <Card className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading mentors</h3>
              <p className="text-gray-600">Fetching live mentor profiles.</p>
            </Card>
          ) : filteredMentors.length === 0 ? (
            <Card className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No mentors found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {isLoading ? (
            <Card className="p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading requests</h3>
              <p className="text-gray-600">Fetching live mentorship requests.</p>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests</h3>
              <p className="text-gray-600">No one is looking for mentorship in your areas of expertise</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredRequests.map((post) => (
                <MentorshipRequestCard
                  key={post.postId}
                  post={post}
                  onOffer={() => handleRequestMentorship(post)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-mentors" className="space-y-4">
          {myMentorships.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No mentorships yet</h3>
              <p className="text-gray-600 mb-4">Find a mentor or offer your guidance to start building relationships</p>
              <Button className="bg-[var(--brand-primary)]">
                <Award className="w-4 h-4 mr-2" />
                Browse Mentors
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myMentorships.map((item) => (
                <MyMentorshipCard key={item.id} mentorship={item} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedRequest ? (
            <>
              <DialogHeader>
                <DialogTitle>Offer Mentorship</DialogTitle>
                <DialogDescription>
                  Send a message to {selectedRequest.author.name} offering your mentorship
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-pink-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedRequest.author.avatar} />
                      <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                        {selectedRequest.author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedRequest.author.name}</p>
                      <p className="text-sm text-gray-500">{selectedRequest.author.company}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{selectedRequest.content}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedRequest.mentorship.expertise.map((expertise) => (
                      <Badge key={expertise} variant="secondary">
                        {expertise}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Your Message</label>
                  <Textarea
                    placeholder="Introduce yourself and explain how you can help..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                {offerError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {offerError}
                  </div>
                ) : null}

                <Button
                  className="w-full bg-[var(--brand-primary)]"
                  onClick={handleSubmitOffer}
                  disabled={isSubmittingOffer}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isSubmittingOffer ? 'Sending...' : 'Send Offer'}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface MentorCardProps {
  mentor: MentorCardModel;
}

const MentorCard = ({ mentor }: MentorCardProps) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={mentor.avatar} />
          <AvatarFallback className="bg-[var(--brand-primary)] text-white text-lg">
            {mentor.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{mentor.name}</h3>
          <p className="text-sm text-gray-500">{mentor.company}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="font-medium">
              {mentor.rating > 0 ? mentor.rating.toFixed(1) : 'New'}
            </span>
            <span className="text-sm text-gray-500">({mentor.reviews} reviews)</span>
          </div>
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-4">{mentor.bio}</p>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Expertise</p>
          <div className="flex flex-wrap gap-1">
            {mentor.expertise.map((expertise) => (
              <Badge key={expertise} variant="secondary" className="text-xs">
                {expertise}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            <Briefcase className="w-4 h-4" />
            {mentor.experience > 0 ? `${mentor.experience} years exp.` : 'Experienced'}
          </span>
          <span className="flex items-center gap-1 text-gray-600">
            <Users className="w-4 h-4" />
            {mentor.mentees} mentees
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <p className="text-lg font-bold text-[var(--brand-primary)]">
            {mentor.hourlyRate ? `$${mentor.hourlyRate}` : 'By request'}
          </p>
          <p className="text-xs text-gray-500">
            {mentor.hourlyRate ? '/hour' : mentor.availability}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MessageCircle className="w-4 h-4 mr-1" />
            Message
          </Button>
          <Button size="sm" className="bg-[var(--brand-primary)]">
            <Calendar className="w-4 h-4 mr-1" />
            Book
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface MentorshipRequestCardProps {
  post: MentorshipRequestCardModel;
  onOffer: () => void;
}

const MentorshipRequestCard = ({ post, onOffer }: MentorshipRequestCardProps) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={post.author.avatar} />
          <AvatarFallback className="bg-[var(--brand-primary)] text-white">
            {post.author.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{post.author.name}</h3>
          <p className="text-sm text-gray-500">{post.author.company}</p>
          <Badge className="mt-1 bg-pink-100 text-pink-700">
            <GraduationCap className="w-3 h-3 mr-1" />
            Seeking Mentor
          </Badge>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{post.content}</p>

      <div className="bg-pink-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-600 mb-2">Looking for expertise in:</p>
        <div className="flex flex-wrap gap-1">
          {post.mentorship.expertise.map((expertise) => (
            <Badge key={expertise} variant="secondary">
              {expertise}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Commitment: {post.mentorship.commitment} | Duration: {post.mentorship.duration}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <MessageCircle className="w-4 h-4 mr-1" />
          Message
        </Button>
        <Button className="flex-1 bg-[var(--brand-primary)]" onClick={onOffer}>
          <Award className="w-4 h-4 mr-1" />
          Offer Mentorship
        </Button>
      </div>
    </CardContent>
  </Card>
);

interface MyMentorshipCardProps {
  mentorship: MyMentorshipCardModel;
}

const MyMentorshipCard = ({ mentorship }: MyMentorshipCardProps) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-5 space-y-4">
      <div className="flex items-start gap-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={mentorship.counterpartAvatar} />
          <AvatarFallback className="bg-[var(--brand-primary)] text-white">
            {mentorship.counterpartName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{mentorship.counterpartName}</h3>
            <Badge variant="outline">{mentorship.role === 'mentor' ? 'You mentor' : 'Your mentor'}</Badge>
            <Badge
              className={
                mentorship.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : mentorship.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : mentorship.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
              }
            >
              {mentorship.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{mentorship.counterpartCompany}</p>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-1">Focus Areas</p>
        <div className="flex flex-wrap gap-1">
          {mentorship.expertise.map((expertise) => (
            <Badge key={expertise} variant="secondary">
              {expertise}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-gray-500">Sessions</p>
          <p className="font-semibold">{mentorship.sessionsCompleted}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-gray-500">Timeline</p>
          <p className="font-semibold flex items-center gap-1">
            <Clock3 className="w-4 h-4" />
            {mentorship.startDate ?? 'Pending'}{mentorship.endDate ? ` - ${mentorship.endDate}` : ''}
          </p>
        </div>
      </div>

      {mentorship.rating ? (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-sm font-semibold mb-1">Feedback</p>
          <p className="text-sm text-gray-700">
            Rating: {mentorship.rating}/5
            {mentorship.review ? ` | ${mentorship.review}` : ''}
          </p>
        </div>
      ) : null}
    </CardContent>
  </Card>
);

export default Mentorship;
