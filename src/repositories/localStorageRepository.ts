/**
 * 8ATE - Local Persistent Storage Repository Implementation
 * 
 * Implements clean repository interfaces with browser persistence.
 * Completely portable for export to any environment.
 */

import {
  UserProfile,
  PrivateAccountInfo,
  Conversation,
  ChatMessage,
  WallPair,
  PublicAnonymousWallPost,
  PrivateWallModerationData,
  WallReply,
  HubListing,
  DiscoverPost,
  DiscoverComment,
  CallRecord,
  ReportRequest,
  AppNotification,
  ExpirationDuration,
} from '../types';
import {
  IAuthRepository,
  IChatRepository,
  IWallRepository,
  IHubRepository,
  IDiscoverRepository,
  ICallRepository,
  ISafetyRepository,
  INotificationRepository,
} from './interfaces';
import {
  SEED_USERS,
  SEED_PRIVATE_ACCOUNTS,
  SEED_CONVERSATIONS,
  SEED_MESSAGES,
  SEED_WALL_PAIRS,
  SEED_WALL_POSTS,
  SEED_WALL_REPLIES,
  SEED_HUB_LISTINGS,
  SEED_DISCOVER_POSTS,
  SEED_CALL_RECORDS,
  SEED_NOTIFICATIONS,
} from '../data/seedData';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_USER_ID: '8ATE_CURRENT_USER_ID',
  USERS: '8ATE_USERS_V1',
  PRIVATE_ACCOUNTS: '8ATE_PRIVATE_ACCOUNTS_V1',
  CONVERSATIONS: '8ATE_CONVERSATIONS_V1',
  MESSAGES: '8ATE_MESSAGES_V1',
  WALL_PAIRS: '8ATE_WALL_PAIRS_V1',
  WALL_POSTS: '8ATE_WALL_POSTS_V1',
  WALL_MODERATION: '8ATE_WALL_MODERATION_V1', // Strictly separated moderation table
  WALL_REPLIES: '8ATE_WALL_REPLIES_V1',
  HUB_LISTINGS: '8ATE_HUB_LISTINGS_V1',
  DISCOVER_POSTS: '8ATE_DISCOVER_POSTS_V1',
  DISCOVER_COMMENTS: '8ATE_DISCOVER_COMMENTS_V1',
  CALL_RECORDS: '8ATE_CALL_RECORDS_V1',
  REPORTS: '8ATE_REPORTS_V1',
  NOTIFICATIONS: '8ATE_NOTIFICATIONS_V1',
  USER_VOTES: '8ATE_USER_VOTES_V1',
};

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage`, e);
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to storage`, e);
  }
}

// Initialize seed data if not present
export function initializeLocalStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    setStorage(STORAGE_KEYS.USERS, SEED_USERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRIVATE_ACCOUNTS)) {
    setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
    setStorage(STORAGE_KEYS.CURRENT_USER_ID, 'user_kwame');
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)) {
    setStorage(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
    setStorage(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WALL_PAIRS)) {
    setStorage(STORAGE_KEYS.WALL_PAIRS, SEED_WALL_PAIRS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WALL_POSTS)) {
    setStorage(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WALL_REPLIES)) {
    setStorage(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.HUB_LISTINGS)) {
    setStorage(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DISCOVER_POSTS)) {
    setStorage(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CALL_RECORDS)) {
    setStorage(STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    setStorage(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  }
}

// Anonymous alias generator
const ALIAS_PREFIXES = [
  'Kente', 'Bantama', 'Osu', 'Takoradi', 'Legon', 'Tamale', 'Kejetia',
  'Makola', 'Cape Coast', 'Ahodwo', 'Spintex', 'Aburi', 'Ho', 'Sunyani'
];
const ALIAS_NOUNS = [
  'Falcon', 'Wave', 'Tiger', 'Scholar', 'Pioneer', 'Horizon', 'Eagle',
  'Nomad', 'Spark', 'Beacon', 'Seagull', 'Captain', 'Maverick', 'Vibe'
];
const ALIAS_COLORS = [
  '#7C3AED', '#6D28D9', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'
];
const ALIAS_ICONS = ['Flame', 'Zap', 'Compass', 'Waves', 'Sparkles', 'Shield', 'Sun', 'Heart'];

function generateAnonymousIdentity() {
  const prefix = ALIAS_PREFIXES[Math.floor(Math.random() * ALIAS_PREFIXES.length)];
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)];
  const bg = ALIAS_COLORS[Math.floor(Math.random() * ALIAS_COLORS.length)];
  const icon = ALIAS_ICONS[Math.floor(Math.random() * ALIAS_ICONS.length)];
  return {
    alias: `${prefix} ${noun}`,
    bg,
    icon,
  };
}

