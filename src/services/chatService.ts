/**
 * 8ATE - Chat & Messaging Service
 */

import { Conversation, ChatMessage, UserProfile } from '../types';
import { IChatRepository } from '../repositories/interfaces';
import { LocalChatRepository } from '../repositories/localStorageRepository';

export class ChatService {
  private chatRepo: IChatRepository;

  constructor(chatRepo: IChatRepository = new LocalChatRepository()) {
    this.chatRepo = chatRepo;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return this.chatRepo.getConversations(userId);
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    return this.chatRepo.getConversationById(conversationId);
  }

  async startDirectChat(currentUserId: string, targetUserId: string): Promise<Conversation> {
    if (currentUserId === targetUserId) {
      throw new Error('Cannot start a chat with yourself.');
    }
    return this.chatRepo.createConversation([currentUserId, targetUserId], false);
  }

  async createGroupChat(currentUserId: string, memberUserIds: string[], groupName: string): Promise<Conversation> {
    const allParticipantIds = Array.from(new Set([currentUserId, ...memberUserIds]));
    if (allParticipantIds.length < 2) {
      throw new Error('Group chat requires at least 2 members.');
    }
    return this.chatRepo.createConversation(allParticipantIds, true, groupName);
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.chatRepo.getMessages(conversationId);
  }

  async sendTextMessage(conversationId: string, senderId: string, text: string): Promise<ChatMessage> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message cannot be empty.');
    return this.chatRepo.sendMessage(conversationId, senderId, trimmed, 'text');
  }

  async sendMediaMessage(conversationId: string, senderId: string, imageUrl: string, caption?: string): Promise<ChatMessage> {
    return this.chatRepo.sendMessage(conversationId, senderId, caption || 'Photo', 'image', imageUrl);
  }

  async sendVoiceNote(conversationId: string, senderId: string, durationSec: number): Promise<ChatMessage> {
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

  async deleteMessage(messageId: string, conversationId: string): Promise<void> {
    return this.chatRepo.deleteMessage(messageId, conversationId);
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    return this.chatRepo.markConversationAsRead(conversationId, userId);
  }

  async togglePin(conversationId: string, isPinned: boolean): Promise<void> {
    return this.chatRepo.togglePinConversation(conversationId, isPinned);
  }
}
