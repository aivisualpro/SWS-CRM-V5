<script setup lang="ts">
import type { SidebarMenuButtonVariants } from '~/components/ui/sidebar'
import type { NavLink } from '~/types/nav'
import type { TranslationKey } from '~/composables/useLocale'
import { useSidebar } from '~/components/ui/sidebar'

const props = withDefaults(defineProps<{
  item: NavLink
  size?: SidebarMenuButtonVariants['size']
}>(), {
  size: 'default',
})

const { setOpenMobile } = useSidebar()
const { t } = useLocale()
const route = useRoute()

const displayTitle = computed(() =>
  props.item.titleKey ? t(props.item.titleKey as TranslationKey) : props.item.title,
)

// Active detection: exact match, or prefix match only for single-segment root links
const isActive = computed(() => {
  const currentPath = route.path
  const linkPath = props.item.link
  if (!linkPath) return false
  // Exact match always wins
  if (currentPath === linkPath) return true
  const segments = linkPath.split('/').filter(Boolean)
  // For single-segment links like /finances — match /finances/*
  if (segments.length === 1) {
    return currentPath.startsWith(linkPath + '/')
  }
  // For multi-segment links (e.g. /reports/financial) — exact match only
  return false
})
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton as-child :tooltip="displayTitle" :size="size" :data-active="isActive">
        <NuxtLink :to="item.link" @click="setOpenMobile(false)">
          <Icon :name="item.icon || ''" />
          <span>{{ displayTitle }}</span>
          <span v-if="item.new" class="rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs text-black leading-none no-underline group-hover:no-underline">
            New
          </span>
        </NuxtLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
