import { Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  BusinessProfileCollection,
  BusinessProfileItem,
  BusinessProfileList,
  BusinessProfileSuggestionList,
  IncrementProfileViewResult,
  ProfileListQuery,
  TrendingProfilesList,
  UpsertMyProfileBody,
} from './profiles.types';

interface ProfileRow {
  id: string;
  user_id: string;
  company_name: string;
  tagline: string | null;
  description: string;
  industry: string;
  sub_industry: string | null;
  city: string;
  country: string;
  website: string | null;
  founded_year: number | null;
  team_size: string | null;
  stage: BusinessProfileItem['stage'];
  funding_needed: boolean;
  funding_amount: string | number | null;
  is_public: boolean;
  views: string | number;
  connections_count: string | number;
  cover_image_url: string | null;
  logo_url: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  owner_user_type: BusinessProfileItem['owner']['userType'];
  owner_is_verified: boolean;
  owner_verification_level: BusinessProfileItem['owner']['verificationLevel'];
  skills: string[] | null;
  looking_for: string[] | null;
  achievements: string[] | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  total_count?: string | number;
}

interface TrendingRow extends ProfileRow {
  recent_connections: string | number;
  recent_posts: string | number;
  score: string | number;
}

interface IncrementViewRow {
  id: string;
  user_id: string;
  views: string | number;
}

@Injectable()
export class ProfilesService {
  private readonly profileSelectFields = `
    bp.id,
    bp.user_id,
    bp.company_name,
    bp.tagline,
    bp.description,
    bp.industry,
    bp.sub_industry,
    bp.city,
    bp.country,
    bp.website,
    bp.founded_year,
    bp.team_size,
    bp.stage,
    bp.funding_needed,
    bp.funding_amount,
    bp.is_public,
    bp.views,
    bp.connections_count,
    bp.cover_image_url,
    bp.logo_url,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.user_type::text AS owner_user_type,
    u.is_verified AS owner_is_verified,
    u.verification_level::text AS owner_verification_level,
    COALESCE(skill_items.skills, ARRAY[]::text[]) AS skills,
    COALESCE(looking_items.looking_for, ARRAY[]::text[]) AS looking_for,
    COALESCE(achievement_items.achievements, ARRAY[]::text[]) AS achievements,
    sl.linkedin_url,
    sl.twitter_url,
    sl.facebook_url
  `;

  private readonly profileSelectJoins = `
    JOIN users u
      ON u.id = bp.user_id
      AND u.deleted_at IS NULL
      AND u.is_active = TRUE
    LEFT JOIN business_profile_social_links sl
      ON sl.profile_id = bp.id
    LEFT JOIN LATERAL (
      SELECT array_agg(skill ORDER BY skill) AS skills
      FROM business_profile_skills
      WHERE profile_id = bp.id
    ) skill_items ON TRUE
    LEFT JOIN LATERAL (
      SELECT array_agg(item ORDER BY item) AS looking_for
      FROM business_profile_looking_for
      WHERE profile_id = bp.id
    ) looking_items ON TRUE
    LEFT JOIN LATERAL (
      SELECT array_agg(achievement ORDER BY created_at DESC, achievement) AS achievements
      FROM business_profile_achievements
      WHERE profile_id = bp.id
    ) achievement_items ON TRUE
  `;

  constructor(private readonly databaseService: DatabaseService) {}

