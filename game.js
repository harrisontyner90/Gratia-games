// ==========================================
// GRATIA HEALTH - PRIORITY BLASTER GAME
// ==========================================

// Canvas & Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'start'; // start, playing, gate1, gate2, final
let currentLevel = 1;
let score = 0;
let wave = 1;
let wavesPerLevel = 3;

// Lead Data
let leadData = {
    name: '',
    email: '',
    organization: '',
    title: '',
    prioritiesHit: {}
};

// Priority Targets by Level
const priorityTargets = {
    1: [
        'Patient Experience',
        'Staff Retention',
        'Contract Labor Costs',
        'Sepsis Rates'
    ],
    2: [
        'Readmission Rates',
        'Staff Satisfaction',
        'Burnout Prevention',
        'HCAHPS Scores'
    ],
    3: [
        'Quality Metrics',
        'Nurse Turnover',
        'Agency Spending',
        'Patient Safety'
    ]
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
let targetSpeed = 1.5;

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

// Formspree endpoint - replace with your actual endpoint
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

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
// GAME FLOW
// ==========================================

function startGame() {
    startScreen.classList.add('hidden');
    gameState = 'playing';
    currentLevel = 1;
    score = 0;
    wave = 1;
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
    wave = 1;
    targets = [];
    bullets = [];
    updateHUD();
}

function spawnWave() {
    const levelTargets = priorityTargets[currentLevel];
    // Only spawn 2 targets per wave, staggered vertically
    const startIdx = ((wave - 1) * 2) % levelTargets.length;
    const targetsThisWave = [
        levelTargets[startIdx % levelTargets.length],
        levelTargets[(startIdx + 1) % levelTargets.length]
    ];

    // Position targets with good horizontal spacing
    const positions = [
        canvas.width * 0.25 - targetWidth / 2,
        canvas.width * 0.75 - targetWidth / 2
    ];

    for (let i = 0; i < targetsThisWave.length; i++) {
        const targetName = targetsThisWave[i];
        targets.push({
            x: positions[i],
            y: -targetHeight - (i * 80), // Stagger vertically
            width: targetWidth,
            height: targetHeight,
            name: targetName,
            color: targetColors[(startIdx + i) % targetColors.length],
            health: 1
        });
    }
}

function nextWave() {
    wave++;

    if (wave > wavesPerLevel) {
        // Level complete
        completeLevel();
    } else {
        // Show wave indicator briefly
        showLevelText('WAVE ' + wave);
        setTimeout(spawnWave, 1000);
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
    wave = 1;
    targetSpeed += 0.2;
    updateHUD();
    gameState = 'playing';
    showLevelText('LEVEL ' + currentLevel);
    setTimeout(spawnWave, 1000);
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

    // Submit to Formspree (non-blocking)
    submitToFormspree({
        type: 'Gate 1 - Initial Contact',
        name: leadData.name,
        email: leadData.email,
        score: score,
        priorities: formatPriorities()
    });

    gate1.classList.add('hidden');
    startNextLevel();
}

async function handleGate2Submit(e) {
    e.preventDefault();

    leadData.organization = document.getElementById('organization').value;
    leadData.title = document.getElementById('title').value;

    // Submit to Formspree with full info
    submitToFormspree({
        type: 'Gate 2 - Full Lead',
        name: leadData.name,
        email: leadData.email,
        organization: leadData.organization,
        title: leadData.title,
        score: score,
        priorities: formatPriorities()
    });

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
        await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.log('Form submission error (this is expected in dev):', err);
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

    // Submit final data
    submitToFormspree({
        type: 'COMPLETE - Full Lead with Priorities',
        name: leadData.name,
        email: leadData.email,
        organization: leadData.organization,
        title: leadData.title,
        finalScore: score,
        topPriorities: formatPriorities()
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

    // Check if wave is complete
    if (allTargetsGone && gameState === 'playing') {
        nextWave();
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
