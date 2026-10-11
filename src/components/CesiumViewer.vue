<template>
  <div ref="cesiumContainer" class="cesium-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Configure Cesium Ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1OTAzZDE1Ni1mMTdiLTRlMTAtOGFiMS03YzFhODFiMjNhNmMiLCJpZCI6NDM4ODc5LCJzdWIiOiJZdWthdGEiLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoiVW50aXRsZWQiLCJpYXQiOjE3ODAzMDE2NTJ9.XQU11ngfhaxYfkDWq0foev-jBIDCF8mjqEF45e6-zIg';

const cesiumContainer = ref(null);
let viewer = null;

// Region 11 (Davao Region) center coordinates
const REGION_11_CENTER = {
  longitude: 125.80,
  latitude: 6.95,
  height: 50000 // Initial camera height in meters (50km for overview)
};

onMounted(() => {
  if (!cesiumContainer.value) return;

  // Initialize Cesium Viewer with terrain and imagery
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    terrainProvider: Cesium.createWorldTerrain(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false,
    infoBox: false,
    selectionIndicator: false
  });

  // Enable lighting based on sun position
  viewer.scene.globe.enableLighting = true;

  // Set initial camera view to Region 11 (Davao Region)
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      REGION_11_CENTER.longitude,
      REGION_11_CENTER.latitude,
      REGION_11_CENTER.height
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    },
    duration: 0
  });

  console.log('[CesiumViewer] Initialized for Region 11 (Davao Region) with Cesium Ion terrain');
});

onUnmounted(() => {
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});

// Expose viewer instance for parent components
defineExpose({
  viewer
});
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

:deep(.cesium-viewer-bottom) {
  display: none;
}

:deep(.cesium-viewer-toolbar) {
  display: none;
}
</style>
