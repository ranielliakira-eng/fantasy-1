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
let cameraX = 0, cameraY = 0;
let gameState = 'menu';

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

// --- FUNÇÃO DE SELEÇÃO CORRIGIDA PARA 2025 ---
window.escolherPersonagem = function(genero) {
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;

    if (genero === 'menina') {
        player.attackFrames = 5; player.walkFrames = 8; player.jumpFrames = 6; 
        player.deadFrames = 4; player.hurtFrames = 3;
    } else {
        player.attackFrames = 6; player.walkFrames = 8; player.jumpFrames = 8; 
        player.deadFrames = 3; player.hurtFrames = 3;
    }

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => { console.log("Música aguardando interação"); });

    // REMOÇÃO DO MENU: Garante que nada bloqueie os botões no mobile
    const menu = document.getElementById('selection-menu');
    if(menu) {
        menu.style.display = 'none';
        menu.remove(); // Deleta o elemento para liberar a camada de toque
    }

    // Garante que os botões de controle estejam com Z-index máximo
    const controles = document.querySelector('.controls');
    if(controles) {
        controles.style.display = 'flex';
        controles.style.zIndex = "9999";
    }
};

// --- CONTROLES ---
let keys = { left: false, right: false };

window.mover = function(dir, estado) {
    if (gameState !== 'playing' || player.state === 'dead') return;
    if (dir === 'left') { keys.left = estado; if (estado) { keys.right = false; player.facing = 'left'; } }
    if (dir === 'right') { keys.right = estado; if (estado) { keys.left = false; player.facing = 'right'; } }
};

window.pular = function() {
    if (gameState === 'playing' && player.onGround && (player.state === 'normal' || player.state === 'hurt')) {
        player.velY = player.jumpForce;
    }
};

window.atacar = function() {
    if (gameState !== 'playing' || player.state !== 'normal') return;
    player.state = 'attacking'; player.currentFrame = 0; player.frameTimer = 0;
    checkPlayerHit();
};

// --- LÓGICA DE JOGO (RESUMIDA) ---
function checkPlayerHit() {
    enemies.forEach(en => {
        if(en.state === 'dead' || en.state === 'hurt') return;
        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if(dist < 110 && Math.abs(player.y - en.y) < 70) { 
            en.hp--;
            if(en.hp <= 0) { en.state = 'dead'; en.currentFrame = 0; }
            else { en.state = 'hurt'; en.currentFrame = 0; en.velX = (player.x < en.x) ? 8 : -8; }
        }
    });
}

function takeDamage(amount = 1) {
    if(!player.invincible && player.state !== 'dead' && gameState === 'playing') {
        player.hp -= amount;
        if(player.hp <= 0) { player.state = 'dead'; gameState = 'dead'; }
        else { 
            player.invincible = true; player.invincibilityTimer = 60; 
            player.state = 'hurt'; player.currentFrame = 0;
            player.velY = -7; player.velX = (player.facing === 'right') ? -8 : 8;
        }
    }
}

// --- SISTEMA DE INIMIGOS E PLATAFORMAS ---
let enemies = [];
function initEnemies() {
    enemies = [{ type: 'Green_Slime', x: 600, y: 320, hp: 1, speed: 1.2, range: 150, damage: 1 }];
    enemies.forEach(en => {
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.width = 80; en.height = 80; en.walkFrames = 8; en.attackFrames = 4;
        en.currentFrame = 0; en.frameTimer = 0; en.state = 'patrol'; en.facing = 'left';
        en.velX = 0; en.velY = 0; en.onGround = false;
    });
}

const platforms = [{ x: 0, y: 400, w: 7000, h: 60 }];

// --- LOOP PRINCIPAL ---
function update() {
    if (gameState !== 'playing') return;

    // Física Jogador
    if (player.state === 'normal' || player.state === 'hurt') {
        if (keys.left) player.velX = -player.speed;
        else if (keys.right) player.velX = player.speed;
        else player.velX *= 0.4;
    } else { player.velX *= 0.7; }

    player.velY += gravity; player.x += player.velX; player.y += player.velY;
    if(player.x < 0) player.x = 0;

    // Colisão Plataforma Simples
    player.onGround = false;
    platforms.forEach(p => {
        if (player.y + player.height <= p.y + 10 && player.y + player.height + player.velY >= p.y) {
            player.velY = 0; player.y = p.y - player.height; player.onGround = true;
        }
    });

    // Câmera
    cameraX += ((player.x + player.width/2 - (canvas.width/2)/zoom) - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width/zoom));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cameraX), 0);

    // Chão
    ctx.fillStyle = "#4e342e";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Player
    let img = (player.state === 'attacking' ? player.imgAttack : (player.state === 'dead' ? player.imgDead : player.imgWalk));
    let frames = (player.state === 'attacking' ? player.attackFrames : (player.state === 'dead' ? player.deadFrames : player.walkFrames));
    
    if (img.complete) {
        let fw = img.width / frames;
        player.frameTimer++;
        if(player.frameTimer > player.frameInterval) {
            player.currentFrame = (player.currentFrame + 1) % frames;
            player.frameTimer = 0;
        }
        ctx.drawImage(img, player.currentFrame * fw, 0, fw, img.height, player.x, player.y, player.width, player.height);
    }
    ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();
