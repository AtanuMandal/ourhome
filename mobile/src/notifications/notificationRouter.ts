import type * as Notifications from 'expo-notifications';
import { visitorsApi } from '../api/endpoints/visitors';

type NavigationRef = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

export function routeNotification(
  response: Notifications.NotificationResponse,
  navigation: NavigationRef,
  societyId: string
): void {
  const data = response.notification.request.content.data as Record<string, string>;
  const actionId = response.actionIdentifier;

  if (data['type'] === 'visitor' && actionId === 'APPROVE' && data['visitorId']) {
    void visitorsApi.approveVisitor(societyId, data['visitorId']);
    return;
  }

  if (data['type'] === 'visitor' && actionId === 'DENY' && data['visitorId']) {
    void visitorsApi.denyVisitor(societyId, data['visitorId']);
    return;
  }

  if (data['visitorId']) {
    navigation.navigate('Visitors', { screen: 'VisitorDetail', params: { id: data['visitorId'] } });
    return;
  }

  if (data['chargeId']) {
    navigation.navigate('Maintenance', { screen: 'ChargeDetail', params: { id: data['chargeId'] } });
    return;
  }

  if (data['noticeId']) {
    navigation.navigate('Notices', { screen: 'NoticeDetail', params: { id: data['noticeId'] } });
    return;
  }

  if (data['complaintId']) {
    navigation.navigate('Complaints', { screen: 'ComplaintDetail', params: { id: data['complaintId'] } });
  }
}
