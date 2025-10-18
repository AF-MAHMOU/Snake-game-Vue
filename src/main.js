import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import './styles.css'

// Create Vuex store
const store = createStore({
  state: {
    difficulty: 'easy',
    config: {
      easy: { grid: 20, tick: 140, startLen: 3, applesAtOnce: [1,1], timerSec: 180, applePts: 10 },
      medium: { grid: 24, tick: 110, startLen: 4, applesAtOnce: [1,2], timerSec: 150, applePts: 20 },
      hard: { grid: 28, tick: 85, startLen: 5, applesAtOnce: [2,2], timerSec: 120, applePts: 30, starvation: 30 }
    },
    status: 'menu', // menu, countdown, running, paused, won, gameover
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
  
  getters: {
    speedMs: (state) => state.config[state.difficulty].tick,
    length: (state) => state.snake.length,
    progress: (state) => {
      const target = Math.floor(state.gridSize * state.gridSize * 0.3)
      return Math.min(state.snake.length / target, 1)
    },
    currentConfig: (state) => state.config[state.difficulty]
  },
  
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
      state.timeLeft = config.timerSec
      state.ticksSinceApple = 0
      
      // Initialize snake
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
      if (state.dir.x !== -dir.x || state.dir.y !== -dir.y) {
        state.nextDir = dir
      }
    },
    
    SPAWN_APPLES(state) {
      const config = state.config[state.difficulty]
      const [minApples, maxApples] = config.applesAtOnce
      
      // Always ensure we have at least minApples
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
            state.snake.some(segment => segment.x === newApple.x && segment.y === newApple.y) ||
            state.apples.some(apple => apple.x === newApple.x && apple.y === newApple.y)
          )
        )
        
        if (attempts < 100) {
          state.apples.push(newApple)
        } else {
          break // Avoid infinite loop
        }
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
      
      // Check wall collision
      if (head.x < 0 || head.x >= state.gridSize || head.y < 0 || head.y >= state.gridSize) {
        state.status = 'gameover'
        return
      }
      
      // Check self collision
      if (state.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        state.status = 'gameover'
        return
      }
      
      // Check apple collision
      const appleIndex = state.apples.findIndex(apple => apple.x === head.x && apple.y === head.y)
      if (appleIndex !== -1) {
        // Eat apple
        state.apples.splice(appleIndex, 1)
        
        // Calculate score
        let points = config.applePts
        points += Math.min(10, state.streak * 2) // Streak bonus
        points += 3 // Speed bonus (always within 5 ticks)
        
        state.score += points
        state.streak++
        state.ticksSinceApple = 0
        
        // Don't pop tail when eating apple
        state.snake.unshift(head)
      } else {
        // No apple, move normally
        state.snake.unshift(head)
        state.snake.pop()
        state.ticksSinceApple++
      }
      
      // Check starvation (Hard mode only)
      if (state.difficulty === 'hard' && state.ticksSinceApple >= config.starvation) {
        state.status = 'gameover'
        return
      }
      
      // Check win condition
      const target = Math.floor(state.gridSize * state.gridSize * 0.3)
      if (state.snake.length >= target) {
        // Add level-clear bonus
        const bonuses = { easy: 100, medium: 150, hard: 200 }
        state.score += bonuses[state.difficulty]
        state.status = 'won'
        return
      }
      
      // Spawn new apples
      this.commit('SPAWN_APPLES')
    },
    
    TICK_TIME(state) {
      state.timeLeft--
      if (state.timeLeft <= 0) {
        state.status = 'gameover'
      }
    },
    
    SET_BEST(state, score) {
      if (score > state.bestScore) {
        state.bestScore = score
      }
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
  
  actions: {
    start({ commit }, difficulty) {
      commit('SET_DIFF', difficulty)
      commit('RESET')
      commit('SET_STATUS', 'countdown')
      commit('SET_COUNTDOWN', 3)
      commit('SPAWN_APPLES')
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
      // Use predefined emoji characters instead of GitHub API
      const emojis = {
        'apple': '🍎',
        'cherry': '🍒',
        'grapes': '🍇',
        'strawberry': '🍓',
        'peach': '🍑',
        'pear': '🍐',
        'banana': '🍌',
        'orange': '🍊',
        'lemon': '🍋',
        'watermelon': '🍉',
        'pineapple': '🍍',
        'mango': '🥭',
        'kiwi': '🥝',
        'coconut': '🥥',
        'avocado': '🥑',
        'tomato': '🍅',
        'eggplant': '🍆',
        'carrot': '🥕',
        'corn': '🌽',
        'hot_pepper': '🌶️',
        'cucumber': '🥒',
        'broccoli': '🥦',
        'mushroom': '🍄',
        'peanuts': '🥜',
        'bread': '🍞',
        'croissant': '🥐',
        'baguette': '🥖',
        'pretzel': '🥨',
        'bagel': '🥯',
        'pancakes': '🥞',
        'waffle': '🧇',
        'cheese': '🧀',
        'meat_on_bone': '🍖',
        'poultry_leg': '🍗',
        'cut_of_meat': '🥩',
        'bacon': '🥓',
        'hamburger': '🍔',
        'fries': '🍟',
        'pizza': '🍕',
        'hotdog': '🌭',
        'sandwich': '🥪',
        'taco': '🌮',
        'burrito': '🌯',
        'stuffed_flatbread': '🥙',
        'falafel': '🧆',
        'egg': '🥚',
        'cooking': '🍳',
        'shallow_pan_of_food': '🥘',
        'stew': '🍲',
        'bowl_with_spoon': '🥣',
        'green_salad': '🥗',
        'popcorn': '🍿',
        'butter': '🧈',
        'salt': '🧂',
        'canned_food': '🥫',
        'bento': '🍱',
        'rice_cracker': '🍘',
        'rice_ball': '🍙',
        'rice': '🍚',
        'curry': '🍛',
        'ramen': '🍜',
        'spaghetti': '🍝',
        'sweet_potato': '🍠',
        'oden': '🍢',
        'sushi': '🍣',
        'fried_shrimp': '🍤',
        'fish_cake': '🍥',
        'moon_cake': '🥮',
        'dango': '🍡',
        'dumpling': '🥟',
        'fortune_cookie': '🥠',
        'takeout_box': '🥡',
        'crab': '🦀',
        'lobster': '🦞',
        'shrimp': '🦐',
        'squid': '🦑',
        'oyster': '🦪',
        'icecream': '🍦',
        'shaved_ice': '🍧',
        'ice_cream': '🍨',
        'doughnut': '🍩',
        'cookie': '🍪',
        'birthday': '🎂',
        'cake': '🍰',
        'cupcake': '🧁',
        'pie': '🥧',
        'chocolate_bar': '🍫',
        'candy': '🍬',
        'lollipop': '🍭',
        'custard': '🍮',
        'honey_pot': '🍯',
        'baby_bottle': '🍼',
        'milk_glass': '🥛',
        'coffee': '☕',
        'tea': '🍵',
        'sake': '🍶',
        'beer': '🍺',
        'beers': '🍻',
        'clinking_glasses': '🥂',
        'tumbler_glass': '🥃',
        'cup_with_straw': '🥤',
        'beverage_box': '🧃',
        'mate': '🧉',
        'ice': '🧊'
      }
      commit('SET_EMOJI_MAP', emojis)
    }
  }
})

const app = createApp(App)
app.use(store)
app.mount('#app')
