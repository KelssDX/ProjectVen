import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  CreateMentorshipOfferBody,
  MentorshipAvailability,
  MentorshipMentorListQuery,
  MentorshipRequestListQuery,
  UpdateMentorshipStatusBody,
} from './mentorship.types';
import type {
  MentorshipMentor,
  MentorshipMentorList,
  MentorshipRequest,
  MentorshipRequestList,
  MyMentorship,
  MyMentorshipList,
} from '../contracts/mentorship';

interface MentorRow {
  user_id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  company_name: string;
  description: string;
  expertise: string[] | null;
  founded_year: number | null;
  avg_rating: string | number | null;
  review_count: string | number;
  mentees_count: string | number;
  availability: MentorshipAvailability;
}

interface RequestRow {
  post_id: string;
  mentee_user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  company_name: string | null;
  user_type: MentorshipRequest['userType'];
  content: string;
  expertise: string[] | null;
  commitment: MentorshipRequest['commitment'];
  duration: string;
  created_at: string | Date;
}

interface RelationshipRow {
  id: string;
  role: MyMentorship['role'];
  status: MyMentorship['status'];
  counterpart_user_id: string;
  counterpart_name: string;
  counterpart_company: string | null;
  counterpart_avatar: string | null;
  expertise: string[] | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  sessions_completed: string | number;
  rating: number | null;
  review: string | null;
  source_post_id: string | null;
  created_at: string | Date;
}

interface SourceRequestRow {
  post_id: string;
  mentee_user_id: string;
  expertise: string[] | null;
}

