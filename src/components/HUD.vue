<template>
  <div class="hud" :class="{ 'minimized': hudMinimized }">
    <!-- Minimize/Maximize Toggle Button -->
    <button 
      class="hud-toggle-btn" 
      @click="toggleHud"
      :aria-label="hudMinimized ? 'Expand HUD' : 'Minimize HUD'"
      :title="hudMinimized ? 'Expand HUD' : 'Minimize HUD'"
    >
      {{ hudMinimized ? '↗' : '↙' }}
    </button>

    <!-- Minimized View - Essential Info Only -->
    <div v-if="hudMinimized" class="hud-minimized">
      <div class="hud-item">
        <span class="label">{{ difficulty === 'survivor' ? 'Survival:' : 'Time:' }}</span>
        <span class="value">{{ difficulty === 'survivor' ? formatSurvivalTime : formatTime(timeLeft) }}</span>
      </div>
      
      <!-- Apple Timer (only for non-survivor modes) -->
      <div v-if="difficulty !== 'survivor'" class="hud-item">
        <span class="label">🍎 Timer:</span>
        <span class="value">{{ starvationTimeLeft }}s</span>
      </div>
      
      <!-- Progress Info (for easy/medium/hard modes) -->
      <div v-if="difficulty !== 'survivor'" class="hud-item">
        <span class="label">Progress:</span>
        <span class="value">{{ Math.floor(progress * 100) }}%</span>
      </div>
      
      <!-- Stage Progress (only for survivor mode) -->
      <div v-if="difficulty === 'survivor'" class="hud-item stage-progress-item">
        <span class="label">Stage:</span>
        <span class="value">{{ currentStage }}</span>
        <div class="minimized-stage-bar">
          <div 
            class="minimized-stage-fill" 
            :style="{ width: `${stageProgress * 100}%` }"
          ></div>
        </div>
        <span class="stage-progress-text">{{ Math.floor(stageProgress * 100) }}%</span>
        
        <!-- Active Ability Indicator -->
        <div v-if="activeAbilities.length > 0" class="minimized-ability-indicator">
          {{ activeAbilities[activeAbilities.length - 1].name }}
        </div>
      </div>
    </div>

    <!-- Full View -->
    <div v-else class="hud-full">
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
                :style="{ width: `${stageProgress * 100}%` }"
              ></div>
            </div>
            <div class="stage-text">{{ stageProgressText }}</div>
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
      
      <!-- Active Abilities Display -->
      <div v-if="activeAbilities.length > 0" class="abilities-display">
        <div class="abilities-label">Active Abilities:</div>
        <div class="abilities-list">
          <div 
            v-for="ability in activeAbilities" 
            :key="ability.stage"
            class="ability-item"
            :title="`Stage ${ability.stage} Ability`"
          >
            {{ ability.name }}
          </div>
        </div>
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
          Progress: {{ Math.floor(progress * 100) }}% ({{ score }}/{{ targetScore }} points)
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
    </div> <!-- End of hud-full -->
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'HUD',
  computed: {
    ...mapState(['score', 'bestScore', 'timeLeft', 'difficulty', 'streak', 'ticksSinceApple', 'survivalTime', 'bestSurvivalTime', 'currentStage', 'volume', 'lastSoundPlayed', 'hudMinimized', 'stageAbilities']),
    ...mapGetters(['length', 'progress']),
    
    targetLength() {
      return Math.floor(this.$store.state.gridSize * this.$store.state.gridSize * 0.3)
    },
    
    targetScore() {
      const config = this.$store.state.config[this.difficulty]
      const targetCells = Math.floor(this.$store.state.gridSize * this.$store.state.gridSize * 0.3)
      return targetCells * config.applePts
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

    // Calculate stage progress with increasing requirements
    stageProgress() {
      if (this.difficulty !== 'survivor') return 0
      
      let stage = 1
      let totalRequired = 0
      
      // Calculate current stage requirements
      while (totalRequired <= this.score) {
        stage++
        totalRequired += 200 + (stage - 2) * 100
      }
      
      // Calculate progress within current stage
      const prevStageRequired = totalRequired - (200 + (stage - 2) * 100)
      const currentStageRequired = 200 + (stage - 2) * 100
      const progressInStage = this.score - prevStageRequired
      
      return Math.min(1, progressInStage / currentStageRequired)
    },

    stageProgressText() {
      if (this.difficulty !== 'survivor') return ''
      
      let stage = 1
      let totalRequired = 0
      
      // Calculate current stage requirements
      while (totalRequired <= this.score) {
        stage++
        totalRequired += 200 + (stage - 2) * 100
      }
      
      const prevStageRequired = totalRequired - (200 + (stage - 2) * 100)
      const currentStageRequired = 200 + (stage - 2) * 100
      const progressInStage = this.score - prevStageRequired
      
      return `${progressInStage}/${currentStageRequired} to next stage`
    },

    volume() {
      return this.$store.state.volume || 70
    },

    isSoundPlaying() {
      return this.lastSoundPlayed && (Date.now() - this.lastSoundPlayed.timestamp) < 1000
    },

    activeAbilities() {
      if (this.difficulty !== 'survivor') return []
      
      const abilityNames = {
        'explosion': '💥 Explosion',
        'double_points': '💰 Double Points',
        'magnet': '🧲 Magnet'
      }
      
      return Object.entries(this.stageAbilities).map(([stage, ability]) => ({
        stage: parseInt(stage) || stage, // Use stage as string if parseInt fails
        name: abilityNames[ability] || ability,
        ability: ability
      }))
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
    },

    toggleHud() {
      this.$store.commit('TOGGLE_HUD_MINIMIZED')
    }
  }
}
</script>