  async getProfiles(query: ProfileListQuery): Promise<BusinessProfileList> {
    const params: unknown[] = [];
    const whereClauses = ['bp.deleted_at IS NULL', 'bp.is_public = TRUE'];
    const searchVector = this.getSearchVectorExpression();
    let orderBy = 'bp.views DESC, bp.connections_count DESC, bp.created_at DESC';

    if (query.query) {
      params.push(query.query);
      const queryParam = params.length;
      whereClauses.push(
        `(
          ${searchVector} @@ websearch_to_tsquery('english', $${queryParam})
          OR similarity(bp.company_name, $${queryParam}) > 0.2
          OR similarity(bp.industry, $${queryParam}) > 0.2
          OR similarity(bp.city, $${queryParam}) > 0.2
          OR similarity(bp.country, $${queryParam}) > 0.2
        )`,
      );
      orderBy = `
        GREATEST(
          similarity(bp.company_name, $${queryParam}),
          similarity(bp.industry, $${queryParam}),
          similarity(bp.city, $${queryParam}),
          similarity(bp.country, $${queryParam})
        ) DESC,
        ts_rank(${searchVector}, websearch_to_tsquery('english', $${queryParam})) DESC,
        bp.views DESC,
        bp.connections_count DESC,
        bp.created_at DESC
      `;
    }

    if (query.userType.length > 0) {
      params.push(query.userType);
      whereClauses.push(`u.user_type::text = ANY($${params.length}::text[])`);
    }

    if (query.industry.length > 0) {
      params.push(query.industry);
      whereClauses.push(`bp.industry = ANY($${params.length}::text[])`);
    }

    if (query.stage.length > 0) {
      params.push(query.stage);
      whereClauses.push(`bp.stage = ANY($${params.length}::text[])`);
    }

    if (query.skills.length > 0) {
      params.push(query.skills);
      whereClauses.push(`
        EXISTS (
          SELECT 1
          FROM business_profile_skills bps_filter
          WHERE bps_filter.profile_id = bp.id
            AND bps_filter.skill = ANY($${params.length}::text[])
        )
      `);
    }

    if (query.location) {
      params.push(`%${query.location}%`);
      whereClauses.push(
        `(bp.city ILIKE $${params.length} OR bp.country ILIKE $${params.length})`,
      );
    }

    if (typeof query.fundingNeeded === 'boolean') {
      params.push(query.fundingNeeded);
      whereClauses.push(`bp.funding_needed = $${params.length}::boolean`);
    }

    if (query.verifiedOnly) {
      whereClauses.push('u.is_verified = TRUE');
    }

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);
    const limitParam = params.length - 1;
    const offsetParam = params.length;

