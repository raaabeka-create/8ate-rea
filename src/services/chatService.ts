/**
 * 8ATE - Chat & Messaging Service
 */

import { Conversation, ChatMessage, UserProfile } from '../types';
import { IChatRepository } from '../repositories/interfaces';
import { LocalChatRepository } from '../repositories/localStorageRepository';
import { isSecureHttpsUrl } from '../utils/secureUrl';

export class ChatService {
  private chatRepo: IChatRepository;

  constructor(chatRepo: IChatRepository = new LocalChatRepository()) {
    this.chatRepo = chatRepo;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return this.chatRepo.getConversations(userId);
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    return this.chatRepo.getConversationById(conversationId, userId);
  }

  async startDirectChat(currentUserId: string, targetUserId: string): Promise<Conversation> {
    if (currentUserId === targetUserId) {
      throw new Error('Cannot start a chat with yourself.');
    }
    return this.chatRepo.createConversation([currentUserId, targetUserId], false);
  }

  async createGroupChat(currentUserId: string, memberUserIds: string[], groupName: string): Promise<Conversation> {
    const cleanGroupName = groupName.trim();
    if (!cleanGroupName || cleanGroupName.length > 80) throw new Error('Group name must contain 1–80 characters.');
    const allParticipantIds = Array.from(new Set([currentUserId, ...memberUserIds]));
    if (allParticipantIds.length < 2) {
      throw new Error('Group chat requires at least 2 members.');
    }
    return this.chatRepo.createConversation(allParticipantIds, true, cleanGroupName);
  }

  async getMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    return this.chatRepo.getMessages(conversationId, userId);
  }

  async sendTextMessage(conversationId: string, senderId: string, text: string): Promise<ChatMessage> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message cannot be empty.');
    if (trimmed.length > 5000) throw new Error('Messages cannot exceed 5000 characters.');
    return this.chatRepo.sendMessage(conversationId, senderId, trimmed, 'text');
  }

  async editTextMessage(messageId: string, conversationId: string, userId: string, content: string): Promise<ChatMessage> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Edited messages cannot be empty.');
    if (trimmed.length > 5000) throw new Error('Messages cannot exceed 5000 characters.');
    return this.chatRepo.editMessage(messageId, conversationId, userId, trimmed);
  }

  async sendMediaMessage(conversationId: string, senderId: string, imageUrl: string, caption?: string): Promise<ChatMessage> {
    if (!isSecureHttpsUrl(imageUrl)) throw new Error('Image attachments must use a valid secure HTTPS URL.');
    const cleanCaption = caption?.trim() || 'Photo';
    if (cleanCaption.length > 5000) throw new Error('Image captions cannot exceed 5000 characters.');
    return this.chatRepo.sendMessage(conversationId, senderId, cleanCaption, 'image', imageUrl.trim());
  }

  async sendVoiceNote(conversationId: string, senderId: string, durationSec: number): Promise<ChatMessage> {
    if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 600) {
      throw new Error('Voice note duration must be between 1 and 600 seconds.');
    }
    return this.chatRepo.sendMessage(
      conversationId,
      senderId,
      `Voice message (${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')})`,
      'audio',
      undefined,
      durationSec
    );
  }

  async toggleReaction(messageId: string, conversationId: string, userId: string, emoji: string): Promise<ChatMessage> {
    return this.chatRepo.toggleMessageReaction(messageId, conversationId, userId, emoji);
  }

  async deleteMessage(messageId: string, conversationId: string, requesterUserId: string): Promise<void> {
    return this.chatRepo.deleteMessage(messageId, conversationId, requesterUserId);
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    return this.chatRepo.markConversationAsRead(conversationId, userId);
  }

  async togglePin(conversationId: string, userId: string, isPinned: boolean): Promise<void> {
    return this.chatRepo.togglePinConversation(conversationId, userId, isPinned);
  }
}
