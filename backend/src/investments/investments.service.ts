import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  CreateInvestmentCommitmentBody,
  InvestmentCampaignListQuery,
} from './investments.types';
import type {
  InvestmentCampaign,
  InvestmentCampaignList,
  InvestmentCommitment,
  InvestmentCommitmentList,
  InvestmentCommitmentMutationResult,
} from '../contracts/investments';

interface CampaignRow {
  campaign_id: string | null;
  post_id: string;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_type: InvestmentCampaign['author']['userType'];
  company_name: string | null;
  content: string;
  title: string | null;
  description: string | null;
  primary_image_url: string | null;
  currency: string;
  target_amount: string | number;
  raised_amount: string | number;
  backers_count: string | number;
  min_investment: string | number;
  max_investment: string | number | null;
  equity: string | null;
  status: InvestmentCampaign['status'] | null;
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface CommitmentRow {
  id: string;
  campaign_id: string;
  post_id: string;
  investor_id: string;
  investor_name: string;
  investor_avatar: string | null;
  amount: string | number;
  currency: string;
  comment: string | null;
  is_anonymous: boolean;
  status: InvestmentCommitment['status'];
  created_at: string | Date;
}

interface SourceCampaignRow {
  post_id: string;
  owner_user_id: string;
  content: string;
  post_created_at: string | Date;
  post_updated_at: string | Date;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_type: InvestmentCampaign['author']['userType'];
  company_name: string | null;
  primary_image_url: string | null;
  target_amount: string | number;
  raised_amount: string | number;
  backers_count: string | number;
  min_investment: string | number;
  max_investment: string | number | null;
  currency: string;
  equity: string | null;
  ends_at: string | Date | null;
}

interface ExistingCampaignRow {
  id: string;
  title: string;
  description: string | null;
  status: InvestmentCampaign['status'];
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

@Injectable()
export class InvestmentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCampaigns(
    query: InvestmentCampaignListQuery,
  ): Promise<InvestmentCampaignList> {
    const params: unknown[] = [];
    const whereClauses = [
      `p.deleted_at IS NULL`,
      `p.type = 'crowdfunding'::post_type`,
    ];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(p.content ILIKE $${searchParam} OR COALESCE(bp.company_name, '') ILIKE $${searchParam} OR COALESCE(ic.title, '') ILIKE $${searchParam} OR COALESCE(ic.description, '') ILIKE $${searchParam})`,
      );
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<CampaignRow>(
      `
        SELECT
          ic.id AS campaign_id,
          p.id AS post_id,
          p.user_id AS owner_user_id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.user_type::text AS user_type,
          COALESCE(bp.company_name, 'Independent') AS company_name,
          p.content,
          ic.title,
          ic.description,
          media.primary_image_url,
          pc.currency,
          pc.target_amount,
          COALESCE(ic.raised_amount, pc.raised_amount) AS raised_amount,
          pc.backers_count,
          pc.min_investment,
          pc.max_investment,
          pc.equity,
          ic.status::text AS status,
          ic.starts_at,
          COALESCE(ic.ends_at, pc.ends_at) AS ends_at,
          COALESCE(ic.created_at, p.created_at) AS created_at,
          COALESCE(ic.updated_at, p.updated_at) AS updated_at
        FROM posts p
        JOIN post_crowdfunding pc
          ON pc.post_id = p.id
        JOIN users u
          ON u.id = p.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = p.user_id
          AND bp.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT
            campaign.id,
            campaign.title,
            campaign.description,
            campaign.raised_amount,
            campaign.status,
            campaign.starts_at,
            campaign.ends_at,
            campaign.created_at,
            campaign.updated_at
          FROM investment_campaigns campaign
          WHERE campaign.source_post_id = p.id
          ORDER BY campaign.created_at DESC, campaign.id DESC
          LIMIT 1
        ) ic ON TRUE
        LEFT JOIN LATERAL (
          SELECT pm.media_url AS primary_image_url
          FROM post_media pm
          WHERE pm.post_id = p.id
          ORDER BY pm.sort_order ASC, pm.created_at ASC
          LIMIT 1
        ) media ON TRUE
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapCampaign(row)),
    };
  }

  async getCommitments(
    postId: string,
    limit: number,
  ): Promise<InvestmentCommitmentList> {
    const result = await this.databaseService.query<CommitmentRow>(
      `
        SELECT
          commitment.id,
          commitment.campaign_id,
          campaign.source_post_id AS post_id,
          commitment.investor_user_id AS investor_id,
          CONCAT_WS(' ', investor.first_name, investor.last_name) AS investor_name,
          investor.avatar_url AS investor_avatar,
          commitment.amount,
          commitment.currency,
          commitment.comment,
          commitment.is_anonymous,
          commitment.status::text AS status,
          commitment.created_at
        FROM investment_commitments commitment
        JOIN investment_campaigns campaign
          ON campaign.id = commitment.campaign_id
        JOIN users investor
          ON investor.id = commitment.investor_user_id
          AND investor.deleted_at IS NULL
          AND investor.is_active = TRUE
        WHERE campaign.source_post_id = $1::uuid
        ORDER BY commitment.created_at DESC, commitment.id DESC
        LIMIT $2
      `,
      [postId, limit],
    );

    return {
      items: result.rows.map((row) => this.mapCommitment(row)),
    };
  }

  async createCommitment(
    investorId: string,
    postId: string,
    payload: CreateInvestmentCommitmentBody,
  ): Promise<InvestmentCommitmentMutationResult> {
    return this.databaseService.transaction(async (client) => {
      const { source, campaign } = await this.ensureCampaignForPost(client, postId);

      if (source.owner_user_id === investorId) {
        throw new BadRequestException({
          error: {
            code: 'SELF_INVESTMENT_NOT_ALLOWED',
            message: 'You cannot invest in your own campaign.',
          },
        });
      }

      const minInvestment = this.toNumber(source.min_investment);
      const maxInvestment = this.toOptionalNumber(source.max_investment);
      if (payload.amount < minInvestment) {
        throw new BadRequestException({
          error: {
            code: 'INVESTMENT_BELOW_MINIMUM',
            message: 'Investment amount is below the campaign minimum.',
          },
        });
      }
      if (maxInvestment !== undefined && payload.amount > maxInvestment) {
        throw new BadRequestException({
          error: {
            code: 'INVESTMENT_ABOVE_MAXIMUM',
            message: 'Investment amount exceeds the campaign maximum.',
          },
        });
      }

      if (campaign.status !== 'active') {
        throw new BadRequestException({
          error: {
            code: 'CAMPAIGN_NOT_ACTIVE',
            message: 'Campaign is not currently accepting commitments.',
          },
        });
      }

      const existingBackerResult = await client.query<{ has_commitment: boolean }>(
        `
          SELECT EXISTS (
            SELECT 1
            FROM investment_commitments
            WHERE campaign_id = $1::uuid
              AND investor_user_id = $2::uuid
              AND status NOT IN ('failed'::payment_status, 'cancelled'::payment_status, 'refunded'::payment_status)
          ) AS has_commitment
        `,
        [campaign.id, investorId],
      );
      const isExistingBacker = Boolean(existingBackerResult.rows[0]?.has_commitment);

      const insertResult = await client.query<CommitmentRow>(
        `
          WITH inserted AS (
            INSERT INTO investment_commitments (
              campaign_id,
              investor_user_id,
              amount,
              currency,
              comment,
              is_anonymous,
              status
            ) VALUES (
              $1::uuid,
              $2::uuid,
              $3,
              $4,
              $5,
              $6,
              'initiated'::payment_status
            )
            RETURNING
              id,
              campaign_id,
              investor_user_id AS investor_id,
              amount,
              currency,
              comment,
              is_anonymous,
              status::text AS status,
              created_at
          )
          SELECT
            inserted.id,
            inserted.campaign_id,
            $7::uuid AS post_id,
            inserted.investor_id,
            CONCAT_WS(' ', investor.first_name, investor.last_name) AS investor_name,
            investor.avatar_url AS investor_avatar,
            inserted.amount,
            inserted.currency,
            inserted.comment,
            inserted.is_anonymous,
            inserted.status,
            inserted.created_at
          FROM inserted
          JOIN users investor
            ON investor.id = inserted.investor_id
        `,
        [
          campaign.id,
          investorId,
          payload.amount,
          source.currency,
          payload.comment?.trim() || null,
          payload.isAnonymous ?? false,
          postId,
        ],
      );
      const commitment = insertResult.rows[0];
      if (!commitment) {
        throw new BadRequestException({
          error: {
            code: 'COMMITMENT_CREATE_FAILED',
            message: 'Failed to create investment commitment.',
          },
        });
      }

      const backersDelta = isExistingBacker ? 0 : 1;

      await client.query(
        `
          UPDATE post_crowdfunding
          SET
            raised_amount = raised_amount + $2,
            backers_count = backers_count + $3
          WHERE post_id = $1::uuid
        `,
        [postId, payload.amount, backersDelta],
      );

      const campaignUpdateResult = await client.query<{
        raised_amount: string | number;
        updated_at: string | Date;
      }>(
        `
          UPDATE investment_campaigns
          SET
            raised_amount = raised_amount + $2,
            updated_at = now()
          WHERE id = $1::uuid
          RETURNING raised_amount, updated_at
        `,
        [campaign.id, payload.amount],
      );
      const updatedCampaign = campaignUpdateResult.rows[0];
      if (!updatedCampaign) {
        throw new BadRequestException({
          error: {
            code: 'CAMPAIGN_UPDATE_FAILED',
            message: 'Failed to update campaign totals.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'investment_commitment',
        aggregateId: commitment.id,
        eventType: 'investment.commitment.created',
        payload: {
          commitmentId: commitment.id,
          campaignId: campaign.id,
          postId,
          investorId,
          amount: payload.amount,
          currency: source.currency,
          isAnonymous: payload.isAnonymous ?? false,
        },
      });

      return {
        commitment: this.mapCommitment(commitment),
        campaign: this.mapCampaign({
          campaign_id: campaign.id,
          post_id: source.post_id,
          owner_user_id: source.owner_user_id,
          first_name: source.first_name,
          last_name: source.last_name,
          avatar_url: source.avatar_url,
          user_type: source.user_type,
          company_name: source.company_name,
          content: source.content,
          title: campaign.title,
          description: campaign.description,
          primary_image_url: source.primary_image_url,
          currency: source.currency,
          target_amount: source.target_amount,
          raised_amount: updatedCampaign.raised_amount,
          backers_count: this.toCount(source.backers_count) + backersDelta,
          min_investment: source.min_investment,
          max_investment: source.max_investment,
          equity: source.equity,
          status: campaign.status,
          starts_at: campaign.starts_at,
          ends_at: campaign.ends_at,
          created_at: campaign.created_at,
          updated_at: updatedCampaign.updated_at,
        }),
      };
    });
  }

  private async ensureCampaignForPost(
    client: PoolClient,
    postId: string,
  ): Promise<{ source: SourceCampaignRow; campaign: ExistingCampaignRow }> {
    const sourceResult = await client.query<SourceCampaignRow>(
      `
        SELECT
          p.id AS post_id,
          p.user_id AS owner_user_id,
          p.content,
          p.created_at AS post_created_at,
          p.updated_at AS post_updated_at,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.user_type::text AS user_type,
          COALESCE(bp.company_name, 'Funding Campaign') AS company_name,
          media.primary_image_url,
          pc.target_amount,
          pc.raised_amount,
          pc.backers_count,
          pc.min_investment,
          pc.max_investment,
          pc.currency,
          pc.equity,
          pc.ends_at
        FROM posts p
        JOIN post_crowdfunding pc
          ON pc.post_id = p.id
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
        WHERE p.id = $1::uuid
          AND p.deleted_at IS NULL
        FOR UPDATE OF p, pc
      `,
      [postId],
    );
    const source = sourceResult.rows[0];
    if (!source) {
      throw new NotFoundException({
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Crowdfunding campaign not found.',
        },
      });
    }

    const existingResult = await client.query<ExistingCampaignRow>(
      `
        SELECT
          id,
          title,
          description,
          status::text AS status,
          starts_at,
          ends_at,
          created_at,
          updated_at
        FROM investment_campaigns
        WHERE source_post_id = $1::uuid
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [postId],
    );

    const existing = existingResult.rows[0];
    if (existing) {
      return { source, campaign: existing };
    }

    const insertedResult = await client.query<ExistingCampaignRow>(
      `
        INSERT INTO investment_campaigns (
          owner_user_id,
          source_post_id,
          title,
          description,
          currency,
          target_amount,
          raised_amount,
          min_investment,
          max_investment,
          equity,
          status,
          starts_at,
          ends_at
        ) VALUES (
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'active'::campaign_status,
          $11::timestamptz,
          $12::timestamptz
        )
        RETURNING
          id,
          title,
          description,
          status::text AS status,
          starts_at,
          ends_at,
          created_at,
          updated_at
      `,
      [
        source.owner_user_id,
        postId,
        source.company_name ?? 'Funding Campaign',
        source.content,
        source.currency,
        source.target_amount,
        source.raised_amount,
        source.min_investment,
        source.max_investment,
        source.equity,
        this.toIsoTimestamp(source.post_created_at),
        source.ends_at ? this.toIsoTimestamp(source.ends_at) : null,
      ],
    );
    const inserted = insertedResult.rows[0];
    if (!inserted) {
      throw new BadRequestException({
        error: {
          code: 'CAMPAIGN_CREATE_FAILED',
          message: 'Failed to materialize investment campaign.',
        },
      });
    }

    return { source, campaign: inserted };
  }

  private mapCampaign(row: CampaignRow): InvestmentCampaign {
    return {
      campaignId: row.campaign_id,
      postId: row.post_id,
      ownerUserId: row.owner_user_id,
      author: {
        id: row.owner_user_id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        company: row.company_name ?? 'Independent',
        avatar: row.avatar_url,
        userType: row.user_type,
      },
      content: row.content,
      title: row.title ?? row.company_name ?? 'Funding Campaign',
      description: row.description,
      primaryImageUrl: row.primary_image_url,
      currency: row.currency,
      targetAmount: this.toNumber(row.target_amount),
      raisedAmount: this.toNumber(row.raised_amount),
      backersCount: this.toCount(row.backers_count),
      minInvestment: this.toNumber(row.min_investment),
      maxInvestment: this.toOptionalNumber(row.max_investment),
      equity: row.equity ?? undefined,
      status: row.status ?? 'active',
      startsAt: row.starts_at ? this.toIsoTimestamp(row.starts_at) : null,
      endsAt: row.ends_at ? this.toIsoTimestamp(row.ends_at) : null,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
  }

  private mapCommitment(row: CommitmentRow): InvestmentCommitment {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      postId: row.post_id,
      investorId: row.investor_id,
      investorName: row.is_anonymous ? 'Anonymous Investor' : row.investor_name,
      investorAvatar: row.is_anonymous ? null : row.investor_avatar,
      amount: this.toNumber(row.amount),
      currency: row.currency,
      comment: row.comment,
      isAnonymous: row.is_anonymous,
      status: row.status,
      createdAt: this.toIsoTimestamp(row.created_at),
    };
  }

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toNumber(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toOptionalNumber(value: string | number | null): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return this.toNumber(value);
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
