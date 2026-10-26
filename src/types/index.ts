/**
 * 8ATE - Core TypeScript Data Definitions
 * Made for Ghana
 */

export type GhanaRegion =
  | 'Greater Accra'
  | 'Ashanti'
  | 'Northern'
  | 'Eastern'
  | 'Western'
  | 'Central'
  | 'Volta'
  | 'Bono'
  | 'Bono East'
  | 'Ahafo'
  | 'Upper East'
  | 'Upper West'
  | 'Oti'
  | 'Savannah'
  | 'North East'
  | 'Western North';

export interface GhanaLocation {
  region: GhanaRegion;
  city: string;
}

// User & Auth
export interface UserProfile {
  id: string;
  username: string; // e.g. "kwame" (stored lowercase, unique)
  displayName: string; // e.g. "Kwame Owusu"
  avatarUrl: string;
  bio: string;
  region: GhanaRegion;
  city: string;
  joinedAt: number;
  verified?: boolean;
}

// Private account info - NEVER exposed in public feeds or search
export interface PrivateAccountInfo {
  userId: string;
  phoneNumber: string; // e.g. "+233 24 123 4567"
  createdAt: number;
  lastLoginAt: number;
  blockedUserIds: string[];
  savedPostIds: string[];
  savedListingIds: string[];
}

export interface UserSession {
  user: UserProfile;
  privateInfo: PrivateAccountInfo;
  token?: string;
}

// CHATS
export type MessageType = 'text' | 'image' | 'audio';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string; // Text content or media URL / audio duration description
  mediaUrl?: string;
  audioDurationSec?: number;
  timestamp: number;
  editedAt?: number;
  status: MessageStatus;
  reactions: MessageReaction[];
  deletedForEveryone?: boolean;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string; // For groups
  avatarUrl?: string;
  participantIds: string[];
  participants: UserProfile[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  /** Per-user unread counts in local prototype storage; not a security boundary. */
  unreadCountsByUser?: Record<string, number>;
  /** Per-user pin state, replacing the legacy conversation-wide flag when present. */
  pinnedByUserIds?: string[];
  isPinned: boolean;
  updatedAt: number;
  createdAt: number;
}

// WALLS - Anonymous Regional Spaces
export type ExpirationDuration = 2 | 6 | 12 | 24; // Hours

export interface WallPair {
  id: string;
  originLocation: string; // e.g. "Kumasi"
  destinationLocation: string; // e.g. "Accra"
  originRegion: GhanaRegion;
  destinationRegion: GhanaRegion;
  activePostCount: number;
}

// Public anonymous wall post (strictly no user ID, username, or phone number)
export interface PublicAnonymousWallPost {
  id: string;
  wallPairId: string;
  originLocation: string;
  destinationLocation: string;
  content: string;
  anonymousAlias: string; // e.g. "Kente Tiger", "Kumasi Falcon", "Osu Wave"
  anonymousAvatarBg: string; // hex color or gradient name
  anonymousAvatarIcon: string; // Lucide icon name
  createdAt: number;
  expiresAt: number; // Unix timestamp
  expirationDurationHours: ExpirationDuration;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  userVote?: 'up' | 'down' | null; // Local user's current vote
}

// Private Moderation ownership data - Isolated on server/moderation layer
export interface PrivateWallModerationData {
  postId: string;
  realOwnerUserId: string;
  createdAt: number;
  clientIpHash?: string;
}

export interface WallReply {
  id: string;
  postId: string;
  content: string;
  anonymousAlias: string;
  anonymousAvatarBg: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
}

// HUBS - Marketplace & Services
export type HubCategory =
  | 'Housing'
  | 'Jobs'
  | 'Marketplace'
  | 'Services'
  | 'Transport'
  | 'Food'
  | 'Education'
  | 'Events'
  | 'Football'
  | 'Music';

export interface HubListing {
  id: string;
  title: string;
  description: string;
  price: number; // in Ghanaian Cedis (GHS ₵)
  isNegotiable?: boolean;
  region: GhanaRegion;
  city: string;
  category: HubCategory;
  sellerId: string;
  seller: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    region: GhanaRegion;
    city: string;
  };
  images: string[];
  createdAt: number;
  status: 'active' | 'sold' | 'archived';
  viewsCount: number;
  savedCount: number;
}

// DISCOVER - Public Social Feed
export type DiscoverCategory =
  | 'Trending'
  | 'Ghana Now'
  | 'Campus Life'
  | 'Tech & Startups'
  | 'Football'
  | 'Entertainment'
  | 'Business'
  | 'Lifestyle';

export interface DiscoverComment {
  id: string;
  postId: string;
  author: UserProfile;
  content: string;
  createdAt: number;
  likesCount: number;
  isLiked?: boolean;
}

export interface DiscoverPost {
  id: string;
  author: UserProfile;
  content: string;
  category: DiscoverCategory;
  tags: string[];
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  /** User IDs that liked this post; prototype-only state. */
  likedByUserIds?: string[];
}

// CALLS
export type CallType = 'voice' | 'video';
export type CallDirection = 'incoming' | 'outgoing' | 'missed';
export type CallStatus = 'completed' | 'missed' | 'rejected' | 'ongoing';

export interface CallRecord {
  id: string;
  /** Account whose call history this record belongs to. */
  ownerUserId: string;
  otherUser: UserProfile;
  type: CallType;
  direction: CallDirection;
  status: CallStatus;
  startedAt: number;
  durationSeconds: number;
}

export interface ActiveCallState {
  isActive: boolean;
  callRecord?: CallRecord;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  elapsedSeconds: number;
  isConnecting: boolean;
}

// SAFETY & MODERATION
export type ReportTargetType = 'user' | 'message' | 'wall_post' | 'wall_reply' | 'hub_listing' | 'discover_post';
export type ReportReason =
  | 'Spam'
  | 'Harassment'
  | 'Scam'
  | 'Hate/abuse'
  | 'Sexual content'
  | 'Violence'
  | 'Illegal activity'
  | 'Other';

export interface ReportRequest {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetSummary: string;
  reporterUserId: string;
  reason: ReportReason;
  details?: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
}

// NOTIFICATIONS
export type NotificationType =
  | 'new_message'
  | 'wall_reply'
  | 'wall_upvote'
  | 'hub_inquiry'
  | 'discover_like'
  | 'discover_comment'
  | 'system_update';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  targetUrl?: string; // navigation target
  createdAt: number;
  isRead: boolean;
  /** User-specific read state, particularly for broadcast notifications. */
  readByUserIds?: string[];
  senderAvatar?: string;
  metadata?: Record<string, unknown>;
}
