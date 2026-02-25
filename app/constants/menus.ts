import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
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
    heading: 'General',
    headingKey: 'nav.general',
    items: [
      {
        title: 'Dashboard',
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
        title: 'Events',
        icon: 'i-lucide-calendar-days',
        link: '/events/calendar',
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
    heading: 'Sales & Commerce',
    headingKey: 'nav.salesCommerce',
    items: [
      {
        title: 'Invoices',
        titleKey: 'nav.invoices',
        icon: 'i-lucide-receipt',
        link: '/sales/invoices',
      },
    ],
  },
  {
    heading: 'Finance & Accounting',
    headingKey: 'nav.financeAccounting',
    items: [
      {
        title: 'Accounts',
        titleKey: 'nav.accounts',
        icon: 'i-lucide-wallet',
        link: '/finance/accounts',
      },
      {
        title: 'Transactions',
        titleKey: 'nav.transactions',
        icon: 'i-lucide-arrow-right-left',
        link: '/finance/transactions',
      },
      {
        title: 'Expenses',
        titleKey: 'nav.expenses',
        icon: 'i-lucide-credit-card',
        link: '/finance/expenses',
      },
      {
        title: 'Tax Management',
        titleKey: 'nav.taxManagement',
        icon: 'i-lucide-percent',
        link: '/finance/taxes',
      },
      {
        title: 'Balance Sheet',
        titleKey: 'nav.balanceSheet',
        icon: 'i-lucide-landmark',
        link: '/finance/balance-sheet',
      },
      {
        title: 'Income Statement',
        titleKey: 'nav.incomeStatement',
        icon: 'i-lucide-receipt',
        link: '/finance/income-statement',
      },
      {
        title: 'Financial Ratios',
        titleKey: 'nav.financialRatios',
        icon: 'i-lucide-chart-no-axes-combined',
        link: '/finance/ratios',
      },
      {
        title: 'Business Health',
        titleKey: 'nav.businessHealth',
        icon: 'i-lucide-heart-pulse',
        link: '/finance/business-health',
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
      {
        title: 'Knowledge Base',
        titleKey: 'nav.knowledgeBase',
        icon: 'i-lucide-book-open',
        link: '/support/knowledge-base',
      },
      {
        title: 'Live Chat',
        titleKey: 'nav.liveChat',
        icon: 'i-lucide-message-circle',
        link: '/support/chat',
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
    ],
  },
]

export const navMenuBottom: NavMenuItems = [
  {
    title: 'Help & Support',
    titleKey: 'nav.helpSupport',
    icon: 'i-lucide-circle-help',
    link: '/docs',
  },
  {
    title: 'Feedback',
    titleKey: 'nav.feedback',
    icon: 'i-lucide-send',
    link: '/docs',
  },
]
