<template>
  <div class="game-board-container">
    <canvas 
      ref="canvas" 
      :width="canvasSize" 
      :height="canvasSize"
      class="game-canvas"
      :class="{ 'flash': isFlashing }"
    ></canvas>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'GameBoard',
  data() {
    return {
      canvasSize: 560,
      isFlashing: false,
      audioContext: null,
      sounds: {}
    }
  },
  computed: {
    ...mapState(['snake', 'apples', 'gridSize', 'status', 'emojiMap']),
    ...mapGetters(['currentConfig']),
    
    cellSize() {
      return Math.floor(this.canvasSize / this.gridSize)
    }
  },
  watch: {
    snake: {
      handler() {
        this.render()
      },
      deep: true
    },
    apples: {
      handler() {
        this.render()
      },
      deep: true
    },
    status(newStatus) {
      if (newStatus === 'gameover') {
        this.flash()
        this.playSound('bump')
        this.vibrate([200, 80, 200])
      } else if (newStatus === 'won') {
        this.playSound('levelup')
        this.vibrate([100, 50, 100, 50, 200])
      }
    }
  },
  mounted() {
    this.initAudio()
    this.render()
  },
  methods: {
    initAudio() {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        
        // Create simple sound effects using Web Audio API
        this.sounds = {
          eat: this.createTone(800, 0.1),
          bump: this.createTone(200, 0.3),
          levelup: this.createTone(600, 0.5)
        }
      } catch (error) {
        console.log('Audio not supported')
      }
    },
    
    createTone(frequency, duration) {
      return () => {
        if (!this.audioContext) return
        
        const oscillator = this.audioContext.createOscillator()
        const gainNode = this.audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)
        
        oscillator.start(this.audioContext.currentTime)
        oscillator.stop(this.audioContext.currentTime + duration)
      }
    },
    
    playSound(soundName) {
      if (this.sounds[soundName]) {
        try {
          this.sounds[soundName]()
        } catch (error) {
          console.log('Sound playback failed')
        }
      }
    },
    
    vibrate(pattern) {
      if (navigator.vibrate) {
        try {
          navigator.vibrate(pattern)
        } catch (error) {
          console.log('Vibration not supported')
        }
      }
    },
    
    flash() {
      this.isFlashing = true
      setTimeout(() => {
        this.isFlashing = false
      }, 200)
    },
    
    render() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      const cellSize = this.cellSize
      
      // Clear canvas
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, this.canvasSize, this.canvasSize)
      
      // Draw grid
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      
      for (let i = 0; i <= this.gridSize; i++) {
        const pos = i * cellSize
        ctx.beginPath()
        ctx.moveTo(pos, 0)
        ctx.lineTo(pos, this.canvasSize)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.moveTo(0, pos)
        ctx.lineTo(this.canvasSize, pos)
        ctx.stroke()
      }
      
      // Draw snake
      this.snake.forEach((segment, index) => {
        const x = segment.x * cellSize
        const y = segment.y * cellSize
        
        if (index === 0) {
          // Snake head
          ctx.fillStyle = '#4CAF50'
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
          
          // Eyes
          ctx.fillStyle = '#000'
          const eyeSize = Math.max(2, cellSize / 8)
          const eyeOffset = cellSize / 4
          
          ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize)
          ctx.fillRect(x + cellSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize)
        } else {
          // Snake body
          ctx.fillStyle = '#66BB6A'
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        }
      })
      
      // Draw apples
      this.apples.forEach((apple, index) => {
        const x = apple.x * cellSize
        const y = apple.y * cellSize
        const centerX = x + cellSize / 2
        const centerY = y + cellSize / 2
        const radius = cellSize / 2 - 2
        
        // Use consistent emoji based on apple index to avoid flickering
        const emojiKeys = Object.keys(this.emojiMap)
        if (emojiKeys.length > 0) {
          // Use a consistent emoji for each apple based on its index
          const emojiIndex = index % emojiKeys.length
          const emoji = this.emojiMap[emojiKeys[emojiIndex]]
          ctx.font = `${cellSize - 4}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(emoji, centerX, centerY)
        } else {
          // Fallback to red circle
          ctx.fillStyle = '#F44336'
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
    },
    
    checkAppleCollision() {
      // This method is called when the snake moves
      const head = this.snake[0]
      const appleIndex = this.apples.findIndex(apple => 
        apple.x === head.x && apple.y === head.y
      )
      
      if (appleIndex !== -1) {
        this.playSound('eat')
        this.vibrate([30])
      }
    }
  }
}
</script>

<style scoped>
.game-board-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-canvas {
  border: 3px solid #333;
  border-radius: 10px;
  background: #1a1a1a;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.game-canvas.flash {
  animation: flash 0.2s ease-in-out;
}

@keyframes flash {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.5); }
  100% { filter: brightness(1); }
}
</style>
