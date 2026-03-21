import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  marketplaceApi,
  type MarketplaceProductListingDto,
  type MarketplaceReviewDto,
  type MarketplaceReviewSummaryDto,
  type MarketplaceServiceListingDto,
} from '@/api/marketplace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBookmarks } from '@/context/BookmarkContext';
import { useCalendarPanel } from '@/context/CalendarPanelContext';
import { mockPosts } from '@/data/mockPosts';
import { categories } from '@/data/mockPosts';
import type { Product, Service } from '@/types';
import {
  Search,
  ShoppingCart,
  Package,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Star,
} from 'lucide-react';

const USE_REAL_MARKETPLACE =
  import.meta.env.VITE_FEATURE_USE_REAL_MARKETPLACE === 'true';

interface VenReview {
  id: string;
  reviewer: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: Date;
}

interface ReviewTarget {
  postId: string;
  itemName: string;
  itemType: 'product' | 'service';
  sellerName: string;
}

interface ReviewSummary {
  average: number;
  count: number;
  verifiedCount: number;
}

interface MarketplaceDisplayPost {
  id: string;
  userId: string;
  author: {
    name: string;
    company: string;
    avatar?: string;
    userType?: string;
  };
  media?: Array<{ url: string }>;
  createdAt: Date;
  bookmarks?: number;
}

type MarketplaceProductCardModel = Product & { post: MarketplaceDisplayPost };
type MarketplaceServiceCardModel = Service & { post: MarketplaceDisplayPost };

const initialReviews: Record<string, VenReview[]> = {
  '1': [
    {
      id: 'rev-1',
      reviewer: 'Alicia Green',
      reviewerAvatar: '/avatar-2.jpg',
      rating: 5,
      comment: 'Huge time saver for our reporting. Support team was responsive.',
      verifiedPurchase: true,
      createdAt: new Date('2026-01-10T10:00:00'),
    },
    {
      id: 'rev-2',
      reviewer: 'Marcus Lee',
      reviewerAvatar: '/avatar-3.jpg',
      rating: 4,
      comment: 'Strong analytics, would love more export formats.',
      verifiedPurchase: false,
      createdAt: new Date('2026-01-22T14:30:00'),
    },
  ],
  '4': [
    {
      id: 'rev-3',
      reviewer: 'Nora Patel',
      reviewerAvatar: '/avatar-4.jpg',
      rating: 5,
      comment: 'Delivered ahead of schedule and the UI is beautiful.',
      verifiedPurchase: true,
      createdAt: new Date('2026-01-18T09:15:00'),
    },
    {
      id: 'rev-4',
      reviewer: 'Samuel Wright',
      reviewerAvatar: '/avatar-1.jpg',
      rating: 4,
      comment: 'Great collaboration and clear milestones.',
      verifiedPurchase: true,
      createdAt: new Date('2026-01-25T16:40:00'),
    },
  ],
};

const getSellerBadgeLabel = (userType?: string) => {
  switch (userType) {
    case 'entrepreneur':
      return 'Entrepreneur Verified';
    case 'sme':
      return 'Company Verified';
    case 'mentor':
      return 'Mentor Verified';
    case 'investor':
      return 'Investor Verified';
    default:
      return 'Verified Seller';
  }
};

