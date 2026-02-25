<script setup lang="ts">
</script>

<template>
  <SidebarProvider>
    <LayoutAppSidebar />
    <SidebarInset>
      <LayoutHeader />
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div class="@container/main flex-1 min-h-0 p-4 flex flex-col">
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped>

</style>
