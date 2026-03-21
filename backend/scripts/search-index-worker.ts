import { Buffer } from 'node:buffer';
import { Client } from 'pg';

const PROFILE_EVENT_TYPES = [
  'profile.created',
  'profile.updated',
  'profile.viewed',
] as const;

const POST_EVENT_TYPES = [
  'post.created',
  'post.reaction.toggled',
  'post.bookmark.toggled',
  'post.share.toggled',
  'post.repost.toggled',
  'post.comment.created',
] as const;

type SearchableAggregateType = 'profile' | 'post';

interface OutboxEventRow {
  id: string;
  aggregate_type: SearchableAggregateType;
  aggregate_id: string;
  event_type: string;
  occurred_at: string | Date;
}

interface ProfileSearchRow {
  id: string;
  user_id: string;
  company_name: string;
  tagline: string | null;
  description: string;
  industry: string;
  sub_industry: string | null;
  city: string;
  country: string;
  stage: string;
  funding_needed: boolean;
  funding_amount: string | number | null;
  is_public: boolean;
  views: string | number;
  connections_count: string | number;
  skills: string[] | null;
  looking_for: string[] | null;
  achievements: string[] | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface PostSearchRow {
  id: string;
  user_id: string;
  type: string;
  visibility: string;
  content: string;
  created_at: string | Date;
  likes_count: string | number;
  loves_count: string | number;
  interests_count: string | number;
  bookmarks_count: string | number;
  reposts_count: string | number;
  comments_count: string | number;
  shares_count: string | number;
  author_name: string;
  company_name: string | null;
  product_name: string | null;
  product_description: string | null;
  product_category: string | null;
  service_name: string | null;
  service_description: string | null;
  service_category: string | null;
  crowdfunding_equity: string | null;
  crowdfunding_currency: string | null;
  offer_stages: string[] | null;
  offer_industries: string[] | null;
  request_stages: string[] | null;
  request_industries: string[] | null;
  request_timeline: string | null;
  mentorship_expertise: string[] | null;
  promotion_code: string | null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isSearchIndexingEnabled(): boolean {
  return process.env.SEARCH_INDEXING_ENABLED === 'true';
}

function shouldWatch(): boolean {
  return process.argv.includes('--watch') || process.env.SEARCH_INDEXING_CONTINUOUS === 'true';
}

function toIsoTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function buildOpenSearchUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBaseUrl).toString();
}

async function openSearchRequest(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const username = process.env.OPENSEARCH_USERNAME?.trim();
  const password = process.env.OPENSEARCH_PASSWORD?.trim();
  if (username && password && !headers.has('authorization')) {
    const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    headers.set('authorization', `Basic ${token}`);
  }

  return fetch(buildOpenSearchUrl(baseUrl, path), {
    ...init,
    headers,
  });
}

async function ensureIndex(
  baseUrl: string,
  indexName: string,
  mapping: Record<string, unknown>,
): Promise<void> {
  const headResponse = await openSearchRequest(
    baseUrl,
    `/${encodeURIComponent(indexName)}`,
    { method: 'HEAD' },
  );

  if (headResponse.ok) {
    return;
  }

  if (headResponse.status !== 404) {
    throw new Error(
      `Failed to check index ${indexName}: ${headResponse.status} ${headResponse.statusText}`,
    );
  }

  const createResponse = await openSearchRequest(
    baseUrl,
    `/${encodeURIComponent(indexName)}`,
    {
      method: 'PUT',
      body: JSON.stringify(mapping),
    },
  );

  if (createResponse.ok) {
    return;
  }

  const responseText = await createResponse.text();
  if (responseText.includes('resource_already_exists_exception')) {
    return;
  }

  throw new Error(
    `Failed to create index ${indexName}: ${createResponse.status} ${responseText}`,
  );
}

async function upsertDocument(
  baseUrl: string,
  indexName: string,
  documentId: string,
  document: Record<string, unknown>,
): Promise<void> {
  const response = await openSearchRequest(
    baseUrl,
    `/${encodeURIComponent(indexName)}/_doc/${encodeURIComponent(documentId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(document),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to index ${indexName}/${documentId}: ${response.status} ${await response.text()}`,
    );
  }
}

async function deleteDocument(
  baseUrl: string,
  indexName: string,
  documentId: string,
): Promise<void> {
  const response = await openSearchRequest(
    baseUrl,
    `/${encodeURIComponent(indexName)}/_doc/${encodeURIComponent(documentId)}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to delete ${indexName}/${documentId}: ${response.status} ${await response.text()}`,
    );
  }
}

