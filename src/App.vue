<template>
  <div class="app">
    <!-- Skip to content link for accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
    <!-- Menu Screen -->
    <div 
      v-if="status === 'menu'" 
      class="menu"
      id="main-content"
      role="main"
      aria-label="Main menu"
    >
      <h1>Snake Game</h1>
      <div class="menu-content">
        <div class="difficulty-select">
          <h2>Choose Difficulty</h2>
          <div class="difficulty-buttons">
            <button 
              v-for="(config, diff) in config" 
              :key="diff"
              @click="startGame(diff)"
              class="difficulty-btn"
              :class="diff"
              :aria-label="`Start ${diff} difficulty game`"
              :aria-describedby="`${diff}-description`"
            >
              <div class="diff-name">{{ diff.charAt(0).toUpperCase() + diff.slice(1) }}</div>
              <div class="diff-details" :id="`${diff}-description`">
                Grid: {{ config.grid }}×{{ config.grid }} | 
                Speed: {{ config.tick }}ms | 
                {{ diff === 'survivor' ? 'Endless' : `Timer: ${config.timerSec}s` }}
              </div>
            </button>
          </div>
        </div>
        
        <!-- Survival Mode Leaderboard -->
        <div class="leaderboard">
          <h3>🏆 Survival Records</h3>
          <div v-if="survivalRecords.length > 0" class="records-list">
            <div 
              v-for="(record, index) in survivalRecords" 
              :key="record.timestamp"
              class="record-item"
              :class="{ 'best': index === 0 }"
            >
              <div class="record-rank">#{{ index + 1 }}</div>
              <div class="record-details">
                <div class="record-time">{{ formatTime(record.time) }}</div>
                <div class="record-stage">Stage {{ record.stage }} • {{ record.score }} pts</div>
                <div class="record-date">{{ record.date }}</div>
              </div>
            </div>
          </div>
          <div v-else class="no-records">
            <p>No survival records yet!</p>
            <p>Play Survivor mode to set your first record.</p>
          </div>
          <button v-if="survivalRecords.length > 0" @click="clearSurvivalRecords" class="clear-records-btn">Clear Records</button>
        </div>
        
        <!-- Game Legend/Help Panel -->
        <div class="game-legend">
          <h3>🎮 How to Play</h3>
          
          <!-- Basic Controls -->
          <div class="legend-section">
            <h4>⌨️ Controls</h4>
            <div class="legend-item">
              <span class="legend-key">WASD</span> or <span class="legend-key">Arrow Keys</span> - Move snake
            </div>
            <div class="legend-item">
              <span class="legend-key">Space</span> - Pause/Resume
            </div>
          </div>
          
          <!-- Difficulty Explanations -->
          <div class="legend-section">
            <h4>🎯 Difficulty Modes</h4>
            <div class="legend-item">
              <span class="legend-difficulty easy">Easy</span> - All borders open (wrap around)
            </div>
            <div class="legend-item">
              <span class="legend-difficulty medium">Medium</span> - Vertical borders blocked
            </div>
            <div class="legend-item">
              <span class="legend-difficulty hard">Hard</span> - All borders blocked
            </div>
            <div class="legend-item">
              <span class="legend-difficulty survivor">Survivor</span> - Endless mode with special abilities
            </div>
          </div>
          
          <!-- Survivor Mode Abilities -->
          <div class="legend-section">
            <h4>⚡ Survivor Abilities</h4>
            <div class="legend-item">
              <span class="legend-ability">💥 Explosion</span> - Eating apples spawns 6 seeds (Stage 1)
            </div>
            <div class="legend-item">
              <span class="legend-ability">💰 Double Points</span> - Apples worth 2x points (Stage 2)
            </div>
            <div class="legend-item">
              <span class="legend-ability">🧲 Magnet</span> - Apples attracted to snake (Stage 3+)
            </div>
            <div class="legend-item">
              <span class="legend-ability">🌱 Seeds</span> - Worth 1/6 apple points, affected by magnet
            </div>
          </div>
          
          <!-- Game Mechanics -->
          <div class="legend-section">
            <h4>🍎 Game Mechanics</h4>
            <div class="legend-item">
              <span class="legend-mechanic">Apple Timer</span> - Eat apples before timer runs out
            </div>
            <div class="legend-item">
              <span class="legend-mechanic">Dynamic Apples</span> - More apples spawn as you eat more apples
            </div>
            <div class="legend-item">
              <span class="legend-mechanic">Reverse Prevention</span> - Can't go backwards into body
            </div>
            <div class="legend-item">
              <span class="legend-mechanic">Border Progression</span> - Survivor mode blocks borders over time
            </div>
          </div>
        </div>
      </div>
    </div>

           <!-- Game Screen -->
           <div 
             v-else 
             class="game" 
             :class="{}"
             tabindex="0" 
             ref="gameContainer" 
             @keydown="handleKeydown"
             role="application"
             :aria-label="`Snake game - ${status} state`"
             aria-live="polite"
           >
             <!-- Controls -->
             <div class="controls">
               <button 
                 v-if="status === 'running'" 
                 @click="pauseGame" 
                 class="control-btn pause"
                 aria-label="Pause game"
               >
                 Pause
               </button>
               <button 
                 v-if="status === 'paused'" 
                 @click="resumeGame" 
                 class="control-btn resume"
                 aria-label="Resume game"
               >
                 Resume
               </button>
               <button 
                 @click="restartGame" 
                 class="control-btn restart"
                 aria-label="Restart game"
               >
                 Restart
               </button>
             </div>

      <!-- HUD -->
      <HUD />

      <!-- Game Board -->
      <GameBoard />

      <!-- Overlays -->
      <div v-if="status === 'won'" class="overlay won">
        <h2>🎉 Level Complete!</h2>
        <p>Score: {{ score }}</p>
        <p>Length: {{ length }}/{{ Math.floor(gridSize * gridSize * 0.3) }}</p>
        <div class="overlay-buttons">
          <!-- Next Level button for Easy and Medium modes -->
          <button 
            v-if="difficulty === 'easy' || difficulty === 'medium'"
            @click="nextLevel" 
            class="control-btn next-level"
            aria-label="Go to next level"
          >
            Next Level
          </button>
          <button 
            @click="restartGame" 
            class="control-btn restart"
            aria-label="Play again"
          >
            Play Again
          </button>
          <button 
            @click="backToMenu" 
            class="control-btn menu"
            aria-label="Return to main menu"
          >
            Main Menu
          </button>
        </div>
      </div>

      <div v-if="status === 'gameover'" class="overlay gameover">
        <h2>💀 Game Over!</h2>
        <p>Score: {{ score }}</p>
        <p v-if="difficulty === 'survivor'">Survival Time: {{ formatSurvivalTime }}</p>
        <p v-else>Length: {{ length }}</p>
        <div class="overlay-buttons">
          <button 
            @click="restartGame" 
            class="control-btn restart"
            aria-label="Play again"
          >
            Play Again
          </button>
          <button 
            @click="backToMenu" 
            class="control-btn menu"
            aria-label="Return to main menu"
          >
            Main Menu
          </button>
        </div>
      </div>

      <div v-if="status === 'paused'" class="overlay paused">
        <h2>⏸️ Paused</h2>
        <p>Press Resume to continue</p>
        <div class="overlay-buttons">
          <button 
            @click="resumeGame" 
            class="control-btn resume"
            aria-label="Resume game"
          >
            Resume
          </button>
          <button 
            @click="backToMenu" 
            class="control-btn menu"
            aria-label="Return to main menu"
          >
            Main Menu
          </button>
        </div>
      </div>

      <div 
        v-if="status === 'countdown' && isStartingFromMenu" 
        class="overlay countdown"
        role="status"
        aria-live="polite"
        aria-label="Game starting countdown"
      >
        <h2 class="countdown-number">{{ countdown }}</h2>
        <p>Get Ready!</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import HUD from './components/HUD.vue'
