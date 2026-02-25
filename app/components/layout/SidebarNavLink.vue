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

// Prefix-based active detection: highlights when current route is under the link's section
const isActive = computed(() => {
  const currentPath = route.path
  const linkPath = props.item.link
  if (!linkPath) return false
  // Exact match
  if (currentPath === linkPath) return true
  // For links like /finances — match /finances and /finances/*
  const segments = linkPath.split('/').filter(Boolean)
  if (segments.length === 1) {
    return currentPath === linkPath || currentPath.startsWith(linkPath + '/')
  }
  // For links like /projects/all-projects — match any /projects/* route
  if (segments.length >= 2) {
    const basePath = `/${segments[0]}`
    return currentPath.startsWith(basePath + '/')
  }
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
