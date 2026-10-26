import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeLocalStorage,
  resetLocalStorage,
  LocalAuthRepository,
  LocalChatRepository,
  LocalDiscoverRepository,
  LocalNotificationRepository,
  LocalWallRepository,
  LocalHubRepository,
  LocalCallRepository,
  LocalSafetyRepository,
} from './localStorageRepository';
import { normalizeGhanaPhone } from '../utils/phone';

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
    expect(() => normalizeGhanaPhone('1234')).toThrow('Enter a valid Ghanaian phone number');
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
    })).rejects.toThrow('Price must be a valid amount.');
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
});
