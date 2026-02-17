import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { profileService } from '@/services/profileService';
import type { BusinessProfile } from '@/types';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Users,
  Eye,
  Calendar,
  Briefcase,
  DollarSign,
  Linkedin,
  Twitter,
  Mail,
  MessageSquare,
  UserPlus,
  Share2,
  Building2,
} from 'lucide-react';

const ProfileDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [similarProfiles, setSimilarProfiles] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [profileData, similarData] = await Promise.all([
          profileService.getProfileById(id),
          profileService.getSimilarBusinesses(id, 3),
        ]);
        setProfile(profileData);
        setSimilarProfiles(similarData);
        if (profileData) {
          profileService.incrementViews(id);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-xl mb-6" />
          <div className="flex gap-6">
            <div className="w-32 h-32 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile not found</h2>
        <p className="text-gray-600 mb-4">The profile you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/dashboard/profiles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profiles
        </Button>
      </div>
    );
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      idea: 'bg-gray-100 text-gray-700',
      seed: 'bg-blue-100 text-blue-700',
      early: 'bg-green-100 text-green-700',
      growth: 'bg-orange-100 text-orange-700',
      established: 'bg-purple-100 text-purple-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Cover Image */}
      <div className="relative h-64 rounded-xl overflow-hidden bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)]">
        {profile.coverImage ? (
          <img
            src={profile.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]" />
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="relative -mt-20 px-6">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <Avatar className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg">
            <AvatarImage src={profile.logo} />
            <AvatarFallback className="bg-[var(--brand-primary)] text-white text-4xl rounded-2xl">
              {profile.companyName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{profile.companyName}</h1>
              <Badge className={getStageColor(profile.stage)}>
                {profile.stage}
              </Badge>
            </div>
            <p className="text-lg text-gray-600">{profile.tagline}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {profile.industry}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.location.city}, {profile.location.country}
              </span>
              {profile.foundedYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Founded {profile.foundedYear}
                </span>
              )}
              {profile.teamSize && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {profile.teamSize} employees
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pb-2">
            <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
              <UserPlus className="w-4 h-4 mr-2" />
              Connect
            </Button>
            <Button variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-6 px-6 py-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-gray-400" />
          <span className="font-semibold">{profile.views.toLocaleString()}</span>
          <span className="text-gray-500">views</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="font-semibold">{profile.connections}</span>
          <span className="text-gray-500">connections</span>
        </div>
        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[var(--brand-primary)] hover:underline ml-auto"
          >
            <Globe className="w-5 h-5" />
            Visit Website
          </a>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="skills">Skills & Expertise</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">{profile.description}</p>
                </CardContent>
              </Card>

              {profile.fundingNeeded && (
                <Card className="border-[var(--brand-secondary)]/30 bg-[var(--brand-secondary)]/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--brand-secondary)]">
                      <DollarSign className="w-5 h-5" />
                      Seeking Investment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      This business is currently seeking funding to accelerate growth.
                    </p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Amount Needed</p>
                        <p className="text-2xl font-bold text-[var(--brand-secondary)]">
                          ${profile.fundingAmount?.toLocaleString()}
                        </p>
                      </div>
                      <Button className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]">
                        Express Interest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>What We're Looking For</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.lookingFor.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Industry</p>
                      <p className="font-medium">{profile.industry}</p>
                    </div>
                    {profile.subIndustry && (
                      <div>
                        <p className="text-sm text-gray-500">Sub-Industry</p>
                        <p className="font-medium">{profile.subIndustry}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">
                        {profile.location.city}, {profile.location.country}
                      </p>
                    </div>
                    {profile.foundedYear && (
                      <div>
                        <p className="text-sm text-gray-500">Founded</p>
                        <p className="font-medium">{profile.foundedYear}</p>
                      </div>
                    )}
                    {profile.teamSize && (
                      <div>
                        <p className="text-sm text-gray-500">Team Size</p>
                        <p className="font-medium">{profile.teamSize}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Stage</p>
                      <p className="font-medium capitalize">{profile.stage}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Description</p>
                    <p className="text-gray-600 leading-relaxed">{profile.description}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge
                        key={skill}
                        className="px-3 py-1 text-sm bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Achievements & Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {profile.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm">✓</span>
                        </div>
                        <span className="text-gray-600">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Social Links */}
            {(profile.socialLinks.linkedin || profile.socialLinks.twitter) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.socialLinks.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Linkedin className="w-5 h-5 text-[#0077b5]" />
                      <span className="text-gray-700">LinkedIn</span>
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${profile.socialLinks.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Twitter className="w-5 h-5 text-[#1da1f2]" />
                      <span className="text-gray-700">{profile.socialLinks.twitter}</span>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Similar Profiles */}
            {similarProfiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Similar Businesses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {similarProfiles.map((similar) => (
                    <Link
                      key={similar.id}
                      to={`/dashboard/profiles/${similar.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="w-10 h-10 rounded-lg">
                        <AvatarImage src={similar.logo} />
                        <AvatarFallback className="bg-[var(--brand-primary)] text-white text-sm rounded-lg">
                          {similar.companyName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {similar.companyName}
                        </p>
                        <p className="text-sm text-gray-500">{similar.industry}</p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request Connection
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default ProfileDetail;
