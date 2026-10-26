/**
 * 8ATE - Safety, Reporting & Moderation Service
 */

import { ReportRequest, ReportTargetType, ReportReason, UserProfile } from '../types';
import { ISafetyRepository } from '../repositories/interfaces';
import { LocalSafetyRepository } from '../repositories/localStorageRepository';

export interface SubmitReportParams {
  targetType: ReportTargetType;
  targetId: string;
  targetSummary: string;
  reporterUserId: string;
  reason: ReportReason;
  details?: string;
}

export class SafetyService {
  private safetyRepo: ISafetyRepository;

  constructor(safetyRepo: ISafetyRepository = new LocalSafetyRepository()) {
    this.safetyRepo = safetyRepo;
  }

  async submitReport(params: SubmitReportParams): Promise<ReportRequest> {
    return this.safetyRepo.submitReport({
      targetType: params.targetType,
      targetId: params.targetId,
      targetSummary: params.targetSummary,
      reporterUserId: params.reporterUserId,
      reason: params.reason,
      details: params.details?.trim(),
    });
  }

  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    return this.safetyRepo.blockUser(currentUserId, targetUserId);
  }

  async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
    return this.safetyRepo.unblockUser(currentUserId, targetUserId);
  }

  async getBlockedUsers(currentUserId: string): Promise<UserProfile[]> {
    return this.safetyRepo.getBlockedUsers(currentUserId);
  }
}
