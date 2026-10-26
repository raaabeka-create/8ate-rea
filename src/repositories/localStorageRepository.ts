/**
 * 8ATE - Local Persistent Storage Repository Implementation
 * 
 * Implements clean repository interfaces with browser persistence.
 * Completely portable for export to any environment.
 */

import { normalizeGhanaPhone } from '../utils/phone';
import { isSecureHttpsUrl } from '../utils/secureUrl';
import { getAllRegions } from '../data/ghanaData';

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
  HubCategory,
  GhanaRegion,
  DiscoverPost,
  DiscoverCategory,
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
  SESSION_MARKER: '8ATE_EXPLICIT_SESSION_V1',
  USERS: '8ATE_USERS_V1',
  PRIVATE_ACCOUNTS: '8ATE_PRIVATE_ACCOUNTS_V1',
  CONVERSATIONS: '8ATE_CONVERSATIONS_V1',
  MESSAGES: '8ATE_MESSAGES_V1',
  WALL_PAIRS: '8ATE_WALL_PAIRS_V1',
  WALL_POSTS: '8ATE_WALL_POSTS_V1',
  WALL_MODERATION: '8ATE_WALL_MODERATION_V1', // Separate prototype key only; browser storage is not private
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
  const cloneDefault = (): T => JSON.parse(JSON.stringify(defaultValue)) as T;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading ${key} from browser storage`, error);
    throw new Error('8ATE could not read browser storage. Storage may be unavailable.');
  }
  if (!raw) return cloneDefault();
  try {
    const parsed = JSON.parse(raw);
    // A literal JSON null is not a valid value for most collection keys.
    return parsed === null ? cloneDefault() : parsed as T;
  } catch (error) {
    console.error(`Stored data for ${key} is unreadable; refusing to replace it with demo defaults.`, error);
    throw new Error(`Stored 8ATE data for ${key} is corrupted. No replacement data was written.`);
  }
}

function assertCurrentUser(userId: string, action: string): void {
  const sessionMarker = getStorage<string | null>(STORAGE_KEYS.SESSION_MARKER, null);
  const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
  if (sessionMarker !== 'explicit' || !currentUserId || currentUserId !== userId) {
    throw new Error(`Only the signed-in demo user can ${action}.`);
  }
}


function getBlockedUserIds(userId: string): Set<string> {
  const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
  return new Set(accounts[userId]?.blockedUserIds ?? []);
}

function isContentOwnedByBlockedUser(userId: string, contentId: string): boolean {
  const moderation = getStorage<Record<string, PrivateWallModerationData>>(STORAGE_KEYS.WALL_MODERATION, {});
  const ownerUserId = moderation[contentId]?.realOwnerUserId;
  return Boolean(ownerUserId && getBlockedUserIds(userId).has(ownerUserId));
}

function assertContentNotBlocked(userId: string, contentId: string): void {
  if (isContentOwnedByBlockedUser(userId, contentId)) {
    throw new Error('This content is unavailable because you blocked its author.');
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to storage`, e);
    throw new Error('8ATE could not save this change in browser storage. Storage may be full or unavailable.');
  }
}

/**
 * Persist related records as one best-effort localStorage transaction.
 * localStorage has no native transaction support, so restore previous raw
 * values if a later write fails. This is a prototype reliability safeguard,
 * not a database transaction or a security boundary.
 */
function setStorageBatch(entries: Array<[string, unknown]>): void {
  const snapshots: Array<{ key: string; previous: string | null; serialized: string }> = [];
  const written: Array<{ key: string; previous: string | null; serialized: string }> = [];
  try {
    for (const [key, value] of entries) {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) throw new Error(`Unable to serialize stored value for ${key}.`);
      snapshots.push({ key, previous: localStorage.getItem(key), serialized });
    }
    for (const snapshot of snapshots) {
      localStorage.setItem(snapshot.key, snapshot.serialized);
      written.push(snapshot);
    }
  } catch (error) {
    for (const snapshot of [...written].reverse()) {
      try {
        if (snapshot.previous === null) localStorage.removeItem(snapshot.key);
        else localStorage.setItem(snapshot.key, snapshot.previous);
      } catch (rollbackError) {
        console.error(`Unable to roll back browser storage key ${snapshot.key}`, rollbackError);
      }
    }
    console.error('Multi-record browser storage update failed', error);
    throw new Error('8ATE could not save this change in browser storage. Multi-record update was rolled back where possible.');
  }
}

// Initialize seed data if not present
/** Remove only 8ATE-owned local data; preserve unrelated applications' storage keys. */
export function resetLocalStorage(): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('8ATE_')) localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Could not reset 8ATE browser data', error);
    throw new Error('8ATE could not reset browser storage. Check the browser storage permissions and retry.');
  }
}

