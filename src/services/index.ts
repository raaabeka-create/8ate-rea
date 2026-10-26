/**
 * 8ATE - Unified Service Locator / Exports
 */

import { AuthService } from './authService';
import { ChatService } from './chatService';
import { WallService } from './wallService';
import { HubService } from './hubService';
import { DiscoverService } from './discoverService';
import { CallService } from './callService';
import { SafetyService } from './safetyService';
import { NotificationService } from './notificationService';
import { SearchService } from './searchService';

export const authService = new AuthService();
export const chatService = new ChatService();
export const wallService = new WallService();
export const hubService = new HubService();
export const discoverService = new DiscoverService();
export const callService = new CallService();
export const safetyService = new SafetyService();
export const notificationService = new NotificationService();
export const searchService = new SearchService();

export * from './authService';
export * from './chatService';
export * from './wallService';
export * from './hubService';
export * from './discoverService';
export * from './callService';
export * from './safetyService';
export * from './notificationService';
export * from './searchService';
