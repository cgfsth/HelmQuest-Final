<template>
  <transition name="fade">
    <div v-if="inventoryVisible" class="inventory-wrapper" @click.self="toggleInventory">
      <div class="inventory-modal glass-card">
        <button class="close-btn" @click="toggleInventory">✖</button>
        <h3 class="inventory-title">Your Fish Inventory ({{ totalFish }} fish, {{ uniqueSpecies }} species)</h3>
        
        <div class="sort-controls">
          <button 
            @click="sortBy = 'quantity'" 
            :class="{ active: sortBy === 'quantity' }"
            class="sort-btn"
          >
            Sort by Quantity
          </button>
          <button 
            @click="sortBy = 'name'" 
            :class="{ active: sortBy === 'name' }"
            class="sort-btn"
          >
            Sort by Name
          </button>
        </div>
        
        <div class="inventory-list">
          <div v-for="group in sortedGroups" :key="group.name" class="fish-card">
            <div class="fish-quantity-badge">x{{ group.count }}</div>
            <img :src="group.image" :alt="group.name" class="fish-image" />
            <p class="fish-common">{{ group.name }}</p>
            <p class="fish-scientific">{{ group.scientific }}</p>
          </div>
        </div>
        
        <div v-if="totalFish === 0" class="empty-state">
          <p>No fish caught yet. Start fishing!</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { inject, computed, ref } from 'vue';

const inventoryVisible = inject('inventoryVisible');
const inventoryItems = inject('inventoryItems');
const sortBy = ref('quantity');

// Group fish by species
const groupedFish = computed(() => {
  const groups = {};
  
  inventoryItems.value.forEach(fish => {
    if (!groups[fish.name]) {
      groups[fish.name] = {
        name: fish.name,
        scientific: fish.scientific,
        image: fish.image,
        count: 0
      };
    }
    groups[fish.name].count++;
  });
  
  return Object.values(groups);
});

// Sort grouped fish
const sortedGroups = computed(() => {
  const groups = [...groupedFish.value];
  
  if (sortBy.value === 'quantity') {
    return groups.sort((a, b) => b.count - a.count);
  } else {
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }
});

// Statistics
const totalFish = computed(() => inventoryItems.value.length);
const uniqueSpecies = computed(() => groupedFish.value.length);

const toggleInventory = () => {
  if (window.toggleInventory) window.toggleInventory();
};
</script>

<style scoped>
.inventory-modal {
  position: relative;
  min-width: 320px;
  max-width: 600px;
  max-height: 80vh;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  color: #fff;
  z-index: 2001;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.inventory-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
}
.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
.close-btn:hover {
  opacity: 0.7;
}
.inventory-title {
  margin: 0 0 1rem;
  font-size: 1.4rem;
  font-weight: 600;
}
.sort-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.sort-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.sort-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
.sort-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #3b82f6;
}
.inventory-list {
  max-height: 60vh;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.fish-card {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.5rem;
  border-radius: 8px;
  text-align: center;
}
.fish-quantity-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 1;
}
.fish-image {
  max-width: 100%;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}
.fish-common {
  font-weight: 500;
  margin: 0;
}
.fish-scientific {
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.8;
  margin: 0;
}
.empty-state {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
