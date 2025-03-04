// nPong - A multidimensional pong game
// Main game logic

document.addEventListener('DOMContentLoaded', () => {
    // Game canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const playerScoreElement = document.getElementById('playerScore');
    const aiScoreElement = document.getElementById('aiScore');
    const currentDimensionElement = document.getElementById('currentDimension');
    const singlePlayerModeButton = document.getElementById('singlePlayerMode');
    const twoPlayerModeButton = document.getElementById('twoPlayerMode');
    const leftPlayerLabel = document.getElementById('leftPlayerLabel');
    const rightPlayerLabel = document.getElementById('rightPlayerLabel');
    const singlePlayerInstructions = document.getElementById('singlePlayerInstructions');
    const twoPlayerInstructions = document.getElementById('twoPlayerInstructions');
    
    // AI Difficulty elements
    const aiDifficultySelection = document.getElementById('aiDifficultySelection');
    const easyDifficultyButton = document.getElementById('easyDifficulty');
    const mediumDifficultyButton = document.getElementById('mediumDifficulty');
    const hardDifficultyButton = document.getElementById('hardDifficulty');
    
    // Map Size elements
    const smallMapSizeButton = document.getElementById('smallMapSize');
    const normalMapSizeButton = document.getElementById('normalMapSize');
    const largeMapSizeButton = document.getElementById('largeMapSize');
    
    // Game mode
    let isTwoPlayerMode = false;
    
    // AI difficulty level (0.0 to 1.0)
    // 0.0 is the easiest, 1.0 is the hardest
    let aiDifficultyLevel = 0.7; // Default is medium
    
    // Map size configuration (width ratio, height ratio)
    let mapSizes = {
        small: { widthRatio: 0.8, heightRatio: 0.5, name: 'Small' },
        normal: { widthRatio: 1.0, heightRatio: 0.6, name: 'Normal' },
        large: { widthRatio: 1.2, heightRatio: 0.7, name: 'Large' }
    };
    
    let currentMapSize = 'normal'; // Default map size

    // Set canvas size based on selected map size
    function setCanvasSize() {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth;
        const mapSize = mapSizes[currentMapSize];
        
        canvas.width = containerWidth * mapSize.widthRatio;
        canvas.height = containerWidth * mapSize.heightRatio;
    }

    // Initial canvas sizing
    setCanvasSize();
    
    // Game state
    let gameRunning = false;
    let playerScore = 0;
    let aiScore = 0;
    let currentDimension = 1;
    let lastFrameTime = 0;
    let particleEffects = [];
    let gameFocused = false; // Track if the game has focus
    
    // Screen shake effect
    let screenShake = 0;
    
    // Ball stuck detection
    let ballStuckTimer = 0;
    const ballStuckThreshold = 1.0; // Time in seconds before considering the ball stuck
    
    // Boost functionality
    let player1BoostActive = false;
    let player2BoostActive = false;
    let player1BoostCooldown = 0;
    let player2BoostCooldown = 0;
    let player1BoostArea = false; // Is the boost area visible for player 1
    let player2BoostArea = false; // Is the boost area visible for player 2
    let player1BoostAreaTimer = 0; // How long the boost area remains active
    let player2BoostAreaTimer = 0;
    const boostCooldownTime = 3; // Cooldown in seconds
    const boostFactor = 2.25; // Increased from 1.75 - How much faster the ball goes when boosted
    const boostAreaDuration = 0.5; // How long the boost area remains active in seconds
    const boostAreaSize = 100; // Size of the boost activation area in pixels

    // Focus handling
    canvas.tabIndex = 0; // Make canvas focusable
    
    // Apply focus to the game when clicked
    canvas.addEventListener('click', () => {
        if (!gameFocused) {
            canvas.focus();
            gameFocused = true;
            // Add a visual indicator that the game is focused
            canvas.style.boxShadow = `0 0 0 3px ${dimensions[currentDimension - 1].ballColor}`;
        }
    });

    // Remove focus when tabbing away
    canvas.addEventListener('blur', () => {
        gameFocused = false;
        canvas.style.boxShadow = '';
    });

    canvas.addEventListener('focus', () => {
        gameFocused = true;
        canvas.style.boxShadow = `0 0 0 3px ${dimensions[currentDimension - 1].ballColor}`;
    });

    // Prevent scrolling when arrow keys are pressed
    window.addEventListener('keydown', (e) => {
        // Prevent default behavior for arrow keys when game has focus or is running
        if ((gameFocused || gameRunning) && 
            (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
             e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
             e.key === ' ' || e.key === 'w' || e.key === 's' || 
             e.key === 'W' || e.key === 'S')) {
            e.preventDefault();
        }
    });

    // Paddle configuration
    const paddleHeight = canvas.height / 6;
    const paddleWidth = canvas.width / 60;
    const paddleOffset = canvas.width / 40;
    
    // Player paddle and AI/Player2 paddle
    const player = {
        x: paddleOffset,
        y: canvas.height / 2 - paddleHeight / 2,
        width: paddleWidth,
        height: paddleHeight,
        speed: 0,
        maxSpeed: 800,
        horizontalSpeed: 0, // Add horizontal speed
        maxHorizontalSpeed: 400, // Horizontal movement is slower
        color: '#00ffff',
        minX: paddleOffset, // Left boundary
        maxX: canvas.width / 2 - paddleWidth - paddleOffset // Right boundary (middle of screen minus paddle width and offset)
    };

    const ai = {
        x: canvas.width - paddleOffset - paddleWidth,
        y: canvas.height / 2 - paddleHeight / 2,
        width: paddleWidth,
        height: paddleHeight,
        speed: 0,
        maxSpeed: 400,
        horizontalSpeed: 0, // Add horizontal speed
        maxHorizontalSpeed: 200, // Horizontal movement is slower
        difficulty: 0.7, // Default medium difficulty
        color: '#ff00ff',
        minX: canvas.width / 2 + paddleOffset, // Left boundary (middle of screen plus offset)
        maxX: canvas.width - paddleOffset - paddleWidth // Right boundary
    };

    // Ball configuration
    const initialBallRadius = canvas.width / 60;
    const maxBallSpeed = 1200; // Add a maximum ball speed limit
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: initialBallRadius,
        velocityX: 300,
        velocityY: 300,
        speed: 400,
        color: '#ffffff',
        trail: []
    };

    // Portal configuration
    const portals = [];
    const maxPortals = 3;

    // Function to update game elements when canvas size changes
    function updateGameElementsForCanvasSize() {
        // Update paddle dimensions
        const paddleHeight = canvas.height / 6;
        const paddleWidth = canvas.width / 60;
        const paddleOffset = canvas.width / 40;
        
        // Update player paddle
        player.height = paddleHeight;
        player.width = paddleWidth;
        player.x = paddleOffset;
        player.minX = paddleOffset;
        player.maxX = canvas.width / 2 - paddleWidth - paddleOffset;
        
        // If player was outside new bounds, fix position
        if (player.x < player.minX) player.x = player.minX;
        if (player.x > player.maxX) player.x = player.maxX;
        if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
        
        // Update AI/Player2 paddle
        ai.height = paddleHeight;
        ai.width = paddleWidth;
        ai.x = canvas.width - paddleOffset - paddleWidth;
        ai.minX = canvas.width / 2 + paddleOffset;
        ai.maxX = canvas.width - paddleOffset - paddleWidth;
        
        // If AI was outside new bounds, fix position
        if (ai.x < ai.minX) ai.x = ai.minX;
        if (ai.x > ai.maxX) ai.x = ai.maxX;
        if (ai.y + ai.height > canvas.height) ai.y = canvas.height - ai.height;
        
        // Update ball
        ball.radius = canvas.width / 60;
        
        // Center the ball if not in gameplay
        if (!gameRunning) {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
        }
        // If the ball is outside the canvas, reset its position
        else if (ball.x < 0 || ball.x > canvas.width || ball.y < 0 || ball.y > canvas.height) {
            resetBall();
        }
    }
    
    // Update event listeners for resize and map size buttons
    window.addEventListener('resize', () => {
        setCanvasSize();
        if (typeof player !== 'undefined') {
            updateGameElementsForCanvasSize();
        }
    });
    
    // Map size selection handlers
    smallMapSizeButton.addEventListener('click', () => {
        if (currentMapSize !== 'small') {
            // Remove active class from all map size buttons
            smallMapSizeButton.classList.add('active');
            normalMapSizeButton.classList.remove('active');
            largeMapSizeButton.classList.remove('active');
            
            currentMapSize = 'small';
            setCanvasSize();
            updateGameElementsForCanvasSize();
        }
    });
    
    normalMapSizeButton.addEventListener('click', () => {
        if (currentMapSize !== 'normal') {
            // Remove active class from all map size buttons
            smallMapSizeButton.classList.remove('active');
            normalMapSizeButton.classList.add('active');
            largeMapSizeButton.classList.remove('active');
            
            currentMapSize = 'normal';
            setCanvasSize();
            updateGameElementsForCanvasSize();
        }
    });
    
    largeMapSizeButton.addEventListener('click', () => {
        if (currentMapSize !== 'large') {
            // Remove active class from all map size buttons
            smallMapSizeButton.classList.remove('active');
            normalMapSizeButton.classList.remove('active');
            largeMapSizeButton.classList.add('active');
            
            currentMapSize = 'large';
            setCanvasSize();
            updateGameElementsForCanvasSize();
        }
    });
    
    // Dimension configurations - each has different physics rules
    const dimensions = [
        // Dimension 1: Normal physics
        {
            name: "Prime",
            bgColor: 'rgba(0, 0, 0, 0.7)',
            ballColor: '#ffffff',
            gravity: 0,
            friction: 1,
            paddleBounceIntensity: 1.05,
            wallBounceIntensity: 1,
            ballTrailLength: 0,
            portalChance: 0.003,
            particleEffect: "none"
        },
        // Dimension 2: Low gravity
        {
            name: "Floaty",
            bgColor: 'rgba(0, 20, 80, 0.7)',
            ballColor: '#80ffff',
            gravity: 60,
            friction: 0.995,
            paddleBounceIntensity: 1.15,
            wallBounceIntensity: 1.25,
            ballTrailLength: 5,
            portalChance: 0.005,
            particleEffect: "glow"
        },
        // Dimension 3: High gravity, high speed
        {
            name: "Heavy",
            bgColor: 'rgba(80, 0, 80, 0.7)',
            ballColor: '#ff80ff',
            gravity: 300,
            friction: 0.995,
            paddleBounceIntensity: 1.2,
            wallBounceIntensity: 1.15,
            ballTrailLength: 8,
            portalChance: 0.008,
            particleEffect: "fire"
        },
        // Dimension 4: Chaotic dimension
        {
            name: "Chaos",
            bgColor: 'rgba(80, 20, 0, 0.7)',
            ballColor: '#ff8040',
            gravity: 120,
            friction: 0.995,
            paddleBounceIntensity: 1.3,
            wallBounceIntensity: 1.4,
            ballTrailLength: 15,
            portalChance: 0.01,
            particleEffect: "lightning"
        }
    ];

    // Get current dimension properties
    function getDimension() {
        return dimensions[(currentDimension - 1) % dimensions.length];
    }

    // Control handlers
    let mouseY = player.y + player.height / 2;
    let upPressed = false;
    let downPressed = false;
    let wPressed = false;
    let sPressed = false;
    let leftPressed = false;
    let rightPressed = false;
    let aPressed = false;
    let dPressed = false;

    canvas.addEventListener('mousemove', (e) => {
        // Remove mouse tracking for paddle movement
        // Only track mouse position for other purposes if needed
        const rect = canvas.getBoundingClientRect();
        mouseY = e.clientY - rect.top;
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') upPressed = true;
        if (e.key === 'ArrowDown') downPressed = true;
        if (e.key === 'ArrowLeft') leftPressed = true;
        if (e.key === 'ArrowRight') rightPressed = true;
        if (e.key === 'w' || e.key === 'W') wPressed = true;
        if (e.key === 's' || e.key === 'S') sPressed = true;
        if (e.key === 'a' || e.key === 'A') aPressed = true;
        if (e.key === 'd' || e.key === 'D') dPressed = true;
        
        // Boost keys
        if (gameRunning) {
            // Player 1 boost (Shift key)
            if ((e.key === 'Shift') && player1BoostCooldown <= 0) {
                player1BoostArea = true;
                player1BoostAreaTimer = boostAreaDuration;
                // Visual feedback for boost area activation
                createBoostAreaEffect(player.x + player.width + boostAreaSize/2, player.y + player.height/2, '#00ffff');
            }
            
            // Player 2 or single-player boost (Spacebar)
            if (e.key === ' ' && !e.repeat) {
                if (isTwoPlayerMode) {
                    // Player 2 boost in 2-player mode
                    if (player2BoostCooldown <= 0) {
                        player2BoostArea = true;
                        player2BoostAreaTimer = boostAreaDuration;
                        createBoostAreaEffect(ai.x - boostAreaSize/2, ai.y + ai.height/2, '#ff00ff');
                    }
                } else {
                    // Player 1 boost in 1-player mode
                    if (player1BoostCooldown <= 0) {
                        player1BoostArea = true;
                        player1BoostAreaTimer = boostAreaDuration;
                        createBoostAreaEffect(player.x + player.width + boostAreaSize/2, player.y + player.height/2, '#00ffff');
                    }
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp') upPressed = false;
        if (e.key === 'ArrowDown') downPressed = false;
        if (e.key === 'ArrowLeft') leftPressed = false;
        if (e.key === 'ArrowRight') rightPressed = false;
        if (e.key === 'w' || e.key === 'W') wPressed = false;
        if (e.key === 's' || e.key === 'S') sPressed = false;
        if (e.key === 'a' || e.key === 'A') aPressed = false;
        if (e.key === 'd' || e.key === 'D') dPressed = false;
    });

    // Game mode selection
    singlePlayerModeButton.addEventListener('click', () => {
        isTwoPlayerMode = false;
        singlePlayerModeButton.classList.add('active');
        twoPlayerModeButton.classList.remove('active');
        singlePlayerInstructions.style.display = 'block';
        twoPlayerInstructions.style.display = 'none';
        aiDifficultySelection.classList.remove('hidden');  // Show AI difficulty in single-player mode
        resetGame();
    });

    twoPlayerModeButton.addEventListener('click', () => {
        isTwoPlayerMode = true;
        twoPlayerModeButton.classList.add('active');
        singlePlayerModeButton.classList.remove('active');
        twoPlayerInstructions.style.display = 'block';
        singlePlayerInstructions.style.display = 'none';
        aiDifficultySelection.classList.add('hidden');  // Hide AI difficulty in two-player mode
        resetGame();
    });

    startButton.addEventListener('click', () => {
        if (!gameRunning) {
            resetGame();
            gameRunning = true;
            startButton.textContent = 'Restart Game';
            requestAnimationFrame(gameLoop);
            
            // Focus the canvas when starting the game
            canvas.focus();
            gameFocused = true;
            canvas.style.boxShadow = `0 0 0 3px ${dimensions[currentDimension - 1].ballColor}`;
        } else {
            resetGame();
        }
    });

    // Set up AI difficulty buttons
    easyDifficultyButton.addEventListener('click', () => {
        aiDifficultyLevel = 0.4;
        ai.difficulty = 0.4;
        easyDifficultyButton.classList.add('active');
        mediumDifficultyButton.classList.remove('active');
        hardDifficultyButton.classList.remove('active');
    });
    
    mediumDifficultyButton.addEventListener('click', () => {
        aiDifficultyLevel = 0.7;
        ai.difficulty = 0.7;
        mediumDifficultyButton.classList.add('active');
        easyDifficultyButton.classList.remove('active');
        hardDifficultyButton.classList.remove('active');
    });
    
    hardDifficultyButton.addEventListener('click', () => {
        aiDifficultyLevel = 0.9;
        ai.difficulty = 0.9;
        hardDifficultyButton.classList.add('active');
        easyDifficultyButton.classList.remove('active');
        mediumDifficultyButton.classList.remove('active');
    });

    // Game functions
    function resetGame() {
        playerScore = 0;
        aiScore = 0;
        currentDimension = 1;
        
        // Reset boost states
        player1BoostActive = false;
        player2BoostActive = false;
        player1BoostCooldown = 0;
        player2BoostCooldown = 0;
        player1BoostArea = false;
        player2BoostArea = false;
        player1BoostAreaTimer = 0;
        player2BoostAreaTimer = 0;
        
        // Reset ball stuck tracker
        ballStuckTimer = 0;
        screenShake = 0;
        
        // Set labels based on game mode
        if (isTwoPlayerMode) {
            leftPlayerLabel.textContent = 'Player 1:';
            rightPlayerLabel.textContent = 'Player 2:';
        } else {
            leftPlayerLabel.textContent = 'Player:';
            rightPlayerLabel.textContent = 'AI:';
        }
        
        updateScoreboard();
        
        // Reset ball
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.velocityX = 300 * (Math.random() > 0.5 ? 1 : -1);
        ball.velocityY = 300 * (Math.random() > 0.5 ? 1 : -1);
        ball.speed = 400;
        ball.radius = initialBallRadius;
        ball.trail = [];

        // Reset paddle positions
        player.y = canvas.height / 2 - paddleHeight / 2;
        player.x = paddleOffset; // Reset horizontal position
        ai.y = canvas.height / 2 - paddleHeight / 2;
        ai.x = canvas.width - paddleOffset - paddleWidth; // Reset horizontal position
        
        // Set AI difficulty based on current selection
        ai.difficulty = aiDifficultyLevel;
        
        // Set paddle speed based on game mode
        if (isTwoPlayerMode) {
            ai.maxSpeed = player.maxSpeed; // Both players have the same speed in 2-player mode
        } else {
            ai.maxSpeed = 400; // AI uses default speed in 1-player mode
        }
        
        // Clear portals and particles
        portals.length = 0;
        particleEffects.length = 0;
    }

    function updateScoreboard() {
        playerScoreElement.textContent = playerScore;
        aiScoreElement.textContent = aiScore;
        currentDimensionElement.textContent = `${currentDimension}: ${getDimension().name}`;
        
        // Update focus indicator if the game has focus
        if (gameFocused) {
            canvas.style.boxShadow = `0 0 0 3px ${dimensions[currentDimension - 1].ballColor}`;
        }
    }

    // Create a portal at a random position
    function createPortal() {
        if (portals.length >= maxPortals) return;
        
        const portalRadius = ball.radius * 2;
        const x = Math.random() * (canvas.width - portalRadius * 4) + portalRadius * 2;
        const y = Math.random() * (canvas.height - portalRadius * 4) + portalRadius * 2;
        
        // Don't create portals too close to paddles or other portals
        if (x < player.x + player.width + 50 || x > ai.x - 50) return;
        
        for (const portal of portals) {
            const dx = portal.x - x;
            const dy = portal.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < portalRadius * 4) return;
        }
        
        const targetDimension = Math.floor(Math.random() * dimensions.length) + 1;
        
        portals.push({
            x,
            y,
            radius: portalRadius,
            targetDimension,
            timer: 500,  // Portal lifetime in frames
            pulsePhase: 0
        });
    }

    // Create particle effects
    function createParticle(x, y, type) {
        const particleCount = type === "lightning" ? 3 : 10;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            
            particleEffects.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1,
                color: type === "fire" ? `hsl(${Math.random() * 30 + 10}, 100%, 50%)` :
                       type === "glow" ? `hsl(${Math.random() * 60 + 180}, 100%, 50%)` :
                       `hsl(${Math.random() * 40 + 270}, 100%, 50%)`,
                life: Math.random() * 30 + 20,
                type
            });
        }
    }

    // Create boost area visual effect
    function createBoostAreaEffect(x, y, color) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * boostAreaSize * 0.5;
            const posX = x + Math.cos(angle) * distance;
            const posY = y + Math.sin(angle) * distance;
            
            particleEffects.push({
                x: posX,
                y: posY,
                vx: Math.cos(angle) * 20,
                vy: Math.sin(angle) * 20,
                radius: Math.random() * 3 + 1,
                color: color,
                life: Math.random() * 20 + 10,
                type: "boostArea"
            });
        }
    }

    // Update game logic
    function update(deltaTime) {
        const dimension = getDimension();
        
        // Update boost cooldowns - use Math.max to ensure they don't go below 0
        if (player1BoostCooldown > 0) {
            player1BoostCooldown = Math.max(0, player1BoostCooldown - deltaTime);
        }
        if (player2BoostCooldown > 0) {
            player2BoostCooldown = Math.max(0, player2BoostCooldown - deltaTime);
        }
        
        // Update boost area timers
        if (player1BoostAreaTimer > 0) {
            player1BoostAreaTimer = Math.max(0, player1BoostAreaTimer - deltaTime);
            if (player1BoostAreaTimer <= 0) {
                player1BoostArea = false;
            }
        }
        if (player2BoostAreaTimer > 0) {
            player2BoostAreaTimer = Math.max(0, player2BoostAreaTimer - deltaTime);
            if (player2BoostAreaTimer <= 0) {
                player2BoostArea = false;
            }
        }
        
        // Check for ball collision with boost areas
        if (gameRunning && ball.velocityX > 0 && player1BoostArea) {
            // Ball is moving right and player 1 boost area is active
            const distanceX = ball.x - (player.x + player.width);
            const distanceY = ball.y - (player.y + player.height / 2);
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            
            if (distance < boostAreaSize / 2) {
                // Ball is in the boost area, apply boost
                ball.velocityX *= boostFactor;
                
                // Update ball's base speed property to match its current velocity
                // This prevents the ball from getting progressively faster with multiple boosts
                ball.speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
                
                // Apply extra upward/downward velocity based on where in the area the ball is
                const verticalFactor = distanceY / (boostAreaSize / 2);
                ball.velocityY += ball.speed * verticalFactor * 0.5;
                
                // Create boost effect particles
                for (let i = 0; i < 20; i++) {
                    createParticle(ball.x, ball.y, "fire");
                }
                
                // Set cooldown and deactivate boost area
                player1BoostCooldown = boostCooldownTime;
                player1BoostActive = false;
                player1BoostArea = false;
                player1BoostAreaTimer = 0;
            }
        }
        
        if (gameRunning && ball.velocityX < 0 && player2BoostArea) {
            // Ball is moving left and player 2 boost area is active
            const distanceX = ball.x - (ai.x);
            const distanceY = ball.y - (ai.y + ai.height / 2);
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            
            if (distance < boostAreaSize / 2) {
                // Ball is in the boost area, apply boost
                ball.velocityX *= boostFactor;
                
                // Update ball's base speed property to match its current velocity
                // This prevents the ball from getting progressively faster with multiple boosts
                ball.speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
                
                // Apply extra upward/downward velocity based on where in the area the ball is
                const verticalFactor = distanceY / (boostAreaSize / 2);
                ball.velocityY += ball.speed * verticalFactor * 0.5;
                
                // Create boost effect particles
                for (let i = 0; i < 20; i++) {
                    createParticle(ball.x, ball.y, "fire");
                }
                
                // Set cooldown and deactivate boost area
                player2BoostCooldown = boostCooldownTime;
                player2BoostActive = false;
                player2BoostArea = false;
                player2BoostAreaTimer = 0;
            }
        }
        
        // Player 1 (left paddle) vertical movement
        if (gameRunning) {
            if (isTwoPlayerMode) {
                // Two-player mode: Use W/S keys for player 1
                if (wPressed) {
                    player.speed = -player.maxSpeed;
                } else if (sPressed) {
                    player.speed = player.maxSpeed;
                } else {
                    player.speed = player.speed * 0.8; // Smooth deceleration
                    // Fix for paddle shaking - if speed is very small, set it to exactly zero
                    if (Math.abs(player.speed) < 5) {
                        player.speed = 0;
                    }
                }
                
                // Horizontal movement with A/D keys
                if (aPressed) {
                    player.horizontalSpeed = -player.maxHorizontalSpeed;
                } else if (dPressed) {
                    player.horizontalSpeed = player.maxHorizontalSpeed;
                } else {
                    player.horizontalSpeed = player.horizontalSpeed * 0.8;
                    if (Math.abs(player.horizontalSpeed) < 5) {
                        player.horizontalSpeed = 0;
                    }
                }
            } else {
                // Single-player mode: Use arrow keys or WASD (both work)
                if (upPressed || wPressed) {
                    player.speed = -player.maxSpeed;
                } else if (downPressed || sPressed) {
                    player.speed = player.maxSpeed;
                } else {
                    player.speed = player.speed * 0.8; // Smooth deceleration
                    // Fix for paddle shaking - if speed is very small, set it to exactly zero
                    if (Math.abs(player.speed) < 5) {
                        player.speed = 0;
                    }
                }
                
                // Horizontal movement with arrow keys or A/D
                if (leftPressed || aPressed) {
                    player.horizontalSpeed = -player.maxHorizontalSpeed;
                } else if (rightPressed || dPressed) {
                    player.horizontalSpeed = player.maxHorizontalSpeed;
                } else {
                    player.horizontalSpeed = player.horizontalSpeed * 0.8;
                    if (Math.abs(player.horizontalSpeed) < 5) {
                        player.horizontalSpeed = 0;
                    }
                }
            }
            
            // Apply vertical movement
            player.y += player.speed * deltaTime;
            
            // Apply horizontal movement
            player.x += player.horizontalSpeed * deltaTime;
        }
        
        // Keep player paddle on screen vertically
        if (player.y < 0) player.y = 0;
        if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
        
        // Keep player paddle within horizontal boundaries (can't cross middle)
        if (player.x < player.minX) player.x = player.minX;
        if (player.x > player.maxX) player.x = player.maxX;
        
        // Player 2 or AI movement
        if (gameRunning) {
            if (isTwoPlayerMode) {
                // Player 2 vertical control (right paddle) with arrow keys
                if (upPressed) {
                    ai.speed = -ai.maxSpeed;
                } else if (downPressed) {
                    ai.speed = ai.maxSpeed;
                } else {
                    ai.speed = ai.speed * 0.8; // Smooth deceleration
                    // Fix for paddle shaking - if speed is very small, set it to exactly zero
                    if (Math.abs(ai.speed) < 5) {
                        ai.speed = 0;
                    }
                }
                
                // Player 2 horizontal control with arrow keys
                if (leftPressed) {
                    ai.horizontalSpeed = -ai.maxHorizontalSpeed;
                } else if (rightPressed) {
                    ai.horizontalSpeed = ai.maxHorizontalSpeed;
                } else {
                    ai.horizontalSpeed = ai.horizontalSpeed * 0.8;
                    if (Math.abs(ai.horizontalSpeed) < 5) {
                        ai.horizontalSpeed = 0;
                    }
                }
                
                // In two-player mode, increase right paddle speed to match left paddle
                ai.maxSpeed = player.maxSpeed;
            } else {
                // AI control in single-player mode
                // Vertical AI movement
                let targetY = ball.y - ai.height / 2;
                
                // Add some prediction when ball is moving toward AI
                if (ball.velocityX > 0) {
                    const timeToIntercept = (ai.x - ball.x) / ball.velocityX;
                    targetY = ball.y + ball.velocityY * timeToIntercept * ai.difficulty - ai.height / 2;
                    
                    // Horizontal movement for AI - try to maintain optimal distance from right wall
                    // Difficulty affects how perfectly it positions itself
                    let optimalX = canvas.width - paddleOffset - paddleWidth - 50; // Base position
                    
                    // Adjust based on difficulty: harder = better positioning
                    if (ai.difficulty > 0.7) { // Hard
                        // Move a bit forward when ball is approaching
                        if (ball.velocityX > 300 && ball.x > canvas.width / 2) {
                            optimalX = canvas.width - paddleOffset - paddleWidth - 30;
                        }
                    }
                    
                    const dx = optimalX - ai.x;
                    ai.horizontalSpeed = Math.abs(dx) > 10 ? Math.sign(dx) * ai.maxHorizontalSpeed * ai.difficulty : 0;
                    
                    // Add randomness to make AI imperfect
                    targetY += (Math.random() - 0.5) * ai.height * (1 - ai.difficulty);
                }
                
                const dy = targetY - ai.y;
                ai.speed = Math.abs(dy) > 5 ? Math.sign(dy) * ai.maxSpeed * ai.difficulty : 0;
                
                // In single-player mode, use configured AI speed
                ai.maxSpeed = 400;
            }
            
            // Apply vertical movement
            ai.y += ai.speed * deltaTime;
            
            // Apply horizontal movement
            ai.x += ai.horizontalSpeed * deltaTime;
        }
        
        // Keep AI/Player2 paddle on screen vertically
        if (ai.y < 0) ai.y = 0;
        if (ai.y + ai.height > canvas.height) ai.y = canvas.height - ai.height;
        
        // Keep AI/Player2 paddle within horizontal boundaries (can't cross middle)
        if (ai.x < ai.minX) ai.x = ai.minX;
        if (ai.x > ai.maxX) ai.x = ai.maxX;
        
        // Ball movement
        if (gameRunning) {
            ball.velocityY += dimension.gravity * deltaTime; // Apply gravity
            ball.velocityX *= dimension.friction; // Apply friction
            ball.velocityY *= dimension.friction;
            
            // Ensure minimum horizontal speed
            const minSpeed = 100;
            if (Math.abs(ball.velocityX) < minSpeed) {
                ball.velocityX = Math.sign(ball.velocityX) * minSpeed;
            }
            
            // If ball is moving too vertically, add some horizontal momentum to prevent vertical loops
            const verticalityRatio = Math.abs(ball.velocityY) / Math.abs(ball.velocityX);
            if (verticalityRatio > 2.5) {
                // Ball is moving too vertically, add horizontal momentum
                ball.velocityX *= 1.5;
            }
            
            // Ensure ball doesn't exceed maximum speed after any modifications
            const currentSpeed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
            if (currentSpeed > maxBallSpeed) {
                const scaleFactor = maxBallSpeed / currentSpeed;
                ball.velocityX *= scaleFactor;
                ball.velocityY *= scaleFactor;
            }
            
            // Update ball position
            ball.x += ball.velocityX * deltaTime;
            ball.y += ball.velocityY * deltaTime;
            
            // Add to ball trail
            if (dimension.ballTrailLength > 0) {
                ball.trail.push({x: ball.x, y: ball.y, radius: ball.radius});
                if (ball.trail.length > dimension.ballTrailLength) {
                    ball.trail.shift();
                }
            } else {
                ball.trail = [];
            }
            
            // Ball collision with top and bottom walls
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.velocityY = -ball.velocityY * dimension.wallBounceIntensity;
                
                if (dimension.particleEffect !== "none") {
                    createParticle(ball.x, ball.y, dimension.particleEffect);
                }
                
                // Reset stuck timer when hitting the top
                ballStuckTimer = 0;
            }
            
            if (ball.y + ball.radius > canvas.height) {
                ball.y = canvas.height - ball.radius;
                
                // Calculate new bounce velocity
                ball.velocityY = -ball.velocityY * dimension.wallBounceIntensity;
                
                // Ensure minimum upward velocity after bouncing from bottom
                // This prevents the ball from getting stuck due to gravity
                const minBounceVelocity = dimension.gravity * 0.8 + 250;
                if (ball.velocityY > -minBounceVelocity) {
                    ball.velocityY = -minBounceVelocity;
                }
                
                // Add some horizontal velocity if the ball is moving too slow horizontally
                if (Math.abs(ball.velocityX) < 200) {
                    ball.velocityX = ball.velocityX * 1.2;
                    // Ensure minimum horizontal velocity
                    const minHorizontalVelocity = 150;
                    if (Math.abs(ball.velocityX) < minHorizontalVelocity) {
                        ball.velocityX = Math.sign(ball.velocityX) * minHorizontalVelocity;
                    }
                }
                
                if (dimension.particleEffect !== "none") {
                    createParticle(ball.x, ball.y, dimension.particleEffect);
                }
                
                // Start counting time spent near the bottom
                ballStuckTimer += deltaTime;
            } else {
                // If the ball is not at the bottom and not close to the bottom, reset the stuck timer
                if (ball.y < canvas.height - ball.radius * 3) {
                    ballStuckTimer = 0;
                }
            }
            
            // Check if the ball is stuck near the bottom for too long
            if (ballStuckTimer > ballStuckThreshold) {
                // Ball is stuck - blast it upward!
                ball.velocityY = -800 - Math.random() * 400; // Strong upward force
                ball.velocityX = ball.velocityX * 1.5; // Increase horizontal speed too
                
                // Add special "blast" effect
                for (let i = 0; i < 30; i++) {
                    createParticle(ball.x, ball.y, "lightning");
                }
                
                // Reset the stuck timer
                ballStuckTimer = 0;
                
                // Add screen shake effect (visual feedback)
                shakeScreen(15);
            }
            
            // Ball collision with player paddle - Now checks both front and back of paddle
            if (
                ball.y + ball.radius > player.y &&
                ball.y - ball.radius < player.y + player.height &&
                ball.x - ball.radius < player.x + player.width &&
                ball.x + ball.radius > player.x
            ) {
                // Calculate where on the paddle the ball hit (0 to 1)
                const hitPos = (ball.y - player.y) / player.height;
                
                // Calculate paddle momentum impact
                // A faster moving paddle will give the ball more velocity
                let paddleMomentumFactor = 1.0;
                
                // Get the magnitude of the paddle's speed (considering both vertical and horizontal)
                const paddleSpeed = Math.sqrt(player.speed * player.speed + player.horizontalSpeed * player.horizontalSpeed);
                
                // If the paddle is moving, apply its momentum to the ball (with limits)
                if (paddleSpeed > 50) {
                    // Determine if paddle is moving toward the ball or away
                    const paddleMovingTowardBall = (player.horizontalSpeed > 0); // Right paddle moves right toward ball
                    
                    if (paddleMovingTowardBall) {
                        // Add extra velocity proportional to paddle speed (capped)
                        paddleMomentumFactor = Math.min(1.0 + (paddleSpeed / player.maxSpeed) * 0.5, 1.5);
                    } else {
                        // Paddle moving away - still add some momentum but less (capped)
                        paddleMomentumFactor = Math.min(1.0 + (paddleSpeed / player.maxSpeed) * 0.25, 1.25);
                    }
                }
                
                // Determine if this is a front or back paddle hit by checking the ball's position relative to the paddle center
                const isFrontHit = ball.x > player.x + player.width / 2;
                const isBackHit = !isFrontHit;
                
                // Determine if the ball should go behind the paddle (reverse direction)
                // For back hits, force a reverse. For front hits, check paddle movement
                const reverseHit = isBackHit || (player.horizontalSpeed < -400);
                
                // If it's a back hit, position the ball to the left of the paddle
                // If it's a front hit, position it to the right of the paddle
                if (isBackHit) {
                    ball.x = player.x - ball.radius;
                } else {
                    ball.x = player.x + player.width + ball.radius;
                }
                
                // Get base speed for this hit - reset to a controlled value but factor in current speed
                const baseSpeed = Math.min(400 + Math.abs(ball.velocityX) * 0.2, 600);
                ball.speed = baseSpeed; // Reset ball speed to reasonable value
                
                if (reverseHit) {
                    // Send the ball backward with reduced speed
                    ball.velocityX = -baseSpeed * 0.7;
                    createParticle(ball.x, ball.y, "fire"); // Special effect for reverse hit
                } else {
                    // Normal forward hit with momentum factor
                    ball.velocityX = baseSpeed * dimension.paddleBounceIntensity * paddleMomentumFactor;
                }
                
                // Add some of the paddle's vertical velocity to the ball
                ball.velocityY = ball.speed * Math.sin((hitPos - 0.5) * Math.PI * 0.6) + (player.speed * 0.3);
                
                // Ensure ball doesn't exceed maximum speed
                const currentSpeed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
                if (currentSpeed > maxBallSpeed) {
                    const scaleFactor = maxBallSpeed / currentSpeed;
                    ball.velocityX *= scaleFactor;
                    ball.velocityY *= scaleFactor;
                }
                
                if (dimension.particleEffect !== "none") {
                    createParticle(ball.x, ball.y, dimension.particleEffect);
                }
                
                // Add more particles if hit with high momentum
                if (paddleMomentumFactor > 1.3) {
                    for (let i = 0; i < 5; i++) {
                        createParticle(ball.x, ball.y, "fire");
                    }
                }
            }
            
            // Ball collision with AI paddle - Now checks both front and back of paddle
            if (
                ball.y + ball.radius > ai.y &&
                ball.y - ball.radius < ai.y + ai.height &&
                ball.x + ball.radius > ai.x &&
                ball.x - ball.radius < ai.x + ai.width
            ) {
                // Calculate where on the paddle the ball hit (0 to 1)
                const hitPos = (ball.y - ai.y) / ai.height;
                
                // Calculate paddle momentum impact
                // A faster moving paddle will give the ball more velocity
                let paddleMomentumFactor = 1.0;
                
                // Get the magnitude of the paddle's speed (considering both vertical and horizontal)
                const paddleSpeed = Math.sqrt(ai.speed * ai.speed + ai.horizontalSpeed * ai.horizontalSpeed);
                
                // If the paddle is moving, apply its momentum to the ball (with limits)
                if (paddleSpeed > 50) {
                    // Determine if paddle is moving toward the ball or away
                    const paddleMovingTowardBall = (ai.horizontalSpeed < 0); // Left for right paddle
                    
                    if (paddleMovingTowardBall) {
                        // Add extra velocity proportional to paddle speed (capped)
                        paddleMomentumFactor = Math.min(1.0 + (paddleSpeed / ai.maxSpeed) * 0.5, 1.5);
                    } else {
                        // Paddle moving away - still add some momentum but less (capped)
                        paddleMomentumFactor = Math.min(1.0 + (paddleSpeed / ai.maxSpeed) * 0.25, 1.25);
                    }
                }
                
                // Determine if this is a front or back paddle hit by checking the ball's position relative to the paddle center
                const isFrontHit = ball.x < ai.x + ai.width / 2;
                const isBackHit = !isFrontHit;
                
                // Determine if the ball should go behind the paddle (reverse direction)
                // For back hits, force a reverse. For front hits, check paddle movement
                const reverseHit = isBackHit || (ai.horizontalSpeed > 400);
                
                // If it's a back hit, position the ball to the right of the paddle
                // If it's a front hit, position it to the left of the paddle
                if (isBackHit) {
                    ball.x = ai.x + ai.width + ball.radius;
                } else {
                    ball.x = ai.x - ball.radius;
                }
                
                // Get base speed for this hit - reset to a controlled value but factor in current speed
                const baseSpeed = Math.min(400 + Math.abs(ball.velocityX) * 0.2, 600);
                ball.speed = baseSpeed; // Reset ball speed to reasonable value
                
                if (reverseHit) {
                    // Send the ball backward with reduced speed
                    ball.velocityX = baseSpeed * 0.7;
                    createParticle(ball.x, ball.y, "fire"); // Special effect for reverse hit
                } else {
                    // Normal forward hit with momentum factor
                    ball.velocityX = -baseSpeed * dimension.paddleBounceIntensity * paddleMomentumFactor;
                }
                
                // Add some of the paddle's vertical velocity to the ball
                ball.velocityY = ball.speed * Math.sin((hitPos - 0.5) * Math.PI * 0.6) + (ai.speed * 0.3);
                
                // Ensure ball doesn't exceed maximum speed
                const currentSpeed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
                if (currentSpeed > maxBallSpeed) {
                    const scaleFactor = maxBallSpeed / currentSpeed;
                    ball.velocityX *= scaleFactor;
                    ball.velocityY *= scaleFactor;
                }
                
                if (dimension.particleEffect !== "none") {
                    createParticle(ball.x, ball.y, dimension.particleEffect);
                }
                
                // Add more particles if hit with high momentum
                if (paddleMomentumFactor > 1.3) {
                    for (let i = 0; i < 5; i++) {
                        createParticle(ball.x, ball.y, "fire");
                    }
                }
            }
            
            // Ball out of bounds (scoring)
            if (ball.x - ball.radius > canvas.width) {
                // Left player (Player 1) scores when ball exits on the right
                playerScore++;
                updateScoreboard();
                
                // Instead of resetting, bounce it back from the edge with some randomization
                ball.x = canvas.width - ball.radius;
                ball.velocityX = -Math.abs(ball.velocityX) * 1.1; // Slightly faster return
                ball.velocityY += (Math.random() - 0.5) * 200; // Add some random Y velocity
                
                // Create a special scoring effect
                for (let i = 0; i < 15; i++) {
                    createParticle(ball.x, ball.y, "fire");
                }
            } else if (ball.x + ball.radius < 0) {
                // Right player (AI or Player 2) scores when ball exits on the left
                aiScore++;
                updateScoreboard();
                
                // Instead of resetting, bounce it back from the edge with some randomization
                ball.x = ball.radius;
                ball.velocityX = Math.abs(ball.velocityX) * 1.1; // Slightly faster return
                ball.velocityY += (Math.random() - 0.5) * 200; // Add some random Y velocity
                
                // Create a special scoring effect
                for (let i = 0; i < 15; i++) {
                    createParticle(ball.x, ball.y, "fire");
                }
            }
            
            // Check for portal entry
            for (let i = 0; i < portals.length; i++) {
                const portal = portals[i];
                const dx = ball.x - portal.x;
                const dy = ball.y - portal.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < portal.radius) {
                    // Transport to another dimension
                    currentDimension = portal.targetDimension;
                    updateScoreboard();
                    
                    // Create particle effect at portal
                    for (let j = 0; j < 20; j++) {
                        createParticle(portal.x, portal.y, getDimension().particleEffect);
                    }
                    
                    // Remove the portal
                    portals.splice(i, 1);
                    break;
                }
            }
            
            // Create portals randomly
            if (Math.random() < dimension.portalChance) {
                createPortal();
            }
            
            // Update portals
            for (let i = portals.length - 1; i >= 0; i--) {
                portals[i].timer--;
                portals[i].pulsePhase += 0.05;
                if (portals[i].timer <= 0) {
                    portals.splice(i, 1);
                }
            }
            
            // Update particles
            for (let i = particleEffects.length - 1; i >= 0; i--) {
                const particle = particleEffects[i];
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                
                if (particle.type === "fire") {
                    particle.vy -= 100 * deltaTime; // Fire particles rise
                } else if (particle.type === "lightning") {
                    particle.vx *= 0.95;
                    particle.vy *= 0.95;
                }
                
                particle.life--;
                if (particle.life <= 0) {
                    particleEffects.splice(i, 1);
                }
            }
        }
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.velocityX = 300 * (Math.random() > 0.5 ? 1 : -1);
        ball.velocityY = 300 * (Math.random() > 0.5 ? 1 : -1);
        ball.speed = 400; // Reset to initial speed
        ball.trail = [];
    }

    // Render game
    function render() {
        const dimension = getDimension();
        
        // Apply screen shake if active
        ctx.save();
        if (screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * screenShake;
            const shakeY = (Math.random() - 0.5) * screenShake;
            ctx.translate(shakeX, shakeY);
            screenShake *= 0.9; // Reduce shake each frame
            if (screenShake < 0.5) screenShake = 0;
        }
        
        // Clear canvas with dimension background
        ctx.fillStyle = dimension.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw dimension-specific background effects
        drawBackgroundEffects();
        
        // Draw boost cooldown indicators
        drawBoostIndicators();
        
        // Draw boost areas if active
        if (player1BoostArea) {
            drawBoostArea(player.x + player.width + boostAreaSize/2, player.y + player.height/2, boostAreaSize, '#00ffff');
        }
        
        if (player2BoostArea) {
            drawBoostArea(ai.x - boostAreaSize/2, ai.y + ai.height/2, boostAreaSize, '#ff00ff');
        }
        
        // Draw ball trail
        for (let i = 0; i < ball.trail.length; i++) {
            const trailPoint = ball.trail[i];
            const alpha = i / ball.trail.length;
            ctx.beginPath();
            ctx.arc(trailPoint.x, trailPoint.y, trailPoint.radius * alpha, 0, Math.PI * 2);
            ctx.fillStyle = `${dimension.ballColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.fill();
        }
        
        // Draw particles
        for (const particle of particleEffects) {
            const alpha = particle.life / 30;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            
            if (particle.type === "lightning") {
                ctx.strokeStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = particle.radius / 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.fill();
            }
        }
        
        // Draw portals
        for (const portal of portals) {
            const targetDim = dimensions[(portal.targetDimension - 1) % dimensions.length];
            const pulseSize = 1 + Math.sin(portal.pulsePhase) * 0.2;
            
            // Portal glow
            const gradient = ctx.createRadialGradient(
                portal.x, portal.y, portal.radius * 0.5,
                portal.x, portal.y, portal.radius * 2
            );
            gradient.addColorStop(0, `${targetDim.ballColor}99`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, portal.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Portal ring
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, portal.radius * pulseSize, 0, Math.PI * 2);
            ctx.strokeStyle = targetDim.ballColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Inner portal
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, portal.radius * 0.5 * pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = targetDim.bgColor;
            ctx.fill();
        }
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        
        // Create gradient for ball
        const ballFillGradient = ctx.createRadialGradient(
            ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
            ball.x, ball.y, ball.radius
        );
        ballFillGradient.addColorStop(0, '#ffffff');
        ballFillGradient.addColorStop(0.5, dimension.ballColor);
        ballFillGradient.addColorStop(1, dimension.ballColor);
        ctx.fillStyle = ballFillGradient;
        ctx.fill();
        
        // Add ball stroke/outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw glow effect on ball
        const ballGlow = ctx.createRadialGradient(
            ball.x, ball.y, 0,
            ball.x, ball.y, ball.radius * 3
        );
        ballGlow.addColorStop(0, `${dimension.ballColor}55`);
        ballGlow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = ballGlow;
        ctx.fill();
        
        // Draw player paddle
        drawPaddle(player, '#00ffff');
        
        // Draw AI paddle
        drawPaddle(ai, '#ff00ff');
        
        // Draw dimension name
        ctx.font = '20px Orbitron';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.textAlign = 'center';
        ctx.fillText(`Dimension ${currentDimension}: ${dimension.name}`, canvas.width / 2, 30);
        
        // End of render function - restore context if we applied screen shake
        ctx.restore();
    }
    
    function drawPaddle(paddle, color) {
        // Draw paddle glow effect
        const paddleGlow = ctx.createRadialGradient(
            paddle.x + paddle.width/2, paddle.y + paddle.height/2, 0,
            paddle.x + paddle.width/2, paddle.y + paddle.height/2, paddle.height
        );
        paddleGlow.addColorStop(0, `${color}55`);
        paddleGlow.addColorStop(1, 'transparent');
        
        // Draw larger glow around paddle
        ctx.fillStyle = paddleGlow;
        ctx.fillRect(
            paddle.x - paddle.width,
            paddle.y - paddle.height * 0.5,
            paddle.width * 3,
            paddle.height * 2
        );
        
        // Save context for rounded rectangle
        ctx.save();
        
        // Create rounded rectangle path for the paddle
        const radius = paddle.width * 0.5;
        ctx.beginPath();
        ctx.moveTo(paddle.x + radius, paddle.y);
        ctx.lineTo(paddle.x + paddle.width - radius, paddle.y);
        ctx.quadraticCurveTo(paddle.x + paddle.width, paddle.y, paddle.x + paddle.width, paddle.y + radius);
        ctx.lineTo(paddle.x + paddle.width, paddle.y + paddle.height - radius);
        ctx.quadraticCurveTo(paddle.x + paddle.width, paddle.y + paddle.height, paddle.x + paddle.width - radius, paddle.y + paddle.height);
        ctx.lineTo(paddle.x + radius, paddle.y + paddle.height);
        ctx.quadraticCurveTo(paddle.x, paddle.y + paddle.height, paddle.x, paddle.y + paddle.height - radius);
        ctx.lineTo(paddle.x, paddle.y + radius);
        ctx.quadraticCurveTo(paddle.x, paddle.y, paddle.x + radius, paddle.y);
        ctx.closePath();
        
        // Create gradient for paddle body
        const paddleGradient = ctx.createLinearGradient(
            paddle.x, paddle.y,
            paddle.x + paddle.width, paddle.y + paddle.height
        );
        paddleGradient.addColorStop(0, color); 
        paddleGradient.addColorStop(0.5, '#ffffff'); // Add a bright middle reflection
        paddleGradient.addColorStop(1, color);
        
        // Fill paddle with gradient
        ctx.fillStyle = paddleGradient;
        ctx.fill();
        
        // Add paddle border/stroke
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add energy lines effect
        const energyLines = 3;
        const lineSpacing = paddle.height / (energyLines + 1);
        
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= energyLines; i++) {
            const yPos = paddle.y + lineSpacing * i;
            ctx.beginPath();
            ctx.moveTo(paddle.x + paddle.width * 0.2, yPos);
            ctx.lineTo(paddle.x + paddle.width * 0.8, yPos);
            ctx.stroke();
        }
        
        // Restore context
        ctx.restore();
    }
    
    function drawBackgroundEffects() {
        const dimension = getDimension();
        
        // Draw grid pattern based on dimension
        const gridSize = canvas.width / 20; // Grid size adjusts based on canvas
        const gridOpacity = 0.15;
        
        ctx.strokeStyle = `${dimension.ballColor}${Math.floor(gridOpacity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        
        // Use lastFrameTime instead of undefined time variable
        const currentTime = lastFrameTime || 0;
        
        // Draw vertical grid lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
            // Add wave effect in dimension 2
            let startX = x;
            if (currentDimension === 2) {
                startX += Math.sin(currentTime * 0.001 + x * 0.01) * 10;
            }
            
            ctx.beginPath();
            ctx.moveTo(startX, 0);
            ctx.lineTo(startX, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
            // Add wave effect in dimension 3
            let startY = y;
            if (currentDimension === 3) {
                startY += Math.cos(currentTime * 0.001 + y * 0.01) * 10;
            }
            
            ctx.beginPath();
            ctx.moveTo(0, startY);
            ctx.lineTo(canvas.width, startY);
            ctx.stroke();
        }
        
        // Add dimension-specific background effect
        switch (currentDimension) {
            case 1:
                // Dimension 1: Pulsing circles
                const numCircles = 3;
                const maxRadius = canvas.height / 3;
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                
                for (let i = 0; i < numCircles; i++) {
                    const pulseFactor = 0.8 + Math.sin(currentTime * 0.001 + i) * 0.2;
                    const radius = maxRadius * (i + 1) / numCircles * pulseFactor;
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `${dimension.ballColor}22`;
                    ctx.stroke();
                }
                break;
                
            case 2:
                // Dimension 2: Light beams from corners
                const beamOpacity = (0.1 + Math.sin(currentTime * 0.0005) * 0.05).toFixed(2);
                const gradient = ctx.createRadialGradient(
                    0, 0, 0,
                    0, 0, canvas.width * 1.5
                );
                gradient.addColorStop(0, `${dimension.ballColor}${Math.floor(beamOpacity * 255).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
                
            case 3:
                // Dimension 3: Floating particles
                const numParticles = 10;
                const particleSize = canvas.width / 100;
                
                ctx.fillStyle = `${dimension.ballColor}22`;
                
                for (let i = 0; i < numParticles; i++) {
                    const x = (Math.sin(currentTime * 0.0005 + i) * 0.5 + 0.5) * canvas.width;
                    const y = (Math.cos(currentTime * 0.0007 + i) * 0.5 + 0.5) * canvas.height;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            default:
                // Other dimensions can have random star-like dots
                const numStars = 30;
                ctx.fillStyle = `${dimension.ballColor}33`;
                
                for (let i = 0; i < numStars; i++) {
                    const starSize = Math.random() * 3 + 1;
                    // Use simple math functions instead of noise library
                    const x = (Math.sin(i * 0.1 + currentTime * 0.0001) * 0.5 + 0.5) * canvas.width;
                    const y = (Math.cos(i * 0.1 + currentTime * 0.0002) * 0.5 + 0.5) * canvas.height;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, starSize, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    }

    // Draw boost cooldown indicators
    function drawBoostIndicators() {
        // Make sure we have valid cooldown values (between 0 and boostCooldownTime)
        const player1CooldownPercent = Math.max(0, Math.min(1, 1 - player1BoostCooldown / boostCooldownTime));
        const player2CooldownPercent = Math.max(0, Math.min(1, 1 - player2BoostCooldown / boostCooldownTime));
        
        // Display debug info about cooldown values
        ctx.fillStyle = 'white';
        ctx.font = '10px Orbitron';
        ctx.textAlign = 'left';
        
        // Player 1 boost indicator
        ctx.fillStyle = player1CooldownPercent === 1 ? '#00ffff' : '#555555';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(player.x - 10, player.y - 15, 8, player.height + 30);
        
        // Fill cooldown bar
        ctx.fillStyle = '#00ffff';
        const p1Height = (player.height + 30) * player1CooldownPercent;
        ctx.fillRect(player.x - 10, player.y + player.height + 15 - p1Height, 8, p1Height);
        
        // Player 2 boost indicator
        ctx.fillStyle = player2CooldownPercent === 1 ? '#ff00ff' : '#555555';
        ctx.fillRect(ai.x + ai.width + 2, ai.y - 15, 8, ai.height + 30);
        
        // Fill cooldown bar
        ctx.fillStyle = '#ff00ff';
        const p2Height = (ai.height + 30) * player2CooldownPercent;
        ctx.fillRect(ai.x + ai.width + 2, ai.y + ai.height + 15 - p2Height, 8, p2Height);
        
        ctx.globalAlpha = 1.0;
    }

    // Draw boost area on screen
    function drawBoostArea(x, y, size, color) {
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        
        // Create gradient for boost area
        const gradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, size/2
        );
        gradient.addColorStop(0, `${color}55`);  // Semi-transparent
        gradient.addColorStop(0.7, `${color}22`); // More transparent
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw pulsing ring
        const pulseSize = 1 + Math.sin(performance.now() / 100) * 0.1;
        ctx.beginPath();
        ctx.arc(x, y, (size/2) * pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Add screen shake effect
    function shakeScreen(intensity) {
        screenShake = intensity;
    }

    // Game loop
    function gameLoop(timestamp) {
        // Calculate time since last frame
        if (!lastFrameTime) lastFrameTime = timestamp;
        
        // Cap deltaTime to prevent huge jumps if the game was in background
        let deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.1); // Convert to seconds, max 100ms
        lastFrameTime = timestamp;
        
        // Update game state
        update(deltaTime);
        
        // Render game
        render();
        
        // Continue game loop
        if (gameRunning) {
            requestAnimationFrame(gameLoop);
        }
    }

    // Initial render
    render();
}); 