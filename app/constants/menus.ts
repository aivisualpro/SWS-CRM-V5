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
      {
        title: 'Dropdowns',
        icon: 'i-lucide-list-collapse',
        link: '/admin/dropdowns',
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
            title: 'Open Projects',
            link: '/projects/my-open',
          },
          {
            title: 'Closed Projects',
            link: '/projects/my-closed',
          },
          {
            title: 'Cancelled Projects',
            link: '/projects/my-cancelled',
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
        children: [
          {
            title: 'Events Calendar',
            link: '/events/calendar',
          },
          {
            title: 'Install Calendar',
            link: '/events/install-calendar',
          },
          {
            title: 'Tech Calendar',
            link: '/events/tech-calendar',
          },
          {
            title: 'SSA Calendar',
            link: '/events/ssa-calendar',
          },
          {
            title: 'Events Dashboard',
            link: '/events/dashboard',
          },
          {
            title: 'Archive Calendar',
            link: '/events/archive',
          },
          {
            title: 'Events Without Projects',
            link: '/events/without-projects',
          },
        ],
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
        title: 'Finance',
        icon: 'i-lucide-pie-chart',
        link: '/reports/financial',
      },
      {
        title: 'RTF',
        icon: 'i-lucide-badge-dollar-sign',
        link: '/reports/ready-to-fund',
      },
      {
        title: 'General',
        icon: 'i-lucide-clipboard-list',
        link: '/reports/general',
      },
      {
        title: 'PM Weekly',
        icon: 'i-lucide-calendar-range',
        link: '/reports/pm-weekly',
      },
      {
        title: 'Permits',
        icon: 'i-lucide-stamp',
        link: '/reports/permit',
      },
      {
        title: 'Document Requested',
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
