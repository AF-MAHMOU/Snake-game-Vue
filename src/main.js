import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import './styles.css'

// Create Vuex store
const store = createStore({
  state: {
    difficulty: 'easy',

    // ===== Difficulty Configs (includes Survivor) =====
    config: {
      easy:   { 
        grid: 20, tick: 140, startLen: 3, applesAtOnce: [1, 1], timerSec: 180, applePts: 10, starvation: 60,
        borders: { top: false, bottom: false, left: false, right: false } // All borders open (wrap-around)
      },
      medium: { 
        grid: 24, tick: 110, startLen: 4, applesAtOnce: [1, 2], timerSec: 150, applePts: 20, starvation: 45,
        borders: { top: true, bottom: true, left: false, right: false } // Only vertical borders blocked
      },
      hard:   { 
        grid: 28, tick: 85,  startLen: 5, applesAtOnce: [2, 2], timerSec: 120, applePts: 30, starvation: 30,
        borders: { top: true, bottom: true, left: true, right: true } // All borders blocked
      },

      // NEW: Survivor (no timer; speeds up every 100 score)
      survivor: {
        grid: 24,
        tick: 120,            // starting speed (ms per step)
        startLen: 3,
        applesAtOnce: [1, 2],
        timerSec: null,       // no countdown/timer in survivor
        applePts: 10,
        accelPer100: 10,      // reduce tick by 10ms per 100 score
        minTick: 50,          // cap at 50ms minimum
        borders: { top: false, bottom: false, left: false, right: false }, // Start with all open
        borderBlockScore: 200  // Block a border every 200 points
      }
    },

    // ===== Runtime State =====
    status: 'menu', // 'menu' | 'countdown' | 'running' | 'paused' | 'won' | 'gameover'
    gridSize: 20,
    snake: [],
    apples: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    score: 0,
    streak: 0,
    timeLeft: 0,
    ticksSinceApple: 0,
    bestScore: 0,
    emojiMap: {},
    countdown: 0,
    survivalTime: 0, // For survivor mode elapsed time
    bestSurvivalTime: 0, // Best survival time record
    currentStage: 1, // Current stage in survivor mode
    survivalRecords: [], // Array of survival time records
    maxRecords: 10, // Maximum number of records to keep
    volume: 70, // Volume level (0-100)
    lastSoundPlayed: null // Last sound that was triggered
  },

  // ===== Getters =====
  getters: {
    // Survivor: dynamic speed (faster every 100 score); others: fixed tick
    speedMs: (state) => {
      const cfg = state.config[state.difficulty]
      if (!cfg) return 120 // safety fallback

      if (state.difficulty === 'survivor') {
        const steps = Math.floor(state.score / 100) // 0,1,2,...
        const accel = cfg.accelPer100 ?? 10
        const minTick = cfg.minTick ?? 50
        const next = cfg.tick - steps * accel
        return Math.max(minTick, next)
      }

      return cfg.tick
    },

    length: (state) => state.snake.length,

    progress: (state) => {
      const target = Math.floor(state.gridSize * state.gridSize * 0.3)
      return Math.min(state.snake.length / target, 1)
    },

    currentConfig: (state) => state.config[state.difficulty]
  },

  // ===== Mutations =====
  mutations: {
    SET_DIFF(state, difficulty) {
      state.difficulty = difficulty
      state.gridSize = state.config[difficulty].grid
    },

    RESET(state) {
      const config = state.config[state.difficulty]
      console.log('Resetting game for difficulty:', state.difficulty, 'Config:', config)
      state.snake = []
      state.apples = []
      state.dir = { x: 1, y: 0 }
      state.nextDir = { x: 1, y: 0 }
      state.score = 0
      state.streak = 0
      state.timeLeft = config.timerSec ?? 0  // Survivor: null → 0 (no timer)
      state.ticksSinceApple = 0
      state.survivalTime = 0 // Reset survival time
      state.currentStage = 1 // Reset stage

      // Initialize snake in center
      const center = Math.floor(state.gridSize / 2)
      for (let i = 0; i < config.startLen; i++) {
        state.snake.push({ x: center - i, y: center })
      }
    },

    SET_STATUS(state, status) {
      state.status = status
    },

    QUEUE_DIR(state, dir) {
      // Prevent 180° reversal
      const reversing = (state.dir.x + dir.x === 0) && (state.dir.y + dir.y === 0)
      if (!reversing) {
        state.nextDir = dir
      }
    },

    SPAWN_APPLES(state) {
      const config = state.config[state.difficulty]
      const [minApples] = config.applesAtOnce

      // Ensure at least minApples exist
      while (state.apples.length < minApples) {
        let attempts = 0
        let newApple
        do {
          newApple = {
            x: Math.floor(Math.random() * state.gridSize),
            y: Math.floor(Math.random() * state.gridSize)
          }
          attempts++
        } while (
          attempts < 100 && (
            state.snake.some(s => s.x === newApple.x && s.y === newApple.y) ||
            state.apples.some(a => a.x === newApple.x && a.y === newApple.y)
          )
        )

        if (attempts < 100) state.apples.push(newApple)
        else break // avoid rare infinite loops
      }
    },

    STEP(state) {
      const config = state.config[state.difficulty]

      // Update direction
      state.dir = { ...state.nextDir }

      // Move head
      const head = { ...state.snake[0] }
      head.x += state.dir.x
      head.y += state.dir.y

      // Handle border mechanics and wrap-around
      const borders = config.borders || { top: true, bottom: true, left: true, right: true }
      
      // Check wall collision
      if (head.x < 0) {
        if (borders.left) {
          state.status = 'gameover'
          // Save survival record AFTER status change
          if (state.difficulty === 'survivor' && state.survivalTime > 0) {
            const record = {
              time: state.survivalTime,
              stage: state.currentStage,
              date: new Date().toLocaleDateString(),
              timestamp: Date.now()
            }
            state.survivalRecords.push(record)
            state.survivalRecords.sort((a, b) => b.time - a.time)
            state.survivalRecords = state.survivalRecords.slice(0, state.maxRecords)
          }
          this.commit('PLAY_SOUND', 'bump')
          return
        } else {
          // Wrap around to right side
          head.x = state.gridSize - 1
        }
      } else if (head.x >= state.gridSize) {
        if (borders.right) {
          state.status = 'gameover'
          // Save survival record AFTER status change
          if (state.difficulty === 'survivor' && state.survivalTime > 0) {
            const record = {
              time: state.survivalTime,
              stage: state.currentStage,
              date: new Date().toLocaleDateString(),
              timestamp: Date.now()
            }
            state.survivalRecords.push(record)
            state.survivalRecords.sort((a, b) => b.time - a.time)
            state.survivalRecords = state.survivalRecords.slice(0, state.maxRecords)
          }
          this.commit('PLAY_SOUND', 'bump')
          return
        } else {
          // Wrap around to left side
          head.x = 0
        }
      }

      // Check vertical borders (top/bottom)
      if (head.y < 0) {
        if (borders.top) {
          state.status = 'gameover'
          // Save survival record AFTER status change
          if (state.difficulty === 'survivor' && state.survivalTime > 0) {
            const record = {
              time: state.survivalTime,
              stage: state.currentStage,
              date: new Date().toLocaleDateString(),
              timestamp: Date.now()
            }
            state.survivalRecords.push(record)
            state.survivalRecords.sort((a, b) => b.time - a.time)
            state.survivalRecords = state.survivalRecords.slice(0, state.maxRecords)
          }
          this.commit('PLAY_SOUND', 'bump')
          return
        } else {
          // Wrap around to bottom
          head.y = state.gridSize - 1
        }
      } else if (head.y >= state.gridSize) {
        if (borders.bottom) {
          state.status = 'gameover'
          // Save survival record AFTER status change
          if (state.difficulty === 'survivor' && state.survivalTime > 0) {
            const record = {
              time: state.survivalTime,
              stage: state.currentStage,
              date: new Date().toLocaleDateString(),
              timestamp: Date.now()
            }
            state.survivalRecords.push(record)
            state.survivalRecords.sort((a, b) => b.time - a.time)
            state.survivalRecords = state.survivalRecords.slice(0, state.maxRecords)
          }
          this.commit('PLAY_SOUND', 'bump')
          return
        } else {
          // Wrap around to top
          head.y = 0
        }
      }

      // Self collision
      if (state.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        // Save survival record before game over
        if (state.difficulty === 'survivor' && state.survivalTime > 0) {
          this.commit('ADD_SURVIVAL_RECORD', state.survivalTime)
        }
        state.status = 'gameover'
        this.commit('PLAY_SOUND', 'bump')
        return
      }

      // Apple collision
      const idx = state.apples.findIndex(a => a.x === head.x && a.y === head.y)
      if (idx !== -1) {
        state.apples.splice(idx, 1)

        // Play eat sound
        this.commit('PLAY_SOUND', 'eat')

        // Score
        let points = config.applePts
        points += Math.min(10, state.streak * 2) // streak bonus
        points += 3                               // small speed bonus
        state.score += points

        state.streak++
        state.ticksSinceApple = 0

        // Grow: add new head, keep tail
        state.snake.unshift(head)

        // Survivor mode: Check for stage progression and border blocking
        if (state.difficulty === 'survivor' && config.borderBlockScore) {
          // Calculate stage based on score (every 200 points = new stage)
          const newStage = Math.floor(state.score / config.borderBlockScore) + 1
          
          if (newStage > state.currentStage) {
            this.commit('INCREMENT_STAGE')
            this.commit('PLAY_SOUND', 'levelup')
          }
          
          // Block borders progressively (every 200 points)
          const borderBlocks = Math.floor(state.score / config.borderBlockScore)
          const currentBlocks = Object.values(borders).filter(blocked => blocked).length
          
          if (borderBlocks > currentBlocks && borderBlocks <= 4) {
            // Block the next border
            const borderOrder = ['top', 'right', 'bottom', 'left']
            const borderToBlock = borderOrder[borderBlocks - 1]
            this.commit('BLOCK_SURVIVOR_BORDER', borderToBlock)
          }
        }
      } else {
        // Move: add head, remove tail
        state.snake.unshift(head)
        state.snake.pop()
        state.ticksSinceApple++
      }

      // Starvation (all modes except Survivor)
      if (state.difficulty !== 'survivor' && state.ticksSinceApple >= (config.starvation || 0)) {
        // No need to save record here as this doesn't happen in survivor mode
        state.status = 'gameover'
        return
      }

      // Win condition (30% fill) - only for non-survivor modes
      if (state.difficulty !== 'survivor') {
        const target = Math.floor(state.gridSize * state.gridSize * 0.3)
        if (state.snake.length >= target) {
          const bonuses = { easy: 100, medium: 150, hard: 200 }
          state.score += bonuses[state.difficulty] || 0
          state.status = 'won'
          this.commit('PLAY_SOUND', 'levelup')
          return
        }
      }

      // Keep apples coming
      this.commit('SPAWN_APPLES')
    },

    // Timer tick (disabled in Survivor)
    TICK_TIME(state) {
      if (state.difficulty === 'survivor') return // no timer in Survivor
      state.timeLeft--
      if (state.timeLeft <= 0) {
        state.status = 'gameover'
      }
    },

    SET_BEST(state, score) {
      if (score > state.bestScore) state.bestScore = score
    },

    SET_EMOJI_MAP(state, emojis) {
      state.emojiMap = emojis
    },

    SET_COUNTDOWN(state, countdown) {
      state.countdown = countdown
    },

    DECREMENT_COUNTDOWN(state) {
      state.countdown--
      if (state.countdown <= 0) {
        state.status = 'running'
      }
    },

    INCREMENT_SURVIVAL_TIME(state) {
      if (state.difficulty === 'survivor' && state.status === 'running') {
        state.survivalTime++
        console.log('Survival time:', state.survivalTime)
        if (state.survivalTime > state.bestSurvivalTime) {
          state.bestSurvivalTime = state.survivalTime
        }
      }
    },

    BLOCK_SURVIVOR_BORDER(state, borderName) {
      if (state.difficulty === 'survivor' && state.config.survivor.borders) {
        state.config.survivor.borders[borderName] = true
      }
    },

    INCREMENT_STAGE(state) {
      if (state.difficulty === 'survivor') {
        state.currentStage++
        console.log('Advanced to stage:', state.currentStage)
      }
    },

    ADD_SURVIVAL_RECORD(state, survivalTime) {
      const record = {
        time: survivalTime,
        stage: state.currentStage,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
      }
      
      state.survivalRecords.push(record)
      
      // Sort by time (descending) and keep only top records
      state.survivalRecords.sort((a, b) => b.time - a.time)
      state.survivalRecords = state.survivalRecords.slice(0, state.maxRecords)
    },

    SET_VOLUME(state, volume) {
      state.volume = Math.max(0, Math.min(100, volume))
    },

    PLAY_SOUND(state, soundName) {
      // This will be handled by the GameBoard component
      // We'll emit an event that the component can listen to
      state.lastSoundPlayed = { sound: soundName, timestamp: Date.now() }
    }
  },

  // ===== Actions =====
  actions: {
    start({ commit, state }, difficulty) {
      console.log('Starting game with difficulty:', difficulty)
      commit('SET_DIFF', difficulty)
      commit('RESET')
      commit('SPAWN_APPLES')

      // Survivor: skip countdown → start immediately
      if (difficulty === 'survivor') {
        console.log('Starting survivor mode immediately')
        commit('SET_COUNTDOWN', 0)
        commit('SET_STATUS', 'running')
        return
      }

      // Others: go through countdown
      commit('SET_STATUS', 'countdown')
      commit('SET_COUNTDOWN', 3)
    },

    tick({ commit, state }) {
      if (state.status === 'running') {
        commit('STEP')
      }
    },

    second({ commit, state }) {
      console.log('Second tick - Status:', state.status, 'Difficulty:', state.difficulty)
      if (state.status === 'running') {
        commit('TICK_TIME')
        commit('INCREMENT_SURVIVAL_TIME')
      } else if (state.status === 'countdown') {
        commit('DECREMENT_COUNTDOWN')
      }
    },

    async fetchEmojis({ commit }) {
      // Local emoji map (no external calls)
      const emojis = {
        apple: '🍎', cherry: '🍒', grapes: '🍇', strawberry: '🍓', peach: '🍑', pear: '🍐', banana: '🍌',
        orange: '🍊', lemon: '🍋', watermelon: '🍉', pineapple: '🍍', mango: '🥭', kiwi: '🥝', coconut: '🥥',
        avocado: '🥑', tomato: '🍅', eggplant: '🍆', carrot: '🥕', corn: '🌽', hot_pepper: '🌶️', cucumber: '🥒',
        broccoli: '🥦', mushroom: '🍄', peanuts: '🥜', bread: '🍞', croissant: '🥐', baguette: '🥖', pretzel: '🥨',
        bagel: '🥯', pancakes: '🥞', waffle: '🧇', cheese: '🧀', meat_on_bone: '🍖', poultry_leg: '🍗',
        cut_of_meat: '🥩', bacon: '🥓', hamburger: '🍔', fries: '🍟', pizza: '🍕', hotdog: '🌭', sandwich: '🥪',
        taco: '🌮', burrito: '🌯', stuffed_flatbread: '🥙', falafel: '🧆', egg: '🥚', cooking: '🍳',
        shallow_pan_of_food: '🥘', stew: '🍲', bowl_with_spoon: '🥣', green_salad: '🥗', popcorn: '🍿',
        butter: '🧈', salt: '🧂', canned_food: '🥫', bento: '🍱', rice_cracker: '🍘', rice_ball: '🍙', rice: '🍚',
        curry: '🍛', ramen: '🍜', spaghetti: '🍝', sweet_potato: '🍠', oden: '🍢', sushi: '🍣', fried_shrimp: '🍤',
        fish_cake: '🍥', moon_cake: '🥮', dango: '🍡', dumpling: '🥟', fortune_cookie: '🥠', takeout_box: '🥡',
        crab: '🦀', lobster: '🦞', shrimp: '🦐', squid: '🦑', oyster: '🦪', icecream: '🍦', shaved_ice: '🍧',
        ice_cream: '🍨', doughnut: '🍩', cookie: '🍪', birthday: '🎂', cake: '🍰', cupcake: '🧁', pie: '🥧',
        chocolate_bar: '🍫', candy: '🍬', lollipop: '🍭', custard: '🍮', honey_pot: '🍯', baby_bottle: '🍼',
        milk_glass: '🥛', coffee: '☕', tea: '🍵', sake: '🍶', beer: '🍺', beers: '🍻', clinking_glasses: '🥂',
        tumbler_glass: '🥃', cup_with_straw: '🥤', beverage_box: '🧃', mate: '🧉', ice: '🧊'
      }
      commit('SET_EMOJI_MAP', emojis)
    },

    gameOver({ commit, state }) {
      // If it's survivor mode, save the record
      if (state.difficulty === 'survivor' && state.survivalTime > 0) {
        commit('ADD_SURVIVAL_RECORD', state.survivalTime)
      }
    }
  }
})

const app = createApp(App)
app.use(store)
app.mount('#app')