export function initializeLocalStorage(): void {
  // Clear sessions created by older versions that silently signed in a seeded account.
  if (getStorage<string | null>(STORAGE_KEYS.SESSION_MARKER, null) !== 'explicit') {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    } catch (error) {
      console.error('Could not clear a legacy implicit session', error);
    }
  }
  // Seed all missing collections as one best-effort transaction.
  const defaults: Array<[string, unknown]> = [
    [STORAGE_KEYS.USERS, SEED_USERS],
    [STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS],
    [STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS],
    [STORAGE_KEYS.MESSAGES, SEED_MESSAGES],
    [STORAGE_KEYS.WALL_PAIRS, SEED_WALL_PAIRS],
    [STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS],
    [STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES],
    [STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS],
    [STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS],
    [STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS],
    [STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS],
  ];
  const missing = defaults.filter(([key]) => !localStorage.getItem(key));
  if (missing.length) setStorageBatch(missing);
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
    // Only a session explicitly established by demo login is accepted.
    if (getStorage<string | null>(STORAGE_KEYS.SESSION_MARKER, null) !== 'explicit') return null;
    return getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
  }

  async setCurrentUserId(userId: string | null): Promise<void> {
    if (userId) {
      const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
      if (!users.some((user) => user.id === userId)) throw new Error('Cannot sign in as an unknown user.');
      setStorageBatch([
        [STORAGE_KEYS.CURRENT_USER_ID, userId],
        [STORAGE_KEYS.SESSION_MARKER, 'explicit'],
      ]);
      return;
    }
    // Removing keys succeeds even when storage is full; logout should not need extra quota.
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      localStorage.removeItem(STORAGE_KEYS.SESSION_MARKER);
    } catch (error) {
      console.error('Could not remove persisted demo session', error);
      setStorage(STORAGE_KEYS.CURRENT_USER_ID, null);
      setStorage(STORAGE_KEYS.SESSION_MARKER, null);
    }
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
    let cleanPhone: string;
    try {
      cleanPhone = normalizeGhanaPhone(phoneNumber);
    } catch {
      return null;
    }
    const accountEntry = Object.values(accounts).find((account) => {
      try {
        return normalizeGhanaPhone(account.phoneNumber) === cleanPhone;
      } catch {
        return false;
      }
    });
    if (!accountEntry) return null;
    return this.getUserProfile(accountEntry.userId);
  }

  async getPrivateAccountInfo(userId: string): Promise<PrivateAccountInfo | null> {
    assertCurrentUser(userId, 'read private account details');
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    return accounts[userId] || null;
  }

  async createUser(
    profile: Omit<UserProfile, 'id' | 'joinedAt'>,
    privateInfo: Omit<PrivateAccountInfo, 'userId' | 'createdAt' | 'lastLoginAt' | 'blockedUserIds' | 'savedPostIds' | 'savedListingIds'>
  ): Promise<{ user: UserProfile; privateInfo: PrivateAccountInfo }> {
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    // Enforce username and phone uniqueness again at the repository boundary.
    const cleanUsername = profile.username.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      throw new Error('Username must be 3–24 characters using letters, numbers, and underscores.');
    }
    if (users.some((user) => user.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username @${cleanUsername} is already taken.`);
    }
    const normalizedPhone = normalizeGhanaPhone(privateInfo.phoneNumber);
    const phoneExists = Object.values(accounts).some((account) => {
      try {
        return normalizeGhanaPhone(account.phoneNumber) === normalizedPhone;
      } catch {
        return false;
      }
    });
    if (phoneExists) throw new Error('This phone number is already registered.');
    if (!profile.displayName.trim() || profile.displayName.trim().length > 80) {
      throw new Error('Display name must contain 1–80 characters.');
    }
    if (profile.bio && profile.bio.length > 500) throw new Error('Bio cannot exceed 500 characters.');
    if (!profile.city.trim()) throw new Error('City is required.');
    if (!getAllRegions().includes(profile.region)) throw new Error('Select a valid Ghanaian region.');
    if (!isSecureHttpsUrl(profile.avatarUrl)) throw new Error('Avatar images must use a valid secure HTTPS URL.');

    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: UserProfile = {
      ...profile,
      id: newUserId,
      username: cleanUsername,
      displayName: profile.displayName.trim(),
      bio: profile.bio.trim(),
      city: profile.city.trim(),
      avatarUrl: profile.avatarUrl.trim(),
      joinedAt: Date.now(),
    };

    const newPrivateInfo: PrivateAccountInfo = {
      ...privateInfo,
      phoneNumber: normalizedPhone,
      userId: newUserId,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      blockedUserIds: [],
      savedPostIds: [],
      savedListingIds: [],
    };

    users.push(newUser);
    accounts[newUserId] = newPrivateInfo;

    setStorageBatch([
      [STORAGE_KEYS.USERS, users],
      [STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts],
      [STORAGE_KEYS.CURRENT_USER_ID, newUserId],
      [STORAGE_KEYS.SESSION_MARKER, 'explicit'],
    ]);

    return { user: newUser, privateInfo: newPrivateInfo };
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    assertCurrentUser(userId, 'update a profile');
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found');

    // Only public profile fields are editable. Identity, join date, and verification
    // status must never be user-editable through this repository contract.
    const safeUpdates: Partial<UserProfile> = {};
    if (updates.username !== undefined) {
      const cleanUsername = updates.username.trim().toLowerCase().replace(/^@/, '');
      if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
        throw new Error('Username must be 3–24 characters using letters, numbers, and underscores.');
      }
      const conflict = users.find((u) => u.username.toLowerCase() === cleanUsername && u.id !== userId);
      if (conflict) throw new Error(`Username @${cleanUsername} is already taken.`);
      safeUpdates.username = cleanUsername;
    }
    if (updates.displayName !== undefined) {
      const displayName = updates.displayName.trim();
      if (!displayName || displayName.length > 80) throw new Error('Display name must contain 1–80 characters.');
      safeUpdates.displayName = displayName;
    }
    if (updates.bio !== undefined) {
      if (updates.bio.length > 500) throw new Error('Bio cannot exceed 500 characters.');
      safeUpdates.bio = updates.bio.trim();
    }
    if (updates.city !== undefined) {
      if (!updates.city.trim()) throw new Error('City is required.');
      safeUpdates.city = updates.city.trim();
    }
    if (updates.region !== undefined) {
      if (!getAllRegions().includes(updates.region)) throw new Error('Select a valid Ghanaian region.');
      safeUpdates.region = updates.region;
    }
    if (updates.avatarUrl !== undefined) {
      if (updates.avatarUrl && !isSecureHttpsUrl(updates.avatarUrl)) {
        throw new Error('Avatar images must use a secure HTTPS URL.');
      }
      safeUpdates.avatarUrl = updates.avatarUrl;
    }

    const updatedUser: UserProfile = {
      ...users[index],
      ...safeUpdates,
      id: users[index].id,
      joinedAt: users[index].joinedAt,
      verified: users[index].verified,
    };
    users[index] = updatedUser;
    setStorage(STORAGE_KEYS.USERS, users);
    return updatedUser;
  }

  async updatePrivateAccountInfo(userId: string, updates: Partial<PrivateAccountInfo>): Promise<PrivateAccountInfo> {
    assertCurrentUser(userId, 'update private account details');
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    if (!accounts[userId]) throw new Error('Account info not found');

    const safeUpdates = { ...updates };
    delete safeUpdates.userId;
    delete safeUpdates.createdAt;
    if (updates.phoneNumber !== undefined) {
      const normalizedPhone = normalizeGhanaPhone(updates.phoneNumber);
      const phoneExists = Object.values(accounts).some((account) => {
        if (account.userId === userId) return false;
        try {
          return normalizeGhanaPhone(account.phoneNumber) === normalizedPhone;
        } catch {
          return false;
        }
      });
      if (phoneExists) throw new Error('This phone number is already registered.');
      safeUpdates.phoneNumber = normalizedPhone;
    }

    const updated: PrivateAccountInfo = {
      ...accounts[userId],
      ...safeUpdates,
      userId: accounts[userId].userId,
      createdAt: accounts[userId].createdAt,
    };
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
    assertCurrentUser(userId, 'read conversations');
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);

    // Filter conversations where current user is participant
    const userConvs = convs.filter((c) => c.participantIds.includes(userId));

    // Populate participant profiles
    return userConvs
      .map((c) => ({
        ...c,
        unreadCount: c.unreadCountsByUser ? (c.unreadCountsByUser[userId] ?? 0) : 0,
        isPinned: c.pinnedByUserIds ? c.pinnedByUserIds.includes(userId) : false,
        participants: c.participantIds
          .map((pId) => users.find((u) => u.id === pId))
          .filter((u): u is UserProfile => !!u),
      }))
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const conv = convs.find((c) => c.id === conversationId);
    if (!conv || !conv.participantIds.includes(userId)) return null;
    assertCurrentUser(userId, 'read a conversation');

    return {
      ...conv,
      unreadCount: conv.unreadCountsByUser ? (conv.unreadCountsByUser[userId] ?? 0) : 0,
      isPinned: conv.pinnedByUserIds ? conv.pinnedByUserIds.includes(userId) : false,
      participants: conv.participantIds
        .map((pId) => users.find((u) => u.id === pId))
        .filter((u): u is UserProfile => !!u),
    };
  }

  async createConversation(participantIds: string[], isGroup = false, name?: string): Promise<Conversation> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    participantIds = Array.from(new Set(participantIds.map((id) => id.trim()).filter(Boolean)));
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    if (!currentUserId || !participantIds.includes(currentUserId)) throw new Error('The signed-in user must be a conversation member.');
    if (participantIds.length < 2) throw new Error('A conversation requires at least two distinct members.');
    if (participantIds.length > 100) throw new Error('A conversation cannot have more than 100 members.');
    if (!isGroup && participantIds.length !== 2) throw new Error('A direct conversation must have exactly two members.');
    if (isGroup && (!name?.trim() || name.trim().length > 80)) throw new Error('Group name must contain 1–80 characters.');
    if (participantIds.some((id) => !users.some((user) => user.id === id))) {
      throw new Error('Cannot create a conversation with an unknown user.');
    }

    // A block in either direction prevents starting or continuing a direct chat.
    if (!isGroup && participantIds.length === 2) {
      const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
      const otherUserId = participantIds.find((id) => id !== currentUserId)!;
      if (accounts[currentUserId]?.blockedUserIds.includes(otherUserId) || accounts[otherUserId]?.blockedUserIds.includes(currentUserId)) {
        throw new Error('This direct chat is unavailable because one participant has blocked the other.');
      }
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
      participantIds,
      participants: participantIds
        .map((pId) => users.find((u) => u.id === pId))
        .filter((u): u is UserProfile => !!u),
      unreadCount: 0,
      unreadCountsByUser: Object.fromEntries(participantIds.map((id) => [id, 0])),
      pinnedByUserIds: [],
      isPinned: false,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    convs.unshift(newConv);
    setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
    return newConv;
  }

  async getMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const conv = convs.find((item) => item.id === conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      throw new Error('You are not a member of this conversation.');
    }
    assertCurrentUser(userId, 'read messages');
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

    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) throw new Error('Conversation not found.');
    const conversation = convs[convIndex];
    if (!conversation.participantIds.includes(senderId)) throw new Error('Sender is not a conversation member.');
    assertCurrentUser(senderId, 'send a message');
    if (!conversation.isGroup) {
      const recipientId = conversation.participantIds.find((id) => id !== senderId);
      const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
      if (recipientId && (accounts[senderId]?.blockedUserIds.includes(recipientId) || accounts[recipientId]?.blockedUserIds.includes(senderId))) {
        throw new Error('Message not sent because one participant has blocked the other.');
      }
    }
    if (!content.trim()) throw new Error('Message content cannot be empty.');
    if (!['text', 'image', 'audio'].includes(type)) throw new Error('Unsupported message type.');
    if (content.trim().length > 5000) throw new Error('Messages cannot exceed 5000 characters.');
    if (type === 'image' && (!mediaUrl || !isSecureHttpsUrl(mediaUrl))) throw new Error('An image message requires a secure HTTPS media URL.');
    if (type === 'audio' && (!Number.isInteger(audioDurationSec) || !audioDurationSec || audioDurationSec <= 0 || audioDurationSec > 600)) {
      throw new Error('An audio message requires a duration between 1 and 600 seconds.');
    }
    const messageList = allMessages[conversationId] || [];
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      type,
      content: content.trim(),
      mediaUrl,
      audioDurationSec,
      timestamp: Date.now(),
      status: 'sent',
      readByUserIds: [senderId],
      reactions: [],
    };

    messageList.push(newMsg);
    allMessages[conversationId] = messageList;

    // Update last message and recipient-specific unread counts.
    const unreadCounts = conversation.unreadCountsByUser
      ? { ...conversation.unreadCountsByUser }
      : Object.fromEntries(conversation.participantIds.map((id) => [id, 0]));
    for (const participantId of conversation.participantIds) {
      if (participantId === senderId) unreadCounts[participantId] = 0;
      else unreadCounts[participantId] = (unreadCounts[participantId] ?? 0) + 1;
    }
    conversation.unreadCountsByUser = unreadCounts;
    conversation.lastMessage = newMsg;
    conversation.updatedAt = Date.now();
    convs[convIndex] = conversation;
    setStorageBatch([
      [STORAGE_KEYS.MESSAGES, allMessages],
      [STORAGE_KEYS.CONVERSATIONS, convs],
    ]);

    return newMsg;
  }

  async editMessage(messageId: string, conversationId: string, userId: string, content: string): Promise<ChatMessage> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const convIndex = convs.findIndex((item) => item.id === conversationId);
    if (convIndex === -1 || !convs[convIndex].participantIds.includes(userId)) {
      throw new Error('You are not a member of this conversation.');
    }
    assertCurrentUser(userId, 'edit a message');

    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const messages = allMessages[conversationId] || [];
    const messageIndex = messages.findIndex((message) => message.id === messageId && message.conversationId === conversationId);
    if (messageIndex === -1) throw new Error('Message not found.');
    const message = messages[messageIndex];
    if (message.senderId !== userId) throw new Error('You can only edit messages you sent.');
    if (message.type !== 'text') throw new Error('Only text messages can be edited.');
    if (message.deletedForEveryone) throw new Error('Deleted messages cannot be edited.');

    const now = Date.now();
    if (now < message.timestamp || now - message.timestamp > 15 * 60 * 1000) {
      throw new Error('Message editing is only allowed within 15 minutes.');
    }
    const cleanContent = content.trim();
    if (!cleanContent || cleanContent.length > 5000) {
      throw new Error('Edited messages must contain 1–5000 characters.');
    }

    const editedMessage: ChatMessage = { ...message, content: cleanContent, editedAt: now };
    messages[messageIndex] = editedMessage;
    allMessages[conversationId] = messages;
    if (convs[convIndex].lastMessage?.id === messageId) {
      convs[convIndex].lastMessage = editedMessage;
      convs[convIndex].updatedAt = now;
    }

    setStorageBatch([
      [STORAGE_KEYS.MESSAGES, allMessages],
      [STORAGE_KEYS.CONVERSATIONS, convs],
    ]);
    return editedMessage;
  }

  async toggleMessageReaction(messageId: string, conversationId: string, userId: string, emoji: string): Promise<ChatMessage> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const conv = convs.find((item) => item.id === conversationId);
    if (!conv || !conv.participantIds.includes(userId)) throw new Error('You are not a member of this conversation.');
    assertCurrentUser(userId, 'react to a message');
    const cleanEmoji = emoji.trim();
    if (!cleanEmoji || cleanEmoji.length > 16) throw new Error('A valid reaction emoji is required.');
    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const messages = allMessages[conversationId] || [];
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) throw new Error('Message not found');

    const msg = messages[msgIndex];
    if (msg.deletedForEveryone) throw new Error('Deleted messages cannot be reacted to.');
    msg.reactions = msg.reactions || [];
    const existing = msg.reactions.find((reaction) => reaction.userId === userId);
    if (existing?.emoji === cleanEmoji) {
      msg.reactions = msg.reactions.filter((reaction) => reaction.userId !== userId);
    } else {
      msg.reactions = msg.reactions.filter((reaction) => reaction.userId !== userId);
      msg.reactions.push({ userId, emoji: cleanEmoji });
    }

    messages[msgIndex] = msg;
    allMessages[conversationId] = messages;
    setStorage(STORAGE_KEYS.MESSAGES, allMessages);
    return msg;
  }

  async deleteMessage(messageId: string, conversationId: string, requesterUserId: string): Promise<void> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const convIndex = convs.findIndex((item) => item.id === conversationId);
    if (convIndex === -1 || !convs[convIndex].participantIds.includes(requesterUserId)) {
      throw new Error('You are not a member of this conversation.');
    }
    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const messages = allMessages[conversationId] || [];
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) throw new Error('Message not found.');
    if (messages[msgIndex].senderId !== requesterUserId) throw new Error('You can only delete messages you sent.');
    assertCurrentUser(requesterUserId, 'delete a message');
    if (messages[msgIndex].deletedForEveryone) throw new Error('Message has already been deleted.');
    messages[msgIndex] = {
      ...messages[msgIndex],
      deletedForEveryone: true,
      content: 'This message was deleted',
      mediaUrl: undefined,
      audioDurationSec: undefined,
      editedAt: undefined,
      reactions: [],
    };
    if (convs[convIndex].lastMessage?.id === messageId) {
      convs[convIndex].lastMessage = messages[msgIndex];
      convs[convIndex].updatedAt = Date.now();
    }
    allMessages[conversationId] = messages;
    setStorageBatch([
      [STORAGE_KEYS.MESSAGES, allMessages],
      [STORAGE_KEYS.CONVERSATIONS, convs],
    ]);
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (convIndex === -1 || !convs[convIndex].participantIds.includes(userId)) {
      throw new Error('You are not a member of this conversation.');
    }
    assertCurrentUser(userId, 'mark messages as read');
    const conversation = convs[convIndex];
    const unreadCounts = conversation.unreadCountsByUser
      ? { ...conversation.unreadCountsByUser }
      : Object.fromEntries(conversation.participantIds.map((id) => [id, 0]));
    unreadCounts[userId] = 0;
    conversation.unreadCountsByUser = unreadCounts;

    const allMessages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const messages = allMessages[conversationId] || [];
    const updatedMessages: ChatMessage[] = messages.map((message): ChatMessage => {
      // Older seed data may have a single status but no per-recipient receipt list.
      const initialReadBy = message.readByUserIds ??
        (message.status === 'read' ? [...conversation.participantIds] : [message.senderId]);
      const readBy = new Set(initialReadBy);
      readBy.add(userId);
      const recipientIds = conversation.participantIds.filter((participantId) => participantId !== message.senderId);
      const allRecipientsRead = recipientIds.length > 0 && recipientIds.every((participantId) => readBy.has(participantId));
      const status: ChatMessage['status'] = allRecipientsRead ? 'read' : (message.status === 'read' ? 'sent' : message.status);
      return { ...message, readByUserIds: Array.from(readBy), status };
    });
    allMessages[conversationId] = updatedMessages;
    const lastMessage = conversation.lastMessage
      ? updatedMessages.find((message) => message.id === conversation.lastMessage?.id)
      : undefined;
    if (lastMessage) conversation.lastMessage = lastMessage;
    convs[convIndex] = conversation;

    setStorageBatch([
      [STORAGE_KEYS.MESSAGES, allMessages],
      [STORAGE_KEYS.CONVERSATIONS, convs],
    ]);
  }

  async togglePinConversation(conversationId: string, userId: string, isPinned: boolean): Promise<void> {
    const convs = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (convIndex === -1 || !convs[convIndex].participantIds.includes(userId)) {
      throw new Error('You are not a member of this conversation.');
    }
    assertCurrentUser(userId, 'pin a conversation');
    const conversation = convs[convIndex];
    const pinnedByUserIds = new Set(conversation.pinnedByUserIds ?? []);
    if (isPinned) pinnedByUserIds.add(userId);
    else pinnedByUserIds.delete(userId);
    conversation.pinnedByUserIds = Array.from(pinnedByUserIds);
    convs[convIndex] = conversation;
    setStorage(STORAGE_KEYS.CONVERSATIONS, convs);
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

  async getActivePosts(wallPairId?: string, originLocation?: string, destinationLocation?: string, userId?: string): Promise<PublicAnonymousWallPost[]> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});
    if (userId) assertCurrentUser(userId, 'read personal Wall votes');
    const blockedUserIds = userId ? getBlockedUserIds(userId) : new Set<string>();
    const moderation = userId
      ? getStorage<Record<string, PrivateWallModerationData>>(STORAGE_KEYS.WALL_MODERATION, {})
      : {};
    const now = Date.now();

    // Filter out expired posts and posts owned by accounts this user has blocked.
    let activePosts = posts.filter((post) => {
      if (post.expiresAt <= now) return false;
      const ownerUserId = moderation[post.id]?.realOwnerUserId;
      return !ownerUserId || !blockedUserIds.has(ownerUserId);
    });

    if (wallPairId) {
      activePosts = activePosts.filter((p) => p.wallPairId === wallPairId);
    }
    if (originLocation) {
      activePosts = activePosts.filter((p) => p.originLocation.toLowerCase() === originLocation.toLowerCase());
    }
    if (destinationLocation) {
      activePosts = activePosts.filter((p) => p.destinationLocation.toLowerCase() === destinationLocation.toLowerCase());
    }

    return activePosts
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((post) => ({
        ...post,
        userVote: userId ? (userVotes[`${userId}_wall_post_${post.id}`] ?? null) : null,
      }));
  }

  async getPostById(postId: string, userId?: string): Promise<PublicAnonymousWallPost | null> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const post = posts.find((p) => p.id === postId && p.expiresAt > Date.now());
    if (!post) return null;
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});
    if (userId) {
      assertCurrentUser(userId, 'read a personal Wall vote');
      if (isContentOwnedByBlockedUser(userId, post.id)) return null;
    }
    return { ...post, userVote: userId ? (userVotes[`${userId}_wall_post_${post.id}`] ?? null) : null };
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
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});
    const pairs = getStorage<WallPair[]>(STORAGE_KEYS.WALL_PAIRS, SEED_WALL_PAIRS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const pair = pairs.find((item) => item.id === wallPairId);
    const cleanContent = content.trim();
    if (!pair) throw new Error('Regional corridor not found.');
    if (!users.some((user) => user.id === ownerUserId)) throw new Error('Unknown user cannot publish a Wall post.');
    assertCurrentUser(ownerUserId, 'publish a Wall post');
    if (!cleanContent || cleanContent.length > 500) throw new Error('Wall post must contain 1–500 characters.');
    if (![2, 6, 12, 24].includes(expirationHours)) throw new Error('Invalid Wall post expiration.');
    const allowedLocations = [pair.originLocation.toLowerCase(), pair.destinationLocation.toLowerCase()];
    if (!allowedLocations.includes(originLocation.trim().toLowerCase()) || !allowedLocations.includes(destinationLocation.trim().toLowerCase()) || originLocation.trim().toLowerCase() === destinationLocation.trim().toLowerCase()) {
      throw new Error('The origin and destination must match the selected regional corridor.');
    }

    const identity = generateAnonymousIdentity();
    const postId = `wall_post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = Date.now() + expirationHours * 3600000;

    // Public anonymous post - strictly NO ownerUserId
    const newPost: PublicAnonymousWallPost = {
      id: postId,
      wallPairId,
      originLocation: originLocation.trim(),
      destinationLocation: destinationLocation.trim(),
      content: cleanContent,
      anonymousAlias: identity.alias,
      anonymousAvatarBg: identity.bg,
      anonymousAvatarIcon: identity.icon,
      createdAt: Date.now(),
      expiresAt,
      expirationDurationHours: expirationHours,
      upvotes: 1,
      downvotes: 0,
      replyCount: 0,
    };

    // Private moderation data - strictly stored separately
    moderation[postId] = {
      postId,
      realOwnerUserId: ownerUserId,
      createdAt: Date.now(),
    };

    userVotes[`${ownerUserId}_wall_post_${postId}`] = 'up';
    posts.unshift(newPost);
    setStorageBatch([
      [STORAGE_KEYS.WALL_POSTS, posts],
      [STORAGE_KEYS.WALL_MODERATION, moderation],
      [STORAGE_KEYS.USER_VOTES, userVotes],
    ]);

    return { ...newPost, userVote: 'up' };
  }

  async votePost(postId: string, voteType: 'up' | 'down', userId: string): Promise<PublicAnonymousWallPost> {
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});

    if (!users.some((user) => user.id === userId)) throw new Error('Unknown user cannot vote.');
    assertCurrentUser(userId, 'vote on a Wall post');
    if (voteType !== 'up' && voteType !== 'down') throw new Error('Vote must be either up or down.');
    const postIndex = posts.findIndex((p) => p.id === postId && p.expiresAt > Date.now());
    if (postIndex === -1) throw new Error('Active Wall post not found');
    assertContentNotBlocked(userId, postId);

    const post = posts[postIndex];
    const voteKey = `${userId}_wall_post_${postId}`;
    const previousVote = userVotes[voteKey];

    if (previousVote === voteType) {
      // Remove vote
      delete userVotes[voteKey];
      if (voteType === 'up') post.upvotes = Math.max(0, post.upvotes - 1);
      if (voteType === 'down') post.downvotes = Math.max(0, post.downvotes - 1);
    } else {
      // Apply or change vote
      if (previousVote === 'up') post.upvotes = Math.max(0, post.upvotes - 1);
      if (previousVote === 'down') post.downvotes = Math.max(0, post.downvotes - 1);

      if (voteType === 'up') post.upvotes += 1;
      if (voteType === 'down') post.downvotes += 1;

      userVotes[voteKey] = voteType;
    }

    delete post.userVote;
    posts[postIndex] = post;
    setStorageBatch([
      [STORAGE_KEYS.WALL_POSTS, posts],
      [STORAGE_KEYS.USER_VOTES, userVotes],
    ]);
    return { ...post, userVote: userVotes[voteKey] ?? null };
  }

  async getReplies(postId: string, userId?: string): Promise<WallReply[]> {
    if (userId) {
      assertCurrentUser(userId, 'read personal Wall reply votes');
      assertContentNotBlocked(userId, postId);
    }
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    if (!posts.some((post) => post.id === postId && post.expiresAt > Date.now())) return [];
    const moderation = userId
      ? getStorage<Record<string, PrivateWallModerationData>>(STORAGE_KEYS.WALL_MODERATION, {})
      : {};
    const blockedUserIds = userId ? getBlockedUserIds(userId) : new Set<string>();
    const replies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});
    return (replies[postId] || []).filter((reply) => {
      const ownerUserId = moderation[reply.id]?.realOwnerUserId;
      return !ownerUserId || !blockedUserIds.has(ownerUserId);
    }).map((reply) => ({
      ...reply,
      userVote: userId ? (userVotes[`${userId}_wall_reply_${reply.id}`] ?? null) : null,
    }));
  }

  async createReply(postId: string, content: string, ownerUserId: string): Promise<WallReply> {
    const allReplies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const moderation = getStorage<Record<string, PrivateWallModerationData>>(STORAGE_KEYS.WALL_MODERATION, {});
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const postIndex = posts.findIndex((post) => post.id === postId && post.expiresAt > Date.now());
    const cleanContent = content.trim();
    if (postIndex === -1) throw new Error('Active Wall post not found.');
    if (!users.some((user) => user.id === ownerUserId)) throw new Error('Unknown user cannot reply to a Wall post.');
    assertCurrentUser(ownerUserId, 'reply to a Wall post');
    assertContentNotBlocked(ownerUserId, postId);
    if (!cleanContent || cleanContent.length > 500) throw new Error('Wall reply must contain 1–500 characters.');

    const identity = generateAnonymousIdentity();
    const replyId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newReply: WallReply = {
      id: replyId,
      postId,
      content: cleanContent,
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
      postId,
      realOwnerUserId: ownerUserId,
      createdAt: Date.now(),
    };

    // Update post replyCount; persist the public reply and private ownership record together.
    posts[postIndex].replyCount = (posts[postIndex].replyCount || 0) + 1;
    setStorageBatch([
      [STORAGE_KEYS.WALL_POSTS, posts],
      [STORAGE_KEYS.WALL_REPLIES, allReplies],
      [STORAGE_KEYS.WALL_MODERATION, moderation],
    ]);
    return newReply;
  }

  async voteReply(replyId: string, postId: string, voteType: 'up' | 'down', userId: string): Promise<WallReply> {
    const allReplies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    const userVotes = getStorage<Record<string, 'up' | 'down'>>(STORAGE_KEYS.USER_VOTES, {});
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const posts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    if (!users.some((user) => user.id === userId)) throw new Error('Unknown user cannot vote.');
    assertCurrentUser(userId, 'vote on a Wall reply');
    if (voteType !== 'up' && voteType !== 'down') throw new Error('Vote must be either up or down.');
    if (!posts.some((post) => post.id === postId && post.expiresAt > Date.now())) throw new Error('Active Wall post not found.');

    assertContentNotBlocked(userId, postId);
    assertContentNotBlocked(userId, replyId);
    const replies = allReplies[postId] || [];
    const repIndex = replies.findIndex((r) => r.id === replyId && r.postId === postId);
    if (repIndex === -1) throw new Error('Reply not found');

    const reply = replies[repIndex];
    const voteKey = `${userId}_wall_reply_${replyId}`;
    const previousVote = userVotes[voteKey];

    if (previousVote === voteType) {
      delete userVotes[voteKey];
      if (voteType === 'up') reply.upvotes = Math.max(0, reply.upvotes - 1);
      if (voteType === 'down') reply.downvotes = Math.max(0, reply.downvotes - 1);
    } else {
      if (previousVote === 'up') reply.upvotes = Math.max(0, reply.upvotes - 1);
      if (previousVote === 'down') reply.downvotes = Math.max(0, reply.downvotes - 1);

      if (voteType === 'up') reply.upvotes += 1;
      if (voteType === 'down') reply.downvotes += 1;

      userVotes[voteKey] = voteType;
    }

    delete reply.userVote;
    replies[repIndex] = reply;
    allReplies[postId] = replies;
    setStorageBatch([
      [STORAGE_KEYS.WALL_REPLIES, allReplies],
      [STORAGE_KEYS.USER_VOTES, userVotes],
    ]);
    return { ...reply, userVote: userVotes[voteKey] ?? null };
  }
}

