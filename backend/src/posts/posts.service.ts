import { Buffer } from 'node:buffer';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  BookmarkDeleteResponse,
  BookmarkItem,
  BookmarkListQuery,
  BookmarkListResponse,
  BookmarkToggleResponse,
  CreateCommentBody,
  CreatePostBody,
  FeedPage,
  FeedPost,
  PostComment,
  PostCommentList,
  RepostToggleResponse,
  ReactionToggleResponse,
  ShareToggleResponse,
  ToggleReactionBody,
} from './posts.types';

interface FeedCursor {
  createdAt: string;
  id: string;
}

interface FeedPostRow {
  id: string;
  user_id: string;
  type: FeedPost['type'];
  content: string;
  visibility: FeedPost['visibility'];
  likes_count: string | number;
  loves_count: string | number;
  interests_count: string | number;
  bookmarks_count: string | number;
  reposts_count: string | number;
  comments_count: string | number;
  shares_count: string | number;
  created_at: string | Date;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_type: FeedPost['author']['userType'];
  company_name: string | null;
  is_liked: boolean;
  is_loved: boolean;
  is_interested: boolean;
  is_shared: boolean;
  is_reposted: boolean;
  is_bookmarked: boolean;
}

interface PostMediaRow {
  post_id: string;
  media_type: FeedPost['media'][number]['type'];
  media_url: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: string | number;
  created_at: string | Date;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface BookmarkRow {
  id: string;
  source_id: string | null;
  title: string;
  description: string | null;
  url: string | null;
  type: BookmarkItem['type'];
  category: BookmarkItem['category'];
  tags: string[] | null;
  image_url: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  created_at: string | Date;
  saved_at: string | Date;
  post_id: string | null;
}

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getFeed(options: {
    viewerUserId: string | null;
    cursor?: string;
    limit: number;
    type?: FeedPost['type'];
  }): Promise<FeedPage> {
    const decodedCursor = options.cursor ? this.decodeCursor(options.cursor) : null;

    const params: unknown[] = [];
    const whereClauses: string[] = ['p.deleted_at IS NULL'];

    if (options.type) {
      params.push(options.type);
      whereClauses.push(`p.type = $${params.length}::post_type`);
    }

    if (decodedCursor) {
      params.push(decodedCursor.createdAt);
      const createdAtParam = params.length;
      params.push(decodedCursor.id);
      const idParam = params.length;
      whereClauses.push(
        `(p.created_at < $${createdAtParam}::timestamptz OR (p.created_at = $${createdAtParam}::timestamptz AND p.id < $${idParam}::uuid))`,
      );
    }

    params.push(options.viewerUserId);
    const viewerParam = params.length;

    params.push(options.limit + 1);
    const limitParam = params.length;

    const result = await this.databaseService.query<FeedPostRow>(
      `
        SELECT
          p.id,
          p.user_id,
          p.type::text AS type,
          p.content,
          p.visibility::text AS visibility,
          p.likes_count,
          p.loves_count,
          p.interests_count,
          p.bookmarks_count,
          p.reposts_count,
          p.comments_count,
          p.shares_count,
          p.created_at,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.user_type::text AS user_type,
          COALESCE(bp.company_name, 'Independent') AS company_name,
          CASE WHEN $${viewerParam}::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reactions pr
            WHERE pr.post_id = p.id
              AND pr.user_id = $${viewerParam}::uuid
              AND pr.reaction = 'like'
          ) END AS is_liked,
          CASE WHEN $${viewerParam}::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reactions pr
            WHERE pr.post_id = p.id
              AND pr.user_id = $${viewerParam}::uuid
              AND pr.reaction = 'love'
          ) END AS is_loved,
          CASE WHEN $${viewerParam}::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reactions pr
            WHERE pr.post_id = p.id
              AND pr.user_id = $${viewerParam}::uuid
              AND pr.reaction = 'interest'
          ) END AS is_interested,
          CASE WHEN $${viewerParam}::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_shares ps
            WHERE ps.post_id = p.id
              AND ps.user_id = $${viewerParam}::uuid
          ) END AS is_shared,
          CASE WHEN $${viewerParam}::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reposts prp
            WHERE prp.original_post_id = p.id
              AND prp.user_id = $${viewerParam}::uuid
          ) END AS is_reposted,
          CASE WHEN $${viewerParam}::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM bookmarks b
            WHERE b.user_id = $${viewerParam}::uuid
              AND b.type = 'post'::bookmark_type
              AND b.source_id = p.id::text
          ) END AS is_bookmarked
        FROM posts p
        JOIN users u
          ON u.id = p.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = p.user_id
          AND bp.deleted_at IS NULL
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    const hasMore = result.rows.length > options.limit;
    const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows;
    const mediaMap = await this.loadMediaMap(rows.map((row) => row.id));
    const items = rows.map((row) => this.mapFeedPost(row, mediaMap));

    const nextCursor = hasMore
      ? this.encodeCursor({
          createdAt: this.toIsoTimestamp(rows[rows.length - 1].created_at),
          id: rows[rows.length - 1].id,
        })
      : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async createPost(userId: string, payload: CreatePostBody): Promise<FeedPost> {
    const postId = await this.databaseService.transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO posts (user_id, type, content, visibility)
          VALUES ($1::uuid, $2::post_type, $3, $4::post_visibility)
          RETURNING id
        `,
        [userId, payload.type, payload.content, payload.visibility],
      );

      const insertedPostId = result.rows[0]?.id;
      if (!insertedPostId) {
        throw new BadRequestException({
          error: {
            code: 'POST_CREATE_FAILED',
            message: 'Failed to create post.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'post',
        aggregateId: insertedPostId,
        eventType: 'post.created',
        payload: {
          postId: insertedPostId,
          userId,
          type: payload.type,
          visibility: payload.visibility,
        },
      });

      return insertedPostId;
    });

    return this.getPostById(postId, userId);
  }

