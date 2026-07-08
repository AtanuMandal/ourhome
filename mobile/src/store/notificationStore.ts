import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  expoPushToken: string | null;
}

interface NotificationActions {
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
  setPushToken: (token: string) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>((set) => ({
  unreadCount: 0,
  expoPushToken: null,
  setUnreadCount: (n) => set({ unreadCount: n }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  setPushToken: (token) => set({ expoPushToken: token }),
}));
