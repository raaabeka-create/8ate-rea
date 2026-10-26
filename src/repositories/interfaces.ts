/**
 * 8ATE - Repository Interfaces
 * 
 * Clean Data-Access Layer abstractions.
 * UI components NEVER access storage or database directly.
 * This isolates persistence, but production adapters still need server auth, RLS, and realtime interfaces; they are not drop-in replacements yet.
 */

import {
  UserProfile,
  PrivateAccountInfo,
  Conversation,
  ChatMessage,
  WallPair,
  PublicAnonymousWallPost,
  WallReply,
  HubListing,
  HubCategory,
  DiscoverPost,
  DiscoverCategory,
  DiscoverComment,
  CallRecord,
  ReportRequest,
  AppNotification,
  GhanaRegion,
  ExpirationDuration,
} from '../types';

export interface IAuthRepository {
  getCurrentUserId(): string | null;
  setCurrentUserId(userId: string | null): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  getUserByUsername(username: string): Promise<UserProfile | null>;
  getUserByPhone(phoneNumber: string): Promise<UserProfile | null>;
  getPrivateAccountInfo(userId: string): Promise<PrivateAccountInfo | null>;
  createUser(
    profile: Omit<UserProfile, 'id' | 'joinedAt'>,
    privateInfo: Omit<PrivateAccountInfo, 'userId' | 'createdAt' | 'lastLoginAt' | 'blockedUserIds' | 'savedPostIds' | 'savedListingIds'>
  ): Promise<{ user: UserProfile; privateInfo: PrivateAccountInfo }>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  updatePrivateAccountInfo(userId: string, updates: Partial<PrivateAccountInfo>): Promise<PrivateAccountInfo>;
  getAllUsers(): Promise<UserProfile[]>;
}

export interface IChatRepository {
  getConversations(userId: string): Promise<Conversation[]>;
  getConversationById(conversationId: string, userId: string): Promise<Conversation | null>;
  createConversation(participantIds: string[], isGroup?: boolean, name?: string): Promise<Conversation>;
  getMessages(conversationId: string, userId: string): Promise<ChatMessage[]>;
  sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type?: 'text' | 'image' | 'audio',
    mediaUrl?: string,
    audioDurationSec?: number
  ): Promise<ChatMessage>;
  editMessage(messageId: string, conversationId: string, userId: string, content: string): Promise<ChatMessage>;
  toggleMessageReaction(messageId: string, conversationId: string, userId: string, emoji: string): Promise<ChatMessage>;
  deleteMessage(messageId: string, conversationId: string, requesterUserId: string): Promise<void>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;
  togglePinConversation(conversationId: string, userId: string, isPinned: boolean): Promise<void>;
}

export interface IWallRepository {
  getWallPairs(): Promise<WallPair[]>;
  getWallPairById(wallPairId: string): Promise<WallPair | null>;
  getActivePosts(wallPairId?: string, originLocation?: string, destinationLocation?: string, userId?: string): Promise<PublicAnonymousWallPost[]>;
  getPostById(postId: string, userId?: string): Promise<PublicAnonymousWallPost | null>;
  createPost(
    wallPairId: string,
    originLocation: string,
    destinationLocation: string,
    content: string,
    expirationHours: ExpirationDuration,
    ownerUserId: string // Stored in private moderation record only
  ): Promise<PublicAnonymousWallPost>;
  votePost(postId: string, voteType: 'up' | 'down', userId: string): Promise<PublicAnonymousWallPost>;
  getReplies(postId: string, userId?: string): Promise<WallReply[]>;
  createReply(postId: string, content: string, ownerUserId: string): Promise<WallReply>;
  voteReply(replyId: string, postId: string, voteType: 'up' | 'down', userId: string): Promise<WallReply>;
}

export interface IHubRepository {
  getListings(filters?: {
    category?: HubCategory;
    region?: GhanaRegion;
    city?: string;
    searchQuery?: string;
    userId?: string;
  }): Promise<HubListing[]>;
  getListingById(listingId: string, userId?: string): Promise<HubListing | null>;
  createListing(
    listing: Omit<HubListing, 'id' | 'createdAt' | 'viewsCount' | 'savedCount' | 'status'>
  ): Promise<HubListing>;
  toggleSaveListing(listingId: string, userId: string): Promise<boolean>;
  getSavedListings(userId: string): Promise<HubListing[]>;
  incrementViews(listingId: string): Promise<void>;
}

export interface IDiscoverRepository {
  getPosts(category?: DiscoverCategory, searchQuery?: string, userId?: string): Promise<DiscoverPost[]>;
  getPostById(postId: string, userId?: string): Promise<DiscoverPost | null>;
  createPost(authorId: string, content: string, category: DiscoverCategory, tags: string[], imageUrl?: string): Promise<DiscoverPost>;
  toggleLikePost(postId: string, userId: string): Promise<DiscoverPost>;
  toggleBookmarkPost(postId: string, userId: string): Promise<boolean>;
  getComments(postId: string, userId?: string): Promise<DiscoverComment[]>;
  addComment(postId: string, authorId: string, content: string): Promise<DiscoverComment>;
  getSavedPosts(userId: string): Promise<DiscoverPost[]>;
}

export interface ICallRepository {
  getCallRecords(userId: string): Promise<CallRecord[]>;
  addCallRecord(record: Omit<CallRecord, 'id'>): Promise<CallRecord>;
  clearCallHistory(userId: string): Promise<void>;
}

export interface ISafetyRepository {
  submitReport(report: Omit<ReportRequest, 'id' | 'createdAt' | 'status'>): Promise<ReportRequest>;
  blockUser(currentUserId: string, targetUserId: string): Promise<void>;
  unblockUser(currentUserId: string, targetUserId: string): Promise<void>;
  getBlockedUsers(currentUserId: string): Promise<UserProfile[]>;
}

export interface INotificationRepository {
  getNotifications(userId: string): Promise<AppNotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification>;
}
