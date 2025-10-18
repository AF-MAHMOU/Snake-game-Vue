# Snake Game - Vue 3 + Vite + Vuex 4 + Canvas 2D

A fully-featured Snake game built with modern Vue.js technologies, featuring three difficulty levels, scoring system, and responsive design.

## Features

- **Three Difficulty Levels**: Easy, Medium, and Hard with different grid sizes, speeds, and challenges
- **Advanced Scoring System**: Base points, streak bonuses, speed bonuses, and level-clear bonuses
- **Canvas 2D Rendering**: Smooth graphics with snake head eyes and emoji apples
- **Responsive Design**: Works on desktop and mobile devices
- **Audio & Haptic Feedback**: Sound effects and vibration (where supported)
- **Auto-pause**: Game pauses when window loses focus
- **GitHub Emoji Integration**: Fetches emojis for apple skins with fallback

## Game Mechanics

### Difficulty Levels
- **Easy**: 20×20 grid, 140ms tick, 3 starting length, 180s timer
- **Medium**: 24×24 grid, 110ms tick, 4 starting length, 150s timer  
- **Hard**: 28×28 grid, 85ms tick, 5 starting length, 120s timer, starvation mode

### Scoring System
- **Base Points**: 10/20/30 points per apple (Easy/Medium/Hard)
- **Streak Bonus**: +2 points per streak (capped at +10)
- **Speed Bonus**: +3 points if eaten within 5 ticks
- **Level Clear**: +100/+150/+200 bonus when reaching 30% of grid cells

### Win/Lose Conditions
- **Win**: Snake length reaches 30% of total grid cells before timer expires
- **Lose**: Hit wall, self-collision, timer reaches 0, or starvation (Hard mode only)

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Preview Production Build**
   ```bash
   npm run preview
   ```

## Controls

- **WASD** or **Arrow Keys**: Move snake
- **Spacebar**: Pause/Resume game
- **Mouse**: Click buttons for menu navigation

## Project Structure

```
snakegame/
├── public/
│   └── sfx/                 # Sound effect files
│       ├── eat.mp3
│       ├── bump.mp3
│       └── levelup.mp3
├── src/
│   ├── components/
│   │   ├── HUD.vue          # Score, timer, progress display
│   │   └── GameBoard.vue    # Canvas rendering and game logic
│   ├── App.vue              # Main application component
│   ├── main.js              # Vue app initialization with Vuex store
│   └── styles.css           # Global styles and responsive design
├── index.html               # HTML template
└── package.json             # Dependencies and scripts
```

## Technical Details

### Vuex Store Structure
- **State**: Game configuration, snake position, apples, score, timer
- **Getters**: Computed properties for speed, length, progress
- **Mutations**: State updates for movement, scoring, game state
- **Actions**: Game logic, API calls, interval management

### Canvas Rendering
- 560×560 pixel canvas with dynamic cell sizing
- Grid lines, snake segments with rounded corners
- Snake head with two eye dots
- Emoji apples with fallback to red circles

### Responsive Design
- Mobile-friendly layout with touch controls
- Adaptive canvas sizing for different screen sizes
- Flexible HUD layout for small screens

## Browser Support

- Modern browsers with Canvas 2D support
- Web Audio API for sound effects (graceful fallback)
- Vibration API for haptic feedback (mobile devices)

## Customization

### Adding Sound Effects
Replace the placeholder files in `public/sfx/` with actual MP3 files:
- `eat.mp3`: Sound when snake eats an apple
- `bump.mp3`: Sound when snake hits wall or itself
- `levelup.mp3`: Sound when level is completed

### Modifying Difficulty
Edit the difficulty configuration in `src/main.js`:
```javascript
config: {
  easy: { grid: 20, tick: 140, startLen: 3, applesAtOnce: [1,1], timerSec: 180, applePts: 10 },
  medium: { grid: 24, tick: 110, startLen: 4, applesAtOnce: [1,2], timerSec: 150, applePts: 20 },
  hard: { grid: 28, tick: 85, startLen: 5, applesAtOnce: [2,2], timerSec: 120, applePts: 30, starvation: 30 }
}
```

## Development

The project uses:
- **Vue 3**: Composition API and reactive system
- **Vite**: Fast build tool and dev server
- **Vuex 4**: State management
- **Canvas 2D**: Game rendering
- **Web Audio API**: Sound effects
- **GitHub API**: Emoji integration

## License

MIT License - Feel free to use and modify as needed.
