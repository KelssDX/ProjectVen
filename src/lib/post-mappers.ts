import type { PostCommentDto, PostDto } from '@/api/posts';
import type { Comment, Post } from '@/types';

type PitchDto = NonNullable<PostDto['pitch']>;

function mapPitch(pitch: PitchDto | null | undefined) {
  if (!pitch) {
    return undefined;
  }

  return {
    videoUrl: pitch.videoUrl,
    deckUrl: pitch.deckUrl,
    attachments: pitch.attachments,
    links: pitch.links,
  };
}

export function mapPostDtoToUi(post: PostDto): Post {
  const sharedPitch = mapPitch(post.pitch);
  const crowdfundingPitch = mapPitch(post.crowdfunding?.pitch);
  const investmentRequestPitch = mapPitch(post.investmentRequest?.pitch);

  return {
    id: post.id,
    userId: post.userId,
    author: {
      id: post.author.id,
      name: post.author.name,
      company: post.author.company,
      avatar: post.author.avatar ?? undefined,
      userType: post.author.userType,
    },
    type: post.type,
    content: post.content,
    media: post.media
      .filter((item) => item.type === 'image' || item.type === 'video')
      .map((item) => ({ type: item.type as 'image' | 'video', url: item.url })),
    pitch: sharedPitch,
    product: post.product,
    service: post.service,
    crowdfunding: post.crowdfunding
      ? {
          ...post.crowdfunding,
          pitch: crowdfundingPitch,
        }
      : undefined,
    investment: post.investment,
    investmentRequest: post.investmentRequest
      ? {
          ...post.investmentRequest,
          pitch: investmentRequestPitch,
        }
      : undefined,
    mentorship: post.mentorship,
    promo: post.promo
      ? {
          ...post.promo,
          validUntil: new Date(post.promo.validUntil),
        }
      : undefined,
    likes: post.likes,
    loves: post.loves,
    interests: post.interests,
    bookmarks: post.bookmarks,
    reposts: post.reposts,
    comments: post.comments,
    shares: post.shares,
    createdAt: new Date(post.createdAt),
    isLiked: post.isLiked ?? false,
    isLoved: post.isLoved ?? false,
    isInterested: post.isInterested ?? false,
    isShared: post.isShared ?? false,
    isReposted: post.isReposted ?? false,
    isBookmarked: post.isBookmarked ?? false,
  };
}

export function mapCommentDtoToUi(comment: PostCommentDto): Comment {
  return {
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    content: comment.content,
    likes: comment.likes,
    createdAt: new Date(comment.createdAt),
    author: {
      name: comment.author.name,
      avatar: comment.author.avatar ?? undefined,
    },
  };
}