async function getPendingEvents(
  client: Client,
  batchSize: number,
): Promise<OutboxEventRow[]> {
  const result = await client.query<OutboxEventRow>(
    `
      SELECT
        id,
        aggregate_type,
        aggregate_id,
        event_type,
        occurred_at
      FROM outbox_events
      WHERE (
        (aggregate_type = 'profile' AND event_type = ANY($1::text[]))
        OR (aggregate_type = 'post' AND event_type = ANY($2::text[]))
      )
        AND COALESCE(headers -> 'search' ->> 'indexedAt', '') = ''
      ORDER BY occurred_at ASC, id ASC
      LIMIT $3
    `,
    [[...PROFILE_EVENT_TYPES], [...POST_EVENT_TYPES], batchSize],
  );

  return result.rows;
}

async function markIndexed(
  client: Client,
  event: OutboxEventRow,
  indexName: string,
): Promise<void> {
  await client.query(
    `
      UPDATE outbox_events
      SET headers = jsonb_set(
        COALESCE(headers, '{}'::jsonb),
        '{search}',
        $2::jsonb,
        true
      )
      WHERE id = $1::uuid
    `,
    [
      event.id,
      JSON.stringify({
        status: 'indexed',
        indexName,
        indexedAt: new Date().toISOString(),
        aggregateType: event.aggregate_type,
        eventType: event.event_type,
      }),
    ],
  );
}

async function markFailed(
  client: Client,
  event: OutboxEventRow,
  errorMessage: string,
): Promise<void> {
  await client.query(
    `
      UPDATE outbox_events
      SET headers = jsonb_set(
        COALESCE(headers, '{}'::jsonb),
        '{search}',
        $2::jsonb,
        true
      )
      WHERE id = $1::uuid
    `,
    [
      event.id,
      JSON.stringify({
        status: 'failed',
        attemptedAt: new Date().toISOString(),
        aggregateType: event.aggregate_type,
        eventType: event.event_type,
        error: errorMessage.slice(0, 500),
      }),
    ],
  );
}

async function loadProfileDocument(
  client: Client,
  profileId: string,
): Promise<Record<string, unknown> | null> {
  const result = await client.query<ProfileSearchRow>(
    `
      SELECT
        bp.id,
        bp.user_id,
        bp.company_name,
        bp.tagline,
        bp.description,
        bp.industry,
        bp.sub_industry,
        bp.city,
        bp.country,
        bp.stage,
        bp.funding_needed,
        bp.funding_amount,
        bp.is_public,
        bp.views,
        bp.connections_count,
        COALESCE(
          array_agg(DISTINCT bps.skill) FILTER (WHERE bps.skill IS NOT NULL),
          '{}'::text[]
        ) AS skills,
        COALESCE(
          array_agg(DISTINCT bplf.item) FILTER (WHERE bplf.item IS NOT NULL),
          '{}'::text[]
        ) AS looking_for,
        COALESCE(
          array_agg(DISTINCT bpa.achievement) FILTER (WHERE bpa.achievement IS NOT NULL),
          '{}'::text[]
        ) AS achievements,
        bp.created_at,
        bp.updated_at
      FROM business_profiles bp
      LEFT JOIN business_profile_skills bps
        ON bps.profile_id = bp.id
      LEFT JOIN business_profile_looking_for bplf
        ON bplf.profile_id = bp.id
      LEFT JOIN business_profile_achievements bpa
        ON bpa.profile_id = bp.id
      WHERE bp.id = $1::uuid
        AND bp.deleted_at IS NULL
      GROUP BY
        bp.id,
        bp.user_id,
        bp.company_name,
        bp.tagline,
        bp.description,
        bp.industry,
        bp.sub_industry,
        bp.city,
        bp.country,
        bp.stage,
        bp.funding_needed,
        bp.funding_amount,
        bp.is_public,
        bp.views,
        bp.connections_count,
        bp.created_at,
        bp.updated_at
      LIMIT 1
    `,
    [profileId],
  );

  const row = result.rows[0];
  if (!row || !row.is_public) {
    return null;
  }

  const searchableText = [
    row.company_name,
    row.tagline ?? '',
    row.description,
    row.industry,
    row.sub_industry ?? '',
    row.city,
    row.country,
    ...(row.skills ?? []),
    ...(row.looking_for ?? []),
    ...(row.achievements ?? []),
  ]
    .join(' ')
    .trim();

  return {
    id: row.id,
    entityType: 'profile',
    userId: row.user_id,
    companyName: row.company_name,
    tagline: row.tagline ?? undefined,
    description: row.description,
    industry: row.industry,
    subIndustry: row.sub_industry ?? undefined,
    stage: row.stage,
    location: {
      city: row.city,
      country: row.country,
    },
    fundingNeeded: row.funding_needed,
    fundingAmount:
      row.funding_amount === null ? undefined : toNumber(row.funding_amount),
    views: toNumber(row.views),
    connections: toNumber(row.connections_count),
    skills: row.skills ?? [],
    lookingFor: row.looking_for ?? [],
    achievements: row.achievements ?? [],
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
    searchableText,
  };
}

