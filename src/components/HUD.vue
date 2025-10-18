<template>
  <div class="hud">
    <div class="hud-row">
      <div class="hud-item">
        <span class="label">Score:</span>
        <span class="value">{{ score }}</span>
      </div>
      <div class="hud-item">
        <span class="label">Best:</span>
        <span class="value">{{ bestScore }}</span>
      </div>
      <div class="hud-item">
        <span class="label">Time:</span>
        <span class="value">{{ formatTime(timeLeft) }}</span>
      </div>
    </div>
    
    <div class="hud-row">
      <div class="hud-item">
        <span class="label">Level:</span>
        <span class="value">{{ difficulty.charAt(0).toUpperCase() + difficulty.slice(1) }}</span>
      </div>
      <div class="hud-item">
        <span class="label">Length:</span>
        <span class="value">{{ length }}/{{ targetLength }}</span>
      </div>
      <div class="hud-item">
        <span class="label">Streak:</span>
        <span class="value">{{ streak }}</span>
      </div>
    </div>
    
    <div class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress * 100}%` }"
        ></div>
      </div>
      <div class="progress-label">
        Progress: {{ Math.floor(progress * 100) }}%
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'HUD',
  computed: {
    ...mapState(['score', 'bestScore', 'timeLeft', 'difficulty', 'streak']),
    ...mapGetters(['length', 'progress']),
    
    targetLength() {
      return Math.floor(this.$store.state.gridSize * this.$store.state.gridSize * 0.3)
    }
  },
  methods: {
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.hud {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 10px;
  min-width: 600px;
  margin-bottom: 1rem;
}

.hud-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.hud-row:last-of-type {
  margin-bottom: 1rem;
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1.2rem;
  font-weight: bold;
}

.progress-container {
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #20c997);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.progress-label {
  font-size: 0.9rem;
  opacity: 0.8;
}
</style>
