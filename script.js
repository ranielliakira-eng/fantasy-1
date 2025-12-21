const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.6; 
const mapWidth = 7000; 
const mapHeight = 1000; // Definindo uma altura para o mapa
let cameraX = 0, cameraY = 0;
let gameState = 'menu';

const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3, invincible: false, invincibilityTimer: 0,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), 
    attackFrames: 6, currentFrame: 0, walkFrames: 8, jumpFrames: 8, deadFrames: 3, hurtFrames: 3,
    frameTimer: 0, frameInterval: 6
};

let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 600, y: 320, hp: 1, speed: 1.2, range: 150, damage: 1 },
        { type: 'Red_Slime', x: 1500, y: 320, hp: 1, speed: 2.5, range: 450, damage: 1 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, speed: 1.8, range: 200, damage: 1 }
    ];
    enemies.forEach(en => {
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.width = 80; en.height = 80; en.walkFrames = 8; en.attackFrames = 4;
        en.currentFrame = 0; en.frameTimer = 0; en.state = 'patrol'; en.facing = 'left';
        en.velX = 0; en.velY = 0; en.onGround = false; en.startX = en.x;
    });
}

const platforms = [
    { x: 0, y: 400, w: 7000, h: 60 },
    { x: 400, y: 300, w: 200, h: 20 },
    { x: 1400, y: 300, w: 300, h: 20 },
    { x: 2400, y: 320, w: 400, h: 20 }
];

window.escolherPersonagem = function(genero) {
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;
    player.attackFrames = (genero === 'menina') ? 5 : 6;
    player.jumpFrames = (genero === 'menina') ? 6 : 8;
    player.deadFrames = (genero === 'menina') ? 4 : 3;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});

    const menu = document.getElementById('selection-menu');
    if(menu) menu.remove();
    const controles = document.getElementById('mobile-controls');
    if(controles) { controles.style.display = 'flex'; }
    window.dispatchEvent(new Event('resize'));
};

let keys = { left: false, right: false };
window.mover = function(dir, estado) {
    if (gameState !== 'playing' || player.state === 'dead') return;
    if (dir === 'left') { keys.left = estado; if (estado) { keys.right = false; player.facing = 'left'; } }
    if (dir === 'right') { keys.right = estado; if (estado) { keys.left = false; player.facing = 'right'; } }
};
window.pular = function() { if (gameState === 'playing' && player.onGround) player.velY = player.jumpForce; };
window.atacar = function() { if (gameState === 'playing' && player.state === 'normal') { player.state = 'attacking'; player.currentFrame = 0; checkPlayerHit(); } };

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a' || e.key === 'ArrowLeft') window.mover('left', true);
    if (key === 'd' || e.key === 'ArrowRight') window.mover('right', true);
    if (key === 'w' || key === ' ' || key === 'j') window.pular();
    if (key === 'k' || key === 'f') window.atacar();
});
window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a' || e.key === 'ArrowLeft') window.mover('left', false);
    if (key === 'd' || e.key === 'ArrowRight') window.mover('right', false);
});

function checkPlayerHit() {
    enemies.forEach(en => {
        if(en.state === 'dead') return;
        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if(dist < 100 && Math.abs(player.y - en.y) < 50) {
            en.hp--;
            if(en.hp <= 0) { en.state = 'dead'; en.currentFrame = 0; }
            else { en.state = 'hurt'; en.currentFrame = 0; en.velX = (player.x < en.x) ? 5 : -5; }
        }
    });
}

function takeDamage(amount = 1) {
    if(!player.invincible && player.state !== 'dead') {
        player.hp -= amount;
        if(player.hp <= 0) player.state = 'dead';
        else { player.invincible = true; player.invincibilityTimer = 60; player.state = 'hurt'; player.currentFrame = 0; player.velY = -7; player.velX = (player.facing === 'right') ? -8 : 8; }
    }
}

function update() {
    if (gameState !== 'playing') return;
    if(player.invincible) { player.invincibilityTimer--; if(player.invincibilityTimer <= 0) player.invincible = false; }
    if (player.state === 'normal' || player.state === 'hurt') {
        if (keys.left) player.velX = -player.speed; else if (keys.right) player.velX = player.speed; else player.velX *= 0.4;
    } else player.velX *= 0.7;
    player.velY += gravity; player.x += player.velX; player.y += player.velY;
    if(player.x < 0) player.x = 0;
    player.onGround = false;
    platforms.forEach(p => { if (player.x + 40 < p.x + p.w && player.x + 60 > p.x && player.velY >= 0 && player.y + player.height <= p.y + player.velY + 5 && player.y + player.height >= p.y - 10) { player.velY = 0; player.y = p.y - player.height; player.onGround = true; } });
    enemies.forEach(en => { if(en.state === 'dead') return; en.velY += gravity; en.y += en.velY; en.x += en.velX; en.velX *= 0.9; if(en.facing === 'left') en.x -= en.speed; else en.x += en.speed; if(en.x < en.startX - en.range) en.facing = 'right'; if(en.x > en.startX + en.range) en.facing = 'left'; if(Math.abs(player.x - en.x) < 50 && Math.abs(player.y - en.y) < 50) takeDamage(1); });
    
    // --- LÓGICA DE CÂMERA CORRIGIDA ---
    // Centraliza o jogador e suaviza o movimento (fator 0.1)
    let targetX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    let targetY = (player.y + player.height / 2) - (canvas.height / 2) / zoom;

    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;

    // Impede que a câmera saia dos limites do mapa (X e Y)
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
    cameraY = Math.max(-200, Math.min(cameraY, 500 - canvas.height / zoom)); 
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;
    ctx.save(); 
    ctx.scale(zoom, zoom); 
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));
    
    ctx.fillStyle = "#4e342e"; platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    enemies.concat(player).forEach(obj => {
        let isP = obj === player;
        let img = isP ? (obj.state === 'attacking' ? obj.imgAttack : (obj.state === 'dead' ? obj.imgDead : (obj.onGround ? obj.imgWalk : obj.imgJump))) : (obj.state === 'dead' ? obj.imgDead : obj.imgWalk);
        let frames = isP ? (obj.state === 'attacking' ? obj.attackFrames : (obj.state === 'dead' ? obj.deadFrames : (obj.onGround ? obj.walkFrames : obj.jumpFrames))) : (obj.state === 'dead' ? obj.deadFrames : obj.walkFrames);
        if (img.complete) {
            let fw = img.width / frames; obj.frameTimer++;
            if(obj.frameTimer > obj.frameInterval) { obj.currentFrame = (obj.currentFrame + 1) % frames; obj.frameTimer = 0; if((obj.state === 'attacking' || obj.state === 'hurt') && obj.currentFrame === frames - 1) obj.state = 'normal'; }
            ctx.save(); if(isP && obj.invincible && Math.floor(Date.now()/100)%2===0) ctx.globalAlpha = 0.5;
            if(obj.facing === 'left') { ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1); ctx.drawImage(img, obj.currentFrame * fw, 0, fw, img.height, 0, 0, obj.width, obj.height); }
            else { ctx.drawImage(img, obj.currentFrame * fw, 0, fw, img.height, obj.x, obj.y, obj.width, obj.height); }
            ctx.restore();
        }
    });
    ctx.restore();
    if(gameState === 'playing') { ctx.fillStyle = "red"; ctx.fillRect(20, 20, player.hp * 30, 10); }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();
