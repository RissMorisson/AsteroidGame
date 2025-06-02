document.addEventListener('DOMContentLoaded', () => {
  // Game Elements
  const gameContainer = document.getElementById('game-container')
  const starfield = document.getElementById('starfield')
  const spaceship = document.getElementById('spaceship')
  const propellant = document.getElementById('propellant')
  const scoreDisplay = document.getElementById('score-display')
  const livesDisplay = document.getElementById('lives-display')
  const laserCooldownBar = document.getElementById('laser-cooldown-bar')
  const hyperspaceStatusDisplay = document.getElementById('hyperspace-status')
  const hyperspaceButton = document.getElementById('hyperspace-button')
  const gameOverScreen = document.getElementById('game-over-screen')
  const finalScoreDisplay = document.getElementById('final-score')
  const restartButton = document.getElementById('restart-button')

  // Game State
  let score = 0
  let lives = 3
  let gameOver = false
  let gameLoopId

  // Spaceship Properties
  const spaceshipWidth = spaceship.offsetWidth
  const spaceshipHeight = spaceship.offsetHeight
  let spaceshipX = gameContainer.offsetWidth / 2 - spaceshipWidth / 2
  let spaceshipY = gameContainer.offsetHeight - spaceshipHeight - 20
  let spaceshipSpeed = 7
  let spaceshipAngle = 0 // For rotation
  const keysPressed = {}

  // Laser Properties
  let lasers = []
  const laserSpeed = 10
  const laserCooldownTime = 500 // milliseconds
  let lastLaserTime = 0
  let laserCooldownPercentage = 100

  // Asteroid Properties
  let asteroids = []
  const initialAsteroidSpawnInterval = 2000 // ms
  let asteroidSpawnInterval = initialAsteroidSpawnInterval
  let lastAsteroidSpawnTime = 0
  const asteroidBaseSpeed = 1
  const asteroidFragmentChance = 0.5 // Chance an asteroid splits into fragments

  // Starfield Properties
  const numStars = 150
  const stars = []

  // Hyperspace Properties
  const hyperspaceCooldownTime = 10000 // 10 seconds
  let lastHyperspaceTime = -hyperspaceCooldownTime // Ready at start
  const hyperspaceMalfunctionChance = 0.15 // 15% chance of malfunction

  // --- INITIALIZATION ---
  function init() {
    gameOver = false
    score = 0
    lives = 3
    spaceshipX = gameContainer.offsetWidth / 2 - spaceshipWidth / 2
    spaceshipY = gameContainer.offsetHeight - spaceshipHeight - 20
    spaceshipAngle = 0
    asteroids = []
    lasers = []
    lastLaserTime = 0
    lastAsteroidSpawnTime = 0
    asteroidSpawnInterval = initialAsteroidSpawnInterval
    lastHyperspaceTime = -hyperspaceCooldownTime // Reset hyperspace cooldown

    updateScoreDisplay()
    updateLivesDisplay()
    updateLaserCooldownBar()
    updateHyperspaceStatus()

    gameOverScreen.classList.add('hidden')
    gameContainer.style.borderColor = '#0f0' // Reset border color

    createStarfield()
    startGameLoop()
  }

  function createStarfield() {
    starfield.innerHTML = '' // Clear existing stars
    stars.length = 0 // Clear array
    for (let i = 0; i < numStars; i++) {
      const star = document.createElement('div')
      star.classList.add('star')
      const size = Math.random() * 3 + 1 // Star size 1px to 4px
      star.style.width = `${size}px`
      star.style.height = `${size}px`
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 100}%`
      // Parallax effect: smaller/slower stars are further away
      const speedFactor = Math.random() * 0.5 + 0.1 // Slower stars
      star.dataset.speedFactor = speedFactor
      star.style.opacity = Math.random() * 0.5 + 0.3 // Varying brightness
      starfield.appendChild(star)
      stars.push(star)
    }
  }

  // --- GAME LOOP ---
  function startGameLoop() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId)
    gameLoopId = requestAnimationFrame(gameLoop)
  }

  function gameLoop(timestamp) {
    if (gameOver) {
      showGameOverScreen()
      return
    }

    handleInput()
    updateSpaceship()
    updateLasers(timestamp)
    updateAsteroids(timestamp)
    handleCollisions()
    updateStarfield()
    updateDifficulty(timestamp)
    updateUI()

    gameLoopId = requestAnimationFrame(gameLoop)
  }

  // --- SPACESHIP ---
  function handleInput() {
    let movingX = false
    let movingY = false

    if (keysPressed['ArrowLeft'] || keysPressed['a']) {
      spaceshipX -= spaceshipSpeed
      movingX = true
    }
    if (keysPressed['ArrowRight'] || keysPressed['d']) {
      spaceshipX += spaceshipSpeed
      movingX = true
    }
    if (keysPressed['ArrowUp'] || keysPressed['w']) {
      spaceshipY -= spaceshipSpeed
      movingY = true
    }
    if (keysPressed['ArrowDown'] || keysPressed['s']) {
      spaceshipY += spaceshipSpeed
      movingY = true
    }

    // Boundary checks
    spaceshipX = Math.max(
      0,
      Math.min(gameContainer.offsetWidth - spaceshipWidth, spaceshipX)
    )
    spaceshipY = Math.max(
      0,
      Math.min(gameContainer.offsetHeight - spaceshipHeight, spaceshipY)
    )

    // Propellant animation
    if (movingY && (keysPressed['ArrowUp'] || keysPressed['w'])) {
      propellant.style.borderBottomWidth = '20px' // Long flame
      propellant.style.borderBottomColor = '#ffa500' // Brighter orange
    } else if (movingY || movingX) {
      propellant.style.borderBottomWidth = '10px' // Shorter flame for other movements
      propellant.style.borderBottomColor = '#ff8c00'
    } else {
      propellant.style.borderBottomWidth = '0px' // No flame
    }
  }

  function updateSpaceship() {
    spaceship.style.left = `${spaceshipX}px`
    spaceship.style.top = `${spaceshipY}px`
    spaceship.style.transform = `rotate(${spaceshipAngle}deg)`
  }

  // --- STARFIELD ---
  function updateStarfield() {
    stars.forEach((star) => {
      let currentTop = parseFloat(star.style.top)
      const speed = parseFloat(star.dataset.speedFactor) * 0.5 // Adjust base speed for parallax
      currentTop += speed
      if (currentTop > 100) {
        currentTop = -1 // Reset star to top
        star.style.left = `${Math.random() * 100}%` // New horizontal position
      }
      star.style.top = `${currentTop}%`
    })
  }

  // --- LASERS ---
  function shootLaser(timestamp) {
    if (timestamp - lastLaserTime < laserCooldownTime) return

    lastLaserTime = timestamp
    laserCooldownPercentage = 0

    const laser = document.createElement('div')
    laser.classList.add('laser-beam')
    const laserX = spaceshipX + spaceshipWidth / 2 - 2 // Center of spaceship, minus half laser width
    const laserY = spaceshipY // Top of spaceship
    laser.style.left = `${laserX}px`
    laser.style.top = `${laserY}px`
    gameContainer.appendChild(laser)
    lasers.push({ element: laser, x: laserX, y: laserY })
  }

  function updateLasers(timestamp) {
    // Update cooldown bar
    const timeSinceLastShot = timestamp - lastLaserTime
    laserCooldownPercentage = Math.min(
      100,
      (timeSinceLastShot / laserCooldownTime) * 100
    )
    updateLaserCooldownBar()

    // Move existing lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i]
      laser.y -= laserSpeed
      laser.element.style.top = `${laser.y}px`

      if (laser.y < -laser.element.offsetHeight) {
        // Off-screen top
        laser.element.remove()
        lasers.splice(i, 1)
      }
    }
  }

  function updateLaserCooldownBar() {
    laserCooldownBar.style.width = `${laserCooldownPercentage}%`
  }

  // --- ASTEROIDS ---
  function createAsteroid(x, y, size, speedMultiplier = 1, isFragment = false) {
    const asteroid = document.createElement('div')
    asteroid.classList.add(isFragment ? 'fragment' : 'asteroid')

    const actualSize = isFragment ? size : Math.random() * 30 + 20 // Fragments inherit size, new asteroids random
    asteroid.style.width = `${actualSize}px`
    asteroid.style.height = `${actualSize}px`

    let posX =
      x !== undefined
        ? x
        : Math.random() * (gameContainer.offsetWidth - actualSize)
    let posY = y !== undefined ? y : -actualSize // Start above screen

    asteroid.style.left = `${posX}px`
    asteroid.style.top = `${posY}px`

    // Random initial rotation and rotation speed
    const initialRotation = Math.random() * 360
    const rotationSpeed = (Math.random() - 0.5) * 4 // Degrees per frame
    asteroid.style.transform = `rotate(${initialRotation}deg)`

    const angle = Math.random() * Math.PI + Math.PI / 2 // Mostly downwards
    const speed = (Math.random() * 1 + asteroidBaseSpeed) * speedMultiplier
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed

    gameContainer.appendChild(asteroid)
    asteroids.push({
      element: asteroid,
      x: posX,
      y: posY,
      size: actualSize,
      velocityX: velocityX,
      velocityY: velocityY,
      rotation: initialRotation,
      rotationSpeed: rotationSpeed,
      isFragment: isFragment,
    })
  }

  function spawnAsteroids(timestamp) {
    if (timestamp - lastAsteroidSpawnTime > asteroidSpawnInterval) {
      createAsteroid()
      lastAsteroidSpawnTime = timestamp
    }
  }

  function updateAsteroids(timestamp) {
    spawnAsteroids(timestamp)

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const asteroid = asteroids[i]
      asteroid.x += asteroid.velocityX
      asteroid.y += asteroid.velocityY
      asteroid.rotation += asteroid.rotationSpeed

      asteroid.element.style.left = `${asteroid.x}px`
      asteroid.element.style.top = `${asteroid.y}px`
      asteroid.element.style.transform = `rotate(${asteroid.rotation}deg)`

      // Remove if off-screen (bottom)
      if (asteroid.y > gameContainer.offsetHeight + asteroid.size) {
        asteroid.element.remove()
        asteroids.splice(i, 1)
      }
    }
  }

  function breakAsteroid(asteroidObj, index) {
    const numFragments = asteroidObj.isFragment
      ? 0
      : Math.random() < asteroidFragmentChance
      ? Math.floor(Math.random() * 2) + 2
      : 0 // 2-3 fragments or none
    if (numFragments > 0) {
      for (let i = 0; i < numFragments; i++) {
        createAsteroid(
          asteroidObj.x,
          asteroidObj.y,
          asteroidObj.size / (numFragments > 1 ? 2 : 1.5),
          1.5,
          true
        )
      }
    }
    asteroidObj.element.remove()
    asteroids.splice(index, 1)
  }

  // --- COLLISIONS ---
  function checkCollision(rect1, rect2) {
    // Basic AABB collision detection
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  function handleCollisions() {
    const shipRect = {
      x: spaceshipX,
      y: spaceshipY,
      width: spaceshipWidth,
      height: spaceshipHeight,
    }

    // Lasers vs Asteroids
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i]
      const laserRect = {
        x: laser.x,
        y: laser.y,
        width: laser.element.offsetWidth,
        height: laser.element.offsetHeight,
      }

      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j]
        const asteroidRect = {
          x: asteroid.x,
          y: asteroid.y,
          width: asteroid.size,
          height: asteroid.size,
        }

        if (checkCollision(laserRect, asteroidRect)) {
          laser.element.remove()
          lasers.splice(i, 1)

          score += asteroid.isFragment ? 5 : asteroid.size > 40 ? 10 : 20 // More for bigger asteroids
          updateScoreDisplay()

          breakAsteroid(asteroid, j)
          break // Laser hits one asteroid and is destroyed
        }
      }
    }

    // Spaceship vs Asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const asteroid = asteroids[i]
      const asteroidRect = {
        x: asteroid.x,
        y: asteroid.y,
        width: asteroid.size,
        height: asteroid.size,
      }

      if (checkCollision(shipRect, asteroidRect)) {
        lives--
        updateLivesDisplay()
        breakAsteroid(asteroid, i) // Asteroid is destroyed on collision with ship

        // Visual feedback for collision
        gameContainer.style.borderColor = '#ff0000' // Flash red
        setTimeout(() => {
          if (!gameOver) gameContainer.style.borderColor = '#0f0'
        }, 200)

        if (lives <= 0) {
          gameOver = true
          return // Exit early if game over
        }
        // Optional: Brief invincibility or ship reset? For now, just lose a life.
      }
    }
  }

  // --- HYPERSPACE (Bonus) ---
  function activateHyperspace(timestamp) {
    if (timestamp - lastHyperspaceTime < hyperspaceCooldownTime) {
      updateHyperspaceStatus(timestamp) // Update status if tried too early
      return
    }

    lastHyperspaceTime = timestamp
    updateHyperspaceStatus(timestamp)
    hyperspaceButton.disabled = true // Disable button during cooldown

    const oldX = spaceshipX
    const oldY = spaceshipY

    // Teleport effect (e.g., quick disappear/reappear)
    spaceship.style.opacity = '0'

    setTimeout(() => {
      spaceshipX = Math.random() * (gameContainer.offsetWidth - spaceshipWidth)
      spaceshipY =
        Math.random() * (gameContainer.offsetHeight - spaceshipHeight)
      spaceship.style.left = `${spaceshipX}px`
      spaceship.style.top = `${spaceshipY}px`
      spaceship.style.opacity = '1'

      // Malfunction check: collision after teleport
      if (Math.random() < hyperspaceMalfunctionChance) {
        // Check against all current asteroids
        const shipRect = {
          x: spaceshipX,
          y: spaceshipY,
          width: spaceshipWidth,
          height: spaceshipHeight,
        }
        let collisionOccurred = false
        for (let i = asteroids.length - 1; i >= 0; i--) {
          const asteroid = asteroids[i]
          const asteroidRect = {
            x: asteroid.x,
            y: asteroid.y,
            width: asteroid.size,
            height: asteroid.size,
          }
          if (checkCollision(shipRect, asteroidRect)) {
            lives--
            updateLivesDisplay()
            breakAsteroid(asteroid, i) // Asteroid is destroyed
            // Visual feedback
            gameContainer.style.borderColor = '#ffcc00' // Yellow for malfunction
            setTimeout(() => {
              if (!gameOver) gameContainer.style.borderColor = '#0f0'
            }, 300)
            collisionOccurred = true
            break
          }
        }
        if (collisionOccurred) {
          hyperspaceStatusDisplay.textContent = 'MALFUNCTION!'
          setTimeout(() => updateHyperspaceStatus(performance.now()), 1500) // Reset status after a bit
        }

        if (lives <= 0 && !gameOver) {
          gameOver = true
        }
      }
    }, 200) // Short delay for "teleport" effect
  }

  function updateHyperspaceStatus(timestamp) {
    if (!timestamp) timestamp = performance.now() // Ensure timestamp is available
    const timeSinceLastJump = timestamp - lastHyperspaceTime
    if (timeSinceLastJump >= hyperspaceCooldownTime) {
      hyperspaceStatusDisplay.textContent = 'Ready'
      hyperspaceButton.disabled = false
    } else {
      const timeLeft = Math.ceil(
        (hyperspaceCooldownTime - timeSinceLastJump) / 1000
      )
      hyperspaceStatusDisplay.textContent = `Recharging (${timeLeft}s)`
      hyperspaceButton.disabled = true
    }
  }

  // --- UI & GAME STATE ---
  function updateScoreDisplay() {
    scoreDisplay.textContent = score
  }

  function updateLivesDisplay() {
    livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives)) || 'None'
  }

  function updateDifficulty(timestamp) {
    // Increase asteroid spawn rate and speed over time (e.g., every 30 seconds)
    const gameTimeSeconds = timestamp / 1000
    asteroidSpawnInterval = Math.max(
      500,
      initialAsteroidSpawnInterval - gameTimeSeconds * 20
    ) // Faster spawns
    // Could also increase asteroidBaseSpeed here
  }

  function updateUI() {
    // Could add other UI updates here if needed
    updateHyperspaceStatus(performance.now())
  }

  function showGameOverScreen() {
    cancelAnimationFrame(gameLoopId)
    finalScoreDisplay.textContent = score
    gameOverScreen.classList.remove('hidden')
    gameContainer.style.borderColor = '#ff0000'
  }

  function restartGame() {
    // Clear existing DOM elements
    lasers.forEach((l) => l.element.remove())
    asteroids.forEach((a) => a.element.remove())
    init()
  }

  // --- EVENT LISTENERS ---
  window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true // Use toLowerCase for wasd
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault() // Prevent page scrolling
      if (!gameOver) shootLaser(performance.now())
    }
    if ((e.key === 'h' || e.key === 'H') && !gameOver) {
      e.preventDefault()
      activateHyperspace(performance.now())
    }
  })

  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false
  })

  restartButton.addEventListener('click', restartGame)
  hyperspaceButton.addEventListener('click', () => {
    if (!gameOver) activateHyperspace(performance.now())
  })

  // --- START GAME ---
  init()
})
