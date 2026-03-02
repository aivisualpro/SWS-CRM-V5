import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    headingKey: 'nav.general',
    items: [
      {
        title: 'Home',
        titleKey: 'nav.dashboard',
        icon: 'i-lucide-layout-dashboard',
        link: '/',
      },
      {
        title: 'Notifications',
        icon: 'i-lucide-bell',
        link: '/notifications',
      },
    ],
  },
  {
    heading: 'Administration',
    headingKey: 'nav.administration',
    items: [
      {
        title: 'Users',
        titleKey: 'nav.users',
        icon: 'i-lucide-user-cog',
        link: '/admin/users',
      },
      {
        title: 'Roles & Permissions',
        titleKey: 'nav.rolesPermissions',
        icon: 'i-lucide-shield-check',
        link: '/admin/roles',
      },
    ],
  },
  {
    heading: 'Project Management',
    headingKey: 'nav.projectManagement',
    items: [
      {
        title: 'Customers',
        titleKey: 'nav.customers',
        icon: 'i-lucide-users',
        link: '/customers',
      },
      {
        title: 'Projects',
        titleKey: 'nav.projects',
        icon: 'i-lucide-folder-kanban',
        children: [
          {
            title: 'All Projects',
            link: '/projects/all-projects',
          },
          {
            title: 'My Open Projects',
            link: '/projects/my-open',
          },
          {
            title: 'My Closed Projects',
            link: '/projects/my-closed',
          },
          {
            title: 'My Cancelled Projects',
            link: '/projects/my-cancelled',
          },
          {
            title: 'Permit Dashboard',
            link: '/projects/permit-dashboard',
          },
          {
            title: 'Projects Dashboard',
            link: '/projects/projects-dashboard',
          },
          {
            title: 'RTF Today',
            link: '/projects/rtf-today',
          },
          {
            title: 'Engineers Dashboard',
            link: '/projects/engineers-dashboard',
          },
          {
            title: 'PTO & Meterspot Dashboard',
            link: '/projects/pto-meterspot',
          },
        ],
      },
      {
        title: 'Permits',
        icon: 'i-lucide-clipboard-check',
        link: '/permits',
      },
      {
        title: 'Document Requests',
        icon: 'i-lucide-file-search',
        link: '/document-requests',
      },
      {
        title: 'Finances',
        icon: 'i-lucide-banknote',
        link: '/finances',
      },
      {
        title: 'Payments',
        icon: 'i-lucide-credit-card',
        link: '/payments',
      },
      {
        title: 'Events',
        icon: 'i-lucide-calendar-days',
        link: '/events/calendar',
      },
      {
        title: 'Project Chat',
        icon: 'i-lucide-message-circle',
        link: '/project-chats',
      },
      {
        title: 'Tasks',
        titleKey: 'nav.tasks',
        icon: 'i-lucide-calendar-check-2',
        link: '/tasks',
      },
      {
        title: 'Notes',
        icon: 'i-lucide-sticky-note',
        link: '/notes',
      },
      {
        title: 'Tickets',
        icon: 'i-lucide-ticket',
        link: '/project-tickets',
      },
      {
        title: 'Vendors',
        icon: 'i-lucide-building-2',
        link: '/vendors',
      },
      {
        title: 'Sales Reps',
        icon: 'i-lucide-user-round-search',
        link: '/sales-reps',
      },
    ],
  },
  // Kanban Board hidden from sidebar — component preserved at /kanban
  {
    heading: 'Reports',
    headingKey: 'nav.reports',
    items: [
      {
        title: 'Sales Reports',
        titleKey: 'nav.salesReports',
        icon: 'i-lucide-trending-up',
        link: '/reports/sales',
      },
      {
        title: 'Financial Reports',
        titleKey: 'nav.financialReports',
        icon: 'i-lucide-pie-chart',
        link: '/reports/financial',
      },
      {
        title: 'Ready To Fund Report',
        icon: 'i-lucide-badge-dollar-sign',
        link: '/reports/ready-to-fund',
      },
      {
        title: 'General Report',
        icon: 'i-lucide-clipboard-list',
        link: '/reports/general',
      },
      {
        title: 'PM Weekly Report',
        icon: 'i-lucide-calendar-range',
        link: '/reports/pm-weekly',
      },
      {
        title: 'Permits Report',
        icon: 'i-lucide-stamp',
        link: '/reports/permit',
      },
      {
        title: 'Documents Requested',
        icon: 'i-lucide-file-search',
        link: '/reports/documents-requested',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = [
  {
    title: 'Support',
    icon: 'i-lucide-life-buoy',
    link: '/support/tickets',
  },
  {
    title: 'Remote Assistance',
    icon: 'i-lucide-circle-help',
    link: '/remote-assistance',
  },
]
