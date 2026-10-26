/**
 * 8ATE - Authentication & User Service
 * 
 * Clean authentication abstraction with development simulation mechanism.
 * Does NOT pretend simulated OTP is production OTP.
 * Does NOT require paid SMS or external billing.
 * Private phone numbers are never returned in public profile queries.
 */

import { UserProfile, PrivateAccountInfo, GhanaRegion } from '../types';
import { IAuthRepository } from '../repositories/interfaces';
import { LocalAuthRepository } from '../repositories/localStorageRepository';
import { normalizeGhanaPhone } from '../utils/phone';
import { isSecureHttpsUrl } from '../utils/secureUrl';

export interface RegisterParams {
  phoneNumber: string; // e.g. "+233 24 123 4567"
  username: string; // e.g. "kwame"
  displayName: string; // e.g. "Kwame Owusu"
  region: GhanaRegion;
  city: string;
  bio?: string;
  avatarUrl?: string;
}

export class AuthService {
  private authRepo: IAuthRepository;

  constructor(authRepo: IAuthRepository = new LocalAuthRepository()) {
    this.authRepo = authRepo;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const currentId = this.authRepo.getCurrentUserId();
    if (!currentId) return null;
    return this.authRepo.getUserProfile(currentId);
  }

  async getPrivateAccountInfo(): Promise<PrivateAccountInfo | null> {
    const currentId = this.authRepo.getCurrentUserId();
    if (!currentId) return null;
    return this.authRepo.getPrivateAccountInfo(currentId);
  }

  /**
   * Register a new Ghanaian user account.
   * Validates case-insensitive username uniqueness at data/service layer.
   */
  async register(params: RegisterParams): Promise<{ user: UserProfile; privateInfo: PrivateAccountInfo }> {
    const cleanUsername = params.username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 24) {
      throw new Error('Username must be between 3 and 24 characters long.');
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      throw new Error('Username can only contain letters, numbers, and underscores.');
    }

    // Check username collision (case-insensitive)
    const existing = await this.authRepo.getUserByUsername(cleanUsername);
    if (existing) {
      throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
    }

    const cleanPhone = normalizeGhanaPhone(params.phoneNumber);

    const defaultAvatar = params.avatarUrl?.trim() || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`;
    if (!isSecureHttpsUrl(defaultAvatar)) throw new Error('Avatar images must use a valid secure HTTPS URL.');

    const result = await this.authRepo.createUser(
      {
        username: cleanUsername,
        displayName: params.displayName.trim() || cleanUsername,
        avatarUrl: defaultAvatar,
        bio: params.bio?.trim() || `Living in ${params.city}, ${params.region} 🇬🇭`,
        region: params.region,
        city: params.city,
      },
      {
        phoneNumber: cleanPhone,
      }
    );

    return result;
  }

  /**
   * Development Phone Authentication (Simulated).
   * Note: This is an explicit dev authentication abstraction without paid SMS charges.
   */
  async devLoginWithPhone(phoneNumber: string): Promise<UserProfile> {
    const user = await this.authRepo.getUserByPhone(phoneNumber);
    if (!user) {
      throw new Error(
        `No account found with phone ${phoneNumber}. In development mode, choose an existing demo account or register a new one.`
      );
    }
    await this.authRepo.setCurrentUserId(user.id);
    return user;
  }

  /**
   * Quick development user switch (useful for testing two-way chats & walls).
   */
  async devSwitchUser(userId: string): Promise<UserProfile> {
    const user = await this.authRepo.getUserProfile(userId);
    if (!user) throw new Error('User not found');
    await this.authRepo.setCurrentUserId(user.id);
    return user;
  }

  async logout(): Promise<void> {
    await this.authRepo.setCurrentUserId(null);
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const currentId = this.authRepo.getCurrentUserId();
    if (!currentId) throw new Error('Not authenticated');
    return this.authRepo.updateUserProfile(currentId, updates);
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.authRepo.getAllUsers();
  }

  async checkUsernameAvailable(username: string): Promise<boolean> {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return false;
    const existing = await this.authRepo.getUserByUsername(clean);
    return !existing;
  }
}