import GameBoard from './components/GameBoard.vue'

export default {
  name: 'App',
  components: { HUD, GameBoard },

  data() {
    return {
      tickInterval: null,
      secondInterval: null,
      lastSpeedMs: null, // track current tick speed (for Survivor)
      isStartingFromMenu: false // Flag to control countdown display
    }
  },

  computed: {
    ...mapState(['status', 'config', 'score', 'gridSize', 'countdown', 'survivalRecords', 'survivalTime', 'difficulty']),
    ...mapGetters(['length']),

    // Ensure Survivor shows in menu (if you need it elsewhere in template)
    difficulties() {
      const order = ['easy', 'medium', 'hard', 'survivor']
      return order.filter(d => this.config && this.config[d])
    },

    formatSurvivalTime() {
      const mins = Math.floor(this.survivalTime / 60)
      const secs = this.survivalTime % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    formatTime() {
      return (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }
    }
  },

  watch: {
    status(newStatus) {
      // prevent page scroll during game screens
      if (newStatus === 'running' || newStatus === 'paused' || newStatus === 'countdown') {
        document.body.classList.add('game-active')
      } else {
        document.body.classList.remove('game-active')
      }
    },

    // Survivor: speed increases every +100 score → restart interval at new speed
    score() {
      if (this.$store.state.difficulty !== 'survivor') return
      if (this.status !== 'running') return
      const speedMs = this.$store.getters.speedMs
      if (speedMs !== this.lastSpeedMs) {
        this.startIntervals()
      }
    }
  }, // <<< IMPORTANT COMMA BEFORE methods

  methods: {
    ...mapActions(['start', 'tick', 'second', 'fetchEmojis']),

    clearSurvivalRecords() {
      this.$store.commit('CLEAR_SURVIVAL_RECORDS')
    },

    startGame(difficulty) {
      this.isStartingFromMenu = true
      this.start(difficulty)

      // Survivor: skip countdown → run immediately
      if (this.$store.state.difficulty === 'survivor') {
        if (this.$store._mutations?.SET_COUNTDOWN) {
          this.$store.commit('SET_COUNTDOWN', 0)
        }
        this.$store.commit('SET_STATUS', 'running')
      }

      this.startIntervals()

      // focus to capture keyboard input
      this.$nextTick(() => {
        if (this.$refs.gameContainer) this.$refs.gameContainer.focus()
      })
    },

    pauseGame() {
      this.$store.commit('SET_STATUS', 'paused')
      this.stopIntervals()
    },

    resumeGame() {
      this.$store.commit('SET_STATUS', 'running')
      this.startIntervals()
      this.$nextTick(() => {
        if (this.$refs.gameContainer) this.$refs.gameContainer.focus()
      })
    },

    restartGame() {
      this.isStartingFromMenu = false
      this.start(this.$store.state.difficulty)
      
      // Skip countdown for restart - go directly to running
      if (this.$store._mutations?.SET_COUNTDOWN) {
        this.$store.commit('SET_COUNTDOWN', 0)
      }
      this.$store.commit('SET_STATUS', 'running')
      
      this.startIntervals()
    },

    nextLevel() {
      // Determine next difficulty level
      const difficultyOrder = ['easy', 'medium', 'hard']
      const currentIndex = difficultyOrder.indexOf(this.$store.state.difficulty)
      const nextDifficulty = difficultyOrder[currentIndex + 1]
      
      if (nextDifficulty) {
        this.isStartingFromMenu = false
        this.start(nextDifficulty)
        
        // Skip countdown for next level - go directly to running
        if (this.$store._mutations?.SET_COUNTDOWN) {
          this.$store.commit('SET_COUNTDOWN', 0)
        }
        this.$store.commit('SET_STATUS', 'running')
        
        this.startIntervals()
      }
    },

    backToMenu() {
      this.$store.commit('SET_STATUS', 'menu')
      this.stopIntervals()
    },

    startIntervals() {
      this.stopIntervals()

      const speedMs = this.$store.getters.speedMs
      this.lastSpeedMs = speedMs

      // main game loop
      this.tickInterval = setInterval(() => {
        this.tick()
      }, speedMs)

      // 1-second timer for all modes (survivor needs it for survival time tracking)
      this.secondInterval = setInterval(() => {
        this.second()
      }, 1000)
    },

    stopIntervals() {
      if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null }
      if (this.secondInterval) { clearInterval(this.secondInterval); this.secondInterval = null }
    },

    handleKeydown(event) {
      if (this.status === 'menu') return

      const key = event.key.toLowerCase()
      const gameKeys = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ']
      if (gameKeys.includes(key)) { event.preventDefault(); event.stopPropagation() }

      let dir = null
      switch (key) {
        case 'w': case 'arrowup':    dir = { x: 0, y: -1 }; break
        case 's': case 'arrowdown':  dir = { x: 0, y: 1 }; break
        case 'a': case 'arrowleft':  dir = { x: -1, y: 0 }; break
        case 'd': case 'arrowright': dir = { x: 1, y: 0 }; break
        case ' ':
          if (this.status === 'running') this.pauseGame()
          else if (this.status === 'paused') this.resumeGame()
          break
      }
      if (dir) this.$store.commit('QUEUE_DIR', dir)
    },

    handleWindowBlur() {
      if (this.status === 'running') this.pauseGame()
    },

  },

  mounted() {
    this.fetchEmojis()
    document.addEventListener('keydown', this.handleKeydown)
    window.addEventListener('blur', this.handleWindowBlur)
  },

  beforeUnmount() {
    this.stopIntervals()
    document.removeEventListener('keydown', this.handleKeydown)
    window.removeEventListener('blur', this.handleWindowBlur)
  }
  
}
</script>


