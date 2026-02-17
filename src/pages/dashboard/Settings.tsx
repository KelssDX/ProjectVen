import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Moon, 
  Sun, 
  Bell, 
  User, 
  Globe, 
  Shield,
  CheckCircle2,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  Check,
  Newspaper,
  Clock,
  CalendarDays,
  Star,
  BarChart3,
  X,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  defaultBriefboardSettings,
  loadBriefboardSettings,
  saveBriefboardSettings,
  type BriefboardSettings,
} from '@/utils/briefboard';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [briefboardSettings, setBriefboardSettings] = useState<BriefboardSettings>(
    defaultBriefboardSettings
  );
  const [newTime, setNewTime] = useState('');
  const [newDate, setNewDate] = useState('');

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    messages: true,
    opportunities: true,
    networkUpdates: false,
    marketing: false,
    briefing: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showEmail: false,
    showPhone: false,
    allowMessaging: true,
    showActivity: true,
  });

  useEffect(() => {
    setBriefboardSettings(loadBriefboardSettings(user?.id));
  }, [user?.id]);

  const handleAddTime = () => {
    if (!newTime) return;
    setBriefboardSettings((prev) => ({
      ...prev,
      allowedTimes: prev.allowedTimes.includes(newTime)
        ? prev.allowedTimes
        : [...prev.allowedTimes, newTime],
    }));
    setNewTime('');
  };

  const handleRemoveTime = (time: string) => {
    setBriefboardSettings((prev) => ({
      ...prev,
      allowedTimes: prev.allowedTimes.filter((t) => t !== time),
    }));
  };

  const handleAddDate = () => {
    if (!newDate) return;
    setBriefboardSettings((prev) => ({
      ...prev,
      specificDates: prev.specificDates.includes(newDate)
        ? prev.specificDates
        : [...prev.specificDates, newDate],
    }));
    setNewDate('');
  };

  const handleRemoveDate = (date: string) => {
    setBriefboardSettings((prev) => ({
      ...prev,
      specificDates: prev.specificDates.filter((d) => d !== date),
    }));
  };

  const frequencyOptions: { value: BriefboardSettings['frequency']; label: string }[] = [
    { value: 'never', label: 'Never (go to The Hub)' },
    { value: 'hourly', label: 'Once every hour' },
    { value: 'four_times_daily', label: 'Quarterly in the day (4x)' },
    { value: 'twice_daily', label: 'Twice a day' },
    { value: 'daily', label: 'Once a day' },
    { value: 'every_3_days', label: 'Once every 3 days' },
    { value: 'weekly', label: 'Once a week' },
    { value: 'monthly', label: 'Once a month' },
  ];
  const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const verificationProfile = user?.verification ?? {
    level: user?.isVerified ? 'verified' : 'basic',
    badges:
      user?.userType === 'sme'
        ? ['company', 'seller']
        : user?.userType === 'entrepreneur'
          ? ['entrepreneur', 'seller']
          : user?.userType === 'mentor'
            ? ['mentor']
            : user?.userType === 'investor'
              ? ['investor']
              : ['buyer'],
    venScore: 0,
    businessScore: 0,
  };

  const verificationBadges = [
    { key: 'buyer', label: 'Buyer / Client' },
    { key: 'entrepreneur', label: 'Entrepreneur' },
    { key: 'company', label: 'Company' },
    { key: 'mentor', label: 'Mentor' },
    { key: 'investor', label: 'Investor' },
    { key: 'seller', label: 'Seller' },
    { key: 'promoter', label: 'Promoter' },
  ];

  const verificationRequirements = [
    'Sell products or services',
    'Offer mentorship',
    'Seek investments',
    'Launch crowdfunding',
    'Run Promote campaigns',
  ];

  const verificationStatusLabel =
    verificationProfile.level === 'trusted'
      ? 'Trusted Verified'
      : verificationProfile.level === 'verified'
        ? 'Verified'
        : 'Unverified';

  const handleSave = () => {
    saveBriefboardSettings(briefboardSettings, user?.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and settings</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="briefboard" className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Briefboard
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Choose your preferred color scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    {theme === 'light' ? (
                      <Sun className="w-6 h-6 text-amber-500" />
                    ) : (
                      <Moon className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</p>
                    <p className="text-sm text-muted-foreground">
                      {theme === 'light' 
                        ? 'Easy on the eyes during daytime' 
                        : 'Easier on the eyes in low light'}
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={toggleTheme}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-base">Theme Preview</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      theme === 'light' ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => theme === 'dark' && toggleTheme()}
                  >
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="h-2 w-20 bg-gray-200 rounded mb-2" />
                      <div className="h-2 w-32 bg-gray-100 rounded" />
                    </div>
                    <p className="text-center mt-2 text-sm font-medium">Light</p>
                  </div>
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      theme === 'dark' ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => theme === 'light' && toggleTheme()}
                  >
                    <div className="bg-slate-900 rounded-lg p-4 shadow-sm">
                      <div className="h-2 w-20 bg-slate-700 rounded mb-2" />
                      <div className="h-2 w-32 bg-slate-800 rounded" />
                    </div>
                    <p className="text-center mt-2 text-sm font-medium">Dark</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.email}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive push notifications</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.push}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs">M</span>
                    </div>
                    <div>
                      <p className="font-medium">New Messages</p>
                      <p className="text-sm text-muted-foreground">When someone sends you a message</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.messages}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, messages: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">$</span>
                    </div>
                    <div>
                      <p className="font-medium">Opportunities</p>
                      <p className="text-sm text-muted-foreground">New investment or partnership opportunities</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.opportunities}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, opportunities: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xs">N</span>
                    </div>
                    <div>
                      <p className="font-medium">Network Updates</p>
                      <p className="text-sm text-muted-foreground">When connections post updates</p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.networkUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, networkUpdates: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Newspaper className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Briefing Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Notifications about new briefings and summaries
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={notifications.briefing}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, briefing: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control who can see your information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Public Profile</p>
                      <p className="text-sm text-muted-foreground">Make your profile visible to everyone</p>
                    </div>
                  </div>
                  <Switch 
                    checked={privacy.publicProfile}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, publicProfile: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Show Email</p>
                      <p className="text-sm text-muted-foreground">Display email on your profile</p>
                    </div>
                  </div>
                  <Switch 
                    checked={privacy.showEmail}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, showEmail: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Show Phone</p>
                      <p className="text-sm text-muted-foreground">Display phone number on your profile</p>
                    </div>
                  </div>
                  <Switch 
                    checked={privacy.showPhone}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, showPhone: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">M</span>
                    </div>
                    <div>
                      <p className="font-medium">Allow Messaging</p>
                      <p className="text-sm text-muted-foreground">Let others send you messages</p>
                    </div>
                  </div>
                  <Switch 
                    checked={privacy.allowMessaging}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, allowMessaging: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Briefboard Settings */}
        <TabsContent value="briefboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                Briefboard Landing
              </CardTitle>
              <CardDescription>
                Control how often you land on Briefboard after logging in. If set to never,
                you will be redirected to The Hub.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Landing Frequency</Label>
                  <Select
                    value={briefboardSettings.frequency}
                    onValueChange={(value) =>
                      setBriefboardSettings((prev) => ({
                        ...prev,
                        frequency: value as BriefboardSettings['frequency'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Allowed Days (optional)</Label>
                  <ToggleGroup
                    type="multiple"
                    value={briefboardSettings.allowedDays}
                    onValueChange={(value) =>
                      setBriefboardSettings((prev) => ({
                        ...prev,
                        allowedDays: value as string[],
                      }))
                    }
                    className="flex flex-wrap"
                  >
                    {dayOptions.map((day) => (
                      <ToggleGroupItem key={day} value={day} variant="outline" size="sm">
                        {day}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow any day of the week.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Preferred Times (optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleAddTime}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {briefboardSettings.allowedTimes.map((time) => (
                      <Badge key={time} variant="secondary" className="flex items-center gap-1">
                        {time}
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(time)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Briefboard can appear within about an hour of selected times.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Specific Dates (optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleAddDate}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {briefboardSettings.specificDates.map((date) => (
                      <Badge key={date} variant="secondary" className="flex items-center gap-1">
                        {date}
                        <button
                          type="button"
                          onClick={() => handleRemoveDate(date)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If dates are selected, Briefboard will only show on those dates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Settings */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Verification & Trust
              </CardTitle>
              <CardDescription>
                Verification builds trust across Vendrom and unlocks selling, mentorship, and promotion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold text-foreground">{verificationStatusLabel}</p>
                </div>
                <Badge
                  variant={verificationProfile.level === 'basic' ? 'outline' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {verificationProfile.level === 'basic' ? 'Needs Verification' : 'Verified'}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Your Verification Badges</p>
                <div className="flex flex-wrap gap-2">
                  {verificationBadges.map((badge) => {
                    const active = verificationProfile.badges.includes(badge.key);
                    return (
                      <Badge
                        key={badge.key}
                        variant={active ? 'secondary' : 'outline'}
                        className={active ? 'text-primary' : 'text-muted-foreground'}
                      >
                        {badge.label}
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Badges show who you are on the platform (buyer, entrepreneur, company, mentor, investor).
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 text-amber-500" />
                    Ven Score
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {verificationProfile.venScore > 0 ? verificationProfile.venScore.toFixed(1) : 'New'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trustworthiness for product and service transactions.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Business Score
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {verificationProfile.businessScore > 0 ? verificationProfile.businessScore : 'New'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Growth score based on activity, traction, and platform engagement.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Verification Required For</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {verificationRequirements.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item}</span>
                      <Badge variant="outline" className="text-[10px]">
                        Required
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Buyers can verify optionally to earn a Buyer badge and show verified purchase status.
                </p>
              </div>

              <Button className="w-full sm:w-auto bg-[var(--brand-primary)]">
                Start Verification
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    defaultValue={`${user?.firstName} ${user?.lastName}`} 
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    defaultValue={user?.email} 
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'}
                      defaultValue="********"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="w-full md:w-auto">
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
