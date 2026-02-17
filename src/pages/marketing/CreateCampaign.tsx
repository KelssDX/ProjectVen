import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { campaignTypes, targetLocations, calculateCampaignCost } from '@/data/mockCampaigns';
import { industries } from '@/data/mockProfiles';
import { userTypeLabels } from '@/data/mockProfiles';
import type { UserType } from '@/types';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronRight,
  DollarSign,
  Users,
  Target,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    targetIndustries: [] as string[],
    targetLocations: [] as string[],
    targetUserTypes: [] as UserType[],
    budget: 0,
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSuccess(true);
  };

  const toggleArrayItem = (field: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const arr = prev[field] as string[];
      const updated = arr.includes(value)
        ? arr.filter(item => item !== value)
        : [...arr, value];
      return { ...prev, [field]: updated };
    });
  };

  const estimatedCost =
    formData.type && formData.startDate && formData.endDate
      ? calculateCampaignCost(formData.type, formData.startDate, formData.endDate)
      : 0;

  const userTypes: UserType[] = ['sme', 'entrepreneur', 'investor', 'mentor'];

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center p-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Created!</h2>
          <p className="text-gray-600 mb-6">
            Your campaign "{formData.name}" has been created and is now pending review.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard/marketing')}>
              View All Campaigns
            </Button>
            <Button
              className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]"
              onClick={() => navigate('/dashboard/marketing')}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard/marketing')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Campaign</h2>
          <p className="text-gray-600">Set up your marketing campaign in 4 simple steps</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full transition-colors ${
              s <= step ? 'bg-[var(--brand-secondary)]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Step 1: Campaign Basics'}
            {step === 2 && 'Step 2: Campaign Type'}
            {step === 3 && 'Step 3: Target Audience'}
            {step === 4 && 'Step 4: Review & Launch'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Give your campaign a name and set the duration'}
            {step === 2 && 'Choose how you want to promote your business'}
            {step === 3 && 'Define who you want to reach'}
            {step === 4 && 'Review your campaign details before launching'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Product Launch"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {formData.startDate
                          ? format(formData.startDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => setFormData({ ...formData, startDate: date })}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {formData.endDate
                          ? format(formData.endDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => setFormData({ ...formData, endDate: date })}
                        disabled={(date) =>
                          date < new Date() ||
                          !!(formData.startDate && date <= formData.startDate)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Campaign Type */}
          {step === 2 && (
            <div className="space-y-4">
              {campaignTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.type === type.value
                      ? 'border-[var(--brand-secondary)] bg-[var(--brand-secondary)]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{type.label}</h4>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--brand-secondary)]">
                        ${type.pricePerDay}/day
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Target Audience */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Industries */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" />
                  Target Industries
                </Label>
                <div className="flex flex-wrap gap-2">
                  {industries.map((industry) => (
                    <Badge
                      key={industry}
                      variant={formData.targetIndustries.includes(industry) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        formData.targetIndustries.includes(industry)
                          ? 'bg-[var(--brand-primary)]'
                          : ''
                      }`}
                      onClick={() => toggleArrayItem('targetIndustries', industry)}
                    >
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  Target Locations
                </Label>
                <div className="flex flex-wrap gap-2">
                  {targetLocations.map((location) => (
                    <Badge
                      key={location}
                      variant={formData.targetLocations.includes(location) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        formData.targetLocations.includes(location)
                          ? 'bg-[var(--brand-primary)]'
                          : ''
                      }`}
                      onClick={() => toggleArrayItem('targetLocations', location)}
                    >
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* User Types */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" />
                  Target User Types
                </Label>
                <div className="flex flex-wrap gap-2">
                  {userTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={formData.targetUserTypes.includes(type) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        formData.targetUserTypes.includes(type)
                          ? 'bg-[var(--brand-primary)]'
                          : ''
                      }`}
                      onClick={() => toggleArrayItem('targetUserTypes', type)}
                    >
                      {userTypeLabels[type]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Campaign Name</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Campaign Type</span>
                  <span className="font-medium">
                    {campaignTypes.find(t => t.value === formData.type)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">
                    {formData.startDate && format(formData.startDate, 'MMM d')} -{' '}
                    {formData.endDate && format(formData.endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Estimated Cost</span>
                  <span className="font-bold text-[var(--brand-secondary)]">
                    ${estimatedCost.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p>
                  By launching this campaign, you agree to our{' '}
                  <a href="#" className="text-[var(--brand-primary)] hover:underline">
                    Advertising Terms
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-[var(--brand-primary)] hover:underline">
                    Content Guidelines
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && (!formData.name || !formData.startDate || !formData.endDate)) ||
                  (step === 2 && !formData.type)
                }
                className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary-dark)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCampaign;