// -------------------------------------------------------------
// Hubs Repository (Ghana Marketplace & Services)
// -------------------------------------------------------------
export class LocalHubRepository implements IHubRepository {
  async getListings(filters?: {
    category?: HubCategory;
    region?: GhanaRegion;
    city?: string;
    searchQuery?: string;
    userId?: string;
  }): Promise<HubListing[]> {
    let listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    if (filters?.userId) {
      assertCurrentUser(filters.userId, 'read Hub listings with personal block preferences');
      const blockedUserIds = getBlockedUserIds(filters.userId);
      listings = listings.filter((listing) => !blockedUserIds.has(listing.sellerId));
    }

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

  async getListingById(listingId: string, userId?: string): Promise<HubListing | null> {
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) return null;
    if (userId) {
      assertCurrentUser(userId, 'read a Hub listing with personal block preferences');
      if (getBlockedUserIds(userId).has(listing.sellerId)) return null;
    }
    return listing;
  }

  async createListing(
    listing: Omit<HubListing, 'id' | 'createdAt' | 'viewsCount' | 'savedCount' | 'status'>
  ): Promise<HubListing> {
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    assertCurrentUser(listing.sellerId, 'publish a Hub listing');
    if (listing.seller.id !== listing.sellerId) throw new Error('Listing seller identity does not match seller ID.');
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const canonicalSeller = users.find((user) => user.id === listing.sellerId);
    if (!canonicalSeller) throw new Error('Unknown seller cannot publish a listing.');
    if (!listing.title.trim() || !listing.description.trim() || !Number.isFinite(listing.price) || listing.price < 0) {
      throw new Error('Listing title, description, and a valid non-negative price are required.');
    }
    if (!listing.city.trim()) throw new Error('Listing city is required.');
    const allowedCategories: HubCategory[] = [
      'Housing', 'Jobs', 'Marketplace', 'Services', 'Transport',
      'Food', 'Education', 'Events', 'Football', 'Music',
    ];
    if (!allowedCategories.includes(listing.category)) throw new Error('Select a valid Hub listing category.');
    if (!getAllRegions().includes(listing.region)) throw new Error('Select a valid Ghanaian region.');
    if (!listing.images.length || listing.images.length > 5 || listing.images.some((url) => !isSecureHttpsUrl(url))) {
      throw new Error('A listing requires one to five secure HTTPS image URLs.');
    }
    const newListing: HubListing = {
      ...listing,
      seller: canonicalSeller,
      sellerId: canonicalSeller.id,
      title: listing.title.trim(),
      description: listing.description.trim(),
      city: listing.city.trim(),
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

    assertCurrentUser(userId, 'save a Hub listing');
    if (!accounts[userId]) throw new Error('Account info not found.');
    const targetListing = listings.find((listing) => listing.id === listingId);
    if (!targetListing) throw new Error('Listing not found.');
    if (accounts[userId].blockedUserIds.includes(targetListing.sellerId)) {
      throw new Error('You cannot save a listing from a user you blocked.');
    }
    const userAccount = accounts[userId];
    const isSaved = userAccount.savedListingIds.includes(listingId);

    if (isSaved) {
      userAccount.savedListingIds = userAccount.savedListingIds.filter((id) => id !== listingId);
    } else {
      userAccount.savedListingIds.push(listingId);
    }

    const listingIdx = listings.findIndex((l) => l.id === listingId);
    if (listingIdx === -1) throw new Error('Listing not found.');
    listings[listingIdx].savedCount = Math.max(
      0,
      listings[listingIdx].savedCount + (isSaved ? -1 : 1)
    );

    setStorageBatch([
      [STORAGE_KEYS.HUB_LISTINGS, listings],
      [STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts],
    ]);
    return !isSaved;
  }

  async getSavedListings(userId: string): Promise<HubListing[]> {
    assertCurrentUser(userId, 'read saved Hub listings');
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    const savedIds = accounts[userId]?.savedListingIds || [];
    const blockedUserIds = getBlockedUserIds(userId);
    return listings.filter((listing) => savedIds.includes(listing.id) && !blockedUserIds.has(listing.sellerId));
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
  async getPosts(category?: DiscoverCategory, searchQuery?: string, userId?: string): Promise<DiscoverPost[]> {
    if (userId) assertCurrentUser(userId, 'read personal Discover state');
    let posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const blockedUserIds = userId ? getBlockedUserIds(userId) : new Set<string>();
    if (userId) posts = posts.filter((post) => !blockedUserIds.has(post.author.id));

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

    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const savedPostIds = userId ? (accounts[userId]?.savedPostIds ?? []) : [];
    return posts
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((post) => {
        if (!userId) return post;
        const likedByUserIds = post.likedByUserIds ?? (post.isLiked ? ['user_kwame'] : []);
        return {
          ...post,
          likedByUserIds,
          isLiked: likedByUserIds.includes(userId),
          isBookmarked: savedPostIds.includes(post.id),
        };
      });
  }

  async getPostById(postId: string, userId?: string): Promise<DiscoverPost | null> {
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const post = posts.find((item) => item.id === postId);
    if (!post) return null;
    if (!userId) return post;
    assertCurrentUser(userId, 'read personal Discover state');
    if (getBlockedUserIds(userId).has(post.author.id)) return null;
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const likedByUserIds = post.likedByUserIds ?? (post.isLiked ? ['user_kwame'] : []);
    return {
      ...post,
      likedByUserIds,
      isLiked: likedByUserIds.includes(userId),
      isBookmarked: (accounts[userId]?.savedPostIds ?? []).includes(post.id),
    };
  }

  async createPost(
    authorId: string,
    content: string,
    category: DiscoverCategory,
    tags: string[],
    imageUrl?: string
  ): Promise<DiscoverPost> {
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const author = users.find((u) => u.id === authorId);
    if (!author) throw new Error('Cannot create a post for an unknown user.');
    assertCurrentUser(authorId, 'publish a Discover post');
    const allowedCategories: DiscoverCategory[] = [
      'Trending', 'Ghana Now', 'Campus Life', 'Tech & Startups',
      'Football', 'Entertainment', 'Business', 'Lifestyle',
    ];
    if (!allowedCategories.includes(category)) throw new Error('Select a valid Discover category.');
    const cleanContent = content.trim();
    if (!cleanContent || cleanContent.length > 5000) throw new Error('Post content must contain 1–5000 characters.');
    if (tags.length > 10 || tags.some((tag) => !tag.trim() || tag.trim().length > 40)) {
      throw new Error('Posts can have up to ten tags, each 1–40 characters.');
    }
    if (imageUrl && !isSecureHttpsUrl(imageUrl)) throw new Error('Post images must use valid secure HTTPS URLs.');

    const newPost: DiscoverPost = {
      id: `disc_post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author,
      content: cleanContent,
      category,
      tags: tags.map((tag) => tag.trim()),
      imageUrl,
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: Date.now(),
      isLiked: true,
      likedByUserIds: [authorId],
    };

    posts.unshift(newPost);
    setStorage(STORAGE_KEYS.DISCOVER_POSTS, posts);
    return newPost;
  }

  async toggleLikePost(postId: string, userId: string): Promise<DiscoverPost> {
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    if (!users.some((user) => user.id === userId)) throw new Error('Unknown user cannot like a post.');
    assertCurrentUser(userId, 'like a Discover post');
    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) throw new Error('Post not found');

    const post = posts[index];
    if (getBlockedUserIds(userId).has(post.author.id)) {
      throw new Error('You cannot interact with a post from a user you blocked.');
    }
    const likedByUserIds = new Set(post.likedByUserIds ?? (post.isLiked ? ['user_kwame'] : []));
    const wasLiked = likedByUserIds.has(userId);
    if (wasLiked) likedByUserIds.delete(userId);
    else likedByUserIds.add(userId);
    post.likedByUserIds = Array.from(likedByUserIds);
    post.isLiked = !wasLiked;
    post.likesCount = Math.max(0, post.likesCount + (wasLiked ? -1 : 1));

    posts[index] = post;
    setStorage(STORAGE_KEYS.DISCOVER_POSTS, posts);
    return post;
  }

  async toggleBookmarkPost(postId: string, userId: string): Promise<boolean> {
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);

    if (!accounts[userId]) return false;
    assertCurrentUser(userId, 'bookmark a Discover post');
    const targetPost = posts.find((post) => post.id === postId);
    if (!targetPost) throw new Error('Post not found.');
    if (accounts[userId].blockedUserIds.includes(targetPost.author.id)) {
      throw new Error('You cannot bookmark a post from a user you blocked.');
    }
    const userAccount = accounts[userId];
    const isBookmarked = userAccount.savedPostIds.includes(postId);

    if (isBookmarked) {
      userAccount.savedPostIds = userAccount.savedPostIds.filter((id) => id !== postId);
    } else {
      userAccount.savedPostIds.push(postId);
    }

    setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    return !isBookmarked;
  }

  async getComments(postId: string, userId?: string): Promise<DiscoverComment[]> {
    const allComments = getStorage<Record<string, DiscoverComment[]>>(STORAGE_KEYS.DISCOVER_COMMENTS, {});
    const comments = allComments[postId] || [];
    if (!userId) return comments;
    assertCurrentUser(userId, 'read Discover comments');
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const targetPost = posts.find((post) => post.id === postId);
    if (!targetPost || getBlockedUserIds(userId).has(targetPost.author.id)) return [];
    const blockedUserIds = getBlockedUserIds(userId);
    return comments.filter((comment) => !blockedUserIds.has(comment.author.id));
  }

  async addComment(postId: string, authorId: string, content: string): Promise<DiscoverComment> {
    const allComments = getStorage<Record<string, DiscoverComment[]>>(STORAGE_KEYS.DISCOVER_COMMENTS, {});
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const targetPost = posts.find((post) => post.id === postId);
    if (!targetPost) throw new Error('Post not found.');
    const author = users.find((u) => u.id === authorId);
    if (!author) throw new Error('Cannot add a comment for an unknown user.');
    assertCurrentUser(authorId, 'comment on a Discover post');
    if (getBlockedUserIds(authorId).has(targetPost.author.id)) {
      throw new Error('You cannot comment on a post from a user you blocked.');
    }
    const cleanContent = content.trim();
    if (!cleanContent || cleanContent.length > 1000) throw new Error('Comment must contain 1–1000 characters.');
    const newComment: DiscoverComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId,
      author,
      content: cleanContent,
      createdAt: Date.now(),
      likesCount: 0,
    };

    const postComments = allComments[postId] || [];
    postComments.push(newComment);
    allComments[postId] = postComments;

    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) throw new Error('Post not found.');

    posts[postIndex].commentsCount = (posts[postIndex].commentsCount || 0) + 1;
    setStorageBatch([
      [STORAGE_KEYS.DISCOVER_POSTS, posts],
      [STORAGE_KEYS.DISCOVER_COMMENTS, allComments],
    ]);
    return newComment;
  }

  async getSavedPosts(userId: string): Promise<DiscoverPost[]> {
    assertCurrentUser(userId, 'read saved Discover posts');
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    const posts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const savedIds = accounts[userId]?.savedPostIds || [];
    const blockedUserIds = getBlockedUserIds(userId);
    return posts.filter((post) => savedIds.includes(post.id) && !blockedUserIds.has(post.author.id)).map((post) => {
      const likedByUserIds = post.likedByUserIds ?? (post.isLiked ? ['user_kwame'] : []);
      return { ...post, likedByUserIds, isLiked: likedByUserIds.includes(userId), isBookmarked: true };
    });
  }
}

// -------------------------------------------------------------
// Calls Repository
// -------------------------------------------------------------
export class LocalCallRepository implements ICallRepository {
  async getCallRecords(userId: string): Promise<CallRecord[]> {
    assertCurrentUser(userId, 'read call history');
    return getStorage<CallRecord[]>(STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS)
      .filter((record) => record.ownerUserId === userId);
  }

  async addCallRecord(record: Omit<CallRecord, 'id'>): Promise<CallRecord> {
    const currentUserId = getStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
    if (!currentUserId || record.ownerUserId !== currentUserId) {
      throw new Error('Call history can only be written for the signed-in user.');
    }
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const canonicalOtherUser = users.find((user) => user.id === record.otherUser.id);
    if (!canonicalOtherUser || canonicalOtherUser.id === currentUserId) {
      throw new Error('Call history requires a valid other participant.');
    }
    const records = getStorage<CallRecord[]>(STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS);
    const newRecord: CallRecord = {
      ...record,
      otherUser: canonicalOtherUser,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    records.unshift(newRecord);
    setStorage(STORAGE_KEYS.CALL_RECORDS, records);
    return newRecord;
  }

  async clearCallHistory(userId: string): Promise<void> {
    assertCurrentUser(userId, 'clear call history');
    const records = getStorage<CallRecord[]>(STORAGE_KEYS.CALL_RECORDS, SEED_CALL_RECORDS);
    // Drop ownerless legacy records: the old shared format cannot be safely attributed to one account.
    setStorage(STORAGE_KEYS.CALL_RECORDS, records.filter((record) => Boolean(record.ownerUserId) && record.ownerUserId !== userId));
  }
}

// -------------------------------------------------------------
// Safety & Moderation Repository
// -------------------------------------------------------------
export class LocalSafetyRepository implements ISafetyRepository {
  async submitReport(report: Omit<ReportRequest, 'id' | 'createdAt' | 'status'>): Promise<ReportRequest> {
    assertCurrentUser(report.reporterUserId, 'submit a report');
    const targetId = report.targetId.trim();
    const targetSummary = report.targetSummary.trim();
    const details = report.details?.trim();
    const allowedTargetTypes: ReportRequest['targetType'][] = ['user', 'message', 'wall_post', 'wall_reply', 'hub_listing', 'discover_post'];
    const allowedReasons = ['Spam', 'Harassment', 'Scam', 'Hate/abuse', 'Sexual content', 'Violence', 'Illegal activity', 'Other'];
    if (!allowedTargetTypes.includes(report.targetType)) throw new Error('Select a valid report target type.');
    if (!targetId || targetId.length > 200) throw new Error('A valid report target is required.');
    if (!targetSummary || targetSummary.length > 240) throw new Error('Report summary must contain 1–240 characters.');
    if (!allowedReasons.includes(report.reason)) throw new Error('Select a valid report reason.');
    if (details && details.length > 2000) throw new Error('Report details cannot exceed 2000 characters.');
    if (report.targetType === 'user' && targetId === report.reporterUserId) {
      throw new Error('You cannot report your own account.');
    }

    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const messages = getStorage<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, SEED_MESSAGES);
    const conversations = getStorage<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, SEED_CONVERSATIONS);
    const wallPosts = getStorage<PublicAnonymousWallPost[]>(STORAGE_KEYS.WALL_POSTS, SEED_WALL_POSTS);
    const wallReplies = getStorage<Record<string, WallReply[]>>(STORAGE_KEYS.WALL_REPLIES, SEED_WALL_REPLIES);
    const listings = getStorage<HubListing[]>(STORAGE_KEYS.HUB_LISTINGS, SEED_HUB_LISTINGS);
    const discoverPosts = getStorage<DiscoverPost[]>(STORAGE_KEYS.DISCOVER_POSTS, SEED_DISCOVER_POSTS);
    const targetExists = report.targetType === 'user'
      ? users.some((user) => user.id === targetId)
      : report.targetType === 'message'
        ? Object.entries(messages).some(([conversationId, items]) =>
            items.some((message) => message.id === targetId) &&
            conversations.some((conversation) =>
              conversation.id === conversationId && conversation.participantIds.includes(report.reporterUserId)
            )
          )
        : report.targetType === 'wall_post'
          ? wallPosts.some((post) => post.id === targetId)
          : report.targetType === 'wall_reply'
            ? Object.values(wallReplies).some((items) => items.some((reply) => reply.id === targetId))
            : report.targetType === 'hub_listing'
              ? listings.some((listing) => listing.id === targetId)
              : discoverPosts.some((post) => post.id === targetId);
    if (!targetExists) throw new Error('The item you are reporting could not be found.');

    const reports = getStorage<ReportRequest[]>(STORAGE_KEYS.REPORTS, []);
    const newReport: ReportRequest = {
      ...report,
      targetId,
      targetSummary,
      details,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      status: 'pending',
    };
    reports.unshift(newReport);
    setStorage(STORAGE_KEYS.REPORTS, reports);
    return newReport;
  }

  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    assertCurrentUser(currentUserId, 'block a user');
    if (currentUserId === targetUserId) throw new Error('You cannot block your own account.');
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    if (!users.some((user) => user.id === targetUserId)) throw new Error('User to block was not found.');
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    if (accounts[currentUserId]) {
      if (!accounts[currentUserId].blockedUserIds.includes(targetUserId)) {
        accounts[currentUserId].blockedUserIds.push(targetUserId);
        setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
      }
    }
  }

  async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
    assertCurrentUser(currentUserId, 'unblock a user');
    const accounts = getStorage<Record<string, PrivateAccountInfo>>(STORAGE_KEYS.PRIVATE_ACCOUNTS, SEED_PRIVATE_ACCOUNTS);
    if (accounts[currentUserId]) {
      accounts[currentUserId].blockedUserIds = accounts[currentUserId].blockedUserIds.filter(
        (id) => id !== targetUserId
      );
      setStorage(STORAGE_KEYS.PRIVATE_ACCOUNTS, accounts);
    }
  }

  async getBlockedUsers(currentUserId: string): Promise<UserProfile[]> {
    assertCurrentUser(currentUserId, 'read the blocked-users list');
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
    assertCurrentUser(userId, 'read notifications');
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    return notifs
      .filter((n) => n.userId === userId || n.userId === 'all')
      .map((notification) => ({
        ...notification,
        isRead: notification.readByUserIds
          ? notification.readByUserIds.includes(userId)
          : notification.isRead,
      }));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const idx = notifs.findIndex((n) => n.id === notificationId);
    if (idx === -1) return;
    if (notifs[idx].userId !== userId && notifs[idx].userId !== 'all') {
      throw new Error('You cannot mark another user’s notification as read.');
    }
    assertCurrentUser(userId, 'mark a notification as read');
    const readByUserIds = new Set(notifs[idx].readByUserIds ?? []);
    readByUserIds.add(userId);
    notifs[idx].readByUserIds = Array.from(readByUserIds);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  async markAllAsRead(userId: string): Promise<void> {
    assertCurrentUser(userId, 'mark notifications as read');
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    notifs.forEach((notification) => {
      if (notification.userId === userId || notification.userId === 'all') {
        const readByUserIds = new Set(notification.readByUserIds ?? []);
        readByUserIds.add(userId);
        notification.readByUserIds = Array.from(readByUserIds);
      }
    });
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  async addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification> {
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
    if (notification.userId !== 'all' && !users.some((user) => user.id === notification.userId)) {
      throw new Error('Notification recipient was not found.');
    }
    const allowedTypes = ['new_message', 'wall_reply', 'wall_upvote', 'hub_inquiry', 'discover_like', 'discover_comment', 'system_update'];
    if (!allowedTypes.includes(notification.type)) throw new Error('Unsupported notification type.');
    if (!notification.title.trim() || notification.title.length > 120) throw new Error('Notification title must contain 1–120 characters.');
    if (!notification.body.trim() || notification.body.length > 500) throw new Error('Notification body must contain 1–500 characters.');
    if (notification.senderAvatar && !isSecureHttpsUrl(notification.senderAvatar)) throw new Error('Notification avatars must use a valid secure HTTPS URL.');
    const notifs = getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const newNotif: AppNotification = {
      ...notification,
      title: notification.title.trim(),
      body: notification.body.trim(),
      isRead: false,
      readByUserIds: [],
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    notifs.unshift(newNotif);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newNotif;
  }
}