// -------------------------------------------------------------
// Auth Repository
// -------------------------------------------------------------
export class LocalAuthRepository implements IAuthRepository {
  getCurrentUserId(): string | null {
    return getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, 'user_kwame');
  }

  async setCurrentUserId(userId: string | null): Promise<void> {
    setStorage(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    return users.find((u) => u.id === userId) || null;
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    return users.find((u) => u.username.toLowerCase() === clean) || null;
  }

  async getUserByPhone(phoneNumber: string): Promise<UserProfile | null> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    const accountEntry = Object.values(accounts).find(
      (a) => a.phoneNumber.replace(/[\s-]/g, '') === cleanPhone
    );
    if (!accountEntry) return null;
    return this.getUserProfile(accountEntry.userId);
  }

  async getPrivateAccountInfo(userId: string): Promise<PrivateAccountInfo | null> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    return accounts[userId] || null;
  }

  async createUser(
    profile: Omit<UserProfile, 'id' | 'joinedAt'>,
    privateInfo: Omit<PrivateAccountInfo, 'userId' | 'createdAt' | 'lastLoginAt' | 'blockedUserIds' | 'savedPostIds' | 'savedListingIds'>
  ): Promise<{ user: UserProfile; privateInfo: PrivateAccountInfo }> {
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);

    // Case-insensitive username validation
    const cleanUsername = profile.username.trim().toLowerCase().replace(/^@/, '');
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username @${cleanUsername} is already taken.`);
    }

    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: UserProfile = {
      ...profile,
      id: newUserId,
      username: cleanUsername,
      joinedAt: Date.now(),
    };

    const newPrivateInfo: PrivateAccountInfo = {
      ...privateInfo,
      userId: newUserId,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      blockedUserIds: [],
      savedPostIds: [],
      savedListingIds: [],
    };

    users.push(newUser);
    accounts[newUserId] = newPrivateInfo;

    setStorage(STORAGE_KEYS.USERS, users);
    setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    setStorage(STORAGE_KEYS.CURRENT_USER_ID, newUserId);

    return { user: newUser, privateInfo: newPrivateInfo };
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found');

    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase().replace(/^@/, '');
      const conflict = users.find((u) => u.username.toLowerCase() === cleanUsername && u.id !== userId);
      if (conflict) throw new Error(`Username @${cleanUsername} is already taken.`);
      updates.username = cleanUsername;
    }

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    setStorage(STORAGE_KEYS.USERS, users);
    return updatedUser;
  }

  async updatePrivateAccountInfo(userId: string, updates: Partial<PrivateAccountInfo>): Promise<PrivateAccountInfo> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    if (!accounts[userId]) throw new Error('Account info not found');

    const updated = { ...accounts[userId], ...updates };
    accounts[userId] = updated;
    setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    return updated;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
  }
}

// -------------------------------------------------------------
// Chat Repository
// -------------------------------------------------------------
export class LocalChatRepository implements IChatRepository {
  async getConversations(userId: string): Promise<Conversation[]> {
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    if (!currentUserId || currentUserId !== userId) {
      throw new Error('The active demo session can only load its own conversations.');
    }

    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);

    // Filter conversations where current user is participant
    const userConvs = convs.filter((c) => c.participantIds.includes(userId));

    // Populate participant profiles
    return userConvs
      .map((c) => ({
        ...c,
        participants: c.participantIds
          .map((pId) => users.find((u) => u.id === pId))
          .filter((u): u is UserProfile => !!u),
      }))
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const conv = convs.find((c) => c.id === conversationId);
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    if (!conv || !currentUserId || !conv.participantIds.includes(currentUserId)) return null;

    return {
      ...conv,
      participants: conv.participantIds
        .map((pId) => users.find((u) => u.id === pId))
        .filter((u): u is UserProfile => !!u),
    };
  }

  async createConversation(participantIds: string[], isGroup = false, name?: string): Promise<Conversation> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    const uniqueParticipantIds = Array.from(new Set(participantIds));

    if (!currentUserId || !uniqueParticipantIds.includes(currentUserId)) {
      throw new Error('The active demo user must be included in a conversation.');
    }
    if (uniqueParticipantIds.length < 2) {
      throw new Error('A conversation requires at least two distinct participants.');
    }
    if (uniqueParticipantIds.some((id) => !users.some((user) => user.id === id))) {
      throw new Error('A conversation contains an unknown participant.');
    }
    if (isGroup && !name?.trim()) {
      throw new Error('Group conversations require a name.');
    }

    // Check if 1:1 already exists
    if (!isGroup && participantIds.length === 2) {
      const existing = convs.find(
        (c) =>
          !c.isGroup &&
          c.participantIds.length === 2 &&
          participantIds.every((id) => c.participantIds.includes(id))
      );
      if (existing) return existing;
    }

    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isGroup,
      name: name || (isGroup ? 'Group Conversation' : undefined),
      avatarUrl: isGroup
        ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80'
        : undefined,
      participantIds: uniqueParticipantIds,
      participants: uniqueParticipantIds
        .map((pId) => users.find((u) => u.id === pId))
        .filter((u): u is UserProfile => !!u),
      unreadCount: 0,
      isPinned: false,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    convs.unshift(newConv);
    setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
    return newConv;
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const conversation = convs.find((item) => item.id === conversationId);
    if (!currentUserId || !conversation || !conversation.participantIds.includes(currentUserId)) {
      throw new Error('You are not a member of this conversation.');
    }

    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    return allMessages[conversationId] || [];
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'audio' = 'text',
    mediaUrl?: string,
    audioDurationSec?: number
  ): Promise<ChatMessage> {
    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    const conversation = convs.find((item) => item.id === conversationId);

    if (!currentUserId || currentUserId !== senderId) {
      throw new Error('Messages can only be sent as the active demo user.');
    }
    if (!conversation || !conversation.participantIds.includes(senderId)) {
      throw new Error('You are not a member of this conversation.');
    }
    if (!content.trim()) throw new Error('Message content cannot be empty.');
    if (content.length > 10000) throw new Error('Messages must be 10,000 characters or fewer.');

    const messageList = allMessages[conversationId] || [];
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      type,
      content,
      mediaUrl,
      audioDurationSec,
      timestamp: Date.now(),
      status: 'delivered',
      reactions: [],
    };

    messageList.push(newMsg);
    allMessages[conversationId] = messageList;
    setStorage(STORAGE_KEYS.MESSAGES, allMessages);

    // Update conversation last message
    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      convs[convIndex].lastMessage = newMsg;
      convs[convIndex].updatedAt = Date.now();
      setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
    }

    return newMsg;
  }

  async toggleMessageReaction(messageId: string, conversationId: string, userId: string, emoji: string): Promise<ChatMessage> {
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const conversation = convs.find((item) => item.id === conversationId);
    if (!currentUserId || currentUserId !== userId || !conversation || !conversation.participantIds.includes(userId)) {
      throw new Error('Only a conversation member using the active demo session can react.');
    }
    if (!emoji.trim() || emoji.length > 16) throw new Error('Invalid reaction.');

    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const messages = allMessages[conversationId] || [];
    const msgIndex = messages.findIndex((m) => m.id === messageId && m.conversationId === conversationId);
    if (msgIndex === -1) throw new Error('Message not found');

    const msg = messages[msgIndex];
    const existingIdx = msg.reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);

    if (existingIdx !== -1) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ userId, emoji });
    }

    messages[msgIndex] = msg;
    allMessages[conversationId] = messages;
    setStorage(STORAGE_KEYS.MESSAGES, allMessages);
    return msg;
  }

  async deleteMessage(messageId: string, conversationId: string): Promise<void> {
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const conversation = convs.find((item) => item.id === conversationId);
    if (!currentUserId || !conversation || !conversation.participantIds.includes(currentUserId)) {
      throw new Error('You are not a member of this conversation.');
    }

    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const messages = allMessages[conversationId] || [];
    const msgIndex = messages.findIndex((m) => m.id === messageId && m.conversationId === conversationId);
    if (msgIndex === -1) throw new Error('Message not found.');
    if (messages[msgIndex].senderId !== currentUserId) {
      throw new Error('You can only delete messages you sent.');
    }

    messages[msgIndex] = {
      ...messages[msgIndex],
      deletedForEveryone: true,
      content: 'This message was deleted',
      mediaUrl: undefined,
      audioDurationSec: undefined,
    };
    allMessages[conversationId] = messages;
    setStorage(STORAGE_KEYS.MESSAGES, allMessages);

    const convIndex = convs.findIndex((item) => item.id === conversationId);
    if (convIndex !== -1 && convs[convIndex].lastMessage?.id === messageId) {
      convs[convIndex].lastMessage = messages[msgIndex];
      convs[convIndex].updatedAt = Date.now();
      setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
    }
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (!currentUserId || currentUserId !== userId || convIndex === -1 ||
        !convs[convIndex].participantIds.includes(userId)) {
      throw new Error('Only a conversation member using the active demo session can mark it read.');
    }

    // Prototype-only unread count; production receipts must be stored per recipient.
    convs[convIndex].unreadCount = 0;
    setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
  }

  async togglePinConversation(conversationId: string, isPinned: boolean): Promise<void> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      convs[convIndex].isPinned = isPinned;
      setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
    }
  }
}

// -------------------------------------------------------------
// Wall Repository (Anonymous Regional Conversation Spaces)
// -------------------------------------------------------------
export class LocalWallRepository implements IWallRepository {
  async getWallPairs(): Promise<WallPair[]> {
    return getStorage<WallPair[]>(STORAGE_KEYS.WALL_PAIRS, SEED_WALL_PAIRS);
  }

  async getWallPairById(wallPairId: string): Promise<WallPair | null> {
    const pairs = await this.getWallPairs();
    return pairs.find((p) => p.id === wallPairId) || null;
  }

  async getActivePosts(wallPairId?: string, originLocation?: string, destinationLocation?: string): Promise<PublicAnonymousWallPost[]> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const now = Date.now();

    // Filter out expired posts
    let activePosts = posts.filter((p) => p.expiresAt > now);

    if (wallPairId) {
      activePosts = activePosts.filter((p) => p.wallPairId === wallPairId);
    }
    if (originLocation) {
      activePosts = activePosts.filter((p) => p.originLocation.toLowerCase() === originLocation.toLowerCase());
    }
    if (destinationLocation) {
      activePosts = activePosts.filter((p) => p.destinationLocation.toLowerCase() === destinationLocation.toLowerCase());
    }

    return activePosts.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getPostById(postId: string): Promise<PublicAnonymousWallPost | null> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    return posts.find((p) => p.id === postId) || null;
  }

  async createPost(
    wallPairId: string,
    originLocation: string,
    destinationLocation: string,
    content: string,
    expirationHours: ExpirationDuration,
    ownerUserId: string
  ): Promise<PublicAnonymousWallPost> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const moderation = getStorage<Record<string, PrivateWallModerationData>>(STORAGE_KEYS.WALL_MODERATION, {});

    const identity = generateAnonymousIdentity();
    const postId = `wall_post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = Date.now() + expirationHours * 3600000;

    // Public anonymous post - strictly NO ownerUserId
    const newPost: PublicAnonymousWallPost = {
      id: postId,
      wallPairId,
      originLocation,
      destinationLocation,
      content,
      anonymousAlias: identity.alias,
      anonymousAvatarBg: identity.bg,
      anonymousAvatarIcon: identity.icon,
      createdAt: Date.now(),
      expiresAt,
      expirationDurationHours: expirationHours,
      upvotes: 1,
      downvotes: 0,
      replyCount: 0,
      userVote: 'up',
    };

    // Private moderation data - strictly stored separately
    moderation[postId] = {
      postId,
      realOwnerUserId: ownerUserId,
      createdAt: Date.now(),
    };

    posts.unshift(newPost);
    setStorage(STORAGE_KEYS.WALL_POSTS, posts);
    setStorage(STORAGE_KEYS.WALL_MODERATION, moderation);

    return newPost;
  }

  async votePost(postId: string, voteType: 'up' | 'down', userId: string): Promise<PublicAnonymousWallPost> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});

    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) throw new Error('Post not found');

    const post = posts[postIndex];
    const voteKey = `${userId}_wall_post_${postId}`;
    const previousVote = userVotes[voteKey];

    if (previousVote === voteType) {
      // Remove vote
      delete userVotes[voteKey];
      if (voteType === 'up') post.upvotes = Math.max(0, post.upvotes - 1);
      if (voteType === 'down') post.downvotes = Math.max(0, post.downvotes - 1);
      post.userVote = null;
    } else {
      // Apply or change vote
      if (previousVote === 'up') post.upvotes = Math.max(0, post.upvotes - 1);
      if (previousVote === 'down') post.downvotes = Math.max(0, post.downvotes - 1);

      if (voteType === 'up') post.upvotes += 1;
      if (voteType === 'down') post.downvotes += 1;

      userVotes[voteKey] = voteType;
      post.userVote = voteType;
    }

    posts[postIndex] = post;
    setStorage(STORAGE_KEYS.WALL_POSTS, posts);
    setStorage(STORAGE_KEYS.USER_VOTES, userVotes);
    return post;
  }

  async getReplies(postId: string): Promise<WallReply[]> {
    const replies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    return replies[postId] || [];
  }

  async createReply(postId: string, content: string, ownerUserId: string): Promise<WallReply> {
    const allReplies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const moderation = getStorage<Record<string, PrivateWallModerationData>>(STORAGE_KEYS.WALL_MODERATION, {});

    const identity = generateAnonymousIdentity();
    const replyId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newReply: WallReply = {
      id: replyId,
      postId,
      content,
      anonymousAlias: identity.alias,
      anonymousAvatarBg: identity.bg,
      createdAt: Date.now(),
      upvotes: 0,
      downvotes: 0,
    };

    const postReplies = allReplies[postId] || [];
    postReplies.push(newReply);
    allReplies[postId] = postReplies;

    // Record moderation ownership separately
    moderation[replyId] = {
      postId: replyId,
      realOwnerUserId: ownerUserId,
      createdAt: Date.now(),
    };

    // Update post replyCount
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].replyCount = (posts[postIndex].replyCount || 0) + 1;
      setStorage(STORAGE_KEYS.WALL_POSTS, posts);
    }

    setStorage(STORAGE_KEYS.WALL_REPLIES, allReplies);
    setStorage(STORAGE_KEYS.WALL_MODERATION, moderation);
    return newReply;
  }

  async voteReply(replyId: string, postId: string, voteType: 'up' | 'down', userId: string): Promise<WallReply> {
    const allReplies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});

    const replies = allReplies[postId] || [];
    const repIndex = replies.findIndex((r) => r.id === replyId);
    if (repIndex === -1) throw new Error('Reply not found');

    const reply = replies[repIndex];
    const voteKey = `${userId}_wall_reply_${replyId}`;
    const previousVote = userVotes[voteKey];

    if (previousVote === voteType) {
      delete userVotes[voteKey];
      if (voteType === 'up') reply.upvotes = Math.max(0, reply.upvotes - 1);
      if (voteType === 'down') reply.downvotes = Math.max(0, reply.downvotes - 1);
      reply.userVote = null;
    } else {
      if (previousVote === 'up') reply.upvotes = Math.max(0, reply.upvotes - 1);
      if (previousVote === 'down') reply.downvotes = Math.max(0, reply.downvotes - 1);

      if (voteType === 'up') reply.upvotes += 1;
      if (voteType === 'down') reply.downvotes += 1;

      userVotes[voteKey] = voteType;
      reply.userVote = voteType;
    }

    replies[repIndex] = reply;
    allReplies[postId] = replies;
    setStorage(STORAGE_KEYS.WALL_REPLIES, allReplies);
    setStorage(STORAGE_KEYS.USER_VOTES, userVotes);
    return reply;
  }
}

