import { useNotificationStore } from '../store/notificationStore';

export function useNotifications() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const pushToken = useNotificationStore((s) => s.expoPushToken);

  return { unreadCount, pushToken };
}
