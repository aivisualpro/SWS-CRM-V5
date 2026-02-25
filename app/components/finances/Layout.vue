<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  activeFilter: string
  companies: string[]
}>()

const emit = defineEmits<{
  'update:activeFilter': [filter: string]
}>()

const allFilters = computed(() => [
  { key: '', label: 'All Finances', icon: 'i-lucide-banknote' },
  ...props.companies.map(c => ({
    key: c,
    label: c,
    icon: 'i-lucide-building-2',
  })),
])
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex">
    <!-- Sub-sidebar -->
    <div class="w-[220px] shrink-0 border-r bg-card/50 flex flex-col min-h-0 overflow-y-auto">
      <div class="px-3 pt-3 pb-1">
        <p class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Finance Company</p>
      </div>
      <nav class="flex flex-col gap-0.5 p-2">
        <button
          v-for="f in allFilters"
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