// -------------------------------------------------------------
// Hubs Repository (Ghana Marketplace & Services)
// -------------------------------------------------------------
export class LocalHubRepository implements IHubRepository {
  async getListings(filters?: {
    category?: any;
    region?: any;
    city?: string;
    searchQuery?: string;
  }): Promise<HubListing[]> {
    let listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);

    if (filters?.category) {
      listings = listings.filter((l) => l.category === filters.category);
    }
    if (filters?.region) {
      listings = listings.filter((l) => l.region === filters.region);
    }
    if (filters?.city) {
      listings = listings.filter((l) => l.city.toLowerCase().includes(filters.city!.toLowerCase()));
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      listings = listings.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }

    return listings.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getListingById(listingId: string): Promise<HubListing | null> {
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    return listings.find((l) => l.id === listingId) || null;
  }

  async createListing(
    listing: Omit<HubListing, 'id' | 'createdAt' | 'viewsCount' | 'savedCount' | 'status'>
  ): Promise<HubListing> {
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    const newListing: HubListing = {
      ...listing,
      id: `hub_listing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      status: 'active',
      viewsCount: 1,
      savedCount: 0,
    };

    listings.unshift(newListing);
    setStorage(STORAGE_KEYS.HUB_LISTINGS, listings);
    return newListing;
  }

  async toggleSaveListing(listingId: string, userId: string): Promise<boolean> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);

    if (!accounts[userId]) return false;
    const userAccount = accounts[userId];
    const isSaved = userAccount.savedListingIds.includes(listingId);

    if (isSaved) {
      userAccount.savedListingIds = userAccount.savedListingIds.filter((id) => id !== listingId);
    } else {
      userAccount.savedListingIds.push(listingId);
    }

    const listingIdx = listings.findIndex((l) => l.id === listingId);
    if (listingIdx !== -1) {
      listings[listingIdx].savedCount = Math.max(
        0,
        listings[listingIdx].savedCount + (isSaved ? -1 : 1)
      );
      setStorage(STORAGE_KEYS.HUB_LISTINGS, listings);
    }

    setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    return !isSaved;
  }

  async getSavedListings(userId: string): Promise<HubListing[]> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    const savedIds = accounts[userId]?.savedListingIds || [];
    return listings.filter((l) => savedIds.includes(l.id));
  }

  async incrementViews(listingId: string): Promise<void> {
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    const index = listings.findIndex((l) => l.id === listingId);
    if (index !== -1) {
      listings[index].viewsCount = (listings[index].viewsCount || 0) + 1;
      setStorage(STORAGE_KEYS.HUB_LISTINGS, listings);
    }
  }
}

// -------------------------------------------------------------
// Discover Repository (Public Social Feed)
// -------------------------------------------------------------
export class LocalDiscoverRepository implements IDiscoverRepository {
  async getPosts(category?: any, searchQuery?: string): Promise<DiscoverPost[]> {
    let posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);

    if (category && category !== 'Trending') {
      posts = posts.filter((p) => p.category === category);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.author.displayName.toLowerCase().includes(q)
      );
    }

    return posts.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getPostById(postId: string): Promise<DiscoverPost | null> {
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    return posts.find((p) => p.id === postId) || null;
  }

  async createPost(
    authorId: string,
    content: string,
    category: any,
    tags: string[],
    imageUrl?: string
  ): Promise<DiscoverPost> {
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const author = users.find((u) => u.id === authorId) || SEED_USERS[0];

    const newPost: DiscoverPost = {
      id: `disc_post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author,
      content,
      category,
      tags,
      imageUrl,
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: Date.now(),
      isLiked: true,
    };

    posts.unshift(newPost);
    setStorage(STORAGE_KEYS.DISCOVER_POSTS, posts);
    return newPost;
  }