async function loadPostDocument(
  client: Client,
  postId: string,
): Promise<Record<string, unknown> | null> {
  const result = await client.query<PostSearchRow>(
    `
      SELECT
        p.id,
        p.user_id,
        p.type::text AS type,
        p.visibility::text AS visibility,
        p.content,
        p.created_at,
        p.likes_count,
        p.loves_count,
        p.interests_count,
        p.bookmarks_count,
        p.reposts_count,
        p.comments_count,
        p.shares_count,
        CONCAT_WS(' ', u.first_name, u.last_name) AS author_name,
        bp.company_name,
        pp.name AS product_name,
        pp.description AS product_description,
        pp.category AS product_category,
        ps.name AS service_name,
        ps.description AS service_description,
        ps.category AS service_category,
        pcf.equity AS crowdfunding_equity,
        pcf.currency AS crowdfunding_currency,
        offer_stages.stages AS offer_stages,
        offer_industries.industries AS offer_industries,
        request_stages.stages AS request_stages,
        request_industries.industries AS request_industries,
        pir.timeline AS request_timeline,
        mentorship_expertise.expertise AS mentorship_expertise,
        promo.promo_code AS promotion_code
      FROM posts p
      JOIN users u
        ON u.id = p.user_id
        AND u.deleted_at IS NULL
        AND u.is_active = TRUE
      LEFT JOIN business_profiles bp
        ON bp.user_id = p.user_id
        AND bp.deleted_at IS NULL
      LEFT JOIN post_products pp
        ON pp.post_id = p.id
      LEFT JOIN post_services ps
        ON ps.post_id = p.id
      LEFT JOIN post_crowdfunding pcf
        ON pcf.post_id = p.id
      LEFT JOIN post_investment_requests pir
        ON pir.post_id = p.id
      LEFT JOIN post_promotions promo
        ON promo.post_id = p.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(stage ORDER BY stage), '{}'::text[]) AS stages
        FROM post_investment_offer_stages
        WHERE post_id = p.id
      ) AS offer_stages ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(industry ORDER BY industry), '{}'::text[]) AS industries
        FROM post_investment_offer_industries
        WHERE post_id = p.id
      ) AS offer_industries ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(stage ORDER BY stage), '{}'::text[]) AS stages
        FROM post_investment_request_stages
        WHERE post_id = p.id
      ) AS request_stages ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(industry ORDER BY industry), '{}'::text[]) AS industries
        FROM post_investment_request_industries
        WHERE post_id = p.id
      ) AS request_industries ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(array_agg(expertise ORDER BY expertise), '{}'::text[]) AS expertise
        FROM post_mentorship_expertise
        WHERE post_id = p.id
      ) AS mentorship_expertise ON TRUE
      WHERE p.id = $1::uuid
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [postId],
  );

  const row = result.rows[0];
  if (!row || row.visibility !== 'public') {
    return null;
  }

  const searchableText = [
    row.content,
    row.author_name,
    row.company_name ?? '',
    row.product_name ?? '',
    row.product_description ?? '',
    row.product_category ?? '',
    row.service_name ?? '',
    row.service_description ?? '',
    row.service_category ?? '',
    row.crowdfunding_equity ?? '',
    row.crowdfunding_currency ?? '',
    ...(row.offer_stages ?? []),
    ...(row.offer_industries ?? []),
    ...(row.request_stages ?? []),
    ...(row.request_industries ?? []),
    row.request_timeline ?? '',
    ...(row.mentorship_expertise ?? []),
    row.promotion_code ?? '',
  ]
    .join(' ')
    .trim();

  return {
    id: row.id,
    entityType: 'post',
    userId: row.user_id,
    type: row.type,
    visibility: row.visibility,
    authorName: row.author_name,
    companyName: row.company_name ?? 'Independent',
    content: row.content,
    productName: row.product_name ?? undefined,
    serviceName: row.service_name ?? undefined,
    crowdfundingCurrency: row.crowdfunding_currency ?? undefined,
    crowdfundingEquity: row.crowdfunding_equity ?? undefined,
    offerStages: row.offer_stages ?? [],
    offerIndustries: row.offer_industries ?? [],
    requestStages: row.request_stages ?? [],
    requestIndustries: row.request_industries ?? [],
    requestTimeline: row.request_timeline ?? undefined,
    mentorshipExpertise: row.mentorship_expertise ?? [],
    promotionCode: row.promotion_code ?? undefined,
    metrics: {
      likes: toNumber(row.likes_count),
      loves: toNumber(row.loves_count),
      interests: toNumber(row.interests_count),
      bookmarks: toNumber(row.bookmarks_count),
      reposts: toNumber(row.reposts_count),
      comments: toNumber(row.comments_count),
      shares: toNumber(row.shares_count),
    },
    createdAt: toIsoTimestamp(row.created_at),
    searchableText,
  };
}

async function processEvent(
  client: Client,
  baseUrl: string,
  profileIndex: string,
  postIndex: string,
  event: OutboxEventRow,
): Promise<{ indexed: boolean; failed: boolean }> {
  try {
    if (event.aggregate_type === 'profile') {
      const document = await loadProfileDocument(client, event.aggregate_id);
      if (document) {
        await upsertDocument(baseUrl, profileIndex, event.aggregate_id, document);
      } else {
        await deleteDocument(baseUrl, profileIndex, event.aggregate_id);
      }

      await markIndexed(client, event, profileIndex);
      return { indexed: true, failed: false };
    }

    const document = await loadPostDocument(client, event.aggregate_id);
    if (document) {
      await upsertDocument(baseUrl, postIndex, event.aggregate_id, document);
    } else {
      await deleteDocument(baseUrl, postIndex, event.aggregate_id);
    }

    await markIndexed(client, event, postIndex);
    return { indexed: true, failed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFailed(client, event, message);
    console.error(
      `Search indexing failed for ${event.aggregate_type}:${event.aggregate_id}: ${message}`,
    );
    return { indexed: false, failed: true };
  }
}

async function processBatch(
  client: Client,
  baseUrl: string,
  profileIndex: string,
  postIndex: string,
  batchSize: number,
): Promise<{ processed: number; failed: number }> {
  const events = await getPendingEvents(client, batchSize);
  if (events.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    const result = await processEvent(client, baseUrl, profileIndex, postIndex, event);
    if (result.indexed) {
      processed += 1;
    }
    if (result.failed) {
      failed += 1;
    }
  }

  return { processed, failed };
}

function getProfileIndexMapping(): Record<string, unknown> {
  return {
    settings: {
      index: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    },
    mappings: {
      properties: {
        entityType: { type: 'keyword' },
        userId: { type: 'keyword' },
        companyName: { type: 'text' },
        industry: { type: 'keyword' },
        stage: { type: 'keyword' },
        skills: { type: 'keyword' },
        lookingFor: { type: 'keyword' },
        views: { type: 'integer' },
        connections: { type: 'integer' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        searchableText: { type: 'text' },
      },
    },
  };
}

function getPostIndexMapping(): Record<string, unknown> {
  return {
    settings: {
      index: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    },
    mappings: {
      properties: {
        entityType: { type: 'keyword' },
        userId: { type: 'keyword' },
        type: { type: 'keyword' },
        visibility: { type: 'keyword' },
        companyName: { type: 'text' },
        authorName: { type: 'text' },
        offerStages: { type: 'keyword' },
        offerIndustries: { type: 'keyword' },
        requestStages: { type: 'keyword' },
        requestIndustries: { type: 'keyword' },
        mentorshipExpertise: { type: 'keyword' },
        createdAt: { type: 'date' },
        searchableText: { type: 'text' },
      },
    },
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function run(): Promise<void> {
  if (!isSearchIndexingEnabled()) {
    console.log('Search indexing is disabled. Set SEARCH_INDEXING_ENABLED=true to run the worker.');
    return;
  }

  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://vendrome:vendrome@localhost:5433/vendrome';
  const openSearchUrl = getRequiredEnv('OPENSEARCH_URL');
  const profileIndex = process.env.OPENSEARCH_INDEX_PROFILES?.trim() || 'vendrome-profiles';
  const postIndex = process.env.OPENSEARCH_INDEX_POSTS?.trim() || 'vendrome-posts';
  const batchSize = getNumberEnv('SEARCH_INDEXING_BATCH_SIZE', 50);
  const pollIntervalMs = getNumberEnv('SEARCH_INDEXING_POLL_INTERVAL_MS', 5000);
  const watch = shouldWatch();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureIndex(openSearchUrl, profileIndex, getProfileIndexMapping());
    await ensureIndex(openSearchUrl, postIndex, getPostIndexMapping());

    let totalProcessed = 0;
    let totalFailed = 0;

    do {
      const batch = await processBatch(
        client,
        openSearchUrl,
        profileIndex,
        postIndex,
        batchSize,
      );

      totalProcessed += batch.processed;
      totalFailed += batch.failed;

      if (!watch) {
        break;
      }

      if (batch.processed === 0 && batch.failed === 0) {
        await sleep(pollIntervalMs);
      }
    } while (watch);

    if (totalProcessed === 0 && totalFailed === 0) {
      console.log('No pending search indexing events found.');
      return;
    }

    console.log(
      `Search indexing completed. Indexed: ${totalProcessed}, failed: ${totalFailed}.`,
    );

    if (totalFailed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Search indexing worker failed: ${message}`);
  process.exit(1);
});
