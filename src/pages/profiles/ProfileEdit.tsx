import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { profileService } from '@/services/profileService';
import { industries, stages, teamSizes, skills } from '@/data/mockProfiles';
import type { BusinessProfile } from '@/types';
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  X,
  Building2,
  Globe,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newLookingFor, setNewLookingFor] = useState('');
  const [newAchievement, setNewAchievement] = useState('');

  const [formData, setFormData] = useState<Partial<BusinessProfile>>({
    companyName: '',
    tagline: '',
    description: '',
    industry: '',
    subIndustry: '',
    location: { city: '', country: '' },
    website: '',
    foundedYear: undefined,
    teamSize: '',
    stage: 'idea',
    fundingNeeded: false,
    fundingAmount: undefined,
    skills: [],
    lookingFor: [],
    achievements: [],
    socialLinks: {},
    isPublic: true,
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const profile = await profileService.getProfileByUserId(user.id);
        if (profile) {
          setFormData(profile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: 'city' | 'country', value: string) => {
    setFormData(prev => ({
      ...prev,
      location: { 
        city: prev.location?.city || '', 
        country: prev.location?.country || '',
        [field]: value 
      },
    }));
  };

  const addSkill = () => {
    if (newSkill && !formData.skills?.includes(newSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skill) || [],
    }));
  };

  const addLookingFor = () => {
    if (newLookingFor && !formData.lookingFor?.includes(newLookingFor)) {
      setFormData(prev => ({
        ...prev,
        lookingFor: [...(prev.lookingFor || []), newLookingFor],
      }));
      setNewLookingFor('');
    }
  };

  const removeLookingFor = (item: string) => {
    setFormData(prev => ({
      ...prev,
      lookingFor: prev.lookingFor?.filter(i => i !== item) || [],
    }));
  };

  const addAchievement = () => {
    if (newAchievement && !formData.achievements?.includes(newAchievement)) {
      setFormData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), newAchievement],
      }));
      setNewAchievement('');
    }
  };

  const removeAchievement = (item: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements?.filter(i => i !== item) || [],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard/profile')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
            <p className="text-gray-600">Update your business information</p>
          </div>
        </div>
        {successMessage && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Essential details about your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="A short description of your business"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                required
                placeholder="Tell us about your business, mission, and what you do..."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleChange('industry', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subIndustry">Sub-Industry</Label>
                <Input
                  id="subIndustry"
                  value={formData.subIndustry}
                  onChange={(e) => handleChange('subIndustry', e.target.value)}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://yourcompany.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input
                  id="foundedYear"
                  type="number"
                  value={formData.foundedYear || ''}
                  onChange={(e) => handleChange('foundedYear', parseInt(e.target.value) || undefined)}
                  placeholder="2020"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location & Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.location?.city}
                  onChange={(e) => handleLocationChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.location?.country}
                  onChange={(e) => handleLocationChange('country', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamSize">
                  <Users className="w-4 h-4 inline mr-1" />
                  Team Size
                </Label>
                <Select
                  value={formData.teamSize}
                  onValueChange={(value) => handleChange('teamSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size} employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Business Stage *</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => handleChange('stage', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Funding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fundingNeeded"
                checked={formData.fundingNeeded}
                onCheckedChange={(checked) =>
                  handleChange('fundingNeeded', checked)
                }
              />
              <Label htmlFor="fundingNeeded" className="font-normal cursor-pointer">
                Currently seeking funding
              </Label>
            </div>

            {formData.fundingNeeded && (
              <div className="space-y-2">
                <Label htmlFor="fundingAmount">Funding Amount Needed (USD)</Label>
                <Input
                  id="fundingAmount"
                  type="number"
                  value={formData.fundingAmount || ''}
                  onChange={(e) =>
                    handleChange('fundingAmount', parseInt(e.target.value) || undefined)
                  }
                  placeholder="1000000"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
            <CardDescription>
              Add skills that your team possesses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={newSkill} onValueChange={setNewSkill}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a skill..." />
                </SelectTrigger>
                <SelectContent>
                  {skills
                    .filter((s) => !formData.skills?.includes(s))
                    .map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addSkill} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills?.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => removeSkill(skill)}
                >
                  {skill} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Looking For */}
        <Card>
          <CardHeader>
            <CardTitle>What You're Looking For</CardTitle>
            <CardDescription>
              Describe what partnerships or opportunities you seek
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newLookingFor}
                onChange={(e) => setNewLookingFor(e.target.value)}
                placeholder="e.g., Strategic Partners, Investors..."
                className="flex-1"
              />
              <Button type="button" onClick={addLookingFor} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.lookingFor?.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => removeLookingFor(item)}
                >
                  {item} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements & Milestones</CardTitle>
            <CardDescription>
              Highlight your key accomplishments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="e.g., Y Combinator Graduate, $1M Revenue..."
                className="flex-1"
              />
              <Button type="button" onClick={addAchievement} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              {formData.achievements?.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeAchievement(item)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/profile')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEdit;
