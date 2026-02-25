<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({ title: 'Tech Calendar', icon: 'i-lucide-wrench' })
</script>

<template>
  <EventsLayout>
    <div class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center space-y-2">
        <Icon name="i-lucide-wrench" class="size-10 mx-auto opacity-40" />
        <p class="text-sm font-medium">Tech Calendar</p>
        <p class="text-xs">Coming soon</p>
      </div>
    </div>
  </EventsLayout>
</template>
