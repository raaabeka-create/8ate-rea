/**
 * 8ATE - Calls Service
 * 
 * Manages call logs and simulated interactive calling UI.
 * Note: Clearly isolated development call simulation as required by instructions.
 */

import { CallRecord, CallType, UserProfile } from '../types';
import { ICallRepository } from '../repositories/interfaces';
import { LocalCallRepository } from '../repositories/localStorageRepository';

export class CallService {
  private callRepo: ICallRepository;

  constructor(callRepo: ICallRepository = new LocalCallRepository()) {
    this.callRepo = callRepo;
  }

  async getCallRecords(userId: string): Promise<CallRecord[]> {
    return this.callRepo.getCallRecords(userId);
  }

  async recordCall(
    ownerUserId: string,
    otherUser: UserProfile,
    type: CallType,
    direction: 'incoming' | 'outgoing' | 'missed',
    durationSeconds: number
  ): Promise<CallRecord> {
    if (!ownerUserId.trim()) throw new Error('Call history requires an owner.');
    if (!['voice', 'video'].includes(type)) throw new Error('Unsupported call type.');
    if (!['incoming', 'outgoing', 'missed'].includes(direction)) throw new Error('Unsupported call direction.');
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) {
      throw new Error('Call duration must be between 0 and 24 hours.');
    }
    return this.callRepo.addCallRecord({
      ownerUserId,
      otherUser,
      type,
      direction,
      status: direction === 'missed' ? 'missed' : 'completed',
      startedAt: Date.now() - durationSeconds * 1000,
      durationSeconds,
    });
  }

  async clearHistory(userId: string): Promise<void> {
    return this.callRepo.clearCallHistory(userId);
  }
}
