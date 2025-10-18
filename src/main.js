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
      easy:   { grid: 20, tick: 140, startLen: 3, applesAtOnce: [1, 1], timerSec: 180, applePts: 10 },
      medium: { grid: 24, tick: 110, startLen: 4, applesAtOnce: [1, 2], timerSec: 150, applePts: 20 },
      hard:   { grid: 28, tick: 85,  startLen: 5, applesAtOnce: [2, 2], timerSec: 120, applePts: 30, starvation: 30 },

      // NEW: Survivor (no timer; speeds up every 100 score)
      survivor: {
        grid: 24,
        tick: 120,            // starting speed (ms per step)
        startLen: 3,
        applesAtOnce: [1, 2],
        timerSec: null,       // no countdown/timer in survivor
        applePts: 10,
        accelPer100: 10,      // reduce tick by 10ms per 100 score
        minTick: 50           // cap at 50ms minimum
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
    countdown: 0
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
      state.snake = []
      state.apples = []
      state.dir = { x: 1, y: 0 }
      state.nextDir = { x: 1, y: 0 }
      state.score = 0
      state.streak = 0
      state.timeLeft = config.timerSec ?? 0  // Survivor: null → 0 (no timer)
      state.ticksSinceApple = 0

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

      // Walls
      if (head.x < 0 || head.x >= state.gridSize || head.y < 0 || head.y >= state.gridSize) {
        state.status = 'gameover'
        return
      }

      // Self
      if (state.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        state.status = 'gameover'
        return
      }

      // Apple
      const idx = state.apples.findIndex(a => a.x === head.x && a.y === head.y)
      if (idx !== -1) {
        state.apples.splice(idx, 1)

        // Score
        let points = config.applePts
        points += Math.min(10, state.streak * 2) // streak bonus
        points += 3                               // small speed bonus
        state.score += points

        state.streak++
        state.ticksSinceApple = 0

        // Grow: add new head, keep tail
        state.snake.unshift(head)
      } else {
        // Move: add head, remove tail
        state.snake.unshift(head)
        state.snake.pop()
        state.ticksSinceApple++
      }

      // Starvation (hard mode)
      if (state.difficulty === 'hard' && state.ticksSinceApple >= (config.starvation || 0)) {
        state.status = 'gameover'
        return
      }

      // Win condition (30% fill)
      const target = Math.floor(state.gridSize * state.gridSize * 0.3)
      if (state.snake.length >= target) {
        const bonuses = { easy: 100, medium: 150, hard: 200 }
        state.score += bonuses[state.difficulty] || 0
        state.status = 'won'
        return
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
    }
  },

  // ===== Actions =====
  actions: {
    start({ commit, state }, difficulty) {
      commit('SET_DIFF', difficulty)
      commit('RESET')
      commit('SPAWN_APPLES')

      // Survivor: skip countdown → start immediately
      if (state.difficulty === 'survivor') {
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
      if (state.status === 'running') {
        commit('TICK_TIME')
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
    }
  }
})

const app = createApp(App)
app.use(store)
app.mount('#app')
