<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  activeFilter?: string
}>()

const emit = defineEmits<{
  'update:activeFilter': [filter: string]
}>()

const filters = [
  { key: '', label: 'All Customers', icon: 'i-lucide-users' },
  { key: 'this-week', label: 'This Week', icon: 'i-lucide-calendar-days' },
  { key: 'this-month', label: 'This Month', icon: 'i-lucide-calendar' },
  { key: 'last-month', label: 'Last Month', icon: 'i-lucide-calendar-minus' },
  { key: 'this-quarter', label: 'This Quarter', icon: 'i-lucide-calendar-range' },
  { key: 'this-year', label: 'This Year', icon: 'i-lucide-calendar-check' },
  { key: 'last-year', label: 'Last Year', icon: 'i-lucide-calendar-clock' },
]
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex">
    <!-- Sub-sidebar -->
    <div class="w-[220px] shrink-0 border-r bg-card/50 flex flex-col min-h-0 overflow-y-auto">
      <nav class="flex flex-col gap-0.5 p-2">
        <button
          v-for="f in filters"
          :key="f.key"
          :class="cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full text-left',
            activeFilter === f.key
              ? 'bg-primary/10 text-primary font-medium shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )"
          @click="emit('update:activeFilter', f.key)"
        >
          <Icon :name="f.icon" class="size-4 shrink-0" />
          <span class="truncate">{{ f.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Content area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
