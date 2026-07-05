import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { profileApi } from '../api/endpoints/profile';
import { routeNotification } from './notificationRouter';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationProviderProps {
  children: React.ReactNode;
  navigationRef?: React.RefObject<{
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  }>;
}

export function NotificationProvider({
  children,
  navigationRef,
}: NotificationProviderProps) {
  const user = useAuthStore((s) => s.user);
  const { setPushToken, incrementUnread } = useNotificationStore();

  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    async function register(): Promise<void> {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Notifications.setNotificationCategoryAsync('VISITOR_REQUEST', [
        {
          identifier: 'APPROVE',
          buttonTitle: 'Approve',
          options: { isDestructive: false, isAuthenticationRequired: false },
        },
        {
          identifier: 'DENY',
          buttonTitle: 'Deny',
          options: { isDestructive: true, isAuthenticationRequired: false },
        },
      ]);

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'ourhome-project-id',
        });
        const token = tokenData.data;
        setPushToken(token);

        if (user) {
          const platform = Platform.OS === 'ios' ? 'ios' : 'android';
          await profileApi.registerMobilePushToken(
            user.societyId,
            user.id,
            platform,
            token
          );
        }
      } catch {
        // push token registration is best-effort
      }
    }

    void register();

    receivedSub.current = Notifications.addNotificationReceivedListener(() => {
      incrementUnread();
    });

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (navigationRef?.current && user) {
          routeNotification(response, navigationRef.current, user.societyId);
        }
      }
    );

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [user, setPushToken, incrementUnread, navigationRef]);

  return <>{children}</>;
}
