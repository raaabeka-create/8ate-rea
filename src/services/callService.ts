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
    otherUser: UserProfile,
    type: CallType,
    direction: 'incoming' | 'outgoing' | 'missed',
    durationSeconds: number
  ): Promise<CallRecord> {
    return this.callRepo.addCallRecord({
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
