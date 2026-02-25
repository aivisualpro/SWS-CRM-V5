<script setup lang="ts">
import { cn } from '@/lib/utils'

const route = useRoute()

const tabs = [
  { title: 'Events Calendar', href: '/events/calendar', icon: 'i-lucide-calendar-days' },
  { title: 'Install Calendar', href: '/events/install-calendar', icon: 'i-lucide-hard-hat' },
  { title: 'Tech Calendar', href: '/events/tech-calendar', icon: 'i-lucide-wrench' },
  { title: 'SSA Calendar', href: '/events/ssa-calendar', icon: 'i-lucide-shield-check' },
  { title: 'Events Dashboard', href: '/events/dashboard', icon: 'i-lucide-layout-dashboard' },
  { title: 'Archive Calendar', href: '/events/archive', icon: 'i-lucide-archive' },
  { title: 'Events Without Projects', href: '/events/without-projects', icon: 'i-lucide-calendar-x' },
]
</script>

<template>
  <div class="w-full h-full flex min-h-0">
    <!-- Sub-sidebar -->
    <div class="w-[220px] shrink-0 border-r bg-card/50 flex flex-col min-h-0 overflow-y-auto">
      <nav class="flex flex-col gap-0.5 p-2">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.href"
          :to="tab.href"
          :class="cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
            route.path === tab.href
              ? 'bg-primary/10 text-primary font-medium shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )"
        >
          <Icon :name="tab.icon" class="size-4 shrink-0" />
          <span class="truncate">{{ tab.title }}</span>
        </NuxtLink>
      </nav>
    </div>

    <!-- Content area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
