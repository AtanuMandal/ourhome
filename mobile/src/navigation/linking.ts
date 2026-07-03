import type { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: ['ourhome://'],
  config: {
    screens: {
      App: {
        screens: {
          Visitors: { screens: { VisitorDetail: 'visitors/:id' } },
          Maintenance: { screens: { ChargeDetail: 'maintenance/charges/:id' } },
          Notices: { screens: { NoticeDetail: 'notices/:id' } },
          Complaints: { screens: { ComplaintDetail: 'complaints/:id' } },
        },
      },
    },
  },
};