@Injectable()
export class MentorshipService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getMentors(
    query: MentorshipMentorListQuery,
  ): Promise<MentorshipMentorList> {
    const params: unknown[] = [];
    const whereClauses = [
      `u.deleted_at IS NULL`,
      `u.is_active = TRUE`,
      `u.user_type = 'mentor'::user_type`,
      `bp.deleted_at IS NULL`,
      `bp.is_public = TRUE`,
    ];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(CONCAT_WS(' ', u.first_name, u.last_name) ILIKE $${searchParam} OR bp.company_name ILIKE $${searchParam} OR bp.description ILIKE $${searchParam} OR EXISTS (SELECT 1 FROM business_profile_skills bps WHERE bps.profile_id = bp.id AND bps.skill ILIKE $${searchParam}))`,
      );
    }

    if (query.expertise) {
      params.push(query.expertise);
      whereClauses.push(
        `EXISTS (SELECT 1 FROM business_profile_skills bps_filter WHERE bps_filter.profile_id = bp.id AND LOWER(bps_filter.skill) = LOWER($${params.length}))`,
      );
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<MentorRow>(
      `
        SELECT
          u.id AS user_id,
          bp.id AS profile_id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          bp.company_name,
          bp.description,
          skill_items.expertise,
          bp.founded_year,
          mentorship_stats.avg_rating,
          mentorship_stats.review_count,
          mentorship_stats.mentees_count,
          CASE
            WHEN mentorship_stats.active_count >= 5 THEN 'part-time'
            WHEN mentorship_stats.active_count >= 1 THEN 'ad-hoc'
            ELSE 'ad-hoc'
          END AS availability
        FROM users u
        JOIN business_profiles bp
          ON bp.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT array_agg(skill ORDER BY skill) AS expertise
          FROM business_profile_skills
          WHERE profile_id = bp.id
        ) skill_items ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            AVG(rating)::numeric(10,2) AS avg_rating,
            COUNT(rating)::int AS review_count,
            COUNT(*) FILTER (WHERE status IN ('active'::mentorship_status, 'completed'::mentorship_status))::int AS mentees_count,
            COUNT(*) FILTER (WHERE status = 'active'::mentorship_status)::int AS active_count
          FROM mentorship_relationships mr
          WHERE mr.mentor_user_id = u.id
        ) mentorship_stats ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY COALESCE(mentorship_stats.avg_rating, 0) DESC, mentorship_stats.mentees_count DESC, u.created_at ASC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapMentor(row)),
    };
  }

  async getRequests(
    query: MentorshipRequestListQuery,
  ): Promise<MentorshipRequestList> {
    const params: unknown[] = [];
    const whereClauses = [
      `p.deleted_at IS NULL`,
      `p.type = 'mentorship'::post_type`,
    ];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(p.content ILIKE $${searchParam} OR COALESCE(bp.company_name, '') ILIKE $${searchParam} OR CONCAT_WS(' ', u.first_name, u.last_name) ILIKE $${searchParam})`,
      );
    }

    if (query.expertise) {
      params.push(query.expertise);
      whereClauses.push(
        `EXISTS (SELECT 1 FROM post_mentorship_expertise pme_filter WHERE pme_filter.post_id = p.id AND LOWER(pme_filter.expertise) = LOWER($${params.length}))`,
      );
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<RequestRow>(
      `
        SELECT
          p.id AS post_id,
          p.user_id AS mentee_user_id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          bp.company_name,
          u.user_type::text AS user_type,
          p.content,
          expertise_items.expertise,
          pmr.commitment,
          pmr.duration,
          p.created_at
        FROM posts p
        JOIN post_mentorship_requests pmr
          ON pmr.post_id = p.id
        JOIN users u
          ON u.id = p.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = p.user_id
          AND bp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT array_agg(expertise ORDER BY expertise) AS expertise
          FROM post_mentorship_expertise
          WHERE post_id = p.id
        ) expertise_items ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapRequest(row)),
    };
  }

  async getMine(userId: string): Promise<MyMentorshipList> {
    const result = await this.databaseService.query<RelationshipRow>(
      `
        SELECT
          mr.id,
          CASE
            WHEN mr.mentor_user_id = $1::uuid THEN 'mentor'
            ELSE 'mentee'
          END AS role,
          mr.status::text AS status,
          counterpart.id AS counterpart_user_id,
          CONCAT_WS(' ', counterpart.first_name, counterpart.last_name) AS counterpart_name,
          bp.company_name AS counterpart_company,
          counterpart.avatar_url AS counterpart_avatar,
          expertise_items.expertise,
          mr.start_date,
          mr.end_date,
          mr.sessions_completed,
          mr.rating,
          mr.review,
          mr.source_post_id,
          mr.created_at
        FROM mentorship_relationships mr
        JOIN users counterpart
          ON counterpart.id = CASE
            WHEN mr.mentor_user_id = $1::uuid THEN mr.mentee_user_id
            ELSE mr.mentor_user_id
          END
          AND counterpart.deleted_at IS NULL
          AND counterpart.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = counterpart.id
          AND bp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT array_agg(expertise ORDER BY expertise) AS expertise
          FROM post_mentorship_expertise
          WHERE post_id = mr.source_post_id
        ) expertise_items ON TRUE
        WHERE mr.mentor_user_id = $1::uuid
           OR mr.mentee_user_id = $1::uuid
        ORDER BY mr.created_at DESC, mr.id DESC
      `,
      [userId],
    );

    return {
      items: result.rows.map((row) => this.mapRelationship(row)),
    };
  }

  async createOffer(
    mentorUserId: string,
    postId: string,
    payload: CreateMentorshipOfferBody,
  ): Promise<MyMentorship> {
    return this.databaseService.transaction(async (client) => {
      const source = await this.getSourceRequest(client, postId);
      if (source.mentee_user_id === mentorUserId) {
        throw new BadRequestException({
          error: {
            code: 'SELF_MENTORSHIP_NOT_ALLOWED',
            message: 'You cannot offer mentorship to your own request.',
          },
        });
      }

      const existingResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM mentorship_relationships
          WHERE mentor_user_id = $1::uuid
            AND mentee_user_id = $2::uuid
            AND source_post_id = $3::uuid
            AND status IN ('pending'::mentorship_status, 'active'::mentorship_status)
          LIMIT 1
        `,
        [mentorUserId, source.mentee_user_id, postId],
      );
      if (existingResult.rows[0]) {
        throw new BadRequestException({
          error: {
            code: 'MENTORSHIP_ALREADY_EXISTS',
            message: 'A mentorship offer already exists for this request.',
          },
        });
      }

      const insertResult = await client.query<RelationshipRow>(
        `
          WITH inserted AS (
            INSERT INTO mentorship_relationships (
              mentor_user_id,
              mentee_user_id,
              source_post_id,
              status
            ) VALUES (
              $1::uuid,
              $2::uuid,
              $3::uuid,
              'pending'::mentorship_status
            )
            RETURNING
              id,
              status::text AS status,
              start_date,
              end_date,
              sessions_completed,
              rating,
              review,
              source_post_id,
              created_at
          )
          SELECT
            inserted.id,
            'mentor' AS role,
            inserted.status,
            counterpart.id AS counterpart_user_id,
            CONCAT_WS(' ', counterpart.first_name, counterpart.last_name) AS counterpart_name,
            bp.company_name AS counterpart_company,
            counterpart.avatar_url AS counterpart_avatar,
            $4::text[] AS expertise,
            inserted.start_date,
            inserted.end_date,
            inserted.sessions_completed,
            inserted.rating,
            inserted.review,
            inserted.source_post_id,
            inserted.created_at
          FROM inserted
          JOIN users counterpart
            ON counterpart.id = $2::uuid
          LEFT JOIN business_profiles bp
            ON bp.user_id = counterpart.id
            AND bp.deleted_at IS NULL
        `,
        [mentorUserId, source.mentee_user_id, postId, source.expertise ?? []],
      );

      const relationship = insertResult.rows[0];
      if (!relationship) {
        throw new BadRequestException({
          error: {
            code: 'MENTORSHIP_CREATE_FAILED',
            message: 'Failed to create mentorship offer.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'mentorship_relationship',
        aggregateId: relationship.id,
        eventType: 'mentorship.offered',
        payload: {
          mentorshipId: relationship.id,
          mentorUserId,
          menteeUserId: source.mentee_user_id,
          sourcePostId: postId,
          message: payload.message?.trim() || null,
        },
      });

      return this.mapRelationship(relationship);
    });
  }

  async updateStatus(
    actorUserId: string,
    relationshipId: string,
    payload: UpdateMentorshipStatusBody,
  ): Promise<MyMentorship> {
    return this.databaseService.transaction(async (client) => {
      const accessResult = await client.query<{
        mentor_user_id: string;
        mentee_user_id: string;
      }>(
        `
          SELECT mentor_user_id, mentee_user_id
          FROM mentorship_relationships
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [relationshipId],
      );
      const access = accessResult.rows[0];
      if (!access) {
        throw new NotFoundException({
          error: {
            code: 'MENTORSHIP_NOT_FOUND',
            message: 'Mentorship relationship not found.',
          },
        });
      }

      if (
        access.mentor_user_id !== actorUserId &&
        access.mentee_user_id !== actorUserId
      ) {
        throw new BadRequestException({
          error: {
            code: 'MENTORSHIP_ACCESS_DENIED',
            message: 'You do not have access to update this mentorship.',
          },
        });
      }

      const shouldSetStartDate = payload.status === 'active';
      const shouldSetEndDate =
        payload.status === 'completed' || payload.status === 'cancelled';

      const updateResult = await client.query<RelationshipRow>(
        `
          UPDATE mentorship_relationships
          SET
            status = $2::mentorship_status,
            start_date = CASE
              WHEN $2::mentorship_status = 'active'::mentorship_status
              THEN COALESCE(start_date, CURRENT_DATE)
              ELSE start_date
            END,
            end_date = CASE
              WHEN $2::mentorship_status IN ('completed'::mentorship_status, 'cancelled'::mentorship_status)
              THEN COALESCE(end_date, CURRENT_DATE)
              ELSE end_date
            END,
            sessions_completed = COALESCE($3, sessions_completed),
            rating = COALESCE($4, rating),
            review = COALESCE($5, review)
          WHERE id = $1::uuid
          RETURNING
            id,
            CASE
              WHEN mentor_user_id = $6::uuid THEN 'mentor'
              ELSE 'mentee'
            END AS role,
            status::text AS status,
            CASE
              WHEN mentor_user_id = $6::uuid THEN mentee_user_id
              ELSE mentor_user_id
            END AS counterpart_user_id,
            ''::text AS counterpart_name,
            NULL::text AS counterpart_company,
            NULL::text AS counterpart_avatar,
            NULL::text[] AS expertise,
            start_date,
            end_date,
            sessions_completed,
            rating,
            review,
            source_post_id,
            created_at
        `,
        [
          relationshipId,
          payload.status,
          payload.sessionsCompleted ?? null,
          payload.rating ?? null,
          payload.review?.trim() || null,
          actorUserId,
        ],
      );
      const updated = updateResult.rows[0];
      if (!updated) {
        throw new BadRequestException({
          error: {
            code: 'MENTORSHIP_UPDATE_FAILED',
            message: 'Failed to update mentorship.',
          },
        });
      }

      const hydrated = await this.hydrateRelationship(
        client,
        updated,
        updated.counterpart_user_id,
      );

      await this.appendOutboxEvent(client, {
        aggregateType: 'mentorship_relationship',
        aggregateId: relationshipId,
        eventType: 'mentorship.status.updated',
        payload: {
          mentorshipId: relationshipId,
          actorUserId,
          status: payload.status,
          rating: payload.rating ?? null,
          review: payload.review?.trim() || null,
          sessionsCompleted: payload.sessionsCompleted ?? null,
          startDateSet: shouldSetStartDate,
          endDateSet: shouldSetEndDate,
        },
      });

      return hydrated;
    });
  }

  private async getSourceRequest(
    client: PoolClient,
    postId: string,
  ): Promise<SourceRequestRow> {
    const result = await client.query<SourceRequestRow>(
      `
        SELECT
          p.id AS post_id,
          p.user_id AS mentee_user_id,
          expertise_items.expertise
        FROM posts p
        JOIN post_mentorship_requests pmr
          ON pmr.post_id = p.id
        LEFT JOIN LATERAL (
          SELECT array_agg(expertise ORDER BY expertise) AS expertise
          FROM post_mentorship_expertise
          WHERE post_id = p.id
        ) expertise_items ON TRUE
        WHERE p.id = $1::uuid
          AND p.deleted_at IS NULL
          AND p.type = 'mentorship'::post_type
        LIMIT 1
      `,
      [postId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'MENTORSHIP_REQUEST_NOT_FOUND',
          message: 'Mentorship request not found.',
        },
      });
    }

    return row;
  }

  private async hydrateRelationship(
    client: PoolClient,
    relationship: RelationshipRow,
    counterpartUserId: string,
  ): Promise<MyMentorship> {
    const counterpartResult = await client.query<{
      counterpart_name: string;
      counterpart_company: string | null;
      counterpart_avatar: string | null;
      expertise: string[] | null;
    }>(
      `
        SELECT
          CONCAT_WS(' ', u.first_name, u.last_name) AS counterpart_name,
          bp.company_name AS counterpart_company,
          u.avatar_url AS counterpart_avatar,
          expertise_items.expertise
        FROM users u
        LEFT JOIN business_profiles bp
          ON bp.user_id = u.id
          AND bp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT array_agg(expertise ORDER BY expertise) AS expertise
          FROM post_mentorship_expertise
          WHERE post_id = $2::uuid
        ) expertise_items ON TRUE
        WHERE u.id = $1::uuid
        LIMIT 1
      `,
      [counterpartUserId, relationship.source_post_id],
    );

    const counterpart = counterpartResult.rows[0];
    if (!counterpart) {
      throw new NotFoundException({
        error: {
          code: 'MENTORSHIP_COUNTERPART_NOT_FOUND',
          message: 'Mentorship participant not found.',
        },
      });
    }

    return this.mapRelationship({
      ...relationship,
      counterpart_name: counterpart.counterpart_name,
      counterpart_company: counterpart.counterpart_company,
      counterpart_avatar: counterpart.counterpart_avatar,
      expertise: counterpart.expertise,
    });
  }

  private mapMentor(row: MentorRow): MentorshipMentor {
    return {
      userId: row.user_id,
      profileId: row.profile_id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      company: row.company_name,
      avatar: row.avatar_url,
      expertise: row.expertise ?? [],
      experienceYears: row.founded_year
        ? Math.max(0, new Date().getUTCFullYear() - row.founded_year)
        : 0,
      rating:
        row.avg_rating === null || row.avg_rating === undefined
          ? 0
          : this.toNumber(row.avg_rating),
      reviews: this.toCount(row.review_count),
      mentees: this.toCount(row.mentees_count),
      availability: row.availability,
      bio: row.description,
    };
  }

  private mapRequest(row: RequestRow): MentorshipRequest {
    return {
      postId: row.post_id,
      menteeUserId: row.mentee_user_id,
      authorName: `${row.first_name} ${row.last_name}`.trim(),
      company: row.company_name ?? 'Independent',
      avatar: row.avatar_url,
      userType: row.user_type,
      content: row.content,
      expertise: row.expertise ?? [],
      commitment: row.commitment,
      duration: row.duration,
      createdAt: this.toIsoTimestamp(row.created_at),
    };
  }

  private mapRelationship(row: RelationshipRow): MyMentorship {
    return {
      id: row.id,
      role: row.role,
      status: row.status,
      counterpartUserId: row.counterpart_user_id,
      counterpartName: row.counterpart_name,
      counterpartCompany: row.counterpart_company ?? 'Independent',
      counterpartAvatar: row.counterpart_avatar,
      expertise: row.expertise ?? [],
      startDate: row.start_date ? this.toDateString(row.start_date) : null,
      endDate: row.end_date ? this.toDateString(row.end_date) : null,
      sessionsCompleted: this.toCount(row.sessions_completed),
      rating: row.rating ?? undefined,
      review: row.review,
      sourcePostId: row.source_post_id,
      createdAt: this.toIsoTimestamp(row.created_at),
    };
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

  private toDateString(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
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
