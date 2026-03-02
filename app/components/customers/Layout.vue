<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  activeFilter?: string
}>()

const emit = defineEmits<{
  'update:activeFilter': [filter: string]
}>()

const filters = [
  { key: '', label: 'All', icon: 'i-lucide-users' },
  { key: 'this-week', label: 'This Week', icon: 'i-lucide-calendar-days' },
  { key: 'this-month', label: 'This Month', icon: 'i-lucide-calendar' },
  { key: 'last-month', label: 'Last Month', icon: 'i-lucide-calendar-minus' },
  { key: 'this-quarter', label: 'This Quarter', icon: 'i-lucide-calendar-range' },
  { key: 'this-year', label: 'This Year', icon: 'i-lucide-calendar-check' },
  { key: 'last-year', label: 'Last Year', icon: 'i-lucide-calendar-clock' },
]
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex flex-col">
    <!-- Tabs bar -->
    <div v-if="activeFilter !== undefined" class="shrink-0 border-b bg-card/50 px-4 pt-2">
      <div class="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        <button
          v-for="f in filters"
          :key="f.key"
          :class="cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-150 border-b-2 -mb-px',
            activeFilter === f.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
          )"
          @click="emit('update:activeFilter', f.key)"
        >
          <Icon :name="f.icon" class="size-3.5 shrink-0" />
          <span>{{ f.label }}</span>
        </button>
      </div>
    </div>

    <!-- Content area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
