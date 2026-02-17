import { useState } from 'react';
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
} from 'lucide-react';

const Mentorship = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  
  // Use requestMessage to avoid unused variable warning
  void requestMessage;

  const mentorshipPosts = mockPosts.filter(p => p.type === 'mentorship' && p.mentorship);
  
  // Mock mentors
  const mentors = [
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
      rating: 5.0,
      reviews: 29,
      mentees: 15,
      availability: 'part-time',
      hourlyRate: 300,
      bio: 'Healthcare regulatory expert with 10+ years navigating FDA approvals.',
    },
  ];

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

  const filteredMentors = mentors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesExpertise = selectedExpertise === 'all' || m.expertise.includes(selectedExpertise);
    return matchesSearch && matchesExpertise;
  });

  const handleRequestMentorship = (request: any) => {
    setSelectedRequest(request);
    setIsRequestDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Available Mentors</p>
            <p className="text-2xl font-bold">{mentors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Active Mentorships</p>
            <p className="text-2xl font-bold">156</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Avg. Rating</p>
            <p className="text-2xl font-bold text-yellow-500">4.8/5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Mentees Helped</p>
            <p className="text-2xl font-bold">2,340</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
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

      {/* Tabs */}
      <Tabs defaultValue="mentors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mentors" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Find Mentors ({filteredMentors.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Mentorship Requests ({mentorshipPosts.length})
          </TabsTrigger>
          <TabsTrigger value="my-mentors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            My Mentors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentors" className="space-y-4">
          {filteredMentors.length === 0 ? (
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
          {mentorshipPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests</h3>
              <p className="text-gray-600">No one is looking for mentorship in your areas of expertise</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {mentorshipPosts.map((post) => (
                <MentorshipRequestCard 
                  key={post.id} 
                  post={post} 
                  onOffer={() => handleRequestMentorship(post)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-mentors" className="space-y-4">
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No mentors yet</h3>
            <p className="text-gray-600 mb-4">Find a mentor to accelerate your growth</p>
            <Button className="bg-[var(--brand-primary)]">
              <Award className="w-4 h-4 mr-2" />
              Browse Mentors
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle>Offer Mentorship</DialogTitle>
                <DialogDescription>
                  Send a message to {selectedRequest.author.name} offering your mentorship
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Request Summary */}
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
                    {selectedRequest.mentorship.expertise.map((e: string) => (
                      <Badge key={e} variant="secondary">{e}</Badge>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Your Message
                  </label>
                  <Textarea
                    placeholder="Introduce yourself and explain how you can help..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button 
                  className="w-full bg-[var(--brand-primary)]"
                  onClick={() => {
                    setIsRequestDialogOpen(false);
                    alert('Mentorship offer sent!');
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Send Offer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface MentorCardProps {
  mentor: any;
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
            <span className="font-medium">{mentor.rating}</span>
            <span className="text-sm text-gray-500">({mentor.reviews} reviews)</span>
          </div>
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-4">{mentor.bio}</p>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Expertise</p>
          <div className="flex flex-wrap gap-1">
            {mentor.expertise.map((e: string) => (
              <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            <Briefcase className="w-4 h-4" />
            {mentor.experience} years exp.
          </span>
          <span className="flex items-center gap-1 text-gray-600">
            <Users className="w-4 h-4" />
            {mentor.mentees} mentees
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <p className="text-lg font-bold text-[var(--brand-primary)]">${mentor.hourlyRate}</p>
          <p className="text-xs text-gray-500">/hour</p>
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
  post: any;
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
          {post.mentorship.expertise.map((e: string) => (
            <Badge key={e} variant="secondary">{e}</Badge>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Commitment: {post.mentorship.commitment} • Duration: {post.mentorship.duration}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <MessageCircle className="w-4 h-4 mr-1" />
          Message
        </Button>
        <Button 
          className="flex-1 bg-[var(--brand-primary)]"
          onClick={onOffer}
        >
          <Award className="w-4 h-4 mr-1" />
          Offer Mentorship
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default Mentorship;
