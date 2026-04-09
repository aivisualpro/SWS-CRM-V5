<script setup lang="ts">
const props = defineProps<{
  roles?: (string | { name: string, count: number })[]
  activeRole?: string
  totalCount?: number
}>()

const emit = defineEmits<{
  'update:activeRole': [role: string]
}>()

const route = useRoute()

const staticTabs = [
  { key: '', label: 'All Users', href: '/admin/users' },
]
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex flex-col">
    <!-- Horizontal tabs bar -->
    <div class="shrink-0 border-b px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
      <!-- Static tabs -->
      <NuxtLink
        v-for="tab in staticTabs"
        :key="tab.key"
        :to="tab.href"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
        :class="route.path === tab.href && !activeRole ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        @click="emit('update:activeRole', '')"
      >
        {{ tab.label }}
        <span v-if="totalCount !== undefined" class="ml-1 opacity-60 text-[10px] bg-background/40 px-1.5 py-0.5 rounded-full">{{ totalCount }}</span>
      </NuxtLink>

      <!-- Separator -->
      <div v-if="roles && roles.length > 0" class="w-px h-5 bg-border shrink-0 mx-1" />

      <!-- Role filter tabs -->
      <button
        v-for="role in roles"
        :key="typeof role === 'string' ? role : role.name"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
        :class="activeRole === (typeof role === 'string' ? role : role.name) ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        @click="emit('update:activeRole', activeRole === (typeof role === 'string' ? role : role.name) ? '' : (typeof role === 'string' ? role : role.name))"
      >
        {{ typeof role === 'string' ? role : role.name }}
        <span v-if="typeof role !== 'string' && role.count !== undefined" class="ml-1 opacity-60 text-[10px] bg-background/40 px-1.5 py-0.5 rounded-full">{{ role.count }}</span>
      </button>
    </div>

    <!-- Content area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
