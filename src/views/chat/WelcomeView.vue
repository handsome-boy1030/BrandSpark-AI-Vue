<template>
  <div class="welcome-view">
    <h1 class="welcome-title">您今天想做什么？</h1>
  </div>
</template>

<script setup>
</script>

<style scoped>
.welcome-view {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
}
</style>