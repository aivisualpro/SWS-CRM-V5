<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  roles?: string[]
  activeRole?: string
}>()

const emit = defineEmits<{
  'update:activeRole': [role: string]
}>()

const route = useRoute()

const staticTabs = [
  { title: 'All Users', href: '/admin/users', icon: 'i-lucide-users' },
]
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex">
    <!-- Sub-sidebar -->
    <div class="w-[220px] shrink-0 border-r bg-card/50 flex flex-col min-h-0 overflow-y-auto">
      <nav class="flex flex-col gap-0.5 p-2">
        <!-- Static navigation tabs -->
        <NuxtLink
          v-for="tab in staticTabs"
          :key="tab.href"
          :to="tab.href"
          :class="cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
            route.path === tab.href && !activeRole
              ? 'bg-primary/10 text-primary font-medium shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )"
          @click="emit('update:activeRole', '')"
        >
          <Icon :name="tab.icon" class="size-4 shrink-0" />
          <span class="truncate">{{ tab.title }}</span>
        </NuxtLink>

        <!-- Dynamic role filters -->
        <template v-if="roles && roles.length > 0">
          <div class="mt-3 mb-1 px-3">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Filter by Role
            </span>
          </div>
          <button
            v-for="role in roles"
            :key="role"
            :class="cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full text-left',
              activeRole === role
                ? 'bg-primary/10 text-primary font-medium shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )"
            @click="emit('update:activeRole', activeRole === role ? '' : role)"
          >
            <Icon name="i-lucide-tag" class="size-3.5 shrink-0" />
            <span class="truncate">{{ role }}</span>
          </button>
        </template>

        <!-- Roles & Permissions link at the bottom -->
        <div class="mt-3 border-t pt-2">
          <NuxtLink
            to="/admin/roles"
            :class="cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              route.path === '/admin/roles'
                ? 'bg-primary/10 text-primary font-medium shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )"
          >
            <Icon name="i-lucide-shield-check" class="size-4 shrink-0" />
            <span class="truncate">Roles & Permissions</span>
          </NuxtLink>
        </div>
      </nav>
    </div>

    <!-- Content area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