  async toggleLikePost(postId: string, _userId: string): Promise<DiscoverPost> {
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) throw new Error('Post not found');

    const post = posts[index];
    const isLiked = !post.isLiked;
    post.isLiked = isLiked;
    post.likesCount = Math.max(0, post.likesCount + (isLiked ? 1 : -1));

    posts[index] = post;
    setStorage(STORAGE_KEYS.DISCOVER_POSTS, posts);
    return post;
  }

  async toggleBookmarkPost(postId: string, userId: string): Promise<boolean> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);

    if (!accounts[userId]) return false;
    const userAccount = accounts[userId];
    const isBookmarked = userAccount.savedPostIds.includes(postId);

    if (isBookmarked) {
      userAccount.savedPostIds = userAccount.savedPostIds.filter((id) => id !== postId);
    } else {
      userAccount.savedPostIds.push(postId);
    }

    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].isBookmarked = !isBookmarked;
      setStorage(STORAGE_KEYS.DISCOVER_POSTS, posts);
    }

    setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    return !isBookmarked;
  }

  async getComments(postId: string): Promise<DiscoverComment[]> {
    const allComments = getStorage<Record<string, DiscoverComment[]>>(STORAGE_KEYS.DISCOVER_COMMENTS, {});
    return allComments[postId] || [];
  }

  async addComment(postId: string, authorId: string, content: string): Promise<DiscoverComment> {
    const allComments = getStorage<Record<string, DiscoverComment[]>>(STORAGE_KEYS.DISCOVER_COMMENTS, {});
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);

    const author = users.find((u) => u.id === authorId) || SEED_USERS[0];
    const newComment: DiscoverComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId,
      author,
      content,
      createdAt: Date.now(),
      likesCount: 0,
    };

    const postComments = allComments[postId] || [];
    postComments.push(newComment);
    allComments[postId] = postComments;

    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].commentsCount = (posts[postIndex].commentsCount || 0) + 1;
      setStorage(STORAGE_KEYS.DISCOVER_POSTS, posts);
    }

    setStorage(STORAGE_KEYS.DISCOVER_COMMENTS, allComments);
    return newComment;
  }

  async getSavedPosts(userId: string): Promise<DiscoverPost[]> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const savedIds = accounts[userId]?.savedPostIds || [];
    return posts.filter((p) => savedIds.includes(p.id));
  }
}

