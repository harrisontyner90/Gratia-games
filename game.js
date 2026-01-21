// ==========================================
// GRATIA HEALTH - CHALLENGE BLASTER GAME
// ==========================================

// Canvas & Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'start'; // start, playing, gate1, gate2, final
let currentLevel = 1;
let score = 0;

// Lead Data
let leadData = {
    name: '',
    email: '',
    organization: '',
    title: '',
    prioritiesHit: {}
};

// All Priority Targets (will be shuffled and distributed across levels)
const allPriorities = [
    'Patient Experience',
    'Retention',
    'Fill Open Shifts',
    'Reduce Contract Labor',
    'Reduce Call-ins & No-shows',
    'Improve Morale',
    'Reduce Burnout',
    'Sense of Belonging',
    'Recognition & Appreciation',
    'Team Communication',
    'Staff Satisfaction',
    'New Hire Mentorship',
    'Leadership Development',
    'Sepsis Prevention',
    'Fall Prevention',
    'Decrease HAC Rate',
    'Workplace Safety',
    'Hand Hygiene',
    'Documentation Adherence',
    'Medication Safety',
    'Patient Safety',
    'Infection Control',
    'HCAHPS Scores'
];

// Shuffle array helper
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Priority targets per level (randomized at game start)
let priorityTargets = { 1: [], 2: [], 3: [] };

function randomizePriorities() {
    const shuffled = shuffleArray(allPriorities);
    priorityTargets = {
        1: shuffled.slice(0, 6),      // 6 targets
        2: shuffled.slice(6, 14),     // 8 targets
        3: shuffled.slice(14, 23)     // 9 targets (23 total priorities)
    };
}

// Gratia Games mapping to priorities
const gratiaGames = {
    'Compliments Circle': {
        priorities: ['Patient Experience', 'Improve Morale', 'Staff Satisfaction', 'HCAHPS Scores'],
        description: 'Build culture & boost morale through peer recognition'
    },
    'Care IQ': {
        priorities: ['Sepsis Prevention', 'Fall Prevention', 'Decrease HAC Rate', 'Workplace Safety', 'Hand Hygiene', 'Medication Safety', 'Patient Safety', 'Infection Control'],
        description: 'Clinical excellence & safety training gamified'
    },
    'Living Legends': {
        priorities: ['Sense of Belonging', 'Recognition & Appreciation', 'Improve Morale', 'Staff Satisfaction'],
        description: 'Celebrate achievements & build belonging'
    },
    'New Hire Navigator': {
        priorities: ['Retention', 'Leadership Development', 'New Hire Mentorship'],
        description: 'Onboarding & retention through mentorship'
    },
    'Shift Pickup': {
        priorities: ['Reduce Contract Labor', 'Fill Open Shifts', 'Reduce Call-ins & No-shows'],
        description: 'Fill shifts & reduce contract labor costs'
    },
    'Charting Champs': {
        priorities: ['Documentation Adherence', 'Recognition & Appreciation'],
        description: 'Gamify documentation compliance'
    }
};

// Colors for targets
const targetColors = [
    '#00ffff', // cyan
    '#ff00ff', // magenta
    '#ffff00', // yellow
    '#00ff00', // green
    '#ff6600', // orange
    '#ff6699', // pink
    '#66ff66', // light green
    '#6699ff'  // light blue
];

// Player
const player = {
    x: 0,
    y: 0,
    width: 50,
    height: 40,
    speed: 8,
    color: '#00ff00'
};

// Bullets
let bullets = [];
const bulletSpeed = 12;
const bulletCooldown = 200;
let lastBulletTime = 0;

// Targets
let targets = [];
const targetWidth = 120;
const targetHeight = 50;
let targetSpeed = 0.8;

// Stars (background)
let stars = [];

// Input state
const keys = {};
let touchX = null;
let isTouching = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gate1 = document.getElementById('gate1');
const gate1Form = document.getElementById('gate1-form');
const gate2 = document.getElementById('gate2');
const gate2Form = document.getElementById('gate2-form');
const finalCta = document.getElementById('final-cta');
const prioritiesList = document.getElementById('priorities-list');
const playAgainBtn = document.getElementById('play-again');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');

// Formspree endpoint
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgoonqza';

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    resizeCanvas();
    createStars();
    setupEventListeners();
    gameLoop();
}

function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 20, 480);
    const maxHeight = Math.min(window.innerHeight - 100, 700);

    canvas.width = maxWidth;
    canvas.height = maxHeight;

    // Position player
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
}

function createStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.1,
            opacity: Math.random()
        });
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space' && gameState === 'playing') {
            e.preventDefault();
            shoot();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Touch controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Mouse (for desktop testing of touch)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        createStars();
    });

    // Start button
    startBtn.addEventListener('click', startGame);

    // Gate forms
    gate1Form.addEventListener('submit', handleGate1Submit);
    gate2Form.addEventListener('submit', handleGate2Submit);

    // Play again
    playAgainBtn.addEventListener('click', resetGame);

    // Share buttons
    document.getElementById('share-email').addEventListener('click', shareViaEmail);
    document.getElementById('share-copy').addEventListener('click', copyGameLink);
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = touch.clientX - rect.left;
    isTouching = true;

    // Tap to shoot
    if (gameState === 'playing') {
        shoot();
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (isTouching) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchX = touch.clientX - rect.left;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    isTouching = false;
    touchX = null;
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    touchX = e.clientX - rect.left;
    isTouching = true;
    if (gameState === 'playing') {
        shoot();
    }
}

function handleMouseMove(e) {
    if (isTouching) {
        const rect = canvas.getBoundingClientRect();
        touchX = e.clientX - rect.left;
    }
}

function handleMouseUp() {
    isTouching = false;
    touchX = null;
}

// ==========================================
// SHARE FUNCTIONS
// ==========================================

function getGameUrl() {
    return window.location.href.split('?')[0];
}

