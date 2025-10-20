import { createApp } from 'vue'
import { createStore } from 'vuex'
import App from './App.vue'
import './styles.css'

// Create Vuex store
const store = createStore({
  state: {
    difficulty: 'easy',
    snake: [],
    apples: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    score: 0,
    streak: 0,
    timeLeft: 0,
    ticksSinceApple: 0,
    status: 'menu', // menu, countdown, running, paused, gameover, won
    countdown: 0,
    bestScore: 0,
    emojiMap: {},
    gridSize: 20,
    config: {
      easy: {
        grid: 20,
        tick: 150,
        timerSec: 60,
        applePts: 6, // User requested 6 points per apple
        apples: 1,
        starvation: 200,
        borders: { top: false, bottom: false, left: false, right: false } // All borders open
      },
      medium: {
        grid: 25,
        tick: 120,
        timerSec: 120, // Increased from 45s to 2 minutes
        applePts: 120, // Need only ~1.6 apples to win
        apples: 1,
        starvation: 150,
        borders: { top: true, bottom: true, left: false, right: false } // Only vertical borders open
      },
      hard: {
        grid: 30,
        tick: 80,
        timerSec: 300, // Increased from 30s to 5 minutes
        applePts: 150, // Need only ~1.8 apples to win
        apples: 1,
        starvation: 100,
        borders: { top: true, bottom: true, left: true, right: true } // All borders blocked
      },
      survivor: {
        grid: 20,
        tick: 150,
        timerSec: null, // No timer in survivor mode
        applePts: 80, // Match easy mode for consistency
        apples: 1,
        starvation: null, // No starvation in survivor mode
        borderBlockScore: 200, // Block borders every 200 points
        accelPer100: 5, // Speed increase per 100 points (much slower scaling)
        minTick: 80, // Minimum speed (much more reasonable)
        borders: { top: false, bottom: false, left: false, right: false }
      }
    },
    survivalTime: 0,
    bestSurvivalTime: 0,
    currentStage: 1,
    survivalRecords: [],
    maxRecords: 10,
    volume: 50,
    lastSoundPlayed: null,
    hudMinimized: false, // HUD minimized state
    stageAbilities: {}, // Active stage abilities for survivor mode
    explosionCells: [], // Cells to explode (for stage 1 ability)
    seeds: [], // Seeds spawned by explosion ability
    borderBounceActive: false, // Border bounce animation active
    borderBounceDuration: 0, // Duration of border bounce pause
    borderBounceDirection: null, // Direction of bounce (for animation)
    lastAppleEaten: null, // Track timing for combo bonuses
    appleComboCount: 0 // Count consecutive apples eaten quickly
  },

  getters: {
    currentConfig: (state) => state.config[state.difficulty] || {},
    length: (state) => state.snake.length,
    progress: (state) => {
      if (state.difficulty === 'survivor') return 0
      const config = state.config[state.difficulty]
      const target = Math.floor(state.gridSize * state.gridSize * 0.3)
      const targetScore = target * config.applePts // Convert target cells to target score
      return Math.min(1, state.score / targetScore)
    },
    speedMs: (state) => {
      const cfg = state.config[state.difficulty] || {}
      let baseSpeed
      if (state.difficulty === 'survivor') {
        const steps = Math.floor(state.score / 100) // 0,1,2,...
        const accel = cfg.accelPer100 ?? 10
        const minTick = cfg.minTick ?? 50
        const next = cfg.tick - steps * accel
        baseSpeed = Math.max(minTick, next)
      } else {
        baseSpeed = cfg.tick
      }

      // Apply border bounce pause
      if (state.borderBounceActive) {
        baseSpeed *= 10 // Much slower during bounce pause
      }

      return baseSpeed
    }
  },

    // ===== Mutations =====
    mutations: {
      // Helper function to handle game over with survival record saving
      HANDLE_GAME_OVER(state) {
        state.status = 'gameover'
        
        // Save survival record if in survivor mode
        if (state.difficulty === 'survivor' && state.survivalTime > 0) {
          this.commit('ADD_SURVIVAL_RECORD', state.survivalTime)
        }
      },
    SET_STATUS(state, status) {
      state.status = status
    },

    QUEUE_DIR(state, dir) {
      // Prevent reverse direction (snake can't go backwards into itself)
      const currentDir = state.dir
      const isReverse = (dir.x === -currentDir.x && dir.y === -currentDir.y)
      
      if (!isReverse) {
        state.nextDir = dir
      }
    },

    SET_CONFIG(state, config) {
      state.config = config
    },

    FETCH_EMOJIS(state) {
      // This will be handled by the GameBoard component
      // We'll emit an event that the component can listen to
    },

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
      state.status = 'countdown'
      state.countdown = 3
      state.survivalTime = 0
      state.currentStage = 1
      state.explosionCells = [] // Reset explosion effects
      state.seeds = [] // Reset seeds
      state.borderBounceActive = false // Reset border bounce
      state.borderBounceDuration = 0 // Reset border bounce duration
      state.borderBounceDirection = null // Reset border bounce direction
      
      // Reset survivor mode borders to all open
      if (state.difficulty === 'survivor') {
        state.config.survivor.borders = { top: false, bottom: false, left: false, right: false }
        
        // Activate Stage 1 ability immediately
        state.stageAbilities = {}
        state.stageAbilities[1] = 'explosion'
      }
    },

    SET_DIR(state, dir) {
      // Prevent 180-degree turns
      if (state.dir.x === -dir.x && state.dir.y === -dir.y) return
      state.nextDir = dir
    },

    STEP(state) {
      // Update direction
      state.dir = { ...state.nextDir }

      // Move head
      const head = { ...state.snake[0] }
      head.x += state.dir.x
      head.y += state.dir.y

      // Handle border mechanics and wrap-around
      const borders = state.config[state.difficulty].borders || { top: true, bottom: true, left: true, right: true }
      
      // Check wall collision
      if (head.x < 0) {
        if (borders.left) {
          // Survivor mode: bounce animation instead of game over
          if (state.difficulty === 'survivor') {
            // Check if already bouncing - if so, end game
            if (state.borderBounceActive) {
              this.commit('HANDLE_GAME_OVER')
              this.commit('PLAY_SOUND', 'bump')
              return
            }
            this.commit('ACTIVATE_BORDER_BOUNCE', 'left')
            head.x = 0 // Keep snake at border
            this.commit('PLAY_SOUND', 'bump')
            return
          } else {
            this.commit('HANDLE_GAME_OVER')
            this.commit('PLAY_SOUND', 'bump')
            return
          }
        } else {
          // Wrap around to right side
          head.x = state.gridSize - 1
        }
      }
      if (head.x >= state.gridSize) {
        if (borders.right) {
          if (state.difficulty === 'survivor') {
            if (state.borderBounceActive) {
              this.commit('HANDLE_GAME_OVER')
              this.commit('PLAY_SOUND', 'bump')
              return
            }
            this.commit('ACTIVATE_BORDER_BOUNCE', 'right')
            head.x = state.gridSize - 1
            this.commit('PLAY_SOUND', 'bump')
            return
          } else {
            this.commit('HANDLE_GAME_OVER')
            this.commit('PLAY_SOUND', 'bump')
            return
          }
        } else {
          head.x = 0
        }
      }
      if (head.y < 0) {
        if (borders.top) {
          if (state.difficulty === 'survivor') {
            if (state.borderBounceActive) {
              this.commit('HANDLE_GAME_OVER')
              this.commit('PLAY_SOUND', 'bump')
              return
            }
            this.commit('ACTIVATE_BORDER_BOUNCE', 'top')
            head.y = 0
            this.commit('PLAY_SOUND', 'bump')
            return
          } else {
            this.commit('HANDLE_GAME_OVER')
            this.commit('PLAY_SOUND', 'bump')
            return
          }
        } else {
          head.y = state.gridSize - 1
        }
      }
      if (head.y >= state.gridSize) {
        if (borders.bottom) {
          if (state.difficulty === 'survivor') {
            if (state.borderBounceActive) {
              this.commit('HANDLE_GAME_OVER')
              this.commit('PLAY_SOUND', 'bump')
              return
            }
            this.commit('ACTIVATE_BORDER_BOUNCE', 'bottom')
            head.y = state.gridSize - 1
            this.commit('PLAY_SOUND', 'bump')
            return
          } else {
            this.commit('HANDLE_GAME_OVER')
            this.commit('PLAY_SOUND', 'bump')
            return
          }
        } else {
          head.y = 0
        }
      }

      // Self collision
      if (state.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        this.commit('HANDLE_GAME_OVER')
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
        let points = state.config[state.difficulty].applePts
        points += Math.min(10, state.streak * 2) // streak bonus
        points += 3                               // small speed bonus
        
        // Stage 2 ability: Double points
        if (state.difficulty === 'survivor' && state.stageAbilities[2] === 'double_points') {
          points *= 2
        }
        
        state.score += points

        state.streak++
        state.ticksSinceApple = 0

        // Combo bonus logic
        const now = Date.now()
        if (state.lastAppleEaten && (now - state.lastAppleEaten) <= 3000) { // Within 3 seconds
          state.appleComboCount++
          if (state.appleComboCount >= 3) {
            // Big combo bonus!
            const comboBonus = 500
            state.score += comboBonus
            console.log(`🎉 COMBO BONUS! +${comboBonus} points for eating ${state.appleComboCount} apples in 3 seconds!`)
            state.appleComboCount = 0 // Reset combo counter
          }
        } else {
          state.appleComboCount = 1 // Start new combo
        }
        state.lastAppleEaten = now

        // Stage 1 ability: Explosion effect - spawn seeds around eaten apple
        if (state.difficulty === 'survivor' && Object.values(state.stageAbilities).includes('explosion')) {
          // Spawn 6 seeds around the eaten apple
          const seedPositions = [
            { x: head.x - 1, y: head.y },     // Left
            { x: head.x + 1, y: head.y },     // Right
            { x: head.x, y: head.y - 1 },     // Top
            { x: head.x, y: head.y + 1 },     // Bottom
            { x: head.x - 1, y: head.y - 1 }, // Top-left
            { x: head.x + 1, y: head.y + 1 }  // Bottom-right
          ]
          
          seedPositions.forEach(pos => {
            // Check bounds and avoid snake/other seeds
            if (pos.x >= 0 && pos.x < state.gridSize && 
                pos.y >= 0 && pos.y < state.gridSize &&
                !state.snake.some(seg => seg.x === pos.x && seg.y === pos.y) &&
                !state.seeds.some(seed => seed.x === pos.x && seed.y === pos.y)) {
              state.seeds.push({ x: pos.x, y: pos.y, time: Date.now() })
            }
          })
        }

        // Grow: add new head, keep tail
        state.snake.unshift(head)
      } else {
        // No apple eaten, check for seed eating
        const seedIndex = state.seeds.findIndex(seed => seed.x === head.x && seed.y === head.y)
        if (seedIndex !== -1) {
          // Remove the eaten seed
          state.seeds.splice(seedIndex, 1)
          
          // Play eat sound
          this.commit('PLAY_SOUND', 'eat')
          
          // Add 1/6 of apple points (rounded up)
          const seedPoints = Math.ceil(state.config[state.difficulty].applePts / 6)
          state.score += seedPoints
          state.streak++
          state.ticksSinceApple = 0
          
          // Grow snake by adding new head
          state.snake.unshift(head)
        } else {
          // No apple or seed eaten, just move
          state.snake.unshift(head)
          state.snake.pop()
          state.ticksSinceApple++
        }
      }

      // Survivor mode: Check for stage progression and border blocking
      if (state.difficulty === 'survivor' && state.config[state.difficulty].borderBlockScore) {
        // Calculate stage based on score (every 200 points = new stage)
        const newStage = Math.floor(state.score / state.config[state.difficulty].borderBlockScore) + 1
        
        // Update stage and activate abilities
        if (newStage !== state.currentStage) {
          this.commit('UPDATE_SURVIVOR_STAGE')
        }
        
        // Block borders progressively (every 200 points)
        const borderBlocks = Math.floor(state.score / state.config[state.difficulty].borderBlockScore)
        const currentBlocks = Object.values(borders).filter(blocked => blocked).length
        
        if (borderBlocks > currentBlocks && borderBlocks <= 4) {
          // Block the next border
          const borderOrder = ['top', 'right', 'bottom', 'left']
          const borderToBlock = borderOrder[borderBlocks - 1]
          this.commit('BLOCK_SURVIVOR_BORDER', borderToBlock)
        }
      }

      // Stage 3 ability: Magnet - attract apples and seeds to snake
      if (state.difficulty === 'survivor' && Object.values(state.stageAbilities).includes('magnet')) {
        const snakeHead = state.snake[0]
        const magnetRadius = 3 // Attract apples and seeds within 3 cells
        
        // Process apples in reverse order to avoid index issues when removing
        for (let i = state.apples.length - 1; i >= 0; i--) {
          const apple = state.apples[i]
          const distance = Math.abs(apple.x - snakeHead.x) + Math.abs(apple.y - snakeHead.y)
          
          if (distance <= magnetRadius && distance > 0) {
            // Move apple one step closer to snake
            const dx = apple.x - snakeHead.x
            const dy = apple.y - snakeHead.y
            
            if (Math.abs(dx) > Math.abs(dy)) {
              // Move horizontally
              apple.x += dx > 0 ? -1 : 1
            } else {
              // Move vertically
              apple.y += dy > 0 ? -1 : 1
            }
            
            // Keep apple within bounds
            apple.x = Math.max(0, Math.min(state.gridSize - 1, apple.x))
            apple.y = Math.max(0, Math.min(state.gridSize - 1, apple.y))
            
            // Check if apple reached snake head (magnet eating)
            if (apple.x === snakeHead.x && apple.y === snakeHead.y) {
              // Remove the apple
              state.apples.splice(i, 1)
              
              // Play eat sound
              this.commit('PLAY_SOUND', 'eat')
              
              // Score (with double points if active)
              let points = state.config[state.difficulty].applePts
              points += Math.min(10, state.streak * 2) // streak bonus
              points += 3 // small speed bonus
              
              // Stage 2 ability: Double points
              if (Object.values(state.stageAbilities).includes('double_points')) {
                points *= 2
              }
              
              state.score += points
              state.streak++
              state.ticksSinceApple = 0
              
              // Grow: add new head, keep tail
              state.snake.unshift({ x: snakeHead.x, y: snakeHead.y })
              
              // Apply other stage abilities for magnet-eaten apples
              this.commit('APPLY_STAGE_ABILITIES', { config: state.config[state.difficulty], snakeHead })
            }
          }
        }
        
        // Process seeds in reverse order to avoid index issues when removing
        for (let i = state.seeds.length - 1; i >= 0; i--) {
          const seed = state.seeds[i]
          const distance = Math.abs(seed.x - snakeHead.x) + Math.abs(seed.y - snakeHead.y)
          
          if (distance <= magnetRadius && distance > 0) {
            // Move seed one step closer to snake
            const dx = seed.x - snakeHead.x
            const dy = seed.y - snakeHead.y
            
            if (Math.abs(dx) > Math.abs(dy)) {
              // Move horizontally
              seed.x += dx > 0 ? -1 : 1
            } else {
              // Move vertically
              seed.y += dy > 0 ? -1 : 1
            }
            
            // Keep seed within bounds
            seed.x = Math.max(0, Math.min(state.gridSize - 1, seed.x))
            seed.y = Math.max(0, Math.min(state.gridSize - 1, seed.y))
            
            // Check if seed reached snake head (magnet eating)
            if (seed.x === snakeHead.x && seed.y === snakeHead.y) {
              // Remove the seed
              state.seeds.splice(i, 1)
              
              // Play eat sound
              this.commit('PLAY_SOUND', 'eat')
              
              // Add 1/6 of apple points (rounded up)
              const seedPoints = Math.ceil(state.config[state.difficulty].applePts / 6)
              state.score += seedPoints
              state.streak++
              state.ticksSinceApple = 0
              
              // Grow snake by adding new head
              state.snake.unshift({ x: snakeHead.x, y: snakeHead.y })
            }
          }
        }
      }

      // Starvation (all modes except Survivor)
      if (state.difficulty !== 'survivor' && state.ticksSinceApple >= (state.config[state.difficulty].starvation || 0)) {
        // No need to save record here as this doesn't happen in survivor mode
        state.status = 'gameover'
        return
      }

      // Win condition (30% fill) - only for non-survivor modes
      if (state.difficulty !== 'survivor') {
        const config = state.config[state.difficulty]
        const targetCells = Math.floor(state.gridSize * state.gridSize * 0.3)
        const targetScore = targetCells * config.applePts
        
        if (state.score >= targetScore) {
          const bonuses = { easy: 100, medium: 150, hard: 200 }
          state.score += bonuses[state.difficulty] || 0
          state.status = 'won'
          this.commit('PLAY_SOUND', 'levelup')
          return
        }
      }
    },

    // Keep apples coming - Dynamic spawning based on time and grid size
    SPAWN_APPLES(state) {
      const config = state.config[state.difficulty]
      const gridArea = state.gridSize * state.gridSize
      const maxApples = Math.floor(gridArea * 0.3) // 30% of map capacity
      
      // Calculate target apples based on apples eaten
      let targetApples = 1 // Start with 1 apple
      
      // Count apples eaten (score divided by apple points)
      const applesEaten = Math.floor(state.score / config.applePts)
      
      // Increase apples based on apples eaten (more aggressive spawning)
      if (applesEaten >= 3) {
        targetApples = Math.min(maxApples, 1 + Math.floor(applesEaten / 3)) // +1 apple every 3 apples eaten
      } else if (applesEaten >= 1) {
        targetApples = 2 // 2 apples after eating 1 apple
      } else {
        targetApples = 1 // 1 apple at start
      }
      
      // Ensure we don't exceed the cap
      targetApples = Math.min(targetApples, maxApples)
      
      // Debug logging
      if (state.apples.length !== targetApples) {
        console.log(`Apples eaten: ${applesEaten}, Target apples: ${targetApples}, Current: ${state.apples.length}, Difficulty: ${state.difficulty}, Snake length: ${state.snake.length}`)
      }
      
      // Spawn apples up to target
      let attempts = 0
      while (state.apples.length < targetApples && attempts < 100) {
        attempts++
        const x = Math.floor(Math.random() * state.gridSize)
        const y = Math.floor(Math.random() * state.gridSize)
        
        // Avoid snake, existing apples, and seeds
        if (!state.snake.some(seg => seg.x === x && seg.y === y) &&
            !state.apples.some(apple => apple.x === x && apple.y === y) &&
            !state.seeds.some(seed => seed.x === x && seed.y === y)) {
          state.apples.push({ x, y })
          console.log(`Spawned apple at (${x}, ${y}), Total apples: ${state.apples.length}`)
        }
      }
      
      if (attempts >= 100 && state.apples.length < targetApples) {
        console.log(`Failed to spawn enough apples after ${attempts} attempts. Snake length: ${state.snake.length}`)
      }
    },

    // Timer tick (disabled in Survivor)
    TICK_TIME(state) {
      if (state.difficulty === 'survivor') return
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
        score: state.score,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
      }
      
      state.survivalRecords.push(record)
      
      // Sort by time (descending) and keep only top records
      state.survivalRecords.sort((a, b) => b.time - a.time)
      state.survivalRecords = state.survivalRecords.slice(0, state.maxRecords)
    },

    CLEAR_SURVIVAL_RECORDS(state) {
      state.survivalRecords = []
    },

    SET_VOLUME(state, volume) {
      state.volume = Math.max(0, Math.min(100, volume))
    },

    PLAY_SOUND(state, soundName) {
      // This will be handled by the GameBoard component
      // We'll emit an event that the component can listen to
      state.lastSoundPlayed = { sound: soundName, timestamp: Date.now() }
    },

    TOGGLE_HUD_MINIMIZED(state) {
      state.hudMinimized = !state.hudMinimized
    },

    // Stage abilities for survivor mode
    SET_STAGE_ABILITY(state, { stage, ability }) {
      state.stageAbilities[stage] = ability
    },

    CLEAR_STAGE_ABILITIES(state) {
      state.stageAbilities = {}
    },

    // Border bounce animation for survivor mode
    ACTIVATE_BORDER_BOUNCE(state, direction) {
      state.borderBounceActive = true
      state.borderBounceDuration = 2000 // 2 seconds
      state.borderBounceDirection = direction
      
      // Set timeout to deactivate bounce
      setTimeout(() => {
        this.commit('DEACTIVATE_BORDER_BOUNCE')
      }, state.borderBounceDuration)
    },

    DEACTIVATE_BORDER_BOUNCE(state) {
      state.borderBounceActive = false
      state.borderBounceDuration = 0
      state.borderBounceDirection = null
    },

    // Survivor mode stage progression with increasing requirements
    UPDATE_SURVIVOR_STAGE(state) {
      // Calculate stage with increasing point requirements
      let stage = 1
      let totalRequired = 0
      
      // Stage requirements: 200, 300, 400, 500, 600, 700, 800, 900, 1000...
      while (totalRequired <= state.score) {
        stage++
        totalRequired += 200 + (stage - 2) * 100 // 200, 300, 400, 500...
      }
      
      if (stage !== state.currentStage) {
        state.currentStage = stage
        
        // Define all available abilities (only 3 now)
        const allAbilities = {
          1: 'explosion', // Explosion when eating apples
          2: 'double_points', // Double points for apples
          3: 'magnet', // Apples are attracted to snake
        }
        
        if (stage <= 3) {
          // Stages 1-3: Add ONLY the specific ability for this stage
          state.stageAbilities = {} // Clear all previous abilities
          state.stageAbilities[stage] = allAbilities[stage]
          
          // Play level up sound for new abilities
          this.commit('PLAY_SOUND', 'levelup')
        } else {
          // Stage 4+: Randomly select from all abilities
          const abilityKeys = Object.keys(allAbilities)
          const randomAbility = abilityKeys[Math.floor(Math.random() * abilityKeys.length)]
          state.stageAbilities = {} // Clear all previous abilities
          state.stageAbilities[`random_${Date.now()}`] = allAbilities[randomAbility]
          
          // Play level up sound for new abilities
          this.commit('PLAY_SOUND', 'levelup')
        }
      }
    },

    // Block survivor mode borders progressively
    BLOCK_SURVIVOR_BORDER(state, border) {
      if (state.difficulty === 'survivor') {
        state.config.survivor.borders[border] = true
        console.log(`Blocked ${border} border`)
      }
    },

    // Helper method to apply stage abilities for magnet-eaten apples
    APPLY_STAGE_ABILITIES(state, { config, snakeHead }) {
      // Stage 1 ability: Explosion effect - spawn seeds around eaten apple
      if (state.difficulty === 'survivor' && Object.values(state.stageAbilities).includes('explosion')) {
        // Spawn 6 seeds around the eaten apple
        const seedPositions = [
          { x: snakeHead.x - 1, y: snakeHead.y },     // Left
          { x: snakeHead.x + 1, y: snakeHead.y },     // Right
          { x: snakeHead.x, y: snakeHead.y - 1 },     // Top
          { x: snakeHead.x, y: snakeHead.y + 1 },     // Bottom
          { x: snakeHead.x - 1, y: snakeHead.y - 1 }, // Top-left
          { x: snakeHead.x + 1, y: snakeHead.y + 1 }  // Bottom-right
        ]
        
        seedPositions.forEach(pos => {
          // Check bounds and avoid snake/other seeds
          if (pos.x >= 0 && pos.x < state.gridSize && 
              pos.y >= 0 && pos.y < state.gridSize &&
              !state.snake.some(seg => seg.x === pos.x && seg.y === pos.y) &&
              !state.seeds.some(seed => seed.x === pos.x && seed.y === pos.y)) {
            state.seeds.push({ x: pos.x, y: pos.y, time: Date.now() })
          }
        })
      }
    },

    // Safety method to reset stuck states
    RESET_STUCK_STATES(state) {
      // Reset border bounce if stuck
      if (state.borderBounceActive && state.borderBounceDuration <= 0) {
        state.borderBounceActive = false
        state.borderBounceDuration = 0
        state.borderBounceDirection = null
      }
    }
  },

  // ===== Actions =====
  actions: {
    fetchEmojis({ commit }) {
      // This will be handled by the GameBoard component
      commit('FETCH_EMOJIS')
    },

    start({ commit, state }, difficulty) {
      console.log('Starting game with difficulty:', difficulty)
      commit('SET_DIFF', difficulty)
      commit('RESET')
      commit('SPAWN_APPLES')
      
      // Initialize snake in center
      const center = Math.floor(state.gridSize / 2)
      state.snake = [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center }
      ]
    },

    pause({ commit, state }) {
      if (state.status === 'running') {
        state.status = 'paused'
      }
    },

    resume({ commit, state }) {
      if (state.status === 'paused') {
        state.status = 'running'
        // Reset any stuck states when resuming
        commit('RESET_STUCK_STATES')
      }
    },

    gameOver({ commit, state }) {
      if (state.status === 'running') {
        commit('HANDLE_GAME_OVER')
      }
    },

    tick({ commit, state }) {
      if (state.status === 'running') {
        commit('STEP')
        commit('SPAWN_APPLES')
      }
    },

    second({ commit, state }) {
      if (state.status === 'countdown') {
        commit('DECREMENT_COUNTDOWN')
      } else if (state.status === 'running') {
        commit('TICK_TIME')
        commit('INCREMENT_SURVIVAL_TIME')
      }
    }
  }
})

const app = createApp(App)
app.use(store)
app.mount('#app')