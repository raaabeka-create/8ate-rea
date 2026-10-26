/**
 * 8ATE - Walls Service
 * 
 * Manages anonymous regional/community conversation spaces.
 * Strictly guarantees public anonymous payload isolation from private owner identity.
 */

import { WallPair, PublicAnonymousWallPost, WallReply, ExpirationDuration } from '../types';
import { IWallRepository } from '../repositories/interfaces';
import { LocalWallRepository } from '../repositories/localStorageRepository';

export class WallService {
  private wallRepo: IWallRepository;

  constructor(wallRepo: IWallRepository = new LocalWallRepository()) {
    this.wallRepo = wallRepo;
  }

  async getWallPairs(): Promise<WallPair[]> {
    return this.wallRepo.getWallPairs();
  }

  async getWallPairById(pairId: string): Promise<WallPair | null> {
    return this.wallRepo.getWallPairById(pairId);
  }

  async getActivePosts(wallPairId?: string, origin?: string, destination?: string): Promise<PublicAnonymousWallPost[]> {
    return this.wallRepo.getActivePosts(wallPairId, origin, destination);
  }

  async getPostById(postId: string): Promise<PublicAnonymousWallPost | null> {
    return this.wallRepo.getPostById(postId);
  }

  /**
   * Create an anonymous regional wall post.
   * Public object NEVER receives owner user ID.
   */
  async createAnonymousPost(
    wallPairId: string,
    originLocation: string,
    destinationLocation: string,
    content: string,
    expirationHours: ExpirationDuration,
    ownerUserId: string
  ): Promise<PublicAnonymousWallPost> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Post content cannot be empty.');
    if (trimmed.length > 500) throw new Error('Post cannot exceed 500 characters.');

    return this.wallRepo.createPost(
      wallPairId,
      originLocation,
      destinationLocation,
      trimmed,
      expirationHours,
      ownerUserId
    );
  }

  async votePost(postId: string, voteType: 'up' | 'down', userId: string): Promise<PublicAnonymousWallPost> {
    return this.wallRepo.votePost(postId, voteType, userId);
  }

  async getReplies(postId: string): Promise<WallReply[]> {
    return this.wallRepo.getReplies(postId);
  }

  async createReply(postId: string, content: string, ownerUserId: string): Promise<WallReply> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Reply cannot be empty.');
    return this.wallRepo.createReply(postId, trimmed, ownerUserId);
  }

  async voteReply(replyId: string, postId: string, voteType: 'up' | 'down', userId: string): Promise<WallReply> {
    return this.wallRepo.voteReply(replyId, postId, voteType, userId);
  }
}