  async toggleReaction(
    userId: string,
    postId: string,
    payload: ToggleReactionBody,
  ): Promise<ReactionToggleResponse> {
    const counterColumnByReaction: Record<ToggleReactionBody['reaction'], string> = {
      like: 'likes_count',
      love: 'loves_count',
      interest: 'interests_count',
    };

    return this.databaseService.transaction(async (client) => {
      const existingPost = await client.query<{ id: string }>(
        `
          SELECT id
          FROM posts
          WHERE id = $1::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      if (!existingPost.rows[0]) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      const insertResult = await client.query<{ id: string }>(
        `
          INSERT INTO post_reactions (post_id, user_id, reaction)
          VALUES ($1::uuid, $2::uuid, $3::reaction_type)
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [postId, userId, payload.reaction],
      );

      const counterColumn = counterColumnByReaction[payload.reaction];
      let isActive = false;

      if (insertResult.rows[0]) {
        isActive = true;
        await client.query(
          `
            UPDATE posts
            SET ${counterColumn} = ${counterColumn} + 1
            WHERE id = $1::uuid
          `,
          [postId],
        );
      } else {
        const deleteResult = await client.query<{ id: string }>(
          `
            DELETE FROM post_reactions
            WHERE post_id = $1::uuid
              AND user_id = $2::uuid
              AND reaction = $3::reaction_type
            RETURNING id
          `,
          [postId, userId, payload.reaction],
        );

        if (deleteResult.rows[0]) {
          await client.query(
            `
              UPDATE posts
              SET ${counterColumn} = GREATEST(0, ${counterColumn} - 1)
              WHERE id = $1::uuid
            `,
            [postId],
          );
        }
      }

      const countResult = await client.query<{
        likes_count: string | number;
        loves_count: string | number;
        interests_count: string | number;
      }>(
        `
          SELECT
            likes_count,
            loves_count,
            interests_count
          FROM posts
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [postId],
      );

      const counts = countResult.rows[0];
      if (!counts) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'post',
        aggregateId: postId,
        eventType: 'post.reaction.toggled',
        payload: {
          postId,
          userId,
          reaction: payload.reaction,
          isActive,
          counts: {
            likes: this.toCount(counts.likes_count),
            loves: this.toCount(counts.loves_count),
            interests: this.toCount(counts.interests_count),
          },
        },
      });

      return {
        reaction: payload.reaction,
        isActive,
        counts: {
          likes: this.toCount(counts.likes_count),
          loves: this.toCount(counts.loves_count),
          interests: this.toCount(counts.interests_count),
        },
      };
    });
  }

  async toggleBookmark(userId: string, postId: string): Promise<BookmarkToggleResponse> {
    return this.databaseService.transaction(async (client) => {
      const postResult = await client.query<{
        id: string;
        type: FeedPost['type'];
        content: string;
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      }>(
        `
          SELECT
            p.id,
            p.type::text AS type,
            p.content,
            u.first_name,
            u.last_name,
            u.avatar_url
          FROM posts p
          JOIN users u
            ON u.id = p.user_id
            AND u.deleted_at IS NULL
            AND u.is_active = TRUE
          WHERE p.id = $1::uuid
            AND p.deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      const post = postResult.rows[0];
      if (!post) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      const existingBookmark = await client.query<{ id: string }>(
        `
          SELECT id
          FROM bookmarks
          WHERE user_id = $1::uuid
            AND type = 'post'::bookmark_type
            AND source_id = $2
          LIMIT 1
        `,
        [userId, postId],
      );

      let isBookmarked = false;

      if (existingBookmark.rows[0]) {
        await client.query(
          `
            DELETE FROM bookmarks
            WHERE id = $1::uuid
          `,
          [existingBookmark.rows[0].id],
        );

        await client.query(
          `
            UPDATE posts
            SET bookmarks_count = GREATEST(0, bookmarks_count - 1)
            WHERE id = $1::uuid
          `,
          [postId],
        );
      } else {
        const title = post.content.split('\n')[0]?.trim().slice(0, 120) || 'Post bookmark';

        await client.query(
          `
            INSERT INTO bookmarks (
              user_id,
              type,
              source_id,
              post_id,
              title,
              description,
              category,
              author_name,
              author_avatar_url
            ) VALUES (
              $1::uuid,
              'post'::bookmark_type,
              $2,
              $3::uuid,
              $4,
              $5,
              $6::bookmark_category,
              $7,
              $8
            )
          `,
          [
            userId,
            postId,
            postId,
            title,
            post.content,
            this.toBookmarkCategory(post.type),
            `${post.first_name} ${post.last_name}`.trim(),
            post.avatar_url,
          ],
        );

        await client.query(
          `
            UPDATE posts
            SET bookmarks_count = bookmarks_count + 1
            WHERE id = $1::uuid
          `,
          [postId],
        );

        isBookmarked = true;
      }

      const countResult = await client.query<{ bookmarks_count: string | number }>(
        `
          SELECT bookmarks_count
          FROM posts
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [postId],
      );

      const counts = countResult.rows[0];
      if (!counts) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'post',
        aggregateId: postId,
        eventType: 'post.bookmark.toggled',
        payload: {
          postId,
          userId,
          isBookmarked,
          bookmarks: this.toCount(counts.bookmarks_count),
        },
      });

      return {
        isBookmarked,
        bookmarks: this.toCount(counts.bookmarks_count),
      };
    });
  }

  async toggleShare(userId: string, postId: string): Promise<ShareToggleResponse> {
    return this.databaseService.transaction(async (client) => {
      const postResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM posts
          WHERE id = $1::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      if (!postResult.rows[0]) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      const existingShare = await client.query<{ id: string }>(
        `
          SELECT id
          FROM post_shares
          WHERE post_id = $1::uuid
            AND user_id = $2::uuid
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [postId, userId],
      );

      let isShared = false;

      if (existingShare.rows[0]) {
        await client.query(
          `
            DELETE FROM post_shares
            WHERE id = $1::uuid
          `,
          [existingShare.rows[0].id],
        );

        await client.query(
          `
            UPDATE posts
            SET shares_count = GREATEST(0, shares_count - 1)
            WHERE id = $1::uuid
          `,
          [postId],
        );
      } else {
        await client.query(
          `
            INSERT INTO post_shares (post_id, user_id, share_type)
            VALUES ($1::uuid, $2::uuid, 'internal')
          `,
          [postId, userId],
        );

        await client.query(
          `
            UPDATE posts
            SET shares_count = shares_count + 1
            WHERE id = $1::uuid
          `,
          [postId],
        );

        isShared = true;
      }

      const countResult = await client.query<{ shares_count: string | number }>(
        `
          SELECT shares_count
          FROM posts
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [postId],
      );

      const counts = countResult.rows[0];
      if (!counts) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'post',
        aggregateId: postId,
        eventType: 'post.share.toggled',
        payload: {
          postId,
          userId,
          isShared,
          shares: this.toCount(counts.shares_count),
        },
      });

      return {
        isShared,
        shares: this.toCount(counts.shares_count),
      };
    });
  }

  async toggleRepost(userId: string, postId: string): Promise<RepostToggleResponse> {
    return this.databaseService.transaction(async (client) => {
      const postResult = await client.query<{
        id: string;
        content: string;
        visibility: FeedPost['visibility'];
      }>(
        `
          SELECT id, content, visibility::text AS visibility
          FROM posts
          WHERE id = $1::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      const original = postResult.rows[0];
      if (!original) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      const existingRepost = await client.query<{ repost_post_id: string }>(
        `
          SELECT repost_post_id
          FROM post_reposts
          WHERE original_post_id = $1::uuid
            AND user_id = $2::uuid
          LIMIT 1
        `,
        [postId, userId],
      );

      let isReposted = false;
      let repostPostId: string | null = null;

      if (existingRepost.rows[0]) {
        repostPostId = existingRepost.rows[0].repost_post_id;
        await client.query(
          `
            DELETE FROM posts
            WHERE id = $1::uuid
              AND user_id = $2::uuid
          `,
          [repostPostId, userId],
        );

        await client.query(
          `
            UPDATE posts
            SET reposts_count = GREATEST(0, reposts_count - 1)
            WHERE id = $1::uuid
          `,
          [postId],
        );
      } else {
        const repostPost = await client.query<{ id: string }>(
          `
            INSERT INTO posts (user_id, type, content, visibility)
            VALUES ($1::uuid, 'update'::post_type, $2, $3::post_visibility)
            RETURNING id
          `,
          [userId, `Repost: ${original.content.slice(0, 240)}`, original.visibility],
        );

        repostPostId = repostPost.rows[0]?.id ?? null;
        if (!repostPostId) {
          throw new BadRequestException({
            error: {
              code: 'REPOST_CREATE_FAILED',
              message: 'Failed to create repost.',
            },
          });
        }

        await client.query(
          `
            INSERT INTO post_reposts (original_post_id, repost_post_id, user_id)
            VALUES ($1::uuid, $2::uuid, $3::uuid)
          `,
          [postId, repostPostId, userId],
        );

        await client.query(
          `
            UPDATE posts
            SET reposts_count = reposts_count + 1
            WHERE id = $1::uuid
          `,
          [postId],
        );

        isReposted = true;
      }

      const countResult = await client.query<{ reposts_count: string | number }>(
        `
          SELECT reposts_count
          FROM posts
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [postId],
      );

      const counts = countResult.rows[0];
      if (!counts) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'post',
        aggregateId: postId,
        eventType: 'post.repost.toggled',
        payload: {
          postId,
          userId,
          isReposted,
          repostPostId,
          reposts: this.toCount(counts.reposts_count),
        },
      });

      return {
        isReposted,
        reposts: this.toCount(counts.reposts_count),
      };
    });
  }

  async getBookmarks(userId: string, query: BookmarkListQuery): Promise<BookmarkListResponse> {
    const params: unknown[] = [userId];
    const whereClauses: string[] = ['b.user_id = $1::uuid'];

    if (query.category) {
      params.push(query.category);
      whereClauses.push(`b.category = $${params.length}::bookmark_category`);
    }

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchParam = params.length;
      whereClauses.push(
        `(b.title ILIKE $${searchParam} OR COALESCE(b.description, '') ILIKE $${searchParam} OR COALESCE(b.author_name, '') ILIKE $${searchParam} OR EXISTS (SELECT 1 FROM unnest(b.tags) AS tag WHERE tag ILIKE $${searchParam}))`,
      );
    }

    params.push(query.limit);
    const limitParam = params.length;

    const result = await this.databaseService.query<BookmarkRow>(
      `
        SELECT
          b.id,
          b.source_id,
          b.title,
          b.description,
          b.url,
          b.type::text AS type,
          b.category::text AS category,
          b.tags,
          b.image_url,
          b.author_name,
          b.author_avatar_url,
          b.created_at,
          b.saved_at,
          b.post_id
        FROM bookmarks b
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY b.saved_at DESC, b.id DESC
        LIMIT $${limitParam}
      `,
      params,
    );

    return {
      items: result.rows.map((row) => this.mapBookmarkRow(row)),
    };
  }

  async deleteBookmark(userId: string, bookmarkId: string): Promise<BookmarkDeleteResponse> {
    return this.databaseService.transaction(async (client) => {
      const deleted = await client.query<{
        id: string;
        post_id: string | null;
        source_id: string | null;
      }>(
        `
          DELETE FROM bookmarks
          WHERE id = $1::uuid
            AND user_id = $2::uuid
          RETURNING id, post_id, source_id
        `,
        [bookmarkId, userId],
      );

      const bookmark = deleted.rows[0];
      if (!bookmark) {
        throw new NotFoundException({
          error: {
            code: 'BOOKMARK_NOT_FOUND',
            message: 'Bookmark not found.',
          },
        });
      }

      if (bookmark.post_id) {
        await client.query(
          `
            UPDATE posts
            SET bookmarks_count = GREATEST(0, bookmarks_count - 1)
            WHERE id = $1::uuid
          `,
          [bookmark.post_id],
        );
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'bookmark',
        aggregateId: bookmark.id,
        eventType: 'bookmark.deleted',
        payload: {
          bookmarkId: bookmark.id,
          userId,
          postId: bookmark.post_id,
          sourceId: bookmark.source_id,
        },
      });

      return {
        id: bookmark.id,
        removed: true,
      };
    });
  }

  async getComments(postId: string, limit = 50): Promise<PostCommentList> {
    const rows = await this.databaseService.query<CommentRow>(
      `
        SELECT
          pc.id,
          pc.post_id,
          pc.user_id,
          pc.content,
          pc.likes_count,
          pc.created_at,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM post_comments pc
        JOIN users u
          ON u.id = pc.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        WHERE pc.post_id = $1::uuid
          AND pc.deleted_at IS NULL
        ORDER BY pc.created_at DESC, pc.id DESC
        LIMIT $2
      `,
      [postId, limit],
    );

    return {
      items: rows.rows.map((row) => this.mapComment(row)),
    };
  }

  async createComment(
    userId: string,
    postId: string,
    payload: CreateCommentBody,
  ): Promise<PostComment> {
    return this.databaseService.transaction(async (client) => {
      const postResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM posts
          WHERE id = $1::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [postId],
      );

      if (!postResult.rows[0]) {
        throw new NotFoundException({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found.',
          },
        });
      }

      if (payload.parentCommentId) {
        const parentResult = await client.query<{ id: string }>(
          `
            SELECT id
            FROM post_comments
            WHERE id = $1::uuid
              AND post_id = $2::uuid
              AND deleted_at IS NULL
            LIMIT 1
          `,
          [payload.parentCommentId, postId],
        );

        if (!parentResult.rows[0]) {
          throw new BadRequestException({
            error: {
              code: 'INVALID_PARENT_COMMENT',
              message: 'Parent comment does not exist on this post.',
            },
          });
        }
      }

      const insertResult = await client.query<{
        id: string;
        post_id: string;
        user_id: string;
        content: string;
        likes_count: string | number;
        created_at: string | Date;
      }>(
        `
          INSERT INTO post_comments (post_id, user_id, parent_comment_id, content)
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
          RETURNING
            id,
            post_id,
            user_id,
            content,
            likes_count,
            created_at
        `,
        [postId, userId, payload.parentCommentId ?? null, payload.content],
      );

      const inserted = insertResult.rows[0];
      if (!inserted) {
        throw new BadRequestException({
          error: {
            code: 'COMMENT_CREATE_FAILED',
            message: 'Failed to create comment.',
          },
        });
      }

      await client.query(
        `
          UPDATE posts
          SET comments_count = comments_count + 1
          WHERE id = $1::uuid
        `,
        [postId],
      );

      const authorResult = await client.query<{
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      }>(
        `
          SELECT first_name, last_name, avatar_url
          FROM users
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [userId],
      );

      const author = authorResult.rows[0];
      if (!author) {
        throw new NotFoundException({
          error: {
            code: 'AUTHOR_NOT_FOUND',
            message: 'Comment author not found.',
          },
        });
      }

      await this.appendOutboxEvent(client, {
        aggregateType: 'post',
        aggregateId: postId,
        eventType: 'post.comment.created',
        payload: {
          postId,
          commentId: inserted.id,
          userId,
          parentCommentId: payload.parentCommentId ?? null,
        },
      });

      return {
        id: inserted.id,
        postId: inserted.post_id,
        userId: inserted.user_id,
        content: inserted.content,
        likes: this.toCount(inserted.likes_count),
        createdAt: this.toIsoTimestamp(inserted.created_at),
        author: {
          name: `${author.first_name} ${author.last_name}`.trim(),
          avatar: author.avatar_url,
        },
      };
    });
  }

  private async getPostById(postId: string, viewerUserId: string | null): Promise<FeedPost> {
    const result = await this.databaseService.query<FeedPostRow>(
      `
        SELECT
          p.id,
          p.user_id,
          p.type::text AS type,
          p.content,
          p.visibility::text AS visibility,
          p.likes_count,
          p.loves_count,
          p.interests_count,
          p.bookmarks_count,
          p.reposts_count,
          p.comments_count,
          p.shares_count,
          p.created_at,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.user_type::text AS user_type,
          COALESCE(bp.company_name, 'Independent') AS company_name,
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reactions pr
            WHERE pr.post_id = p.id
              AND pr.user_id = $2::uuid
              AND pr.reaction = 'like'
          ) END AS is_liked,
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reactions pr
            WHERE pr.post_id = p.id
              AND pr.user_id = $2::uuid
              AND pr.reaction = 'love'
          ) END AS is_loved,
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reactions pr
            WHERE pr.post_id = p.id
              AND pr.user_id = $2::uuid
              AND pr.reaction = 'interest'
          ) END AS is_interested,
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_shares ps
            WHERE ps.post_id = p.id
              AND ps.user_id = $2::uuid
          ) END AS is_shared,
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM post_reposts prp
            WHERE prp.original_post_id = p.id
              AND prp.user_id = $2::uuid
          ) END AS is_reposted,
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS (
            SELECT 1
            FROM bookmarks b
            WHERE b.user_id = $2::uuid
              AND b.type = 'post'::bookmark_type
              AND b.source_id = p.id::text
          ) END AS is_bookmarked
        FROM posts p
        JOIN users u
          ON u.id = p.user_id
          AND u.deleted_at IS NULL
          AND u.is_active = TRUE
        LEFT JOIN business_profiles bp
          ON bp.user_id = p.user_id
          AND bp.deleted_at IS NULL
        WHERE p.id = $1::uuid
          AND p.deleted_at IS NULL
        LIMIT 1
      `,
      [postId, viewerUserId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found.',
        },
      });
    }

    const mediaMap = await this.loadMediaMap([row.id]);
    return this.mapFeedPost(row, mediaMap);
  }

