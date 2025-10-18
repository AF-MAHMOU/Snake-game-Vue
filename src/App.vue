<template>
  <div class="app">
    <!-- Menu Screen -->
    <div v-if="status === 'menu'" class="menu">
      <h1>Snake Game</h1>
      <div class="difficulty-select">
        <h2>Choose Difficulty</h2>
        <div class="difficulty-buttons">
          <button 
            v-for="(config, diff) in config" 
            :key="diff"
            @click="startGame(diff)"
            class="difficulty-btn"
            :class="diff"
          >
            <div class="diff-name">{{ diff.charAt(0).toUpperCase() + diff.slice(1) }}</div>
            <div class="diff-details">
              Grid: {{ config.grid }}×{{ config.grid }} | 
              Speed: {{ config.tick }}ms | 
              Timer: {{ config.timerSec }}s
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Game Screen -->
    <div v-else class="game" tabindex="0" ref="gameContainer" @keydown="handleKeydown">
      <!-- Controls -->
      <div class="controls">
        <button 
          v-if="status === 'running'" 
          @click="pauseGame" 
          class="control-btn pause"
        >
          Pause
        </button>
        <button 
          v-if="status === 'paused'" 
          @click="resumeGame" 
          class="control-btn resume"
        >
          Resume
        </button>
        <button @click="restartGame" class="control-btn restart">
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
        <button @click="backToMenu" class="control-btn">Back to Menu</button>
      </div>

      <div v-if="status === 'gameover'" class="overlay gameover">
        <h2>💀 Game Over!</h2>
        <p>Score: {{ score }}</p>
        <p>Length: {{ length }}</p>
        <button @click="backToMenu" class="control-btn">Back to Menu</button>
      </div>

      <div v-if="status === 'paused'" class="overlay paused">
        <h2>⏸️ Paused</h2>
        <p>Press Resume to continue</p>
      </div>

      <div v-if="status === 'countdown'" class="overlay countdown">
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
    }
  },

  computed: {
    ...mapState(['status', 'config', 'score', 'gridSize', 'countdown']),
    ...mapGetters(['length']),

    // Ensure Survivor shows in menu (if you need it elsewhere in template)
    difficulties() {
      const order = ['easy', 'medium', 'hard', 'survivor']
      return order.filter(d => this.config && this.config[d])
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

    startGame(difficulty) {
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
      this.start(this.$store.state.difficulty)
      if (this.$store.state.difficulty === 'survivor') {
        if (this.$store._mutations?.SET_COUNTDOWN) this.$store.commit('SET_COUNTDOWN', 0)
        this.$store.commit('SET_STATUS', 'running')
      }
      this.startIntervals()
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

      // only run 1-second timer if not survivor
      if (this.$store.state.difficulty !== 'survivor') {
        this.secondInterval = setInterval(() => {
          this.second()
        }, 1000)
      }
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
    }
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

</style>