    const result = await this.databaseService.query<ProfileRow>(
      `
        SELECT
          ${this.profileSelectFields},
          COUNT(*) OVER() AS total_count
        FROM business_profiles bp
        ${this.profileSelectJoins}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      params,
    );

    const total = result.rows[0]?.total_count
      ? this.toCount(result.rows[0].total_count)
      : 0;

    return {
      items: result.rows.map((row) => this.mapProfileRow(row)),
      total,
      page: query.page,
      limit: query.limit,
      hasMore: offset + result.rows.length < total,
    };
  }

  async getProfile(
    idOrUserId: string,
    viewerUserId: string | null,
  ): Promise<BusinessProfileItem> {
    const profile = await this.findProfileByIdOrUserId(idOrUserId, viewerUserId);
    if (!profile) {
      throw this.createProfileNotFoundException();
    }

    return profile;
  }

  async getSimilarProfiles(
    idOrUserId: string,
    viewerUserId: string | null,
    limit: number,
  ): Promise<BusinessProfileCollection> {
    const source = await this.findProfileByIdOrUserId(idOrUserId, viewerUserId);
    if (!source) {
      throw this.createProfileNotFoundException();
    }

    const result = await this.databaseService.query<ProfileRow>(
      `
        SELECT
          ${this.profileSelectFields}
        FROM business_profiles bp
        ${this.profileSelectJoins}
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS shared_skill_count
          FROM business_profile_skills bps
          WHERE bps.profile_id = bp.id
            AND bps.skill = ANY($2::text[])
        ) shared ON TRUE
        WHERE bp.deleted_at IS NULL
          AND bp.is_public = TRUE
          AND bp.id <> $1::uuid
        ORDER BY
          (
            CASE WHEN bp.industry = $3 THEN 3 ELSE 0 END +
            CASE WHEN bp.stage = $4 THEN 2 ELSE 0 END +
            COALESCE(shared.shared_skill_count, 0)
          ) DESC,
          bp.views DESC,
          bp.connections_count DESC,
          bp.created_at DESC
        LIMIT $5
      `,
      [source.id, source.skills, source.industry, source.stage, limit],
    );

    return {
      items: result.rows.map((row) => this.mapProfileRow(row)),
    };
  }

  async getSuggestions(
    query: string,
    limit: number,
  ): Promise<BusinessProfileSuggestionList> {
    const likePattern = `%${query}%`;
    const result = await this.databaseService.query<{ value: string; rank: number }>(
      `
        SELECT value, MIN(rank) AS rank
        FROM (
          SELECT bp.company_name AS value, 1 AS rank
          FROM business_profiles bp
          WHERE bp.deleted_at IS NULL
            AND bp.is_public = TRUE
            AND bp.company_name ILIKE $1
          UNION ALL
          SELECT bp.industry AS value, 2 AS rank
          FROM business_profiles bp
          WHERE bp.deleted_at IS NULL
            AND bp.is_public = TRUE
            AND bp.industry ILIKE $1
          UNION ALL
          SELECT bp.city AS value, 3 AS rank
          FROM business_profiles bp
          WHERE bp.deleted_at IS NULL
            AND bp.is_public = TRUE
            AND bp.city ILIKE $1
        ) suggestions
        GROUP BY value
        ORDER BY MIN(rank), value
        LIMIT $2
      `,
      [likePattern, limit],
    );

    return {
      items: result.rows.map((row) => row.value),
    };
  }

  async getTrending(limit: number): Promise<TrendingProfilesList> {
    const result = await this.databaseService.query<TrendingRow>(
      `
        SELECT
          ${this.profileSelectFields},
          COALESCE(recent_connection_stats.recent_connections, 0) AS recent_connections,
          COALESCE(recent_post_stats.recent_posts, 0) AS recent_posts,
          (
            LEAST(bp.views, 5000)::int / 25 +
            COALESCE(recent_connection_stats.recent_connections, 0) * 15 +
            COALESCE(recent_post_stats.recent_posts, 0) * 10
          ) AS score
        FROM business_profiles bp
        ${this.profileSelectJoins}
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS recent_connections
          FROM connections c
          WHERE c.status = 'accepted'
            AND c.updated_at >= now() - interval '7 days'
            AND (c.requester_id = bp.user_id OR c.addressee_id = bp.user_id)
        ) recent_connection_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS recent_posts
          FROM posts p
          WHERE p.user_id = bp.user_id
            AND p.deleted_at IS NULL
            AND p.created_at >= now() - interval '7 days'
        ) recent_post_stats ON TRUE
        WHERE bp.deleted_at IS NULL
          AND bp.is_public = TRUE
        ORDER BY score DESC, bp.views DESC, bp.connections_count DESC, bp.created_at DESC
        LIMIT $1
      `,
      [limit],
    );

    return {
      items: result.rows.map((row, index) => ({
        profileId: row.id,
        profile: this.mapProfileRow(row),
        score: this.toCount(row.score),
        viewsLastWeek: this.toCount(row.views),
        connectionsLastWeek: this.toCount(row.recent_connections),
        rank: index + 1,
        category: row.industry,
      })),
    };
  }

  async upsertMyProfile(
    userId: string,
    payload: UpsertMyProfileBody,
  ): Promise<BusinessProfileItem> {
    return this.databaseService.transaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        `
          SELECT id
          FROM business_profiles
          WHERE user_id = $1::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [userId],
      );

      const normalized = this.normalizeUpsertPayload(payload);
      const eventType = existing.rows[0] ? 'profile.updated' : 'profile.created';
      const profileId =
        existing.rows[0]?.id ??
        (
          await client.query<{ id: string }>(
            `
              INSERT INTO business_profiles (
                user_id,
                company_name,
                tagline,
                description,
                industry,
                sub_industry,
                city,
                country,
                website,
                founded_year,
                team_size,
                stage,
                funding_needed,
                funding_amount,
                is_public,
                cover_image_url,
                logo_url
              )
              VALUES (
                $1::uuid,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17
              )
              RETURNING id
            `,
            [
              userId,
              normalized.companyName,
              normalized.tagline,
              normalized.description,
              normalized.industry,
              normalized.subIndustry,
              normalized.location.city,
              normalized.location.country,
              normalized.website,
              normalized.foundedYear,
              normalized.teamSize,
              normalized.stage,
              normalized.fundingNeeded,
              normalized.fundingAmount,
              normalized.isPublic,
              normalized.coverImage,
              normalized.logo,
            ],
          )
        ).rows[0].id;

      if (existing.rows[0]) {
        await client.query(
          `
            UPDATE business_profiles
            SET
              company_name = $2,
              tagline = $3,
              description = $4,
              industry = $5,
              sub_industry = $6,
              city = $7,
              country = $8,
              website = $9,
              founded_year = $10,
              team_size = $11,
              stage = $12,
              funding_needed = $13,
              funding_amount = $14,
              is_public = $15,
              cover_image_url = $16,
              logo_url = $17
            WHERE id = $1::uuid
          `,
          [
            profileId,
            normalized.companyName,
            normalized.tagline,
            normalized.description,
            normalized.industry,
            normalized.subIndustry,
            normalized.location.city,
            normalized.location.country,
            normalized.website,
            normalized.foundedYear,
            normalized.teamSize,
            normalized.stage,
            normalized.fundingNeeded,
            normalized.fundingAmount,
            normalized.isPublic,
            normalized.coverImage,
            normalized.logo,
          ],
        );
      }

      await this.replaceProfileArrayValues(
        client,
        profileId,
        'business_profile_skills',
        'skill',
        normalized.skills,
      );
      await this.replaceProfileArrayValues(
        client,
        profileId,
        'business_profile_looking_for',
        'item',
        normalized.lookingFor,
      );

      await client.query(
        `DELETE FROM business_profile_achievements WHERE profile_id = $1::uuid`,
        [profileId],
      );
      for (const achievement of normalized.achievements) {
        await client.query(
          `
            INSERT INTO business_profile_achievements (profile_id, achievement)
            VALUES ($1::uuid, $2)
          `,
          [profileId, achievement],
        );
      }

      await client.query(
        `
          INSERT INTO business_profile_social_links (
            profile_id,
            linkedin_url,
            twitter_url,
            facebook_url
          )
          VALUES ($1::uuid, $2, $3, $4)
          ON CONFLICT (profile_id)
          DO UPDATE SET
            linkedin_url = EXCLUDED.linkedin_url,
            twitter_url = EXCLUDED.twitter_url,
            facebook_url = EXCLUDED.facebook_url,
            updated_at = now()
        `,
        [
          profileId,
          normalized.socialLinks.linkedin ?? null,
          normalized.socialLinks.twitter ?? null,
          normalized.socialLinks.facebook ?? null,
        ],
      );

      const profile = await this.findProfileByIdOrUserId(profileId, userId, client);
      if (!profile) {
        throw this.createProfileNotFoundException();
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'profile',
        aggregateId: profile.id,
        eventType,
        payload: {
          profileId: profile.id,
          userId,
          companyName: profile.companyName,
          industry: profile.industry,
          stage: profile.stage,
          isPublic: profile.isPublic,
        },
      });

      return profile;
    });
  }

  async incrementProfileViews(idOrUserId: string): Promise<IncrementProfileViewResult> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<IncrementViewRow>(
        `
          UPDATE business_profiles
          SET views = views + 1
          WHERE deleted_at IS NULL
            AND (id = $1::uuid OR user_id = $1::uuid)
          RETURNING id, user_id, views
        `,
        [idOrUserId],
      );

      const row = result.rows[0];
      if (!row) {
        throw this.createProfileNotFoundException();
      }

      const response = {
        id: row.id,
        views: this.toCount(row.views),
      };

      await this.appendOutboxEvent(client, {
        aggregateType: 'profile',
        aggregateId: row.id,
        eventType: 'profile.viewed',
        payload: {
          profileId: row.id,
          userId: row.user_id,
          views: response.views,
        },
      });

      return response;
    });
  }

  private async findProfileByIdOrUserId(
    idOrUserId: string,
    viewerUserId: string | null,
    client?: PoolClient,
  ): Promise<BusinessProfileItem | null> {
    const queryText = `
      SELECT
        ${this.profileSelectFields}
      FROM business_profiles bp
      ${this.profileSelectJoins}
      WHERE bp.deleted_at IS NULL
        AND (bp.id = $1::uuid OR bp.user_id = $1::uuid)
        AND (bp.is_public = TRUE OR bp.user_id = $2::uuid)
      LIMIT 1
    `;
    const queryParams = [idOrUserId, viewerUserId];
    const result = client
      ? await client.query<ProfileRow>(queryText, queryParams)
      : await this.databaseService.query<ProfileRow>(queryText, queryParams);

    return result.rows[0] ? this.mapProfileRow(result.rows[0]) : null;
  }

  private async replaceProfileArrayValues(
    client: PoolClient,
    profileId: string,
    tableName: 'business_profile_skills' | 'business_profile_looking_for',
    columnName: 'skill' | 'item',
    values: string[],
  ): Promise<void> {
    await client.query(`DELETE FROM ${tableName} WHERE profile_id = $1::uuid`, [profileId]);

    for (const value of values) {
      await client.query(
        `
          INSERT INTO ${tableName} (profile_id, ${columnName})
          VALUES ($1::uuid, $2)
        `,
        [profileId, value],
      );
    }
  }

  private normalizeUpsertPayload(payload: UpsertMyProfileBody): UpsertMyProfileBody {
    return {
      ...payload,
      tagline: this.emptyToNull(payload.tagline),
      subIndustry: this.emptyToNull(payload.subIndustry),
      website: this.emptyToNull(payload.website),
      teamSize: this.emptyToNull(payload.teamSize),
      coverImage: this.emptyToNull(payload.coverImage),
      logo: this.emptyToNull(payload.logo),
      fundingAmount: payload.fundingNeeded ? payload.fundingAmount ?? null : null,
      skills: this.uniqueTrimmed(payload.skills),
      lookingFor: this.uniqueTrimmed(payload.lookingFor),
      achievements: this.uniqueTrimmed(payload.achievements),
      socialLinks: {
        linkedin: this.emptyToUndefined(payload.socialLinks.linkedin),
        twitter: this.emptyToUndefined(payload.socialLinks.twitter),
        facebook: this.emptyToUndefined(payload.socialLinks.facebook),
      },
    };
  }

  private mapProfileRow(row: ProfileRow): BusinessProfileItem {
    return {
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      tagline: row.tagline,
      description: row.description,
      industry: row.industry,
      subIndustry: row.sub_industry,
      location: {
        city: row.city,
        country: row.country,
      },
      website: row.website,
      foundedYear: row.founded_year,
      teamSize: row.team_size,
      stage: row.stage,
      fundingNeeded: row.funding_needed,
      fundingAmount: row.funding_amount === null ? null : Number(row.funding_amount),
      skills: row.skills ?? [],
      lookingFor: row.looking_for ?? [],
      achievements: row.achievements ?? [],
      socialLinks: {
        linkedin: row.linkedin_url ?? undefined,
        twitter: row.twitter_url ?? undefined,
        facebook: row.facebook_url ?? undefined,
      },
      coverImage: row.cover_image_url ?? undefined,
      logo: row.logo_url ?? undefined,
      isPublic: row.is_public,
      views: this.toCount(row.views),
      connections: this.toCount(row.connections_count),
      owner: {
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar_url,
        userType: row.owner_user_type,
        isVerified: row.owner_is_verified,
        verificationLevel: row.owner_verification_level,
      },
    };
  }

  private getSearchVectorExpression(): string {
    return `
      to_tsvector(
        'english',
        coalesce(bp.company_name, '') || ' ' ||
        coalesce(bp.description, '') || ' ' ||
        coalesce(bp.industry, '') || ' ' ||
        coalesce(bp.sub_industry, '') || ' ' ||
        coalesce(bp.city, '') || ' ' ||
        coalesce(bp.country, '')
      )
    `;
  }

  private uniqueTrimmed(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private emptyToNull(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private emptyToUndefined(value: string | null | undefined): string | undefined {
    if (typeof value !== 'string') {
      return value ?? undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
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

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private createProfileNotFoundException(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'PROFILE_NOT_FOUND',
        message: 'Profile not found.',
      },
    });
  }
}