function shareViaEmail() {
    const gameUrl = getGameUrl();
    const subject = encodeURIComponent('Try Challenge Blaster - A Fun Healthcare Game!');
    const body = encodeURIComponent(`Hey!\n\nI just played Challenge Blaster from Gratia Health - it's a fun arcade game about workforce challenges.\n\nGive it a try: ${gameUrl}\n\nSee if you can beat my score!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

function copyGameLink() {
    const gameUrl = getGameUrl();
    navigator.clipboard.writeText(gameUrl).then(() => {
        const confirmation = document.getElementById('copy-confirmation');
        confirmation.classList.remove('hidden');
        setTimeout(() => {
            confirmation.classList.add('hidden');
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        prompt('Copy this link:', gameUrl);
    });
}

// ==========================================
// GAME FLOW
// ==========================================

function startGame() {
    startScreen.classList.add('hidden');
    gameState = 'playing';
    currentLevel = 1;
    score = 0;
    targetSpeed = 1.01; // Reset speed (level 1 - 10% faster)
    randomizePriorities(); // Shuffle priorities for this playthrough
    updateHUD();
    spawnWave();
}

function resetGame() {
    finalCta.classList.add('hidden');
    leadData = {
        name: '',
        email: '',
        organization: '',
        title: '',
        prioritiesHit: {}
    };
    startScreen.classList.remove('hidden');
    gameState = 'start';
    currentLevel = 1;
    score = 0;
    targetSpeed = 1.01;
    targets = [];
    bullets = [];
    updateHUD();
}

function spawnWave() {
    const levelTargets = priorityTargets[currentLevel];

    // Highly randomized spawning for unpredictable gameplay
    const margin = 15;
    const minX = margin;
    const maxX = canvas.width - targetWidth - margin;

    // Create spawn positions with lots of variation
    const spawnData = [];
    let currentY = -targetHeight - Math.random() * 100; // Random initial offset

    for (let i = 0; i < levelTargets.length; i++) {
        // Varied vertical spacing (68-180px) - reduced by 15%
        const baseSpacing = 68 + Math.random() * 112;
        // Occasional gaps for breathing room (smaller and less frequent)
        const extraGap = Math.random() < 0.2 ? Math.random() * 80 : 0;
        const verticalSpacing = baseSpacing + extraGap;

        currentY -= verticalSpacing;

        // Divide screen into 3 zones (left, center, right) and pick randomly
        const zone = Math.floor(Math.random() * 3);
        let xPos;
        if (zone === 0) {
            xPos = minX + Math.random() * (maxX - minX) * 0.3; // Left third
        } else if (zone === 1) {
            xPos = minX + (maxX - minX) * 0.35 + Math.random() * (maxX - minX) * 0.3; // Center
        } else {
            xPos = minX + (maxX - minX) * 0.7 + Math.random() * (maxX - minX) * 0.3; // Right third
        }

        spawnData.push({
            x: xPos,
            y: currentY,
            name: levelTargets[i],
            colorIndex: i
        });
    }

    // Shuffle the spawn order for even more unpredictability
    for (let i = spawnData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap Y positions but keep X positions
        const tempY = spawnData[i].y;
        spawnData[i].y = spawnData[j].y;
        spawnData[j].y = tempY;
    }

    // Create targets
    for (const data of spawnData) {
        targets.push({
            x: data.x,
            y: data.y,
            width: targetWidth,
            height: targetHeight,
            name: data.name,
            color: targetColors[data.colorIndex % targetColors.length],
            health: 1
        });
    }
}

function completeLevel() {
    gameState = 'transition';

    if (currentLevel === 1) {
        showLevelText('LEVEL COMPLETE!');
        setTimeout(() => {
            gameState = 'gate1';
            gate1.classList.remove('hidden');
        }, 1500);
    } else if (currentLevel === 2) {
        showLevelText('LEVEL COMPLETE!');
        setTimeout(() => {
            gameState = 'gate2';
            gate2.classList.remove('hidden');
        }, 1500);
    } else if (currentLevel === 3) {
        showLevelText('MISSION COMPLETE!');
        setTimeout(() => {
            gameState = 'final';
            showFinalCTA();
        }, 1500);
    }
}

function startNextLevel() {
    currentLevel++;
    targetSpeed += 0.33; // Increase speed each level (10% faster)
    updateHUD();
    gameState = 'transition'; // Stay in transition until targets spawn
    showLevelText('LEVEL ' + currentLevel);
    setTimeout(() => {
        spawnWave();
        gameState = 'playing'; // Now start playing
    }, 1000);
}

function showLevelText(text) {
    const levelText = document.createElement('div');
    levelText.className = 'level-transition';
    levelText.textContent = text;
    document.getElementById('game-container').appendChild(levelText);

    setTimeout(() => {
        levelText.remove();
    }, 1500);
}

// ==========================================
// GATE FORM HANDLERS
// ==========================================

async function handleGate1Submit(e) {
    e.preventDefault();

    leadData.name = document.getElementById('name').value;
    leadData.email = document.getElementById('email').value;

    // Don't submit yet - wait until game complete
    gate1.classList.add('hidden');
    startNextLevel();
}

async function handleGate2Submit(e) {
    e.preventDefault();

    leadData.organization = document.getElementById('organization').value;
    leadData.title = document.getElementById('title').value;

    // Don't submit yet - wait until game complete
    gate2.classList.add('hidden');
    startNextLevel();
}

function formatPriorities() {
    const sorted = Object.entries(leadData.prioritiesHit)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return sorted.map(([name, hits]) => `${name} (${hits}x)`).join(', ');
}

async function submitToFormspree(data) {
    try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            console.log('Form submitted successfully!', data);
        } else {
            console.error('Form submission failed:', response.status, await response.text());
        }
    } catch (err) {
        console.error('Form submission error:', err);
    }
}

function showFinalCTA() {
    // Build priority summary
    const sorted = Object.entries(leadData.prioritiesHit)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    prioritiesList.innerHTML = '';

    if (sorted.length === 0) {
        prioritiesList.innerHTML = '<li>No priorities selected</li>';
    } else {
        sorted.forEach(([name, hits]) => {
            const li = document.createElement('li');
            li.textContent = name;
            prioritiesList.appendChild(li);
        });
    }

    // Calculate game recommendations based on priorities hit
    const gameScores = {};
    const userPriorities = Object.keys(leadData.prioritiesHit);

    for (const [gameName, gameData] of Object.entries(gratiaGames)) {
        let score = 0;
        const matchedPriorities = [];

        for (const priority of gameData.priorities) {
            if (leadData.prioritiesHit[priority]) {
                score += leadData.prioritiesHit[priority];
                matchedPriorities.push(priority);
            }
        }

        if (score > 0) {
            gameScores[gameName] = { score, matchedPriorities, description: gameData.description };
        }
    }

    // Sort games by score and take top 3
    const topGames = Object.entries(gameScores)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 3);

    // Display recommendations
    const recommendationsList = document.getElementById('recommendations-list');
    recommendationsList.innerHTML = '';

    if (topGames.length === 0) {
        recommendationsList.innerHTML = '<p class="no-recs">Play again to get personalized recommendations!</p>';
    } else {
        topGames.forEach(([gameName, data], index) => {
            const rec = document.createElement('div');
            rec.className = 'game-rec';
            rec.innerHTML = `
                <div class="game-rec-number">${index + 1}</div>
                <div class="game-rec-content">
                    <div class="game-rec-name">${gameName}</div>
                    <div class="game-rec-desc">${data.description}</div>
                </div>
            `;
            recommendationsList.appendChild(rec);
        });
    }

    // Store recommendations for form submission
    leadData.recommendedGames = topGames.map(([name]) => name);

    // Submit final data
    submitToFormspree({
        type: 'COMPLETE - Full Lead with Priorities',
        name: leadData.name,
        email: leadData.email,
        organization: leadData.organization,
        title: leadData.title,
        finalScore: score,
        topPriorities: formatPriorities(),
        recommendedGames: leadData.recommendedGames.join(', ')
    });

    finalCta.classList.remove('hidden');
}

// ==========================================
// GAME MECHANICS
// ==========================================

function shoot() {
    const now = Date.now();
    if (now - lastBulletTime < bulletCooldown) return;

    lastBulletTime = now;
    bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 15,
        color: '#00ff00'
    });
}

function updatePlayer() {
    // Keyboard movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += player.speed;
    }

    // Touch/mouse movement
    if (touchX !== null) {
        const targetX = touchX - player.width / 2;
        const diff = targetX - player.x;
        if (Math.abs(diff) > 5) {
            player.x += diff * 0.15;
        }
    }

    // Bounds
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bulletSpeed;

        // Remove off-screen bullets
        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
}

function updateTargets() {
    let allTargetsGone = true;

    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        target.y += targetSpeed;

        // Check bullet collisions
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[j], target)) {
                // Hit!
                bullets.splice(j, 1);
                target.health--;

                if (target.health <= 0) {
                    // Record the hit priority
                    if (!leadData.prioritiesHit[target.name]) {
                        leadData.prioritiesHit[target.name] = 0;
                    }
                    leadData.prioritiesHit[target.name]++;

                    // Add score
                    score += 100;
                    updateHUD();

                    // Create explosion effect
                    createExplosion(target.x + target.width / 2, target.y + target.height / 2, target.color);

                    targets.splice(i, 1);
                }
                break;
            }
        }

        // Remove targets that drift off screen (player didn't care about them)
        if (target.y > canvas.height) {
            targets.splice(i, 1);
        }

        if (targets.length > 0) {
            allTargetsGone = false;
        }
    }

    // Check if level is complete (all targets gone)
    if (targets.length === 0 && gameState === 'playing') {
        completeLevel();
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        star.opacity = 0.3 + Math.sin(Date.now() / 1000 + star.x) * 0.3;

        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Explosions
let explosions = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 10; i++) {
        explosions.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 2,
            color: color,
            life: 1
        });
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const p = explosions[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;

        if (p.life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function updateHUD() {
    scoreDisplay.textContent = score;
    levelDisplay.textContent = currentLevel;
}

// ==========================================
// RENDERING
// ==========================================

function draw() {
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    drawStars();

    if (gameState === 'playing' || gameState === 'transition') {
        drawTargets();
        drawBullets();
        drawPlayer();
        drawExplosions();
    }
}

function drawStars() {
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPlayer() {
    ctx.save();

    // Ship body
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 15;

    // Draw spaceship shape
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.8, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height * 0.85);
    ctx.lineTo(player.x + player.width * 0.2, player.y + player.height * 0.7);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.ellipse(
        player.x + player.width / 2,
        player.y + player.height * 0.4,
        8, 12, 0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    ctx.shadowBlur = 0;
}

function drawTargets() {
    targets.forEach(target => {
        ctx.save();

        // Target box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = target.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = target.color;
        ctx.shadowBlur = 10;

        // Rounded rectangle
        roundRect(ctx, target.x, target.y, target.width, target.height, 5);
        ctx.fill();
        ctx.stroke();

        // Target text
        ctx.fillStyle = target.color;
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap for longer names
        const words = target.name.split(' ');
        if (words.length > 2 || target.name.length > 14) {
            const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
            ctx.fillText(line1, target.x + target.width / 2, target.y + target.height / 2 - 6);
            ctx.fillText(line2, target.x + target.width / 2, target.y + target.height / 2 + 8);
        } else {
            ctx.fillText(target.name, target.x + target.width / 2, target.y + target.height / 2);
        }

        ctx.restore();
    });
}

function drawExplosions() {
    explosions.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// ==========================================
// GAME LOOP
// ==========================================

function gameLoop() {
    // Update
    updateStars();

    if (gameState === 'playing') {
        updatePlayer();
        updateBullets();
        updateTargets();
        updateExplosions();
    }

    // Draw
    draw();

    // Next frame
    requestAnimationFrame(gameLoop);
}

// ==========================================
// START
// ==========================================

window.addEventListener('load', init);
