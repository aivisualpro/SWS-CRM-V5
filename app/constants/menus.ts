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
        title: 'Customers',
        titleKey: 'nav.customers',
        icon: 'i-lucide-users',
        link: '/customers',
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
        title: 'Projects',
        titleKey: 'nav.projects',
        icon: 'i-lucide-folder-kanban',
        link: '/projects/all-projects',
      },
      {
        title: 'Finances',
        icon: 'i-lucide-banknote',
        link: '/finances',
      },
      {
        title: 'Events',
        icon: 'i-lucide-calendar-days',
        link: '/events/calendar',
      },
      {
        title: 'Chat',
        titleKey: 'nav.liveChat',
        icon: 'i-lucide-message-circle',
        link: '/projects/chat',
      },
      {
        title: 'Tasks',
        titleKey: 'nav.tasks',
        icon: 'i-lucide-calendar-check-2',
        link: '/tasks',
      },
    ],
  },
  {
    heading: 'Apps',
    headingKey: 'nav.apps',
    items: [
      {
        title: 'Kanban Board',
        titleKey: 'nav.kanbanBoard',
        icon: 'i-lucide-kanban',
        link: '/kanban',
      },
      {
        title: 'Gantt Chart',
        titleKey: 'nav.ganttChart',
        icon: 'i-lucide-gantt-chart',
        link: '/gantt',
      },
    ],
  },


  {
    heading: 'Support',
    headingKey: 'nav.support',
    items: [
      {
        title: 'Tickets',
        titleKey: 'nav.tickets',
        icon: 'i-lucide-ticket',
        link: '/support/tickets',
      },
    ],
  },
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
        title: 'HR Reports',
        titleKey: 'nav.hrReports',
        icon: 'i-lucide-file-bar-chart',
        link: '/reports/hr',
      },
      {
        title: 'Ready To Fund Report',
        icon: 'i-lucide-badge-dollar-sign',
        link: '/reports/ready-to-fund',
      },
      {
        title: 'Custom Reports',
        icon: 'i-lucide-file-sliders',
        link: '/reports/custom',
      },
      {
        title: 'Finance PTO Report',
        icon: 'i-lucide-calculator',
        link: '/reports/finance-pto',
      },
      {
        title: 'General Report',
        icon: 'i-lucide-clipboard-list',
        link: '/reports/general',
      },
      {
        title: 'Finance Report',
        icon: 'i-lucide-wallet',
        link: '/reports/finance',
      },
      {
        title: 'PM Weekly Report',
        icon: 'i-lucide-calendar-range',
        link: '/reports/pm-weekly',
      },
      {
        title: 'Permit / Document Report',
        icon: 'i-lucide-file-check',
        link: '/reports/permit-document',
      },
      {
        title: 'PTO Expire 1st Notification',
        icon: 'i-lucide-bell',
        link: '/reports/pto-expire-1st',
      },
      {
        title: 'PTO Expire 2nd Notification',
        icon: 'i-lucide-bell-ring',
        link: '/reports/pto-expire-2nd',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []
