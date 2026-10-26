/**
 * 8ATE - Notification Service
 */

import { AppNotification, NotificationType } from '../types';
import { INotificationRepository } from '../repositories/interfaces';
import { LocalNotificationRepository } from '../repositories/localStorageRepository';

export class NotificationService {
  private notifRepo: INotificationRepository;

  constructor(notifRepo: INotificationRepository = new LocalNotificationRepository()) {
    this.notifRepo = notifRepo;
  }

  async getNotifications(userId: string): Promise<AppNotification[]> {
    return this.notifRepo.getNotifications(userId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.notifRepo.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this.notifRepo.markAllAsRead(userId);
  }

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    targetUrl?: string,
    senderAvatar?: string
  ): Promise<AppNotification> {
    return this.notifRepo.addNotification({
      userId,
      type,
      title,
      body,
      targetUrl,
      isRead: false,
      senderAvatar,
    });
  }
}