<style scoped>
.hud {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.8rem;
  border-radius: 8px;
  min-width: 480px;
  margin-bottom: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1rem;
  position: relative;
  transition: all 0.3s ease;
}

.hud.minimized {
  min-width: 320px;
  padding: 0.5rem;
}

.hud-toggle-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  color: white;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  font-weight: bold;
  transition: all 0.2s ease;
  z-index: 10;
  backdrop-filter: blur(5px);
}

.hud-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.1);
}

.hud-minimized {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-right: 25px; /* Add space for the toggle button */
  flex-wrap: wrap;
}

.hud-full {
  width: 100%;
}

/* Minimized Stage Progress */
.stage-progress-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.minimized-stage-bar {
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin: 0.2rem 0;
  position: relative;
}

.minimized-stage-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
  transition: width 0.3s ease;
  border-radius: 3px;
  position: relative;
}

.minimized-stage-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

.stage-progress-text {
  font-size: 0.7rem;
  color: #FFD700;
  font-weight: bold;
  margin-top: 0.1rem;
}

.minimized-ability-indicator {
  font-size: 0.6rem;
  color: #FFD700;
  font-weight: bold;
  margin-top: 0.2rem;
  padding: 0.1rem 0.3rem;
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 3px;
  animation: ability-pulse 1.5s ease-in-out infinite alternate;
}

@keyframes ability-pulse {
  from {
    box-shadow: 0 0 3px rgba(255, 215, 0, 0.3);
  }
  to {
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  }
}

/* Fullscreen styles handled by global CSS */

.hud-row {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
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
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1.1rem;
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
  font-size: 0.85rem;
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
  font-size: 0.95rem;
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
  font-size: 1.4rem;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 0.4rem;
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
  font-size: 0.9rem;
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.3);
  border: 2px solid #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
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
  font-size: 0.95rem;
  color: #ccc;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.volume-slider {
  width: 70px;
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
  width: 18px;
  height: 18px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
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

/* Abilities Display */
.abilities-display {
  margin-top: 0.5rem;
  width: 100%;
  text-align: center;
}

.abilities-label {
  font-size: 0.9rem;
  color: #FFD700;
  font-weight: bold;
  margin-bottom: 0.3rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.abilities-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  justify-content: center;
}

.ability-item {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
  color: #FFD700;
  font-weight: 600;
  transition: all 0.3s ease;
  animation: ability-glow 2s ease-in-out infinite alternate;
}

.ability-item:hover {
  background: rgba(255, 215, 0, 0.3);
  transform: scale(1.05);
}

@keyframes ability-glow {
  from {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
  }
  to {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .hud {
    min-width: 85vw;
    padding: 0.6rem;
    font-size: 0.9rem;
  }
  
  .hud.minimized {
    min-width: 85vw;
    padding: 0.4rem;
  }
  
  .hud-minimized {
    gap: 0.6rem;
    padding-right: 20px;
  }
  
  .stage-progress-item {
    min-width: 90px;
  }
  
  .minimized-stage-bar {
    width: 70px;
    height: 5px;
  }
  
  .stage-progress-text {
    font-size: 0.65rem;
  }
  
  .hud-row {
    gap: 1.2rem;
  }
  
  .hud-item {
    min-width: 70px;
  }
  
  .label {
    font-size: 0.8rem;
  }
  
  .value {
    font-size: 1rem;
  }
  
  .apple-timer-label {
    font-size: 1rem;
  }
  
  .apple-timer-description {
    font-size: 0.8rem;
  }
  
  .progress-label {
    font-size: 0.85rem;
  }
  
  .stage-label {
    font-size: 1.2rem;
  }
  
  .stage-text {
    font-size: 0.8rem;
  }
  
  .border-indicator {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
  
  .border-label {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .hud {
    min-width: 90vw;
    padding: 0.5rem;
    font-size: 0.85rem;
  }
  
  .hud.minimized {
    min-width: 90vw;
    padding: 0.3rem;
  }
  
  .hud-minimized {
    gap: 0.5rem;
    flex-direction: column;
    padding-right: 18px;
  }
  
  .stage-progress-item {
    min-width: 80px;
  }
  
  .minimized-stage-bar {
    width: 60px;
    height: 4px;
  }
  
  .stage-progress-text {
    font-size: 0.6rem;
  }
  
  .hud-row {
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  
  .hud-item {
    min-width: 60px;
  }
  
  .label {
    font-size: 0.75rem;
  }
  
  .value {
    font-size: 0.9rem;
  }
  
  .apple-timer-label {
    font-size: 0.9rem;
  }
  
  .apple-timer-description {
    font-size: 0.75rem;
  }
  
  .progress-label {
    font-size: 0.8rem;
  }
  
  .stage-label {
    font-size: 1.1rem;
  }
  
  .stage-text {
    font-size: 0.75rem;
  }
  
  .border-indicator {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
  
  .border-label {
    font-size: 0.8rem;
  }
}
</style>