<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Arial', sans-serif;
}

.menu {
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
}

.menu-content {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.difficulty-select {
  flex: 1;
}

.leaderboard {
  flex: 1;
  background: rgba(0, 0, 0, 0.05);
  padding: 1rem;
  border-radius: 10px;
  text-align: left;
}

.game-legend {
  flex: 1;
  background: rgba(0, 0, 0, 0.05);
  padding: 1rem;
  border-radius: 10px;
  text-align: left;
  max-height: 500px;
  overflow-y: auto;
}

.leaderboard h3 {
  margin-bottom: 1rem;
  color: #333;
  text-align: center;
}

.records-list {
  max-height: 300px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border-left: 4px solid #ddd;
}

.record-item.best {
  background: rgba(255, 215, 0, 0.2);
  border-left-color: #FFD700;
}

.record-rank {
  font-weight: bold;
  color: #666;
  margin-right: 1rem;
  min-width: 30px;
}

.record-details {
  flex: 1;
}

.record-time {
  font-weight: bold;
  color: #333;
  font-size: 1.1rem;
}

.record-stage {
  color: #666;
  font-size: 0.9rem;
}

.record-date {
  color: #999;
  font-size: 0.8rem;
}

.clear-records-btn {
  width: 100%;
  padding: 0.5rem;
  margin-top: 1rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s;
}

.clear-records-btn:hover {
  background: #c0392b;
}

.no-records {
  text-align: center;
  padding: 2rem 1rem;
  color: #666;
  font-style: italic;
}

.no-records p {
  margin: 0.5rem 0;
}

/* Game Legend Styles */
.game-legend h3 {
  margin-bottom: 1rem;
  color: #333;
  text-align: center;
}

.legend-section {
  margin-bottom: 1rem;
}

.legend-section h4 {
  margin-bottom: 0.5rem;
  color: #555;
  font-size: 1rem;
  border-bottom: 1px solid #ddd;
  padding-bottom: 0.25rem;
}

.legend-item {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.legend-key {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 0.1rem 0.3rem;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: bold;
  color: #495057;
}

.legend-difficulty {
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.8rem;
}

.legend-difficulty.easy {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.legend-difficulty.medium {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.legend-difficulty.hard {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.legend-difficulty.survivor {
  background: rgba(0, 123, 255, 0.2);
  color: #007bff;
  border: 1px solid rgba(0, 123, 255, 0.3);
}

.legend-ability {
  background: rgba(255, 215, 0, 0.2);
  color: #FFD700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-weight: bold;
  font-size: 0.8rem;
}

.legend-mechanic {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.3);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-weight: bold;
  font-size: 0.8rem;
}

.menu h1 {
  font-size: 3rem;
  margin-bottom: 2rem;
  color: #333;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.difficulty-select h2 {
  margin-bottom: 1.5rem;
  color: #555;
}


.difficulty-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.difficulty-btn.survivor {
  border-color: #007bff;
}


.difficulty-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
  border: 2px solid transparent;
}

.difficulty-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.difficulty-btn.easy {
  border-color: #28a745;
}

.difficulty-btn.medium {
  border-color: #ffc107;
}

.difficulty-btn.hard {
  border-color: #dc3545;
}

.diff-name {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.diff-details {
  font-size: 0.9rem;
  color: #666;
}

.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.controls {
  display: flex;
  gap: 1rem;
}

.control-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.control-btn.pause {
  background: #ffc107;
}

.control-btn.resume {
  background: #28a745;
}

.control-btn.restart {
  background: #6c757d;
}

.control-btn.next-level {
  background: #28a745;
}

.control-btn.next-level:hover {
  background: #218838;
  transform: translateY(-1px);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
}

.overlay h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.overlay p {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.overlay button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}

.overlay-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.control-btn.menu {
  background: #6c757d;
}

.control-btn.menu:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

</style>