// -------------------------------------------------------------
// Calls Repository
// -------------------------------------------------------------
export class LocalCallRepository implements ICallRepository {
  async getCallRecords(_userId: string): Promise<CallRecord[]> {
    return getStorage<CallRecord[]>(STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS);
  }

  async addCallRecord(record: Omit<CallRecord, 'id'>): Promise<CallRecord> {
    const records = getStorage<CallRecord[]>(STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS);
    const newRecord: CallRecord = {
      ...record,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    records.unshift(newRecord);
    setStorage(STORAGE_KEYS.CALL_RECORDS, records);
    return newRecord;
  }

  async clearCallHistory(_userId: string): Promise<void> {
    setStorage(STORAGE_KEYS.CALL_RECORDS, []);
  }
}

// -------------------------------------------------------------
// Safety & Moderation Repository
// -------------------------------------------------------------
export class LocalSafetyRepository implements ISafetyRepository {
  async submitReport(report: Omit<ReportRequest, 'id' | 'createdAt' | 'status'>): Promise<ReportRequest> {
    const reports = getStorage<ReportRequest[]>(STORAGE_KEYS.REPORTS, []);
    const newReport: ReportRequest = {
      ...report,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      status: 'pending',
    };
    reports.unshift(newReport);
    setStorage(STORAGE_KEYS.REPORTS, reports);
    return newReport;
  }

  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    if (accounts[currentUserId]) {
      if (!accounts[currentUserId].blockedUserIds.includes(targetUserId)) {
        accounts[currentUserId].blockedUserIds.push(targetUserId);
        setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
      }
    }
  }

  async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    if (accounts[currentUserId]) {
      accounts[currentUserId].blockedUserIds = accounts[currentUserId].blockedUserIds.filter(
        (id) => id !== targetUserId
      );
      setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    }
  }

  async getBlockedUsers(currentUserId: string): Promise<UserProfile[]> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const blockedIds = accounts[currentUserId]?.blockedUserIds || [];
    return users.filter((u) => blockedIds.includes(u.id));
  }
}

// -------------------------------------------------------------
// Notifications Repository
// -------------------------------------------------------------
export class LocalNotificationRepository implements INotificationRepository {
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    return notifs.filter((n) => n.userId === userId || n.userId === 'all');
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const idx = notifs.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      notifs[idx].isRead = true;
      setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    notifs.forEach((n) => {
      if (n.userId === userId || n.userId === 'all') {
        n.isRead = true;
      }
    });
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  async addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification> {
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const newNotif: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    notifs.unshift(newNotif);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newNotif;
  }
}
