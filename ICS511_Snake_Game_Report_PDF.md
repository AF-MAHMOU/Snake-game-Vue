# ICS 511: Web Programming - Graded Practical Assignment

**Team Name:** [INSERT TEAM NAME]  
**Project:** Snake Game - Vue.js/VueX Implementation  
**Submission Date:** October 20, 2025

---

## Team Information

**Team Members:**
- **Member 1:** [INSERT NAME] - ID: [INSERT ID] - Email: [INSERT EMAIL]
- **Member 2:** [INSERT NAME] - ID: [INSERT ID] - Email: [INSERT EMAIL]

**Project Idea:** Snake Game - A classic arcade-style snake game implemented using Vue.js and VueX for state management, featuring multiple difficulty levels, survival mode, and modern web technologies.

---

## Game Strategy

### Reference
Our game implementation is based on the classic Snake game mechanics found at [GameGix Snake Game](https://gamegix.com/snake/game#). This reference provides the fundamental gameplay mechanics that we have enhanced with modern web technologies and additional features.

### Three Levels of Difficulty

**1. Easy Mode:**
- **Target Length:** 120 apples to win
- **Speed:** 150ms tick interval (slow)
- **Starvation Timer:** 4 seconds to eat each apple
- **Borders:** All borders open (wrap-around enabled)
- **Scoring:** 10 points per apple

**2. Medium Mode:**
- **Target Length:** 200 apples to win
- **Speed:** 120ms tick interval (medium)
- **Starvation Timer:** 3 seconds to eat each apple
- **Borders:** All borders open (wrap-around enabled)
- **Scoring:** 10 points per apple

**3. Hard Mode:**
- **Target Length:** 235 apples to win
- **Speed:** 100ms tick interval (fast)
- **Starvation Timer:** 2 seconds to eat each apple
- **Borders:** All borders open (wrap-around enabled)
- **Scoring:** 10 points per apple

**4. Survivor Mode (Bonus):**
- **Target:** Endless gameplay with progressive difficulty
- **Speed:** 120ms tick interval
- **Progressive Border Blocking:** Borders close every 200 points
- **Stage System:** 8 progressive stages with increasing challenge
- **Scoring:** 10 points per apple + survival time tracking

### Scoring System
- **Base Score:** 10 points per apple consumed
- **Best Score Tracking:** Persistent high score storage per difficulty
- **Survival Records:** Time-based leaderboard for survivor mode
- **Length Progress:** Visual progress bar showing completion percentage

### Loss Conditions
1. **Wall Collision:** Snake hits a blocked border (survivor mode only)
2. **Self Collision:** Snake's head collides with its own body
3. **Starvation:** Failure to eat an apple within the time limit
4. **Manual Exit:** User pauses and exits to main menu

---

## Game Design & Implementation

### Graphics Design
Our implementation features modern 2D graphics using HTML5 Canvas API:

- **Snake Rendering:** Dynamic snake body with emoji-based head and body segments
- **Apple Graphics:** Emoji apples with particle effects on consumption
- **Border Visualization:** Clear visual indicators for open/blocked borders
- **HUD Elements:** Real-time score, timer, progress bars, and volume controls
- **Visual Effects:** Particle animations, flash effects, and smooth transitions

### Interactivity
The game provides comprehensive user interaction:

- **Keyboard Controls:** WASD and Arrow keys for snake movement
- **Mouse Controls:** Volume slider, difficulty selection, menu navigation
- **Game State Management:** Pause/resume, restart, main menu navigation
- **Accessibility:** ARIA labels, keyboard navigation, skip links

### Animation, Visual Effects, and Audio Effects

**Visual Effects:**
- **Particle System:** Apple consumption creates animated particle effects
- **Level Up Effects:** Text animations and visual feedback for stage progression
- **Border Indicators:** Pulsing animations for blocked borders in survivor mode
- **Progress Animations:** Smooth progress bar transitions and color changes

**Audio Effects:**
- **Eat Sound:** Crunch sound effect when consuming apples (trimmed to 0.8s duration)
- **Collision Sound:** Bump sound when hitting walls or self (1.2s duration)
- **Level Up Sound:** Victory sound for stage progression and game completion
- **Volume Control:** Real-time volume adjustment with visual sound wave animation

**Haptic Feedback:**
- **Vibration API:** Device vibration on game events (win/lose scenarios)
- **Visual Feedback:** Screen flash effects and color transitions

---

## Technical Implementation

### Events
Our application implements comprehensive event handling:

- **Keyboard Events:** Direction input, pause/resume, menu navigation
- **Mouse Events:** Button clicks, slider interactions, menu selections
- **Game Events:** Apple consumption, collision detection, timer expiration
- **Window Events:** Focus/blur handling for automatic pause functionality

### State Management using VueX
The application uses VueX for centralized state management:

**State Structure:**
```javascript
state: {
  snake: [],           // Snake body coordinates
  apples: [],          // Apple positions
  direction: {x: 1, y: 0}, // Current movement direction
  score: 0,            // Current score
  bestScore: 0,        // High score
  status: 'menu',      // Game state (menu/running/paused/gameover/won)
  difficulty: 'easy',  // Selected difficulty
  config: {...},       // Game configuration per difficulty
  volume: 70,          // Audio volume level
  lastSoundPlayed: null // Sound trigger system
}
```

**Key Mutations:**
- `STEP`: Main game logic execution
- `QUEUE_DIR`: Direction change handling
- `RESET`: Game state reset
- `SET_VOLUME`: Audio volume control
- `PLAY_SOUND`: Audio trigger system

### Hooks
Vue.js lifecycle hooks are extensively used:

- **mounted()**: Canvas initialization, audio setup, event listeners
- **beforeUnmount()**: Cleanup of audio resources and event listeners
- **watch**: Reactive updates for game state changes, volume changes, sound triggers

### APIs Integration
Multiple web APIs are integrated:

- **Canvas API:** 2D rendering for game graphics
- **Audio API:** Sound effect playback and volume control
- **Vibration API:** Haptic feedback for mobile devices
- **Fullscreen API:** Enhanced gameplay experience (removed due to compatibility issues)
- **Local Storage API:** Persistent high score storage

### Reactive Feedback
The application provides real-time reactive feedback:

- **Live HUD Updates:** Score, timer, progress bars update instantly
- **Visual Indicators:** Border status, starvation timer, volume levels
- **Sound Triggers:** Audio feedback synchronized with game events
- **State Synchronization:** All components react to VueX state changes

---

## Screenshots Required

**Screenshot 1: Main Menu Interface**
*[Screenshot showing difficulty selection buttons (Easy, Medium, Hard, Survivor), leaderboard with best scores, and clean UI design]*

**Screenshot 2: Gameplay - Easy Mode**
*[Screenshot showing snake in action, HUD with score/time/progress, apple timer, and border indicators]*

**Screenshot 3: Survivor Mode Features**
*[Screenshot showing stage progression, border blocking system, survival time tracking, and stage indicators]*

**Screenshot 4: Game Over Screen**
*[Screenshot showing final score, restart options, main menu button, and game over overlay]*

**Screenshot 5: Pause Screen**
*[Screenshot showing paused game state, resume/restart controls, and pause overlay]*

**Screenshot 6: Audio Controls**
*[Screenshot showing volume slider, sound wave animation, and audio feedback system]*

---

## User Experience Enhancement

### Scenario 1: First-Time Player
A new player opens the game and sees an intuitive main menu with clear difficulty options. The Easy mode provides a gentle learning curve with slower speed and longer starvation timers. Visual indicators help them understand border mechanics and scoring system.

### Scenario 2: Experienced Player
An experienced player can jump to Hard mode for increased challenge or try Survivor mode for endless gameplay. The progressive difficulty system keeps them engaged with new challenges as borders close and stages advance.

### Scenario 3: Accessibility
The game includes accessibility features like ARIA labels, keyboard navigation, and visual feedback that make it playable for users with different needs. The volume control and visual indicators provide multiple feedback channels.

### Technical Enhancement Impact
- **VueX State Management:** Ensures consistent game state across all components
- **Reactive Components:** Real-time updates provide immediate feedback
- **Event Handling:** Responsive controls enhance gameplay experience
- **API Integration:** Audio and visual effects create immersive experience

---

## Conclusion

Our Snake game implementation successfully demonstrates mastery of Vue.js and VueX concepts while delivering an engaging, feature-rich gaming experience. The combination of classic gameplay mechanics with modern web technologies creates a polished, accessible, and enjoyable game that meets all assignment requirements.

The project showcases effective use of state management, event handling, API integration, and reactive programming principles that are essential for modern web application development.

---

**Repository:** [GitHub Repository URL]  
**Live Demo:** [Deployment URL]  
**Video Demo:** [2-minute gameplay demonstration]
