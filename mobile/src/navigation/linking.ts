import type { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: ['ourhome://'],
  config: {
    screens: {
      Dashboard:       'dashboard',
      Visitors: {
        screens: {
          VisitorList:     'visitors',
          VisitorDetail:   'visitors/:id',
          VisitorRegister: 'visitors/new',
        },
      },
      Notices: {
        screens: {
          NoticeList:   'notices',
          NoticeDetail: 'notices/:id',
        },
      },
      Complaints: {
        screens: {
          ComplaintList:   'complaints',
          ComplaintCreate: 'complaints/new',
        },
      },
      Maintenance:     'maintenance',
      FinancialReport: 'financial-report',
      VendorPayments:  'vendor-payments',
      Amenities:       'amenities',
      Profile:         'profile',
    },
  },
};