const computeReviewSummary = (reviews: VenReview[]): ReviewSummary => {
  const count = reviews.length;
  if (count === 0) {
    return { average: 0, count: 0, verifiedCount: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  const verifiedCount = reviews.filter((review) => review.verifiedPurchase).length;
  return {
    average: Number((total / count).toFixed(1)),
    count,
    verifiedCount,
  };
};

const buildInitialReviewSummaryMap = (): Record<string, ReviewSummary> =>
  Object.fromEntries(
    Object.entries(initialReviews).map(([postId, reviews]) => [
      postId,
      computeReviewSummary(reviews),
    ]),
  );

const mapApiReviewSummary = (
  summary: MarketplaceReviewSummaryDto,
): ReviewSummary => ({
  average: summary.average,
  count: summary.count,
  verifiedCount: summary.verifiedCount,
});

const mapApiReview = (review: MarketplaceReviewDto): VenReview => ({
  id: review.id,
  reviewer: review.reviewerName,
  reviewerAvatar: review.reviewerAvatar ?? undefined,
  rating: review.rating,
  comment: review.comment,
  verifiedPurchase: review.verifiedPurchase,
  createdAt: new Date(review.createdAt),
});

const mapListingPost = (
  listing:
    | MarketplaceProductListingDto
    | MarketplaceServiceListingDto,
): MarketplaceDisplayPost => ({
  id: listing.postId,
  userId: listing.seller.userId,
  author: {
    name: listing.seller.name,
    company: listing.seller.company,
    avatar: listing.seller.avatar ?? undefined,
    userType: listing.seller.userType,
  },
  media: listing.primaryImageUrl ? [{ url: listing.primaryImageUrl }] : undefined,
  createdAt: new Date(listing.createdAt),
  bookmarks: listing.bookmarks,
});

const mapProductListingToCard = (
  listing: MarketplaceProductListingDto,
): MarketplaceProductCardModel => ({
  ...listing.product,
  post: mapListingPost(listing),
});

const mapServiceListingToCard = (
  listing: MarketplaceServiceListingDto,
): MarketplaceServiceCardModel => ({
  ...listing.service,
  post: mapListingPost(listing),
});

const getMockProducts = (): MarketplaceProductCardModel[] =>
  mockPosts
    .filter((post) => post.type === 'product' && post.product)
    .map((post) => ({ ...post.product!, post }));

const getMockServices = (): MarketplaceServiceCardModel[] =>
  mockPosts
    .filter((post) => post.type === 'service' && post.service)
    .map((post) => ({ ...post.service!, post }));

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<{
    type: 'product' | 'service';
    data: Product | Service;
    post: MarketplaceDisplayPost;
  } | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewVerifiedPurchase, setReviewVerifiedPurchase] = useState(false);
  const [products, setProducts] = useState<MarketplaceProductCardModel[]>(() =>
    getMockProducts(),
  );
  const [services, setServices] = useState<MarketplaceServiceCardModel[]>(() =>
    getMockServices(),
  );
  const [isLoading, setIsLoading] = useState(USE_REAL_MARKETPLACE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('09:00');
  const [serviceNotes, setServiceNotes] = useState('');
  const { openPanel } = useCalendarPanel();
  const [venReviews, setVenReviews] =
    useState<Record<string, VenReview[]>>(initialReviews);
  const [reviewSummaries, setReviewSummaries] = useState<
    Record<string, ReviewSummary>
  >(() => buildInitialReviewSummaryMap());

  useEffect(() => {
    if (!USE_REAL_MARKETPLACE) {
      return;
    }

    let cancelled = false;

    const loadMarketplace = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [{ data: productData }, { data: serviceData }] = await Promise.all([
          marketplaceApi.getProducts({ limit: 100 }),
          marketplaceApi.getServices({ limit: 100 }),
        ]);

        if (cancelled) {
          return;
        }

        setProducts(productData.items.map(mapProductListingToCard));
        setServices(serviceData.items.map(mapServiceListingToCard));
        setReviewSummaries({
          ...Object.fromEntries(
            productData.items.map((item) => [
              item.postId,
              mapApiReviewSummary(item.reviewSummary),
            ]),
          ),
          ...Object.fromEntries(
            serviceData.items.map((item) => [
              item.postId,
              mapApiReviewSummary(item.reviewSummary),
            ]),
          ),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('Failed to load marketplace from API:', error);
        setLoadError('Unable to load live marketplace. Showing fallback data.');
        setProducts(getMockProducts());
        setServices(getMockServices());
        setReviewSummaries(buildInitialReviewSummaryMap());
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMarketplace();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [products, searchQuery, selectedCategory],
  );

  const filteredServices = useMemo(
    () =>
      services.filter((service) => {
        const matchesSearch =
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || service.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [services, searchQuery, selectedCategory],
  );

  const getReviewSummary = (postId: string): ReviewSummary =>
    reviewSummaries[postId] ?? { average: 0, count: 0, verifiedCount: 0 };

  const openReviewDialog = async (target: ReviewTarget) => {
    setReviewTarget(target);
    setReviewRating(0);
    setReviewComment('');
    setReviewVerifiedPurchase(false);
    setReviewError(null);
    setIsReviewDialogOpen(true);
    if (!USE_REAL_MARKETPLACE) {
      return;
    }

    setIsReviewLoading(true);
    try {
      const { data } = await marketplaceApi.getReviews(target.postId, 20);
      setVenReviews((previous) => ({
        ...previous,
        [target.postId]: data.items.map(mapApiReview),
      }));
    } catch (error) {
      console.error('Failed to load marketplace reviews:', error);
      setReviewError('Could not load live reviews right now.');
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget || reviewRating === 0 || !reviewComment.trim()) return;

    if (USE_REAL_MARKETPLACE) {
      setIsSavingReview(true);
      setReviewError(null);
      try {
        const { data } = await marketplaceApi.createReview(reviewTarget.postId, {
          rating: reviewRating,
          comment: reviewComment.trim(),
          verifiedPurchase: reviewVerifiedPurchase,
        });

        setVenReviews((previous) => ({
          ...previous,
          [reviewTarget.postId]: [
            mapApiReview(data.review),
            ...(previous[reviewTarget.postId] || []).filter(
              (review) => review.id !== data.review.id,
            ),
          ],
        }));
        setReviewSummaries((previous) => ({
          ...previous,
          [reviewTarget.postId]: mapApiReviewSummary(data.summary),
        }));
        setReviewRating(0);
        setReviewComment('');
        setReviewVerifiedPurchase(false);
        setIsReviewDialogOpen(false);
      } catch (error) {
        console.error('Failed to save review:', error);
        setReviewError('Failed to submit review.');
      } finally {
        setIsSavingReview(false);
      }

      return;
    }

    const newReview: VenReview = {
      id: `rev-${Date.now()}`,
      reviewer: 'Demo User',
      reviewerAvatar: '/avatar-1.jpg',
      rating: reviewRating,
      comment: reviewComment.trim(),
      verifiedPurchase: reviewVerifiedPurchase,
      createdAt: new Date(),
    };

    const nextReviews = [newReview, ...(venReviews[reviewTarget.postId] || [])];
    setVenReviews((previous) => ({
      ...previous,
      [reviewTarget.postId]: nextReviews,
    }));
    setReviewSummaries((previous) => ({
      ...previous,
      [reviewTarget.postId]: computeReviewSummary(nextReviews),
    }));
    setReviewRating(0);
    setReviewComment('');
    setReviewVerifiedPurchase(false);
    setIsReviewDialogOpen(false);
  };

  const handleOrder = (
    type: 'product' | 'service',
    data: Product | Service,
    post: MarketplaceDisplayPost,
  ) => {
    if (type === 'service') {
      openPanel();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setServiceDate(tomorrow.toISOString().slice(0, 10));
      setServiceTime('09:00');
      setServiceNotes('');
    } else {
      setOrderQuantity('1');
      setDeliveryAddress('');
      setOrderNotes('');
    }

    setOrderError(null);
    setSelectedItem({ type, data, post });
    setIsOrderDialogOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!selectedItem) {
      return;
    }

    if (USE_REAL_MARKETPLACE) {
      setIsSubmittingOrder(true);
      setOrderError(null);
      try {
        if (selectedItem.type === 'product') {
          const quantity = Math.max(1, Number(orderQuantity) || 1);
          await marketplaceApi.createOrder(selectedItem.post.id, {
            quantity,
            deliveryAddress: deliveryAddress.trim() || undefined,
            notes: orderNotes.trim() || undefined,
          });
        } else {
          if (!serviceDate || !serviceTime) {
            setOrderError('Please select a preferred date and time.');
            return;
          }

          const startAt = new Date(`${serviceDate}T${serviceTime}`);
          if (Number.isNaN(startAt.getTime())) {
            setOrderError('Please provide a valid booking date and time.');
            return;
          }

          await marketplaceApi.createBooking(selectedItem.post.id, {
            startAt: startAt.toISOString(),
            notes: serviceNotes.trim() || undefined,
          });
        }

        setIsOrderDialogOpen(false);
        alert(
          `${selectedItem.type === 'product' ? 'Order' : 'Booking'} placed successfully!`,
        );
      } catch (error) {
        console.error('Failed to submit marketplace action:', error);
        setOrderError(
          `Failed to ${selectedItem.type === 'product' ? 'place order' : 'create booking'}.`,
        );
      } finally {
        setIsSubmittingOrder(false);
      }

      return;
    }

    setIsOrderDialogOpen(false);
    alert(
      `${selectedItem.type === 'product' ? 'Order' : 'Booking'} placed successfully!`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-[var(--brand-primary)]" />
            Marketplace
          </h2>
          <p className="text-gray-600 mt-1">
            Discover products and services from our community
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search products and services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[var(--brand-primary)]' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories
          </Badge>
          {categories.slice(0, 6).map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap ${selectedCategory === cat ? 'bg-[var(--brand-primary)]' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {USE_REAL_MARKETPLACE && isLoading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Loading live marketplace...
          </CardContent>
        </Card>
      )}

      {USE_REAL_MARKETPLACE && loadError && (
        <Card>
          <CardContent className="p-4 text-sm text-amber-700">
            {loadError}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products ({filteredProducts.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Services ({filteredServices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {filteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={index}
                  product={product}
                  post={product.post}
                  onOrder={() => handleOrder('product', product, product.post)}
                  reviewSummary={getReviewSummary(product.post.id)}
                  onReview={() =>
                    openReviewDialog({
                      postId: product.post.id,
                      itemName: product.name,
                      itemType: 'product',
                      sellerName: product.post.author.company,
                    })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {filteredServices.length === 0 ? (
            <Card className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service, index) => (
                <ServiceCard
                  key={index}
                  service={service}
                  post={service.post}
                  onBook={() => handleOrder('service', service, service.post)}
                  reviewSummary={getReviewSummary(service.post.id)}
                  onReview={() =>
                    openReviewDialog({
                      postId: service.post.id,
                      itemName: service.name,
                      itemType: 'service',
                      sellerName: service.post.author.company,
                    })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order/Book Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedItem.type === 'product' ? 'Order Product' : 'Book Service'}
                </DialogTitle>
                <DialogDescription>
                  {selectedItem.type === 'product'
                    ? 'Complete your order details below'
                    : 'Select your preferred date and time'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Item Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedItem.post.author.avatar} />
                      <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                        {selectedItem.post.author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedItem.data.name}</p>
                      <p className="text-sm text-gray-500">{selectedItem.post.author.company}</p>
                      <p className="text-lg font-bold text-[var(--brand-primary)] mt-1">
                        ${selectedItem.data.price} {selectedItem.data.currency}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                {selectedItem.type === 'product' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        value={orderQuantity}
                        onChange={(event) => setOrderQuantity(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Delivery Address</label>
                      <Input
                        placeholder="Enter your address"
                        value={deliveryAddress}
                        onChange={(event) => setDeliveryAddress(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes (optional)</label>
                      <Input
                        placeholder="Any special instructions..."
                        value={orderNotes}
                        onChange={(event) => setOrderNotes(event.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Preferred Date</label>
                      <Input
                        type="date"
                        value={serviceDate}
                        onChange={(event) => setServiceDate(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Preferred Time</label>
                      <Input
                        type="time"
                        value={serviceTime}
                        onChange={(event) => setServiceTime(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Project Details</label>
                      <Input
                        placeholder="Brief description of what you need..."
                        value={serviceNotes}
                        onChange={(event) => setServiceNotes(event.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-gray-600">Total</span>
                  <span className="text-xl font-bold">
                    $
                    {selectedItem.type === 'product'
                      ? selectedItem.data.price * Math.max(1, Number(orderQuantity) || 1)
                      : selectedItem.data.price}
                  </span>
                </div>

                {orderError && (
                  <p className="text-sm text-red-600">{orderError}</p>
                )}

                <Button
                  className="w-full bg-[var(--brand-primary)]"
                  disabled={isSubmittingOrder}
                  onClick={handleConfirmOrder}
                >
                  {selectedItem.type === 'product' ? (
                    <><ShoppingCart className="w-4 h-4 mr-2" /> {isSubmittingOrder ? 'Placing Order...' : 'Place Order'}</>
                  ) : (
                    <><Calendar className="w-4 h-4 mr-2" /> {isSubmittingOrder ? 'Confirming Booking...' : 'Confirm Booking'}</>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Ven Score Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ven Score Review</DialogTitle>
            <DialogDescription>
              Rate the experience and leave a short reason. Reviews require a comment.
            </DialogDescription>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm text-muted-foreground">Reviewing</p>
                <p className="text-lg font-semibold text-foreground">
                  {reviewTarget.itemName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {reviewTarget.itemType === 'product' ? 'Product' : 'Service'} - {reviewTarget.sellerName}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Your Ven Score (1-5)</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      className={`rounded-full p-1 transition ${value <= reviewRating ? 'text-amber-500' : 'text-muted-foreground'
                        }`}
                      aria-label={`Rate ${value} out of 5`}
                    >
                      <Star className={`h-6 w-6 ${value <= reviewRating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground">
                    {reviewRating > 0 ? `${reviewRating}/5` : 'Select a score'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Reason / Comment</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share what went well or what could be improved..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Required so others understand your rating.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="verified-purchase"
                  checked={reviewVerifiedPurchase}
                  onCheckedChange={(checked) => setReviewVerifiedPurchase(Boolean(checked))}
                />
                <Label htmlFor="verified-purchase" className="text-sm">
                  I purchased this through Vendrom (adds a verified buyer badge)
                </Label>
              </div>

              <Button
                className="w-full bg-[var(--brand-primary)]"
                disabled={reviewRating === 0 || !reviewComment.trim() || isSavingReview}
                onClick={handleSubmitReview}
              >
                {isSavingReview ? 'Submitting Review...' : 'Submit Review'}
              </Button>

              {reviewError && (
                <p className="text-sm text-red-600">{reviewError}</p>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Recent Reviews</p>
                  <Badge variant="secondary">
                    {(venReviews[reviewTarget.postId] || []).length} reviews
                  </Badge>
                </div>
                {isReviewLoading ? (
                  <p className="text-sm text-muted-foreground">Loading reviews...</p>
                ) : (venReviews[reviewTarget.postId] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(venReviews[reviewTarget.postId] || []).slice(0, 3).map((review) => (
                      <div key={review.id} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={review.reviewerAvatar} />
                              <AvatarFallback>{review.reviewer[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{review.reviewer}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <Star
                                      key={value}
                                      className={`h-3 w-3 ${value <= review.rating ? 'text-amber-500 fill-current' : 'text-muted-foreground'
                                        }`}
                                    />
                                  ))}
                                </div>
                                <span>{review.rating}/5</span>
                              </div>
                            </div>
                          </div>
                          {review.verifiedPurchase && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified buyer
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface VenScoreRowProps {
  summary: ReviewSummary;
  onReview: () => void;
}

const VenScoreRow = ({ summary, onReview }: VenScoreRowProps) => {
  const ratingValue = summary.count > 0 ? summary.average : 0;
  const roundedRating = Math.round(ratingValue);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-foreground">Ven score</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={`h-3.5 w-3.5 ${value <= roundedRating ? 'text-amber-500 fill-current' : 'text-muted-foreground'
                }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {summary.count > 0 ? `${summary.average.toFixed(1)} (${summary.count})` : 'New'}
        </span>
        {summary.verifiedCount > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            Verified {summary.verifiedCount}
          </Badge>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onReview}>
        Review
      </Button>
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  post: MarketplaceDisplayPost;
  onOrder: () => void;
  onReview: () => void;
  reviewSummary: ReviewSummary;
}

const ProductCard = ({ product, post, onOrder, onReview, reviewSummary }: ProductCardProps) => {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarks ?? 0);

  const handleBookmarkToggle = () => {
    if (bookmarked) {
      removeBookmark(post.id);
      setBookmarkCount((count: number) => Math.max(0, count - 1));
      return;
    }

    addBookmark({
      title: product.name,
      description: product.description,
      type: 'post',
      category: 'business',
      tags: [product.category],
      imageUrl: post.media?.[0]?.url,
      authorName: post.author.name,
      authorAvatar: post.author.avatar,
      createdAt: post.createdAt,
      url: '/dashboard/marketplace',
      sourceId: post.id,
    });

    setBookmarkCount((count: number) => count + 1);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative">
        <img
          src={post.media?.[0]?.url || '/hero-image.jpg'}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            className={`w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-gray-100 ${bookmarked ? 'text-[var(--brand-primary)]' : 'text-gray-600'
              }`}
            onClick={handleBookmarkToggle}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save product'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs text-gray-700 shadow">
            {bookmarkCount}
          </span>
        </div>
        <Badge className="absolute bottom-2 left-2 bg-white text-gray-900">
          {product.category}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg group-hover:text-[var(--brand-primary)] transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
          </div>
        </div>

        <div className="mb-3">
          <VenScoreRow summary={reviewSummary} onReview={onReview} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-[var(--brand-primary)] text-white text-xs">
              {post.author.name[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{post.author.company}</span>
          <Badge variant="secondary" className="text-[10px]">
            {getSellerBadgeLabel(post.author.userType)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold text-[var(--brand-primary)]">${product.price}</p>
            <p className="text-xs text-gray-500">{product.currency}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/profiles/${post.userId}`}>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="sm" className="bg-[var(--brand-primary)]" onClick={onOrder}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              Order
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ServiceCardProps {
  service: Service;
  post: MarketplaceDisplayPost;
  onBook: () => void;
  onReview: () => void;
  reviewSummary: ReviewSummary;
}

const ServiceCard = ({ service, post, onBook, onReview, reviewSummary }: ServiceCardProps) => {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarks ?? 0);

  const handleBookmarkToggle = () => {
    if (bookmarked) {
      removeBookmark(post.id);
      setBookmarkCount((count: number) => Math.max(0, count - 1));
      return;
    }

    addBookmark({
      title: service.name,
      description: service.description,
      type: 'post',
      category: 'business',
      tags: [service.category],
      imageUrl: post.media?.[0]?.url,
      authorName: post.author.name,
      authorAvatar: post.author.avatar,
      createdAt: post.createdAt,
      url: '/dashboard/marketplace',
      sourceId: post.id,
    });

    setBookmarkCount((count: number) => count + 1);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative">
        <img
          src={post.media?.[0]?.url || '/cta-image.jpg'}
          alt={service.name}
          className="w-full h-48 object-cover"
        />
        <Badge className="absolute bottom-2 left-2 bg-white text-gray-900">
          {service.category}
        </Badge>
        <Badge
          className="absolute top-2 left-2"
          variant={service.availability === 'immediate' ? 'default' : 'secondary'}
        >
          {service.availability === 'immediate' ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" /> Available
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 mr-1" /> {service.availability}
            </>
          )}
        </Badge>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            className={`w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-gray-100 ${bookmarked ? 'text-[var(--brand-primary)]' : 'text-gray-600'
              }`}
            onClick={handleBookmarkToggle}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save service'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs text-gray-700 shadow">
            {bookmarkCount}
          </span>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg group-hover:text-[var(--brand-primary)] transition-colors">
              {service.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
          </div>
        </div>

        <div className="mb-3">
          <VenScoreRow summary={reviewSummary} onReview={onReview} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-[var(--brand-primary)] text-white text-xs">
              {post.author.name[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{post.author.company}</span>
          <Badge variant="secondary" className="text-[10px]">
            {getSellerBadgeLabel(post.author.userType)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold text-[var(--brand-primary)]">${service.price}</p>
            <p className="text-xs text-gray-500">/{service.priceType}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/profiles/${post.userId}`}>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="sm" className="bg-[var(--brand-primary)]" onClick={onBook}>
              <Calendar className="w-4 h-4 mr-1" />
              Book
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Marketplace;
