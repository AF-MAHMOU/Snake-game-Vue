<template>
  <div class="game-board-container">
    <canvas 
      ref="canvas" 
      :width="canvasSize" 
      :height="canvasSize"
      class="game-canvas"
      :class="{ 'flash': isFlashing }"
    ></canvas>
    
    <!-- Particle effects container -->
    <div class="particles-container" ref="particlesContainer"></div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'GameBoard',
  data() {
    return {
      isFlashing: false,
      sounds: {}
    }
  },
  computed: {
    ...mapState(['snake', 'apples', 'gridSize', 'status', 'emojiMap', 'difficulty', 'volume', 'lastSoundPlayed']),
    ...mapGetters(['currentConfig']),
    
    
    canvasSize() {
      return 560
    },
    
    cellSize() {
      return Math.floor(this.canvasSize / this.gridSize)
    },

    currentBorders() {
      const config = this.$store.state.config[this.difficulty]
      return config.borders || { top: true, bottom: true, left: true, right: true }
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
        this.vibrate([200, 80, 200])
      } else if (newStatus === 'won') {
        this.vibrate([100, 50, 100, 50, 200])
      }
    },
    volume(newVolume) {
      // Update volume of all sounds when volume changes
      if (this.sounds) {
        Object.values(this.sounds).forEach(sound => {
          sound.volume = newVolume / 100
        })
      }
    },
    lastSoundPlayed(newSound) {
      // Play sound when store triggers it
      if (newSound && newSound.sound) {
        this.playSound(newSound.sound)
        
        // Trigger visual effects based on sound type
        if (newSound.sound === 'eat') {
          // Create particle effect at random position (simulating apple position)
          const x = Math.random() * this.canvasSize
          const y = Math.random() * this.canvasSize
          this.createAppleParticles(x, y)
        } else if (newSound.sound === 'levelup') {
          this.createLevelUpEffect()
        }
      }
    },
    
  },
  mounted() {
    this.initAudio()
    this.render()
    
    // Preload audio for instant playback
    setTimeout(() => {
      this.preloadAudio()
    }, 100)
    
    // Enable audio on first user interaction
    const enableAudioOnInteraction = () => {
      this.enableAudio()
      this.preloadAudio() // Also preload on first interaction
      document.removeEventListener('click', enableAudioOnInteraction)
      document.removeEventListener('keydown', enableAudioOnInteraction)
    }
    
    document.addEventListener('click', enableAudioOnInteraction)
    document.addEventListener('keydown', enableAudioOnInteraction)
  },
  
  beforeUnmount() {
    // Clean up audio
    Object.values(this.sounds).forEach(sound => {
      sound.pause()
      sound.src = ''
    })
  },
  
  methods: {
    initAudio() {
      try {
        // Load actual MP3 sound files
        this.sounds = {
          eat: new Audio('/sfx/eat.mp3'),
          bump: new Audio('/sfx/bump.mp3'),
          levelup: new Audio('/sfx/levelup.mp3')
        }
        
        // Set volume and optimize for immediate playback
        Object.values(this.sounds).forEach(sound => {
          sound.volume = (this.volume || 70) / 100
          sound.preload = 'auto'
          // Force immediate loading and prepare for instant playback
          sound.load()
          // Set to loop false to ensure clean playback
          sound.loop = false
        })
        
        console.log('Sound effects loaded successfully')
      } catch (error) {
        console.log('Audio not supported:', error)
      }
    },

    enableAudio() {
      // Enable audio context on first user interaction
      Object.values(this.sounds).forEach(sound => {
        if (sound.load) {
          sound.load()
        }
      })
    },

    preloadAudio() {
      // Aggressively preload all audio files for instant playback
      if (this.sounds) {
        Object.values(this.sounds).forEach(sound => {
          // Force load and prepare for immediate playback
          sound.load()
          // Try to play and immediately pause to "warm up" the audio
          const playPromise = sound.play()
          if (playPromise !== undefined) {
            playPromise.then(() => {
              sound.pause()
              sound.currentTime = 0
            }).catch(() => {
              // Ignore errors during preload
            })
          }
        })
      }
    },
    
    playSound(soundName) {
      if (this.sounds && this.sounds[soundName]) {
        try {
          const sound = this.sounds[soundName]
          // Pause any current playback to ensure clean restart
          sound.pause()
          
          // Set the starting position based on sound type
          if (soundName === 'eat') {
            // Start from 1.2 seconds in (where the crunch sound is)
            sound.currentTime = 1.2
          } else if (soundName === 'bump') {
            // Start from 0.8 seconds in for bump sound
            sound.currentTime = 0.8
          } else {
            // Level up sound from beginning
            sound.currentTime = 0
          }
          
          // Play immediately
          const playPromise = sound.play()
          if (playPromise !== undefined) {
            playPromise.then(() => {
              // Stop the sound after a short duration (except for levelup which plays fully)
              if (soundName !== 'levelup') {
                setTimeout(() => {
                  sound.pause()
                  sound.currentTime = 0
                }, soundName === 'eat' ? 800 : 1200) // 0.8s for eat (1.2 to 2.0), 1.2s for bump (0.8 to 2.0)
              }
            }).catch(error => {
              console.log('Sound playback failed:', error)
            })
          }
        } catch (error) {
          console.log('Sound playback failed:', error)
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

    createAppleParticles(x, y) {
      // Create particle effect when apple is eaten
      const particleCount = 8
      const container = this.$refs.particlesContainer
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div')
        particle.className = 'apple-particle'
        
        // Random position around the apple
        const angle = (i / particleCount) * Math.PI * 2
        const distance = 20 + Math.random() * 30
        const particleX = x + Math.cos(angle) * distance
        const particleY = y + Math.sin(angle) * distance
        
        particle.style.left = `${particleX}px`
        particle.style.top = `${particleY}px`
        
        // Random colors for particles
        const colors = ['#27ae60', '#2ecc71', '#f39c12', '#e67e22']
        particle.style.background = colors[Math.floor(Math.random() * colors.length)]
        
        container.appendChild(particle)
        
        // Remove particle after animation
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle)
          }
        }, 600)
      }
    },

    createLevelUpEffect() {
      // Create celebration effect for level up
      const container = this.$refs.particlesContainer
      const effect = document.createElement('div')
      effect.className = 'levelup-effect'
      effect.innerHTML = '✨ LEVEL UP! ✨'
      
      container.appendChild(effect)
      
      setTimeout(() => {
        if (effect.parentNode) {
          effect.parentNode.removeChild(effect)
        }
      }, 2000)
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

      // Draw border highlights for blocked borders
      ctx.lineWidth = 3
      
      // Top border
      if (this.currentBorders.top) {
        ctx.strokeStyle = '#F44336'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(this.canvasSize, 0)
        ctx.stroke()
      }
      
      // Bottom border
      if (this.currentBorders.bottom) {
        ctx.strokeStyle = '#F44336'
        ctx.beginPath()
        ctx.moveTo(0, this.canvasSize)
        ctx.lineTo(this.canvasSize, this.canvasSize)
        ctx.stroke()
      }
      
      // Left border
      if (this.currentBorders.left) {
        ctx.strokeStyle = '#F44336'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, this.canvasSize)
        ctx.stroke()
      }
      
      // Right border
      if (this.currentBorders.right) {
        ctx.strokeStyle = '#F44336'
        ctx.beginPath()
        ctx.moveTo(this.canvasSize, 0)
        ctx.lineTo(this.canvasSize, this.canvasSize)
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
