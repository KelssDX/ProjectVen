import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { profileService } from '@/services/profileService';
import { industries, stages, skills } from '@/data/mockProfiles';
import type { BusinessProfile, SearchFilters } from '@/types';
import {
  Search,
  Filter,
  MapPin,
  Users,
  X,
  Building2,
  DollarSign,
} from 'lucide-react';

const ProfileDirectory = () => {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    industry: [],
    stage: [],
    skills: [],
    fundingNeeded: undefined,
  });

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await profileService.getProfiles(page, 12, {
        ...filters,
        query: searchQuery || undefined,
      });
      setProfiles(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, searchQuery]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Search suggestions
  useEffect(() => {
    const getSuggestions = async () => {
      if (searchQuery.length >= 2) {
        const suggs = await profileService.getSearchSuggestions(searchQuery);
        setSuggestions(suggs);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    getSuggestions();
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setPage(1);
    loadProfiles();
  };

  const toggleFilter = (type: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const current = (prev[type] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      industry: [],
      stage: [],
      skills: [],
      fundingNeeded: undefined,
    });
    setSearchQuery('');
    setPage(1);
  };

  const activeFiltersCount =
    filters.industry!.length +
    filters.stage!.length +
    filters.skills!.length +
    (filters.fundingNeeded !== undefined ? 1 : 0);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Browse Profiles</h2>
          <p className="text-gray-600 mt-1">
            Discover {total.toLocaleString()} businesses, entrepreneurs, and investors
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by company name, industry, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-12 px-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[var(--brand-primary)] text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Button type="submit" className="h-12 px-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
            Search
          </Button>
        </form>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="animate-in slide-in-from-top-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Industry Filter */}
              <div>
                <Label className="font-medium mb-3 block">Industry</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {industries.map((industry) => (
                    <div key={industry} className="flex items-center space-x-2">
                      <Checkbox
                        id={`industry-${industry}`}
                        checked={filters.industry?.includes(industry)}
                        onCheckedChange={() => toggleFilter('industry', industry)}
                      />
                      <Label
                        htmlFor={`industry-${industry}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {industry}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Filter */}
              <div>
                <Label className="font-medium mb-3 block">Business Stage</Label>
                <div className="space-y-2">
                  {stages.map((stage) => (
                    <div key={stage.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stage-${stage.value}`}
                        checked={filters.stage?.includes(stage.value)}
                        onCheckedChange={() => toggleFilter('stage', stage.value)}
                      />
                      <Label
                        htmlFor={`stage-${stage.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {stage.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills & Funding */}
              <div className="space-y-6">
                <div>
                  <Label className="font-medium mb-3 block">Skills</Label>
                  <Select
                    onValueChange={(value) => toggleFilter('skills', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skills..." />
                    </SelectTrigger>
                    <SelectContent>
                      {skills.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          <div className="flex items-center">
                            {filters.skills?.includes(skill) && (
                              <span className="mr-2">✓</span>
                            )}
                            {skill}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.skills && filters.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filters.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleFilter('skills', skill)}
                        >
                          {skill} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="font-medium mb-3 block">Funding Status</Label>
                  <Select
                    value={filters.fundingNeeded?.toString() || 'all'}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        fundingNeeded: value === 'all' ? undefined : value === 'true',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any status</SelectItem>
                      <SelectItem value="true">Seeking funding</SelectItem>
                      <SelectItem value="false">Not seeking funding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.industry?.map((industry) => (
            <Badge
              key={industry}
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => toggleFilter('industry', industry)}
            >
              {industry} <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          {filters.stage?.map((stage) => (
            <Badge
              key={stage}
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => toggleFilter('stage', stage)}
            >
              {stages.find((s) => s.value === stage)?.label} <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          {filters.fundingNeeded !== undefined && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() =>
                setFilters((prev) => ({ ...prev, fundingNeeded: undefined }))
              }
            >
              {filters.fundingNeeded ? 'Seeking funding' : 'Not seeking funding'}{' '}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      <Separator />

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No profiles found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
          <Button variant="outline" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/dashboard/profiles/${profile.id}`}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="w-14 h-14 rounded-lg">
                        <AvatarImage src={profile.logo} />
                        <AvatarFallback className="bg-[var(--brand-primary)] text-white text-lg rounded-lg">
                          {profile.companyName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors truncate">
                          {profile.companyName}
                        </h3>
                        <p className="text-sm text-gray-500">{profile.industry}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {profile.tagline || profile.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className={getStageColor(profile.stage)}>
                        {profile.stage}
                      </Badge>
                      {profile.fundingNeeded && (
                        <Badge variant="outline" className="text-[var(--brand-secondary)] border-[var(--brand-secondary)]">
                          <DollarSign className="w-3 h-3 mr-1" />
                          Seeking
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.location.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {profile.connections}
                      </span>
                    </div>

                    {profile.skills.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1">
                          {profile.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {profile.skills.length > 3 && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              +{profile.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 12)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileDirectory;
