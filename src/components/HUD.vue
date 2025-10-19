<template>
  <div class="hud">
    <!-- Top Row: Main Stats -->
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
        <span class="label">{{ difficulty === 'survivor' ? 'Survival:' : 'Time:' }}</span>
        <span class="value">{{ difficulty === 'survivor' ? formatSurvivalTime : formatTime(timeLeft) }}</span>
      </div>
    </div>
    
    <!-- Second Row: Level, Length, Volume -->
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
        <span class="label">Volume:</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          :value="volume" 
          @input="setVolume"
          class="volume-slider"
          aria-label="Volume control"
        />
        <div class="volume-visual" :class="{ 'active': isSoundPlaying }">
          <div class="sound-wave" v-for="n in 5" :key="n" :style="{ '--delay': `${n * 0.1}s` }"></div>
        </div>
      </div>
    </div>
    
    <!-- Survivor Mode Components -->
    <div v-if="difficulty === 'survivor'" class="survivor-components">
      <div class="progress-container">
        <div class="stage-display">
          <div class="stage-label">Stage {{ currentStage }}</div>
          <div class="stage-progress">
            <div class="stage-bar">
              <div 
                class="stage-fill" 
                :style="{ width: `${((score % 200) / 200) * 100}%` }"
              ></div>
            </div>
            <div class="stage-text">{{ score % 200 }}/200 to next stage</div>
          </div>
        </div>
      </div>
      
      <!-- Border Status Indicator -->
      <div class="border-status">
        <div class="border-indicators">
          <div class="border-indicator" :class="{ 'blocked': currentBorders.top, 'pulsing': currentBorders.top && difficulty === 'survivor' }" title="Top Border">
            <span>↑</span>
          </div>
          <div class="border-indicator" :class="{ 'blocked': currentBorders.left, 'pulsing': currentBorders.left && difficulty === 'survivor' }" title="Left Border">
            <span>←</span>
          </div>
          <div class="border-indicator" :class="{ 'blocked': currentBorders.right, 'pulsing': currentBorders.right && difficulty === 'survivor' }" title="Right Border">
            <span>→</span>
          </div>
          <div class="border-indicator" :class="{ 'blocked': currentBorders.bottom, 'pulsing': currentBorders.bottom && difficulty === 'survivor' }" title="Bottom Border">
            <span>↓</span>
          </div>
        </div>
        <div class="border-label">Borders</div>
      </div>
    </div>

    <!-- Normal Mode Components (Easy, Medium, Hard) -->
    <div v-else class="normal-components">
      <!-- Apple Timer - Longer and More Visible -->
      <div class="apple-timer-container">
        <div class="apple-timer-bar">
          <div 
            class="apple-timer-fill" 
            :style="{ width: `${starvationProgress * 100}%` }"
            :class="{ 'warning': starvationProgress < 0.3, 'critical': starvationProgress < 0.1 }"
          ></div>
        </div>
        <div class="apple-timer-label">
          🍎 Apple Timer: {{ starvationTimeLeft }}s remaining
        </div>
        <div class="apple-timer-description">
          Eat an apple before the timer runs out or you'll lose!
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progress * 100}%` }"
          ></div>
        </div>
        <div class="progress-label">
          Progress: {{ Math.floor(progress * 100) }}% ({{ length }}/{{ targetLength }} snakes)
        </div>
      </div>

      <!-- Border Status with Better Explanation -->
      <div class="border-status">
        <div class="border-indicators">
          <div class="border-indicator" :class="{ 'open': !currentBorders.top }" title="Top Border">
            <span>↑</span>
          </div>
          <div class="border-indicator" :class="{ 'open': !currentBorders.left }" title="Left Border">
            <span>←</span>
          </div>
          <div class="border-indicator" :class="{ 'open': !currentBorders.right }" title="Right Border">
            <span>→</span>
          </div>
          <div class="border-indicator" :class="{ 'open': !currentBorders.bottom }" title="Bottom Border">
            <span>↓</span>
          </div>
        </div>
        <div class="border-label">Available Walls</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'HUD',
  computed: {
    ...mapState(['score', 'bestScore', 'timeLeft', 'difficulty', 'streak', 'ticksSinceApple', 'survivalTime', 'bestSurvivalTime', 'currentStage', 'volume', 'lastSoundPlayed']),
    ...mapGetters(['length', 'progress']),
    
    targetLength() {
      return Math.floor(this.$store.state.gridSize * this.$store.state.gridSize * 0.3)
    },
    
    lengthProgress() {
      return Math.min(1, this.length / this.targetLength)
    },
    
    starvationConfig() {
      const config = this.$store.state.config[this.difficulty]
      return config.starvation || 0
    },
    
    starvationProgress() {
      if (this.starvationConfig === 0) return 1 // No starvation (Survivor mode)
      return Math.max(0, (this.starvationConfig - this.ticksSinceApple) / this.starvationConfig)
    },
    
    starvationTimeLeft() {
      if (this.starvationConfig === 0) return 0
      const config = this.$store.state.config[this.difficulty]
      const ticksLeft = Math.max(0, this.starvationConfig - this.ticksSinceApple)
      return (ticksLeft * config.tick / 1000).toFixed(1) // Convert to seconds
    },

    currentBorders() {
      const config = this.$store.state.config[this.difficulty]
      return config.borders || { top: true, bottom: true, left: true, right: true }
    },

    formatSurvivalTime() {
      const mins = Math.floor(this.survivalTime / 60)
      const secs = this.survivalTime % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    volume() {
      return this.$store.state.volume || 70
    },

    isSoundPlaying() {
      return this.lastSoundPlayed && (Date.now() - this.lastSoundPlayed.timestamp) < 1000
    }
  },
  methods: {
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    setVolume(event) {
      const volume = parseInt(event.target.value)
      this.$store.commit('SET_VOLUME', volume)
    }
  }
}
</script>

<style scoped>
.hud {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  min-width: 500px;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Fullscreen styles handled by global CSS */

.hud-row {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 0.4rem;
}

.hud-row:last-of-type {
  margin-bottom: 0.6rem;
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.label {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 0.2rem;
}

.value {
  font-size: 1rem;
  font-weight: bold;
}

/* Apple Timer - Horizontal and Centered */
.apple-timer-container {
  background: rgba(231, 76, 60, 0.1);
  border-radius: 6px;
  padding: 0.5rem;
  text-align: center;
  margin-top: 0.3rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.apple-timer-bar {
  width: 90%;
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.apple-timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c 0%, #e67e22 100%);
  transition: width 0.3s ease;
}

.apple-timer-fill.warning {
  background: linear-gradient(90deg, #f39c12 0%, #f1c40f 100%);
}

.apple-timer-fill.critical {
  background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
  animation: pulse-red 1s infinite alternate;
}

.apple-timer-label {
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  margin-bottom: 0.25rem;
}

.apple-timer-description {
  font-size: 0.8rem;
  color: #ccc;
  font-style: italic;
}

.progress-container {
  text-align: center;
  margin-top: 0.3rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-bar {
  width: 90%;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db 0%, #5dade2 100%);
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: bold;
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

.stage-display {
  text-align: center;
}

.stage-label {
  font-size: 1.5rem;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.stage-progress {
  margin-bottom: 0.5rem;
}

.stage-bar {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.stage-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.stage-text {
  font-size: 0.8rem;
  opacity: 0.9;
  font-weight: bold;
}

.starvation-container {
  text-align: center;
  margin-top: 0.5rem;
}

.starvation-bar {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.starvation-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #20c997);
  transition: width 0.1s ease;
  border-radius: 6px;
}

.starvation-fill.warning {
  background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.starvation-fill.critical {
  background: linear-gradient(90deg, #dc3545, #e83e8c);
  animation: pulse 0.5s infinite alternate;
}

.starvation-label {
  font-size: 0.8rem;
  opacity: 0.9;
  font-weight: bold;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.border-status {
  text-align: center;
  margin-top: 0.3rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.border-indicators {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.border-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.3);
  border: 2px solid #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.border-indicator.open {
  background: rgba(76, 175, 80, 0.3);
  border-color: #4CAF50;
  color: white;
}

.border-indicator.blocked {
  background: rgba(231, 76, 60, 0.3);
  border-color: #e74c3c;
  color: white;
}

.border-indicator.pulsing {
  animation: pulse-red 1.5s infinite alternate;
}

.border-label {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.volume-slider {
  width: 60px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.volume-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-top: 0.25rem;
  height: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.volume-visual.active {
  opacity: 1;
}

.sound-wave {
  width: 2px;
  height: 8px;
  background: white;
  border-radius: 1px;
  animation: sound-wave 0.6s ease-in-out infinite;
}

@keyframes sound-wave {
  0%, 100% {
    height: 8px;
    opacity: 0.5;
  }
  50% {
    height: 16px;
    opacity: 1;
  }
}

@keyframes pulse-red {
  from { opacity: 0.7; }
  to { opacity: 1; }
}
</style>
