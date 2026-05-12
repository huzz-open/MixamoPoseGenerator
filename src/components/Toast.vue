<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { items } = useToast()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="toast-item"
        :class="item.type"
      >
        {{ item.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: rgba(30, 30, 30, 0.92);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  white-space: nowrap;
}
.toast-item.error { background: rgba(220, 50, 50, 0.92); }
.toast-item.warning { background: rgba(200, 140, 20, 0.92); }
.toast-item.success { background: rgba(40, 160, 70, 0.92); }
.toast-enter-active { transition: all 0.25s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(-12px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