  private async loadMediaMap(postIds: string[]): Promise<Map<string, FeedPost['media']>> {
    const mediaMap = new Map<string, FeedPost['media']>();
    if (postIds.length === 0) {
      return mediaMap;
    }

    const mediaResult = await this.databaseService.query<PostMediaRow>(
      `
        SELECT
          post_id,
          media_type::text AS media_type,
          media_url
        FROM post_media
        WHERE post_id = ANY($1::uuid[])
        ORDER BY post_id, sort_order ASC, created_at ASC
      `,
      [postIds],
    );

    for (const row of mediaResult.rows) {
      const current = mediaMap.get(row.post_id) ?? [];
      current.push({
        type: row.media_type,
        url: row.media_url,
      });
      mediaMap.set(row.post_id, current);
    }

    return mediaMap;
  }

  private mapFeedPost(
    row: FeedPostRow,
    mediaMap: Map<string, FeedPost['media']>,
  ): FeedPost {
    return {
      id: row.id,
      userId: row.user_id,
      author: {
        id: row.user_id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        company: row.company_name ?? 'Independent',
        avatar: row.avatar_url,
        userType: row.user_type,
      },
      type: row.type,
      content: row.content,
      visibility: row.visibility,
      media: mediaMap.get(row.id) ?? [],
      likes: this.toCount(row.likes_count),
      loves: this.toCount(row.loves_count),
      interests: this.toCount(row.interests_count),
      bookmarks: this.toCount(row.bookmarks_count),
      reposts: this.toCount(row.reposts_count),
      comments: this.toCount(row.comments_count),
      shares: this.toCount(row.shares_count),
      isLiked: row.is_liked,
      isLoved: row.is_loved,
      isInterested: row.is_interested,
      isShared: row.is_shared,
      isReposted: row.is_reposted,
      isBookmarked: row.is_bookmarked,
      createdAt: this.toIsoTimestamp(row.created_at),
    };
  }

