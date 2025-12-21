const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.6; 
const mapWidth = 7000; // O tamanho total do seu mundo
let cameraX = 0;
let cameraY = 0;
let gameState = 'menu';
let isPaused = false;
let isMuted = false;

// --- JOGADOR ---
const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3, invincible: false, invincibilityTimer: 0,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), 
    attackFrames: 6,
    currentFrame: 0, walkFrames: 8, jumpFrames: 8, deadFrames: 3, hurtFrames: 3,
    frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 200, hp: 1, speed: 1.2, range: 200, damage: 1 },
        { type: 'Red_Slime', x: 2500, y: 200, hp: 1, speed: 2.5, range: 450, damage: 1 },
        { type: 'Blue_Slime', x: 4000, y: 200, hp: 1, speed: 1.8, range: 250, damage: 1 },
        { 
            type: 'Enchantress', x: 6600, y: 150, hp: 3, speed: 2, 
            attackType: 'melee', range: 400, damage: 1
        }
    ];

    enemies.forEach(en => {
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgJump = new Image(); en.imgJump.src = `assets/${en.type}/Jump.png`;
        en.width = en.type === 'Enchantress' ? 100 : 80;
        en.height = en.type === 'Enchantress' ? 100 : 80;
        en.walkFrames = 8; 
        en.attackFrames = en.type === 'Enchantress' ? 6 : 4;
        en.deadFrames = en.type === 'Enchantress' ? 5 : 3;
        en.hurtFrames = en.type === 'Enchantress' ? 2 : 6;
        en.jumpFrames = 8; en.frameInterval = 5;
        en.currentFrame = 0; en.frameTimer = 0; en.state = 'patrol'; en.facing = 'left';
        en.velX = 0; en.velY = 0; en.onGround = false;
    });
}

const platforms = [
    { x: 0, y: 400, w: mapWidth, h: 60 }, // Chão principal comprido
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
    player.hp = player.maxHp;
    player.x = 100; player.y = 100;
    player.velX = 0; player.velY = 0;
    player.state = 'normal'; player.currentFrame = 0;
    player.invincible = false;
    cameraX = 0; 
    isPaused = false;
    gameState = 'playing';
    initEnemies();
};

window.escolherPersonagem = function(genero) {
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});
    document.getElementById('selection-menu').style.display = 'none';
    document.getElementById('mobile-controls').style.display = 'flex';
};

// --- CONTROLES ---
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
    if (gameState === 'dead' || gameState === 'victory') { window.resetGame(); return; }
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

// --- CORE (LÓGICA E DESENHO) ---
function update() {
    if (gameState !== 'playing' || isPaused) return;

    // Movimento Player
    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.7;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Colisão Chão Simples
    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + 50 < p.x + p.w && player.x + 50 > p.x && 
            player.y + player.height >= p.y && player.y + player.height <= p.y + 10) {
            player.y = p.y - player.height; player.velY = 0; player.onGround = true;
        }
    });

    // CORREÇÃO DA CÂMERA: Foca no jogador e suaviza
    let targetCameraX = (player.x + player.width/2) - (canvas.width / 2) / zoom;
    cameraX += (targetCameraX - cameraX) * 0.1;
    
    // Trava a câmera nos limites do mapa (7000px)
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    // APLICANDO A CÂMERA
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cameraX), 0); // O segredo está aqui

    // Desenhar Plataformas
    ctx.fillStyle = "#4e342e";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Desenhar Personagens (Simplificado para o exemplo rodar)
    [...enemies, player].forEach(obj => {
        ctx.fillStyle = obj === player ? "blue" : "red";
        // Se a imagem existir, desenha ela, se não, desenha um bloco para teste
        let img = obj === player ? obj.imgWalk : obj.imgWalk;
        if(img && img.complete) {
            ctx.drawImage(img, 0, 0, img.width/8, img.height, obj.x, obj.y, obj.width, obj.height);
        } else {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }
    });

    ctx.restore();

    // UI fixa na tela (HP)
    if (gameState === 'playing') {
        ctx.fillStyle = "red";
        ctx.fillRect(20, 20, player.hp * 50, 10);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();

// Eventos de teclado
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', true);
    if(k === 'd') window.mover('right', true);
    if(k === 'w' || k === ' ') window.pular();
    if(k === 'k') window.atacar();
    if(k === 'p') window.togglePause();
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', false);
    if(k === 'd') window.mover('right', false);
});
