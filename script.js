const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.6; 
const mapWidth = 7000; 
let cameraX = 0;
let cameraY = 120; // Valor fixo para garantir que o chão apareça com o zoom
let gameState = 'menu';
let isPaused = false;
let isMuted = false;

// --- JOGADOR ---
const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), 
    attackFrames: 6, walkFrames: 8,
    currentFrame: 0, frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 320, hp: 1, damage: 1, speed: 1.2, range: 200, attackType: 'melee', state: 'patrol', walkFrames: 8, attackFrames: 4, deadFrames: 3, currentFrame: 0, frameTimer: 0, frameInterval: 4 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, damage: 1, speed: 1.8, range: 250, attackType: 'melee', state: 'jumping', walkFrames: 8, attackFrames: 4, deadFrames: 3, currentFrame: 0, frameTimer: 0, frameInterval: 4 },
        { type: 'Red_Slime', x: 4000, y: 320, hp: 1, damage: 1, speed: 2.5, range: 450, attackType: 'melee', state: 'chase', walkFrames: 8, attackFrames: 4, deadFrames: 3, currentFrame: 0, frameTimer: 0, frameInterval: 4 },
        { type: 'Enchantress', x: 6600, y: 300, hp: 3, damage: 1, speed: 2, range: 400, attackType: 'melee', walkFrames: 8, attackFrames: 6, deadFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 4  }
    ];

    enemies.forEach(en => {
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        en.width = 80; en.height = 80;
        en.currentFrame = 0; en.frameTimer = 0; en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left';
    });
}

const platforms = [
    { x: 0, y: 400, w: mapWidth, h: 60 },
    { x: 6400, y: 280, w: 500, h: 20 }
];

let keys = { left: false, right: false };

// --- SISTEMA ---
window.togglePause = function() {
    if (gameState !== 'playing') return;
    isPaused = !isPaused;
    if (isPaused) bgMusic.pause();
    else if (!isMuted) bgMusic.play().catch(() => {});
};

window.toggleSom = function() {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    const btn = document.getElementById('btn-audio');
    if (btn) btn.innerText = isMuted ? "Mudo" : "Som";
};

window.resetGame = function() {
    player.hp = player.maxHp; player.x = 100; player.y = 100;
    player.velX = 0; player.velY = 0; player.state = 'normal';
    cameraX = 0; isPaused = false; gameState = 'playing';
    initEnemies();
};

window.escolherPersonagem = function(genero) {
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});
    document.getElementById('selection-menu').style.display = 'none';
    document.getElementById('mobile-controls').style.display = 'flex';
};

window.mover = function(dir, estado) {
    if (gameState !== 'playing' || player.state === 'dead' || isPaused) return;
    if (dir === 'left') keys.left = estado;
    if (dir === 'right') keys.right = estado;
    if (estado) player.facing = dir;
};

window.pular = function() {
    if (gameState === 'playing' && player.onGround && !isPaused) player.velY = player.jumpForce;
};

window.atacar = function() {
    if (gameState === 'dead') { window.resetGame(); return; }
    if (gameState !== 'playing' || player.state !== 'normal' || isPaused) return;
    player.state = 'attacking'; player.currentFrame = 0;
    checkPlayerHit();
};

function checkPlayerHit() {
    enemies.forEach(en => {
        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if(dist < 100 && en.state !== 'dead') {
            en.hp--;
            if(en.hp <= 0) { en.state = 'dead'; en.currentFrame = 0; }
        }
    });
}

// --- LÓGICA ---
function update() {
    if (gameState !== 'playing' || isPaused) return;

    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.7;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + 40 < p.x + p.w && player.x + 60 > p.x && 
            player.y + player.height >= p.y && player.y + player.height <= p.y + 10) {
            player.y = p.y - player.height; player.velY = 0; player.onGround = true;
        }
    });

    // Animação
    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
        if (player.state === 'attacking') {
            player.currentFrame++;
            if (player.currentFrame >= player.attackFrames) player.state = 'normal';
        } else {
            if (Math.abs(player.velX) > 0.1) player.currentFrame = (player.currentFrame + 1) % player.walkFrames;
            else player.currentFrame = 0;
        }
        player.frameTimer = 0;
    }

    // Câmera X (Suave)
    let alvoX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    cameraX += (alvoX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
}

// --- DESENHO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY)); 

    // Chão
    ctx.fillStyle = "#4e342e";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Personagens
    [...enemies, player].forEach(obj => {
        let img = obj.imgWalk; 
        if (obj.state === 'attacking') img = obj.imgAttack;
        if (obj.state === 'dead') img = obj.imgDead;

        if(img && img.complete) {
            let totalFrames = (obj === player && obj.state === 'attacking') ? obj.attackFrames : 8;
            const fw = img.width / totalFrames;
            ctx.save();
            if(obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1);
                ctx.drawImage(img, (obj.currentFrame % totalFrames) * fw, 0, fw, img.height, 0, 0, obj.width, obj.height);
            } else {
                ctx.drawImage(img, (obj.currentFrame % totalFrames) * fw, 0, fw, img.height, obj.x, obj.y, obj.width, obj.height);
            }
            ctx.restore();
        }
    });

    ctx.restore();

    if (gameState === 'playing') {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

// Eventos
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', true);
    if(k === 'd') window.mover('right', true);
    if(k === 'w' || k === ' ') window.pular();
    if(k === 'k') window.atacar();
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', false);
    if(k === 'd') window.mover('right', false);
});