  private mapComment(row: CommentRow): PostComment {
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      content: row.content,
      likes: this.toCount(row.likes_count),
      createdAt: this.toIsoTimestamp(row.created_at),
      author: {
        name: `${row.first_name} ${row.last_name}`.trim(),
        avatar: row.avatar_url,
      },
    };
  }

  private mapBookmarkRow(row: BookmarkRow): BookmarkItem {
    return {
      id: row.id,
      sourceId: row.source_id,
      title: row.title,
      description: row.description,
      url: row.url,
      type: row.type,
      category: row.category,
      tags: row.tags ?? [],
      imageUrl: row.image_url,
      authorName: row.author_name,
      authorAvatar: row.author_avatar_url,
      createdAt: this.toIsoTimestamp(row.created_at),
      savedAt: this.toIsoTimestamp(row.saved_at),
    };
  }

  private toCount(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private encodeCursor(cursor: FeedCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(value: string): FeedCursor {
    try {
      const decoded = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as FeedCursor;

      if (!decoded?.createdAt || !decoded?.id) {
        throw new Error('Missing cursor fields.');
      }

      return decoded;
    } catch {
      throw new BadRequestException({
        error: {
          code: 'INVALID_CURSOR',
          message: 'Cursor is invalid.',
        },
      });
    }
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

  private toBookmarkCategory(type: FeedPost['type']): string {
    switch (type) {
      case 'product':
      case 'service':
        return 'business';
      case 'idea':
        return 'inspiration';
      case 'crowdfunding':
      case 'investment':
        return 'investment';
      case 'mentorship':
        return 'mentorship';
      case 'promo':
        return 'marketing';
      case 'update':
      default:
        return 'networking';
    }
  }
}
