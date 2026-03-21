import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  CreateMarketplaceBookingBody,
  CreateMarketplaceOrderBody,
  CreateMarketplaceReviewBody,
  MarketplaceListQuery,
} from './marketplace.types';
import type {
  MarketplaceBooking,
  MarketplaceOrder,
  MarketplaceProductListing,
  MarketplaceProductListingList,
  MarketplaceReview,
  MarketplaceReviewList,
  MarketplaceReviewMutationResult,
  MarketplaceReviewSummary,
  MarketplaceServiceListing,
  MarketplaceServiceListingList,
} from '../contracts/marketplace';

interface ListingBaseRow {
  post_id: string;
  seller_user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  seller_user_type: MarketplaceProductListing['seller']['userType'];
  company_name: string | null;
  content: string;
  primary_image_url: string | null;
  bookmarks_count: string | number;
  created_at: string | Date;
  review_average: string | number | null;
  review_count: string | number;
  review_verified_count: string | number;
}

interface ProductListingRow extends ListingBaseRow {
  name: string;
  price: string | number;
  currency: string;
  description: string;
  category: string;
  in_stock: boolean;
  quantity: number | null;
}

interface ServiceListingRow extends ListingBaseRow {
  name: string;
  price: string | number;
  currency: string;
  price_type: 'hourly' | 'project' | 'monthly';
  description: string;
  category: string;
  availability: 'immediate' | '1-week' | '2-weeks' | '1-month';
}

interface ReviewRow {
  id: string;
  post_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  created_at: string | Date;
}

interface ReviewSummaryRow {
  average_rating: string | number | null;
  review_count: string | number;
  verified_count: string | number;
}

interface ProductSourceRow {
  post_id: string;
  seller_id: string;
  item_name: string;
  unit_price: string | number;
  currency: string;
}

interface ServiceSourceRow {
  post_id: string;
  provider_id: string;
  service_name: string;
  service_price: string | number;
  currency: string;
}

interface InsertedOrderRow {
  id: string;
  created_at: string | Date;
  notes: string | null;
  total_amount: string | number;
  status: MarketplaceOrder['status'];
}

