<template>
  <transition name="fade">
    <div v-if="visible" class="catch-popup glass-card">
      <h3 class="catch-title">You caught {{ total }} fish!</h3>
      <div class="catch-list">
        <div v-for="(fish, idx) in fishList" :key="idx" class="fish-card">
          <img :src="fish.image" :alt="fish.commonName" class="catch-image" />
          <p class="catch-common">{{ fish.commonName }}</p>
          <p class="catch-scientific">{{ fish.scientificName }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  fishList: {
    type: Array,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  visible: {
    type: Boolean,
    required: true
  }
});
</script>

<style scoped>
.catch-popup {
  position: fixed;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  min-width: 300px;
  max-width: 500px;
  max-height: 80vh;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  color: #fff;
  text-align: center;
  z-index: 2000;
  overflow: hidden;
}
.catch-title {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 600;
}
.catch-list {
  max-height: 60vh;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.fish-card {
  background: rgba(255,255,255,0.08);
  padding: 0.5rem;
  border-radius: 8px;
  text-align: center;
}
.catch-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}
.catch-common {
  font-weight: 500;
  margin: 0;
}
.catch-scientific {
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.8;
  margin: 0;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
