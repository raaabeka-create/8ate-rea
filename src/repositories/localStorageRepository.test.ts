import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeLocalStorage,
  resetLocalStorage,
  LocalAuthRepository,
  LocalChatRepository,
  LocalDiscoverRepository,
  LocalHubRepository,
  LocalNotificationRepository,
  LocalWallRepository,
  LocalCallRepository,
  LocalSafetyRepository,
} from './localStorageRepository';
import { normalizeGhanaPhone } from '../utils/phone';
import { SearchService } from '../services/searchService';
import { ChatService } from '../services/chatService';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const auth = new LocalAuthRepository();

async function signInAs(userId: string): Promise<void> {
  await auth.setCurrentUserId(userId);
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  initializeLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prototype repository guardrails', () => {
  it('resets only 8ATE-owned storage keys', () => {
    const storage = new MemoryStorage();
    storage.setItem('8ATE_USERS_V1', 'corrupt');
    storage.setItem('other-application-key', 'preserve');
    vi.stubGlobal('localStorage', storage);

    resetLocalStorage();

    expect(storage.getItem('8ATE_USERS_V1')).toBeNull();
    expect(storage.getItem('other-application-key')).toBe('preserve');
  });

  it('refuses to replace corrupted stored records with seed data', async () => {
    const brokenStorage = new MemoryStorage();
    brokenStorage.setItem('8ATE_USERS_V1', '{broken json');
    vi.stubGlobal('localStorage', brokenStorage);

    await expect(new LocalAuthRepository().getAllUsers())
      .rejects.toThrow('Stored 8ATE data for 8ATE_USERS_V1 is corrupted.');
  });

  it('surfaces browser storage write failures instead of pretending the session was saved', async () => {
    vi.stubGlobal('localStorage', {
      length: 0,
      clear: () => undefined,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('quota exceeded'); },
    } satisfies Storage);

    await expect(new LocalAuthRepository().setCurrentUserId('user_kwame'))
      .rejects.toThrow('8ATE could not save this change in browser storage.');
  });

  it('normalizes common Ghanaian phone formats and rejects invalid numbers', () => {
    expect(normalizeGhanaPhone('+233 24 456 7890')).toBe('+233244567890');
    expect(normalizeGhanaPhone('024-456-7890')).toBe('+233244567890');
    expect(normalizeGhanaPhone('00 233 24 456 7890')).toBe('+233244567890');
    expect(normalizeGhanaPhone('020 123 4567')).toBe('+233201234567');
    expect(normalizeGhanaPhone('0591234567')).toBe('+233591234567');
    expect(() => normalizeGhanaPhone('1234')).toThrow('Enter a valid Ghanaian mobile number');
    expect(() => normalizeGhanaPhone('+233 11 123 4567')).toThrow('Enter a valid Ghanaian mobile number');
    expect(() => normalizeGhanaPhone('abc0244567890')).toThrow('Enter a valid Ghanaian phone number');
  });

  it('rejects duplicate phone numbers and prevents profile identity escalation', async () => {
    const authRepo = new LocalAuthRepository();
    await expect(authRepo.createUser(
      {
        username: 'new_member',
        displayName: 'New Member',
        avatarUrl: 'https://example.com/avatar.png',
        bio: '',
        region: 'Ashanti',
        city: 'Kumasi',
      },
      { phoneNumber: '+233 24 456 7890' }
    )).rejects.toThrow('This phone number is already registered.');

    await signInAs('user_kwame');
    const original = await authRepo.getUserProfile('user_kwame');
    expect(original).toBeDefined();
    const updated = await authRepo.updateUserProfile('user_kwame', {
      id: 'user_ama',
      joinedAt: 1,
      verified: true,
      displayName: 'Kwame Updated',
    });
    expect(updated.id).toBe('user_kwame');
    expect(updated.joinedAt).toBe(original!.joinedAt);
    expect(updated.verified).toBe(original!.verified);
    expect(updated.displayName).toBe('Kwame Updated');
  });

  it('clears legacy implicit sessions left by older prototype versions', () => {
    const legacyStorage = new MemoryStorage();
    legacyStorage.setItem('8ATE_CURRENT_USER_ID', JSON.stringify('user_kwame'));
    vi.stubGlobal('localStorage', legacyStorage);

    initializeLocalStorage();

    expect(new LocalAuthRepository().getCurrentUserId()).toBeNull();
    expect(legacyStorage.getItem('8ATE_CURRENT_USER_ID')).toBeNull();
  });

  it('does not silently authenticate a seeded user and can clear a persisted session', async () => {
    const authRepo = new LocalAuthRepository();
    expect(authRepo.getCurrentUserId()).toBeNull();
    await authRepo.setCurrentUserId('user_kwame');
    expect(authRepo.getCurrentUserId()).toBe('user_kwame');
    await authRepo.setCurrentUserId(null);
    expect(authRepo.getCurrentUserId()).toBeNull();
    await expect(authRepo.setCurrentUserId('missing_user')).rejects.toThrow('Cannot sign in as an unknown user.');
  });

  it('rejects a raw stored user ID without the explicit demo-session marker', async () => {
    localStorage.setItem('8ATE_CURRENT_USER_ID', JSON.stringify('user_kwame'));
    const chats = new LocalChatRepository();
    await expect(chats.getConversations('user_kwame'))
      .rejects.toThrow('Only the signed-in demo user can read conversations.');
    await expect(chats.createConversation(['user_kwame', 'user_ama']))
      .rejects.toThrow('The signed-in user must be a conversation member.');

    const otherUser = await new LocalAuthRepository().getUserProfile('user_ama');
    if (!otherUser) throw new Error('Expected seeded user_ama profile in test setup.');
    const calls = new LocalCallRepository();
    await expect(calls.addCallRecord({
      ownerUserId: 'user_kwame',
      otherUser,
      type: 'voice',
      direction: 'outgoing',
      status: 'completed',
      startedAt: Date.now(),
      durationSeconds: 30,
    })).rejects.toThrow('Call history can only be written for the signed-in user.');
    expect(new LocalAuthRepository().getCurrentUserId()).toBeNull();
  });

  it('prevents non-members from reading or sending messages in a conversation', async () => {
    const chats = new LocalChatRepository();

    await expect(chats.getMessages('conv_kwame_ama', 'user_kofi'))
      .rejects.toThrow('You are not a member of this conversation.');

    await expect(chats.sendMessage('conv_kwame_ama', 'user_kofi', 'spoofed message'))
      .rejects.toThrow('Sender is not a conversation member.');
  });

  it('prevents a signed-in user from reading another member’s private chat view', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    await expect(chats.getMessages('conv_kwame_ama', 'user_ama'))
      .rejects.toThrow('Only the signed-in demo user can read messages.');
    await expect(chats.getConversations('user_ama'))
      .rejects.toThrow('Only the signed-in demo user can read conversations.');
  });

  it('keeps conversation pins independent between members', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    await chats.togglePinConversation('conv_kwame_ama', 'user_kwame', true);
    expect((await chats.getConversations('user_kwame').then((items) => items.find((item) => item.id === 'conv_kwame_ama')))?.isPinned).toBe(true);

    await signInAs('user_ama');
    expect((await chats.getConversations('user_ama').then((items) => items.find((item) => item.id === 'conv_kwame_ama')))?.isPinned).toBe(false);
    await chats.togglePinConversation('conv_kwame_ama', 'user_ama', true);

    await signInAs('user_kwame');
    await chats.togglePinConversation('conv_kwame_ama', 'user_kwame', false);
    expect((await chats.getConversations('user_kwame').then((items) => items.find((item) => item.id === 'conv_kwame_ama')))?.isPinned).toBe(false);
    await signInAs('user_ama');
    expect((await chats.getConversations('user_ama').then((items) => items.find((item) => item.id === 'conv_kwame_ama')))?.isPinned).toBe(true);
  });

  it('prevents a user from deleting another member’s message', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const messages = await chats.getMessages('conv_kwame_ama', 'user_kwame');
    const amaMessage = messages.find((message) => message.senderId === 'user_ama');

    expect(amaMessage).toBeDefined();
    await expect(chats.deleteMessage(amaMessage!.id, 'conv_kwame_ama', 'user_kwame'))
      .rejects.toThrow('You can only delete messages you sent.');
  });

  it('allows one reaction per user per message and supports changing/removing it', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const messages = await chats.getMessages('conv_kwame_ama', 'user_kwame');
    const target = messages[0];

    await chats.toggleMessageReaction(target.id, target.conversationId, 'user_kwame', '🔥');
    let updated = await chats.toggleMessageReaction(target.id, target.conversationId, 'user_kwame', '❤️');
    expect(updated.reactions.filter((reaction) => reaction.userId === 'user_kwame'))
      .toEqual([{ userId: 'user_kwame', emoji: '❤️' }]);

    updated = await chats.toggleMessageReaction(target.id, target.conversationId, 'user_kwame', '❤️');
    expect(updated.reactions.some((reaction) => reaction.userId === 'user_kwame')).toBe(false);
  });

  it('accepts valid moderation reports and rejects nonexistent targets', async () => {
    await signInAs('user_kwame');
    const safety = new LocalSafetyRepository();

    const report = await safety.submitReport({
      targetType: 'user',
      targetId: 'user_ama',
      targetSummary: '@ama',
      reporterUserId: 'user_kwame',
      reason: 'Spam',
    });
    expect(report.status).toBe('pending');
    expect(report.targetId).toBe('user_ama');

    await expect(safety.submitReport({
      targetType: 'user',
      targetId: 'not_a_user',
      targetSummary: 'Missing user',
      reporterUserId: 'user_kwame',
      reason: 'Spam',
    })).rejects.toThrow('The item you are reporting could not be found.');
  });

  it('enforces block rules before sending direct messages', async () => {
    await signInAs('user_kwame');
    const safety = new LocalSafetyRepository();
    const chats = new LocalChatRepository();

    await safety.blockUser('user_kwame', 'user_ama');
    await expect(chats.sendMessage('conv_kwame_ama', 'user_kwame', 'This should be blocked'))
      .rejects.toThrow('Message not sent because one participant has blocked the other.');

    await expect(safety.blockUser('user_kwame', 'user_kwame'))
      .rejects.toThrow('You cannot block your own account.');
    await expect(safety.blockUser('user_kwame', 'missing_user'))
      .rejects.toThrow('User to block was not found.');

    await safety.unblockUser('user_kwame', 'user_ama');
    await signInAs('user_ama');
    await safety.blockUser('user_ama', 'user_kwame');
    await signInAs('user_kwame');
    await expect(chats.sendMessage('conv_kwame_ama', 'user_kwame', 'This should also be blocked'))
      .rejects.toThrow('Message not sent because one participant has blocked the other.');
    await expect(chats.createConversation(['user_kwame', 'user_ama'], false))
      .rejects.toThrow('This direct chat is unavailable because one participant has blocked the other.');
    await signInAs('user_ama');
    await safety.unblockUser('user_ama', 'user_kwame');
    await signInAs('user_kwame');
    await chats.sendMessage('conv_kwame_ama', 'user_kwame', 'This should now work');
  });

  it('keeps unread counts separate for each conversation member', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();

    await chats.sendMessage('conv_kwame_ama', 'user_kwame', 'Hello Ama');
    await signInAs('user_ama');
    const amaConversations = await chats.getConversations('user_ama');
    await signInAs('user_kwame');
    const kwameConversations = await chats.getConversations('user_kwame');

    expect(amaConversations.find((conversation) => conversation.id === 'conv_kwame_ama')?.unreadCount).toBe(1);
    expect(kwameConversations.find((conversation) => conversation.id === 'conv_kwame_ama')?.unreadCount).toBe(0);

    await signInAs('user_ama');
    await chats.markConversationAsRead('conv_kwame_ama', 'user_ama');
    const amaAfterRead = await chats.getConversations('user_ama');
    expect(amaAfterRead.find((conversation) => conversation.id === 'conv_kwame_ama')?.unreadCount).toBe(0);
  });

  it('does not let one user mark another user’s private notification as read', async () => {
    await signInAs('user_kwame');
    const notifications = new LocalNotificationRepository();

    await expect(notifications.markAsRead('notif_1', 'user_ama'))
      .rejects.toThrow('You cannot mark another user’s notification as read.');

    const broadcast = await notifications.addNotification({
      userId: 'all',
      type: 'system_update',
      title: 'Test broadcast',
      body: 'Read state must be per-user.',
      isRead: false,
    });

    await notifications.markAsRead(broadcast.id, 'user_kwame');
    const kwameNotifications = await notifications.getNotifications('user_kwame');
    await signInAs('user_ama');
    const amaNotifications = await notifications.getNotifications('user_ama');

    expect(kwameNotifications.find((item) => item.id === broadcast.id)?.isRead).toBe(true);
    expect(amaNotifications.find((item) => item.id === broadcast.id)?.isRead).toBe(false);
  });

  it('keeps anonymous Wall votes per user and omits owner IDs from public posts', async () => {
    await signInAs('user_kwame');
    const walls = new LocalWallRepository();
    const post = await walls.createPost(
      'wall_kumasi_accra',
      'Kumasi',
      'Accra',
      'A fictional test post',
      2,
      'user_kwame'
    );

    expect(post).not.toHaveProperty('ownerUserId');
    expect((await walls.getPostById(post.id, 'user_kwame'))?.userVote).toBe('up');

    await signInAs('user_ama');
    await walls.votePost(post.id, 'down', 'user_ama');
    expect((await walls.getPostById(post.id, 'user_ama'))?.userVote).toBe('down');

    await signInAs('user_kwame');
    expect((await walls.getPostById(post.id, 'user_kwame'))?.userVote).toBe('up');
  });

  it('isolates call history and prevents another user from clearing it', async () => {
    const calls = new LocalCallRepository();

    await signInAs('user_ama');
    expect(await calls.getCallRecords('user_ama')).toHaveLength(0);
    await expect(calls.clearCallHistory('user_kwame'))
      .rejects.toThrow('Only the signed-in demo user can clear call history.');

    await signInAs('user_kwame');
    expect(await calls.getCallRecords('user_kwame')).toHaveLength(4);
    await calls.clearCallHistory('user_kwame');
    expect(await calls.getCallRecords('user_kwame')).toHaveLength(0);

    await signInAs('user_ama');
    expect(await calls.getCallRecords('user_ama')).toHaveLength(0);
  });

  it('uses the canonical seller profile and rejects invalid listing prices', async () => {
    await signInAs('user_kwame');
    const hubs = new LocalHubRepository();
    const canonical = await new LocalAuthRepository().getUserProfile('user_kwame');
    expect(canonical).toBeDefined();

    const listing = await hubs.createListing({
      title: 'A test listing',
      description: 'A fictional test item',
      price: 100,
      region: 'Ashanti',
      city: 'Kumasi',
      category: 'Marketplace',
      sellerId: 'user_kwame',
      seller: {
        id: 'user_kwame',
        username: 'spoofed_username',
        displayName: 'Spoofed Seller',
        avatarUrl: 'https://example.com/spoof.png',
        region: 'Ashanti',
        city: 'Kumasi',
      },
      images: ['https://example.com/item.png'],
    });

    expect(listing.seller.username).toBe(canonical!.username);
    expect(listing.seller.displayName).toBe(canonical!.displayName);
    await expect(hubs.createListing({
      title: 'Invalid price',
      description: 'Should be rejected',
      price: Number.POSITIVE_INFINITY,
      region: 'Ashanti',
      city: 'Kumasi',
      category: 'Marketplace',
      sellerId: 'user_kwame',
      seller: canonical!,
      images: ['https://example.com/item.png'],
    })).rejects.toThrow('Listing title, description, and a valid non-negative price are required.');
  });

  it('keeps Discover likes scoped to each user', async () => {
    await signInAs('user_kwame');
    const discover = new LocalDiscoverRepository();

    await discover.toggleLikePost('disc_post_1', 'user_kwame');
    await signInAs('user_ama');
    await discover.toggleLikePost('disc_post_1', 'user_ama');

    await signInAs('user_kwame');
    const kwamePosts = await discover.getPosts(undefined, undefined, 'user_kwame');
    await signInAs('user_ama');
    const amaPosts = await discover.getPosts(undefined, undefined, 'user_ama');

    expect(kwamePosts.find((post) => post.id === 'disc_post_1')?.isLiked).toBe(false);
    expect(amaPosts.find((post) => post.id === 'disc_post_1')?.isLiked).toBe(true);
  });
  it('hides blocked users from Discover, Hubs, anonymous Walls, comments, and global search', async () => {
    const authRepo = new LocalAuthRepository();
    const safety = new LocalSafetyRepository();
    const discover = new LocalDiscoverRepository();
    const hubs = new LocalHubRepository();
    const walls = new LocalWallRepository();
    const search = new SearchService();

    await signInAs('user_ama');
    const ama = await authRepo.getUserProfile('user_ama');
    expect(ama).toBeDefined();

    const blockedDiscoverPost = await discover.createPost(
      'user_ama',
      'zebra-block-test-token Discover content',
      'Business',
      ['zebra-block-test-token']
    );
    const blockedListing = await hubs.createListing({
      title: 'zebra-block-test-token listing',
      description: 'Listing from a blocked seller',
      price: 10,
      region: 'Ashanti',
      city: 'Kumasi',
      category: 'Marketplace',
      sellerId: 'user_ama',
      seller: {
        id: ama!.id,
        username: ama!.username,
        displayName: ama!.displayName,
        avatarUrl: ama!.avatarUrl,
        region: ama!.region,
        city: ama!.city,
      },
      images: ['https://example.com/blocked-listing.jpg'],
    });
    const blockedWallPost = await walls.createPost(
      'wall_kumasi_accra',
      'Kumasi',
      'Accra',
      'zebra-block-test-token anonymous Wall content',
      2,
      'user_ama'
    );
    await walls.createReply(blockedWallPost.id, 'Reply from blocked account', 'user_ama');

    await signInAs('user_kwame');
    const kwamePost = await discover.createPost(
      'user_kwame',
      'Public parent post for comment filtering',
      'Business',
      ['comment-filter-test']
    );
    await signInAs('user_ama');
    await discover.addComment(kwamePost.id, 'user_ama', 'Comment from blocked account');

    await signInAs('user_kwame');
    await safety.blockUser('user_kwame', 'user_ama');

    const visibleDiscoverPosts = await discover.getPosts(undefined, undefined, 'user_kwame');
    expect(visibleDiscoverPosts.some((post) => post.id === blockedDiscoverPost.id)).toBe(false);
    await expect(discover.getPostById(blockedDiscoverPost.id, 'user_kwame')).resolves.toBeNull();
    await expect(discover.toggleLikePost(blockedDiscoverPost.id, 'user_kwame'))
      .rejects.toThrow('You cannot interact with a post from a user you blocked.');
    await expect(discover.toggleBookmarkPost(blockedDiscoverPost.id, 'user_kwame'))
      .rejects.toThrow('You cannot bookmark a post from a user you blocked.');
    expect(await discover.getComments(kwamePost.id, 'user_kwame')).toHaveLength(0);

    const visibleListings = await hubs.getListings({ userId: 'user_kwame' });
    expect(visibleListings.some((listing) => listing.id === blockedListing.id)).toBe(false);
    await expect(hubs.getListingById(blockedListing.id, 'user_kwame')).resolves.toBeNull();
    await expect(hubs.toggleSaveListing(blockedListing.id, 'user_kwame'))
      .rejects.toThrow('You cannot save a listing from a user you blocked.');

    const visibleWalls = await walls.getActivePosts(undefined, undefined, undefined, 'user_kwame');
    expect(visibleWalls.some((post) => post.id === blockedWallPost.id)).toBe(false);
    await expect(walls.getPostById(blockedWallPost.id, 'user_kwame')).resolves.toBeNull();
    await expect(walls.getReplies(blockedWallPost.id, 'user_kwame'))
      .rejects.toThrow('This content is unavailable because you blocked its author.');

    const results = await search.globalSearch('zebra-block-test-token', 'user_kwame');
    expect(results.users.some((user) => user.id === 'user_ama')).toBe(false);
    expect(results.hubs.some((listing) => listing.id === blockedListing.id)).toBe(false);
    expect(results.discover.some((post) => post.id === blockedDiscoverPost.id)).toBe(false);
    expect(results.walls.some((post) => post.id === blockedWallPost.id)).toBe(false);
  });

  it('removes media and reactions when deleting a message and rejects reactions to tombstones', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const sent = await chats.sendMessage(
      'conv_kwame_ama',
      'user_kwame',
      'Photo attachment',
      'image',
      'https://example.com/test-photo.jpg'
    );
    await chats.toggleMessageReaction(sent.id, sent.conversationId, 'user_kwame', '🔥');
    await chats.deleteMessage(sent.id, sent.conversationId, 'user_kwame');

    const deleted = (await chats.getMessages('conv_kwame_ama', 'user_kwame'))
      .find((message) => message.id === sent.id);
    expect(deleted?.deletedForEveryone).toBe(true);
    expect(deleted?.content).toBe('This message was deleted');
    expect(deleted?.mediaUrl).toBeUndefined();
    expect(deleted?.audioDurationSec).toBeUndefined();
    expect(deleted?.reactions).toEqual([]);

    await expect(chats.toggleMessageReaction(sent.id, sent.conversationId, 'user_kwame', '❤️'))
      .rejects.toThrow('Deleted messages cannot be reacted to.');
    await expect(chats.deleteMessage(sent.id, sent.conversationId, 'user_kwame'))
      .rejects.toThrow('Message has already been deleted.');
  });

  it('rolls back a partially failed multi-record message write', async () => {
    await signInAs('user_kwame');
    const initialStorage = globalThis.localStorage;
    const originalMessages = initialStorage.getItem('8ATE_MESSAGES_V1');
    const originalConversations = initialStorage.getItem('8ATE_CONVERSATIONS_V1');
    const backing = new MemoryStorage();

    for (let index = 0; index < initialStorage.length; index += 1) {
      const key = initialStorage.key(index);
      if (key !== null) {
        const value = initialStorage.getItem(key);
        if (value !== null) backing.setItem(key, value);
      }
    }

    const failingStorage = {
      get length() { return backing.length; },
      clear: () => backing.clear(),
      getItem: (key: string) => backing.getItem(key),
      key: (index: number) => backing.key(index),
      removeItem: (key: string) => backing.removeItem(key),
      setItem: (key: string, value: string) => {
        if (key === '8ATE_CONVERSATIONS_V1') throw new Error('forced second-write failure');
        backing.setItem(key, value);
      },
    } satisfies Storage;
    vi.stubGlobal('localStorage', failingStorage);

    await expect(new LocalChatRepository().sendMessage(
      'conv_kwame_ama',
      'user_kwame',
      'This must not partially persist'
    )).rejects.toThrow('Multi-record update was rolled back where possible.');

    expect(backing.getItem('8ATE_MESSAGES_V1')).toBe(originalMessages);
    expect(backing.getItem('8ATE_CONVERSATIONS_V1')).toBe(originalConversations);
  });

  it('normalizes self-report checks and prevents reporting messages outside accessible chats', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const safety = new LocalSafetyRepository();
    const privateMessage = await chats.sendMessage(
      'conv_kwame_ama',
      'user_kwame',
      'Fictional private message for report access testing'
    );

    await expect(safety.submitReport({
      targetType: 'user',
      targetId: ' user_kwame ',
      targetSummary: 'My own account',
      reporterUserId: 'user_kwame',
      reason: 'Spam',
    })).rejects.toThrow('You cannot report your own account.');

    await signInAs('user_kofi');
    await expect(safety.submitReport({
      targetType: 'message',
      targetId: privateMessage.id,
      targetSummary: 'Private message from another conversation',
      reporterUserId: 'user_kofi',
      reason: 'Spam',
    })).rejects.toThrow('The item you are reporting could not be found.');
  });

  it('rejects invalid Wall votes and out-of-plan Hub and Discover categories', async () => {
    await signInAs('user_kwame');
    const walls = new LocalWallRepository();
    const hubs = new LocalHubRepository();
    const discover = new LocalDiscoverRepository();
    const kwame = await auth.getUserProfile('user_kwame');
    expect(kwame).toBeDefined();

    await expect(walls.votePost('missing-post', 'sideways' as any, 'user_kwame'))
      .rejects.toThrow('Vote must be either up or down.');

    await expect(hubs.createListing({
      title: 'Invalid category listing',
      description: 'This should be rejected',
      price: 10,
      region: 'Ashanti',
      city: 'Kumasi',
      category: 'InvalidCategory' as any,
      sellerId: 'user_kwame',
      seller: {
        id: kwame!.id,
        username: kwame!.username,
        displayName: kwame!.displayName,
        avatarUrl: kwame!.avatarUrl,
        region: kwame!.region,
        city: kwame!.city,
      },
      images: ['https://example.com/listing.jpg'],
    })).rejects.toThrow('Select a valid Hub listing category.');

    await expect(discover.createPost(
      'user_kwame',
      'Invalid category post',
      'InvalidCategory' as any,
      []
    )).rejects.toThrow('Select a valid Discover category.');
  });

  it('fails closed when browser storage cannot be read', () => {
    vi.stubGlobal('localStorage', {
      length: 0,
      clear: () => undefined,
      getItem: () => { throw new Error('forced read failure'); },
      key: () => null,
      removeItem: () => undefined,
      setItem: () => undefined,
    } satisfies Storage);

    expect(() => new LocalAuthRepository().getCurrentUserId())
      .toThrow('8ATE could not read browser storage.');
  });

  it('rolls back account registration if a later storage write fails', async () => {
    const initialStorage = globalThis.localStorage;
    const originalUsers = initialStorage.getItem('8ATE_USERS_V1');
    const originalAccounts = initialStorage.getItem('8ATE_PRIVATE_ACCOUNTS_V1');
    const backing = new MemoryStorage();

    for (let index = 0; index < initialStorage.length; index += 1) {
      const key = initialStorage.key(index);
      if (key !== null) {
        const value = initialStorage.getItem(key);
        if (value !== null) backing.setItem(key, value);
      }
    }

    const failingStorage = {
      get length() { return backing.length; },
      clear: () => backing.clear(),
      getItem: (key: string) => backing.getItem(key),
      key: (index: number) => backing.key(index),
      removeItem: (key: string) => backing.removeItem(key),
      setItem: (key: string, value: string) => {
        if (key === '8ATE_PRIVATE_ACCOUNTS_V1') throw new Error('forced account write failure');
        backing.setItem(key, value);
      },
    } satisfies Storage;
    vi.stubGlobal('localStorage', failingStorage);

    await expect(new LocalAuthRepository().createUser(
      {
        username: 'new_member_transaction',
        displayName: 'New Member',
        avatarUrl: 'https://example.com/new-member.png',
        bio: '',
        region: 'Ashanti',
        city: 'Kumasi',
      },
      { phoneNumber: '+233 21 987 6543' }
    )).rejects.toThrow('Multi-record update was rolled back where possible.');

    expect(backing.getItem('8ATE_USERS_V1')).toBe(originalUsers);
    expect(backing.getItem('8ATE_PRIVATE_ACCOUNTS_V1')).toBe(originalAccounts);
    expect(backing.getItem('8ATE_CURRENT_USER_ID')).toBeNull();
  });

  it('edits only the sender’s text message within 15 minutes and updates the conversation preview', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const message = await chats.sendMessage(
      'conv_kwame_ama',
      'user_kwame',
      'Original message text'
    );

    const edited = await chats.editMessage(
      message.id,
      message.conversationId,
      'user_kwame',
      '  Corrected message text  '
    );
    expect(edited.content).toBe('Corrected message text');
    expect(edited.editedAt).toBeDefined();
    expect((await chats.getConversationById('conv_kwame_ama', 'user_kwame'))?.lastMessage?.content)
      .toBe('Corrected message text');

    await signInAs('user_ama');
    await expect(chats.editMessage(
      message.id,
      message.conversationId,
      'user_ama',
      'Attempted unauthorized edit'
    )).rejects.toThrow('You can only edit messages you sent.');

    await signInAs('user_kwame');
    const allMessages = JSON.parse(localStorage.getItem('8ATE_MESSAGES_V1') || '{}') as Record<string, Array<{ id: string; timestamp: number }>>;
    const stored = allMessages[message.conversationId].find((item) => item.id === message.id);
    expect(stored).toBeDefined();
    stored!.timestamp = Date.now() - 16 * 60 * 1000;
    localStorage.setItem('8ATE_MESSAGES_V1', JSON.stringify(allMessages));

    await expect(chats.editMessage(
      message.id,
      message.conversationId,
      'user_kwame',
      'Too late to edit'
    )).rejects.toThrow('Message editing is only allowed within 15 minutes.');
  });

  it('rejects editing media, deleted messages, and empty edits', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const image = await chats.sendMessage(
      'conv_kwame_ama',
      'user_kwame',
      'Image caption',
      'image',
      'https://example.com/edit-image.jpg'
    );
    await expect(chats.editMessage(image.id, image.conversationId, 'user_kwame', 'New caption'))
      .rejects.toThrow('Only text messages can be edited.');

    const textMessage = await chats.sendMessage('conv_kwame_ama', 'user_kwame', 'Text to delete');
    await chats.deleteMessage(textMessage.id, textMessage.conversationId, 'user_kwame');
    await expect(chats.editMessage(textMessage.id, textMessage.conversationId, 'user_kwame', 'Edited'))
      .rejects.toThrow('Deleted messages cannot be edited.');

    const another = await chats.sendMessage('conv_kwame_ama', 'user_kwame', 'Text to edit');
    await expect(chats.editMessage(another.id, another.conversationId, 'user_kwame', '   '))
      .rejects.toThrow('Edited messages must contain 1–5000 characters.');
  });

  it('tracks per-recipient read receipts for direct and group messages', async () => {
    await signInAs('user_kwame');
    const chats = new LocalChatRepository();
    const directMessage = await chats.sendMessage(
      'conv_kwame_ama',
      'user_kwame',
      'Direct read receipt test'
    );

    await signInAs('user_ama');
    await chats.markConversationAsRead('conv_kwame_ama', 'user_ama');
    const directMessages = await chats.getMessages('conv_kwame_ama', 'user_ama');
    const directReceipt = directMessages.find((message) => message.id === directMessage.id);
    expect(directReceipt?.readByUserIds).toEqual(expect.arrayContaining(['user_kwame', 'user_ama']));
    expect(directReceipt?.status).toBe('read');

    await signInAs('user_kwame');
    const group = await chats.createConversation(['user_kwame', 'user_ama', 'user_kofi'], true, 'Receipt test group');
    const groupMessage = await chats.sendMessage(group.id, 'user_kwame', 'Group read receipt test');

    await signInAs('user_ama');
    await chats.markConversationAsRead(group.id, 'user_ama');
    const afterAma = (await chats.getMessages(group.id, 'user_ama')).find((message) => message.id === groupMessage.id);
    expect(afterAma?.readByUserIds).toEqual(expect.arrayContaining(['user_kwame', 'user_ama']));
    expect(afterAma?.readByUserIds).not.toContain('user_kofi');
    expect(afterAma?.status).not.toBe('read');

    await signInAs('user_kofi');
    await chats.markConversationAsRead(group.id, 'user_kofi');
    const afterKofi = (await chats.getMessages(group.id, 'user_kofi')).find((message) => message.id === groupMessage.id);
    expect(afterKofi?.readByUserIds).toEqual(expect.arrayContaining(['user_kwame', 'user_ama', 'user_kofi']));
    expect(afterKofi?.status).toBe('read');
  });

  it('creates recipient-only local notifications after a message is saved', async () => {
    const chatService = new ChatService(new LocalChatRepository(), new LocalNotificationRepository());
    const notifications = new LocalNotificationRepository();
    const sender = await auth.getUserProfile('user_kwame');

    await signInAs('user_kwame');
    await chatService.sendTextMessage(
      'conv_kwame_ama',
      'user_kwame',
      'unique-notification-preview-8ate'
    );

    await signInAs('user_ama');
    const amaNotifications = await notifications.getNotifications('user_ama');
    expect(amaNotifications.some((item) =>
      item.type === 'new_message' &&
      item.title === `${sender?.displayName} sent you a message` &&
      item.body === 'unique-notification-preview-8ate' &&
      item.targetUrl === '/chats/conv_kwame_ama' &&
      item.senderAvatar === sender?.avatarUrl
    )).toBe(true);

    await signInAs('user_kwame');
    const kwameNotifications = await notifications.getNotifications('user_kwame');
    expect(kwameNotifications.some((item) => item.body === 'unique-notification-preview-8ate')).toBe(false);
  });

});
