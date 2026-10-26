/**
 * 8ATE - Discover Public Feed Service
 */

import { DiscoverPost, DiscoverCategory, DiscoverComment } from '../types';
import { IDiscoverRepository } from '../repositories/interfaces';
import { LocalDiscoverRepository } from '../repositories/localStorageRepository';

export class DiscoverService {
  private discoverRepo: IDiscoverRepository;

  constructor(discoverRepo: IDiscoverRepository = new LocalDiscoverRepository()) {
    this.discoverRepo = discoverRepo;
  }

  async getPosts(category?: DiscoverCategory, searchQuery?: string, userId?: string): Promise<DiscoverPost[]> {
    return this.discoverRepo.getPosts(category, searchQuery, userId);
  }

  async getPostById(postId: string, userId?: string): Promise<DiscoverPost | null> {
    return this.discoverRepo.getPostById(postId, userId);
  }

  async createPost(
    authorId: string,
    content: string,
    category: DiscoverCategory,
    tags: string[],
    imageUrl?: string
  ): Promise<DiscoverPost> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Post content is required.');
    return this.discoverRepo.createPost(authorId, trimmed, category, tags, imageUrl);
  }

  async toggleLike(postId: string, userId: string): Promise<DiscoverPost> {
    return this.discoverRepo.toggleLikePost(postId, userId);
  }

  async toggleBookmark(postId: string, userId: string): Promise<boolean> {
    return this.discoverRepo.toggleBookmarkPost(postId, userId);
  }

  async getComments(postId: string): Promise<DiscoverComment[]> {
    return this.discoverRepo.getComments(postId);
  }

  async addComment(postId: string, authorId: string, content: string): Promise<DiscoverComment> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Comment cannot be empty.');
    return this.discoverRepo.addComment(postId, authorId, trimmed);
  }

  async getSavedPosts(userId: string): Promise<DiscoverPost[]> {
    return this.discoverRepo.getSavedPosts(userId);
  }
}