interface InsertedBookingRow {
  id: string;
  created_at: string | Date;
  notes: string | null;
  price: string | number;
  status: MarketplaceBooking['status'];
  start_at: string | Date;
  end_at: string | Date | null;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getProducts(
    query: MarketplaceListQuery,
  ): Promise<MarketplaceProductListingList> {
    const params: unknown[] = [];
    const whereClauses = [
      `p.deleted_at IS NULL`,
      `p.type = 'product'::post_type`,
    ];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(pp.name ILIKE $${searchParam} OR pp.description ILIKE $${searchParam} OR p.content ILIKE $${searchParam} OR COALESCE(bp.company_name, '') ILIKE $${searchParam})`,
      );
    }

    if (query.category) {
      params.push(query.category);
      whereClauses.push(`pp.category = $${params.length}`);
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<ProductListingRow>(
      `
        SELECT
          p.id AS post_id,
          p.user_id AS seller_user_id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.user_type::text AS seller_user_type,
          COALESCE(bp.company_name, 'Independent') AS company_name,
          p.content,
          media.primary_image_url,
          p.bookmarks_count,
          p.created_at,
          pp.name,
          pp.price,
          pp.currency,
          pp.description,
          pp.category,
          pp.in_stock,
          pp.quantity,
          review_stats.average_rating AS review_average,
          review_stats.review_count,
          review_stats.verified_count AS review_verified_count
        FROM posts p
        JOIN post_products pp
          ON pp.post_id = p.id
        JOIN users u
          ON u.id = p.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = p.user_id
          AND bp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT pm.media_url AS primary_image_url
          FROM post_media pm
          WHERE pm.post_id = p.id
          ORDER BY pm.sort_order ASC, pm.created_at ASC
          LIMIT 1
        ) media ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            AVG(r.rating)::numeric(10,2) AS average_rating,
            COUNT(*)::int AS review_count,
            COUNT(*) FILTER (WHERE r.verified_purchase) ::int AS verified_count
          FROM reviews r
          WHERE r.post_id = p.id
        ) review_stats ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapProductListing(row)),
    };
  }

  async getServices(
    query: MarketplaceListQuery,
  ): Promise<MarketplaceServiceListingList> {
    const params: unknown[] = [];
    const whereClauses = [
      `p.deleted_at IS NULL`,
      `p.type = 'service'::post_type`,
    ];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(ps.name ILIKE $${searchParam} OR ps.description ILIKE $${searchParam} OR p.content ILIKE $${searchParam} OR COALESCE(bp.company_name, '') ILIKE $${searchParam})`,
      );
    }

    if (query.category) {
      params.push(query.category);
      whereClauses.push(`ps.category = $${params.length}`);
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<ServiceListingRow>(
      `
        SELECT
          p.id AS post_id,
          p.user_id AS seller_user_id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.user_type::text AS seller_user_type,
          COALESCE(bp.company_name, 'Independent') AS company_name,
          p.content,
          media.primary_image_url,
          p.bookmarks_count,
          p.created_at,
          ps.name,
          ps.price,
          ps.currency,
          ps.price_type,
          ps.description,
          ps.category,
          ps.availability,
          review_stats.average_rating AS review_average,
          review_stats.review_count,
          review_stats.verified_count AS review_verified_count
        FROM posts p
        JOIN post_services ps
          ON ps.post_id = p.id
        JOIN users u
          ON u.id = p.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = p.user_id
          AND bp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT pm.media_url AS primary_image_url
          FROM post_media pm
          WHERE pm.post_id = p.id
          ORDER BY pm.sort_order ASC, pm.created_at ASC
          LIMIT 1
        ) media ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            AVG(r.rating)::numeric(10,2) AS average_rating,
            COUNT(*)::int AS review_count,
            COUNT(*) FILTER (WHERE r.verified_purchase) ::int AS verified_count
          FROM reviews r
          WHERE r.post_id = p.id
        ) review_stats ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapServiceListing(row)),
    };
  }

  async getReviews(postId: string, limit: number): Promise<MarketplaceReviewList> {
    const result = await this.databaseService.query<ReviewRow>(
      `
        SELECT
          r.id,
          r.post_id,
          r.reviewer_id,
          CONCAT_WS(' ', u.first_name, u.last_name) AS reviewer_name,
          u.avatar_url AS reviewer_avatar,
          r.rating,
          r.comment,
          r.verified_purchase,
          r.created_at
        FROM reviews r
        JOIN users u
          ON u.id = r.reviewer_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        WHERE r.post_id = $1::uuid
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT $2
      `,
      [postId, limit],
    );

    return {
      items: result.rows.map((row) => this.mapReview(row)),
    };
  }

  async createOrUpdateReview(
    reviewerId: string,
    postId: string,
    payload: CreateMarketplaceReviewBody,
  ): Promise<MarketplaceReviewMutationResult> {
    return this.databaseService.transaction(async (client) => {
      await this.ensureMarketplacePostExists(client, postId);

      const result = await client.query<ReviewRow>(
        `
          INSERT INTO reviews (post_id, reviewer_id, rating, comment, verified_purchase)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5)
          ON CONFLICT (post_id, reviewer_id)
          DO UPDATE SET
            rating = EXCLUDED.rating,
            comment = EXCLUDED.comment,
            verified_purchase = EXCLUDED.verified_purchase,
            created_at = now()
          RETURNING
            id,
            post_id,
            reviewer_id,
            rating,
            comment,
            verified_purchase,
            created_at
        `,
        [postId, reviewerId, payload.rating, payload.comment, payload.verifiedPurchase],
      );

      const inserted = result.rows[0];
      if (!inserted) {
        throw new BadRequestException({
          error: {
            code: 'REVIEW_CREATE_FAILED',
            message: 'Failed to save review.',
          },
        });
      }

      const reviewerResult = await client.query<{
        reviewer_name: string;
        reviewer_avatar: string | null;
      }>(
        `
          SELECT
            CONCAT_WS(' ', first_name, last_name) AS reviewer_name,
            avatar_url AS reviewer_avatar
          FROM users
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [reviewerId],
      );

      const reviewer = reviewerResult.rows[0];
      if (!reviewer) {
        throw new NotFoundException({
          error: {
            code: 'REVIEWER_NOT_FOUND',
            message: 'Reviewer not found.',
          },
        });
      }

      const summary = await this.getReviewSummary(postId, client);
      const review = this.mapReview({
        ...inserted,
        reviewer_name: reviewer.reviewer_name,
        reviewer_avatar: reviewer.reviewer_avatar,
      });

      await this.appendOutboxEvent(client, {
        aggregateType: 'review',
        aggregateId: inserted.id,
        eventType: 'review.upserted',
        payload: {
          reviewId: inserted.id,
          postId,
          reviewerId,
          rating: payload.rating,
          verifiedPurchase: payload.verifiedPurchase,
        },
      });

      return {
        review,
        summary,
      };
    });
  }

  async createOrder(
    buyerId: string,
    postId: string,
    payload: CreateMarketplaceOrderBody,
  ): Promise<MarketplaceOrder> {
    return this.databaseService.transaction(async (client) => {
      const sourceResult = await client.query<ProductSourceRow>(
        `
          SELECT
            p.id AS post_id,
            p.user_id AS seller_id,
            pp.name AS item_name,
            pp.price AS unit_price,
            pp.currency
          FROM posts p
          JOIN post_products pp
            ON pp.post_id = p.id
          WHERE p.id = $1::uuid
            AND p.deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      const source = sourceResult.rows[0];
      if (!source) {
        throw new NotFoundException({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product listing not found.',
          },
        });
      }

      if (source.seller_id === buyerId) {
        throw new BadRequestException({
          error: {
            code: 'SELF_ORDER_NOT_ALLOWED',
            message: 'You cannot order your own product.',
          },
        });
      }

      const totalAmount = this.toNumber(source.unit_price) * payload.quantity;
      const notes = this.buildOrderNotes(payload);

      const insertResult = await client.query<InsertedOrderRow>(
        `
          INSERT INTO orders (
            buyer_id,
            seller_id,
            post_id,
            order_type,
            total_amount,
            platform_fee_amount,
            seller_payout_amount,
            currency,
            notes
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            'product'::order_type,
            $4,
            0,
            $4,
            $5,
            $6
          )
          RETURNING id, created_at, notes, total_amount, status::text AS status
        `,
        [buyerId, source.seller_id, postId, totalAmount, source.currency, notes],
      );

      const order = insertResult.rows[0];
      if (!order) {
        throw new BadRequestException({
          error: {
            code: 'ORDER_CREATE_FAILED',
            message: 'Failed to create order.',
          },
        });
      }

      await client.query(
        `
          INSERT INTO order_items (order_id, item_name, quantity, unit_price, currency)
          VALUES ($1::uuid, $2, $3, $4, $5)
        `,
        [order.id, source.item_name, payload.quantity, source.unit_price, source.currency],
      );

      await this.appendOutboxEvent(client, {
        aggregateType: 'order',
        aggregateId: order.id,
        eventType: 'order.created',
        payload: {
          orderId: order.id,
          postId,
          buyerId,
          sellerId: source.seller_id,
          quantity: payload.quantity,
          totalAmount,
          currency: source.currency,
        },
      });

      return {
        id: order.id,
        postId,
        buyerId,
        sellerId: source.seller_id,
        status: order.status,
        totalAmount: this.toNumber(order.total_amount),
        currency: source.currency,
        quantity: payload.quantity,
        itemName: source.item_name,
        notes: order.notes,
        createdAt: this.toIsoTimestamp(order.created_at),
      };
    });
  }

  async createBooking(
    clientId: string,
    postId: string,
    payload: CreateMarketplaceBookingBody,
  ): Promise<MarketplaceBooking> {
    return this.databaseService.transaction(async (client) => {
      const sourceResult = await client.query<ServiceSourceRow>(
        `
          SELECT
            p.id AS post_id,
            p.user_id AS provider_id,
            ps.name AS service_name,
            ps.price AS service_price,
            ps.currency
          FROM posts p
          JOIN post_services ps
            ON ps.post_id = p.id
          WHERE p.id = $1::uuid
            AND p.deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      const source = sourceResult.rows[0];
      if (!source) {
        throw new NotFoundException({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: 'Service listing not found.',
          },
        });
      }

      if (source.provider_id === clientId) {
        throw new BadRequestException({
          error: {
            code: 'SELF_BOOKING_NOT_ALLOWED',
            message: 'You cannot book your own service.',
          },
        });
      }

      const startAt = new Date(payload.startAt);
      const endAt = payload.endAt ? new Date(payload.endAt) : null;
      if (Number.isNaN(startAt.getTime())) {
        throw new BadRequestException({
          error: {
            code: 'INVALID_BOOKING_START',
            message: 'Booking start time is invalid.',
          },
        });
      }
      if (endAt && Number.isNaN(endAt.getTime())) {
        throw new BadRequestException({
          error: {
            code: 'INVALID_BOOKING_END',
            message: 'Booking end time is invalid.',
          },
        });
      }
      if (endAt && endAt.getTime() <= startAt.getTime()) {
        throw new BadRequestException({
          error: {
            code: 'INVALID_BOOKING_RANGE',
            message: 'Booking end time must be after start time.',
          },
        });
      }

      const insertResult = await client.query<InsertedBookingRow>(
        `
          INSERT INTO bookings (
            client_id,
            provider_id,
            service_post_id,
            start_at,
            end_at,
            price,
            platform_fee_amount,
            seller_payout_amount,
            currency,
            notes
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::timestamptz,
            $5::timestamptz,
            $6,
            0,
            $6,
            $7,
            $8
          )
          RETURNING
            id,
            created_at,
            notes,
            price,
            status::text AS status,
            start_at,
            end_at
        `,
        [
          clientId,
          source.provider_id,
          postId,
          startAt.toISOString(),
          endAt?.toISOString() ?? null,
          source.service_price,
          source.currency,
          payload.notes?.trim() || null,
        ],
      );

      const booking = insertResult.rows[0];
      if (!booking) {
        throw new BadRequestException({
          error: {
            code: 'BOOKING_CREATE_FAILED',
            message: 'Failed to create booking.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'booking',
        aggregateId: booking.id,
        eventType: 'booking.created',
        payload: {
          bookingId: booking.id,
          postId,
          clientId,
          providerId: source.provider_id,
          startAt: startAt.toISOString(),
          endAt: endAt?.toISOString() ?? null,
          price: this.toNumber(source.service_price),
          currency: source.currency,
        },
      });

      return {
        id: booking.id,
        postId,
        clientId,
        providerId: source.provider_id,
        status: booking.status,
        price: this.toNumber(booking.price),
        currency: source.currency,
        serviceName: source.service_name,
        startAt: this.toIsoTimestamp(booking.start_at),
        endAt: booking.end_at ? this.toIsoTimestamp(booking.end_at) : null,
        notes: booking.notes,
        createdAt: this.toIsoTimestamp(booking.created_at),
      };
    });
  }

  private async ensureMarketplacePostExists(
    client: PoolClient,
    postId: string,
  ): Promise<void> {
    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM posts
        WHERE id = $1::uuid
          AND deleted_at IS NULL
          AND type IN ('product'::post_type, 'service'::post_type)
        LIMIT 1
      `,
      [postId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException({
        error: {
          code: 'MARKETPLACE_POST_NOT_FOUND',
          message: 'Marketplace listing not found.',
        },
      });
    }
  }

  private async getReviewSummary(
    postId: string,
    client?: PoolClient,
  ): Promise<MarketplaceReviewSummary> {
    const result = client
      ? await client.query<ReviewSummaryRow>(
          `
            SELECT
              AVG(rating)::numeric(10,2) AS average_rating,
              COUNT(*)::int AS review_count,
              COUNT(*) FILTER (WHERE verified_purchase) ::int AS verified_count
            FROM reviews
            WHERE post_id = $1::uuid
          `,
          [postId],
        )
      : await this.databaseService.query<ReviewSummaryRow>(
          `
            SELECT
              AVG(rating)::numeric(10,2) AS average_rating,
              COUNT(*)::int AS review_count,
              COUNT(*) FILTER (WHERE verified_purchase) ::int AS verified_count
            FROM reviews
            WHERE post_id = $1::uuid
          `,
          [postId],
        );

    const row = result.rows[0];
    return {
      average:
        row?.average_rating === null || row?.average_rating === undefined
          ? 0
          : this.toNumber(row.average_rating),
      count: row ? this.toCount(row.review_count) : 0,
      verifiedCount: row ? this.toCount(row.verified_count) : 0,
    };
  }

  private mapProductListing(row: ProductListingRow): MarketplaceProductListing {
    return {
      postId: row.post_id,
      seller: this.mapSeller(row),
      content: row.content,
      primaryImageUrl: row.primary_image_url,
      bookmarks: this.toCount(row.bookmarks_count),
      createdAt: this.toIsoTimestamp(row.created_at),
      product: {
        name: row.name,
        price: this.toNumber(row.price),
        currency: row.currency,
        description: row.description,
        category: row.category,
        inStock: row.in_stock,
        quantity: row.quantity ?? undefined,
      },
      reviewSummary: this.mapReviewSummary(row),
    };
  }

  private mapServiceListing(row: ServiceListingRow): MarketplaceServiceListing {
    return {
      postId: row.post_id,
      seller: this.mapSeller(row),
      content: row.content,
      primaryImageUrl: row.primary_image_url,
      bookmarks: this.toCount(row.bookmarks_count),
      createdAt: this.toIsoTimestamp(row.created_at),
      service: {
        name: row.name,
        price: this.toNumber(row.price),
        currency: row.currency,
        priceType: row.price_type,
        description: row.description,
        category: row.category,
        availability: row.availability,
      },
      reviewSummary: this.mapReviewSummary(row),
    };
  }

  private mapSeller(row: ListingBaseRow): MarketplaceProductListing['seller'] {
    return {
      userId: row.seller_user_id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      company: row.company_name ?? 'Independent',
      avatar: row.avatar_url,
      userType: row.seller_user_type,
    };
  }

  private mapReviewSummary(row: ListingBaseRow): MarketplaceReviewSummary {
    return {
      average:
        row.review_average === null || row.review_average === undefined
          ? 0
          : this.toNumber(row.review_average),
      count: this.toCount(row.review_count),
      verifiedCount: this.toCount(row.review_verified_count),
    };
  }

  private mapReview(row: ReviewRow): MarketplaceReview {
    return {
      id: row.id,
      postId: row.post_id,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      reviewerAvatar: row.reviewer_avatar,
      rating: row.rating,
      comment: row.comment,
      verifiedPurchase: row.verified_purchase,
      createdAt: this.toIsoTimestamp(row.created_at),
    };
  }

  private buildOrderNotes(payload: CreateMarketplaceOrderBody): string | null {
    const sections = [
      payload.deliveryAddress?.trim()
        ? `Delivery address: ${payload.deliveryAddress.trim()}`
        : null,
      payload.notes?.trim() ? `Notes: ${payload.notes.trim()}` : null,
    ].filter((value): value is string => Boolean(value));

    return sections.length > 0 ? sections.join('\n') : null;
  }

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toNumber(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private async appendOutboxEvent(
    client: PoolClient,
    event: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Record<string, unknown>;
      headers?: Record<string, unknown>;
    },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload, headers)
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5::jsonb)
      `,
      [
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload),
        JSON.stringify(event.headers ?? {}),
      ],
    );
  }
}
