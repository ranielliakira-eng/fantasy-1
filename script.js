const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

const gravity = 0.8;
const zoom = 2; 
const mapWidth = 7000; 
let cameraX = 0, cameraY = 0;

// --- IMAGENS ---
const potionImg = new Image();
potionImg.src = 'assets/Potions/LifePotionSmall.png';

const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3, invincible: false, invincibilityTimer: 0,
    imgWalk: new Image(), imgAttack: new Image(), imgDead: new Image(),
    imgJump: new Image(), imgHurt: new Image(),
    currentFrame: 0, walkFrames: 8, attackFrames: 6, jumpFrames: 8, deadFrames: 3, hurtFrames: 3,
    frameTimer: 0, frameInterval: 6
};
player.imgWalk.src = 'assets/Swordsman/Walk.png';
player.imgAttack.src = 'assets/Swordsman/Attack_1.png';
player.imgDead.src = 'assets/Swordsman/Dead.png';
player.imgJump.src = 'assets/Swordsman/Jump.png';
player.imgHurt.src = 'assets/Swordsman/Hurt.png';

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'slime', x: 500, y: 320, width: 80, height: 80, hp: 1, speed: 1.5, range: 100, startX: 500, walkFrames: 8, attackFrames: 4, jumpFrames: 13, deadFrames: 3, hurtFrames: 6, frameInterval: 10 },
        { type: 'skeleton', x: 1200, y: 300, width: 100, height: 100, hp: 2, speed: 1.2, range: 250, startX: 1200, walkFrames: 8, attackFrames: 7, jumpFrames: 10, deadFrames: 3, hurtFrames: 3, frameInterval: 8 },
        { type: 'warrior2', x: 1700, y: 300, width: 100, height: 100, hp: 2, speed: 2, range: 350, startX: 1700, walkFrames: 8, attackFrames: 4, jumpFrames: 7, deadFrames: 4, hurtFrames: 3, protectFrames: 2, frameInterval: 7 },
        { type: 'orc_warrior', x: 2500, y: 275, width: 130, height: 130, hp: 5, speed: 3, range: 400, startX: 2500, walkFrames: 7, attackFrames: 4, jumpFrames: 7, deadFrames: 4, hurtFrames: 2, frameInterval: 12 }
    ];

    enemies.forEach(en => {
        let path = en.type === 'slime' ? 'Blue_Slime' : en.type === 'skeleton' ? 'Skeleton' : en.type === 'warrior2' ? 'Warrior_2' : 'Orc_Warrior';
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${path}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${path}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${path}/Attack_1.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${path}/Dead.png`;
        en.imgJump = new Image(); en.imgJump.src = `assets/${path}/Jump.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${path}/Hurt.png`;
        if(en.type === 'warrior2') { en.imgProtect = new Image(); en.imgProtect.src = `assets/${path}/Protect.png`; }
        en.currentFrame = 0; en.frameTimer = 0; en.state = 'patrol'; en.facing = 'left';
        en.velX = 0; en.velY = 0; en.onGround = false;
    });
}

const platforms = [
    { x: 0, y: 400, w: mapWidth, h: 60 },
    { x: 400, y: 300, w: 200, h: 20 },
    { x: 900, y: 300, w: 400, h: 20 },
    { x: 1600, y: 300, w: 400, h: 20 },
    { x: 2400, y: 300, w: 700, h: 20 }
];

let potions = [{ x: 800, y: 365, w: 25, h: 25, collected: false }, { x: 2300, y: 365, w: 25, h: 25, collected: false }];
let keys = { left: false, right: false };

// --- CONTROLES MELHORADOS (CORREÇÃO DO BUG DE ANDAR SOZINHO) ---
window.mover = function(dir, estado) {
    if(player.state !== 'normal' && estado === true) return;
    
    if(dir === 'left') {
        keys.left = estado;
        if(estado) {
            keys.right = false; // Impede conflito se apertar os dois
            player.facing = 'left';
        }
    }
    if(dir === 'right') {
        keys.right = estado;
        if(estado) {
            keys.left = false; // Impede conflito
            player.facing = 'right';
        }
    }
};

window.pular = function() {
    if(player.state === 'normal' && player.onGround) player.velY = player.jumpForce;
};

window.atacar = function() {
    if(player.state === 'normal') {
        player.state = 'attacking'; 
        player.currentFrame = 0; 
        player.frameTimer = 0; 
        checkPlayerHit(); 
    }
    else if(player.state === 'dead') restartGame();
};

window.toggleSom = function() {
    const mus = document.getElementById('bg-music');
    if(mus) { if(mus.paused) mus.play(); else mus.pause(); }
};

// --- LÓGICA DE COMBATE ---
function checkPlayerHit() {
    enemies.forEach(en => {
        if(en.state === 'dead') return;
        let hitRange = en.type === 'slime' ? 45 : 75; 
        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if(dist < hitRange && Math.abs(player.y - en.y) < 50) {
            if((player.facing === 'right' && en.x > player.x) || (player.facing === 'left' && en.x < player.x)) {
                if(en.type === 'warrior2' && Math.random() < 0.5 && en.state !== 'hurt') {
                    en.state = 'protect'; en.currentFrame = 0; en.frameTimer = 0;
                    en.velX = (player.x < en.x) ? 4 : -4; return; 
                }
                en.hp--; 
                if (en.type === 'orc_warrior') {
                    en.velX = (player.x < en.x) ? 1.5 : -1.5; 
                    if (en.state !== 'attacking') { en.state = 'hurt'; en.currentFrame = 0; }
                } else {
                    en.state = 'hurt'; en.currentFrame = 0; en.frameTimer = 0;
                    en.velX = (player.x < en.x) ? 5 : -5; 
                }
                if(en.hp <= 0) { en.state = 'dead'; en.currentFrame = 0; }
            }
        }
    });
}

function takeDamage(amount = 1) {
    if(!player.invincible && player.state !== 'dead') {
        player.hp -= amount;
        if(player.hp <= 0) { player.state = 'dead'; player.currentFrame = 0; }
        else { 
            player.invincible = true; player.invincibilityTimer = 60; 
            player.velY = -5; player.velX = (player.facing === 'right') ? -8 : 8; 
            player.state = 'hurt'; player.currentFrame = 0;
        }
    }
}

function restartGame() {
    player.x = 100; player.y = 100; player.hp = 3; player.state = 'normal';
    player.velX = 0; player.velY = 0; 
    keys.left = false; keys.right = false; // Reseta teclas ao morrer
    potions.forEach(p => p.collected = false); initEnemies();
}

// --- UPDATE ---
function update() {
    // Cura
    potions.forEach(p => { 
        if (!p.collected && player.x < p.x + p.w && player.x + player.width > p.x && player.y < p.y + p.h && player.y + player.height > p.y) { 
            p.collected = true; if(player.hp < player.maxHp) player.hp++; 
        } 
    });

    if(player.invincible) { player.invincibilityTimer--; if (player.invincibilityTimer <= 0) player.invincible = false; }

    // Movimento Horizontal
    if (player.state === 'normal') {
        if (keys.left) player.velX = -player.speed; 
        else if (keys.right) player.velX = player.speed; 
        else { 
            player.velX *= 0.4; // Atrito/Desaceleração
            if (Math.abs(player.velX) < 0.1) player.velX = 0; 
        }
    } else { 
        player.velX *= 0.7; // Reduz velocidade em outros estados (hurt/attack)
        if (Math.abs(player.velX) < 0.1) player.velX = 0; 
    }

    // Física
    player.velY += gravity; 
    player.x += player.velX; 
    player.y += player.velY;

    // Colisão com bordas do mapa
    if (player.x < 0) player.x = 0; 
    if (player.x + player.width > mapWidth) player.x = mapWidth - player.width;

    // Colisão com Plataformas
    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + player.width*0.4 < p.x + p.w && player.x + player.width*0.6 > p.x) {
            if (player.velY >= 0 && player.y + player.height <= p.y + player.velY + 5 && player.y + player.height >= p.y - 10) {
                player.velY = 0; player.y = p.y - player.height; player.onGround = true;
            }
        }
    });

    // --- LÓGICA INIMIGOS (Resumida) ---
    enemies.forEach((en, index) => {
        if (en.state === 'dead') {
            en.frameTimer++; if (en.frameTimer > en.frameInterval) { en.currentFrame++; en.frameTimer = 0; if (en.currentFrame >= en.deadFrames) enemies.splice(index, 1); }
            return;
        }
        en.velY += gravity; en.y += en.velY; en.x += en.velX; en.velX *= 0.9;
        en.onGround = false;
        platforms.forEach(p => {
            if (en.x + en.width*0.3 < p.x + p.w && en.x + en.width*0.7 > p.x) {
                if (en.velY >= 0 && en.y + en.height <= p.y + en.velY + 5 && en.y + en.height >= p.y - 10) {
                    en.velY = 0; en.y = p.y - en.height; en.onGround = true;
                }
            }
        });
        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        let vDist = Math.abs((player.y + player.height) - (en.y + en.height));
        let attackRange = en.type === 'orc_warrior' ? 60 : 45;
        if (dist < attackRange && vDist < 35 && en.state === 'patrol') { 
            en.state = 'attacking'; en.currentFrame = 0; en.facing = (player.x < en.x) ? 'left' : 'right'; 
        }
        en.frameTimer++;
        if (en.frameTimer > en.frameInterval) {
            en.frameTimer = 0;
            if (en.state === 'attacking') {
                en.currentFrame++;
                if (en.currentFrame === Math.floor(en.attackFrames / 2) && dist < attackRange + 10 && vDist < 35) takeDamage(en.type === 'orc_warrior' ? 2 : 1);
                if (en.currentFrame >= en.attackFrames) { en.state = 'patrol'; en.currentFrame = 0; }
            } else if (en.state === 'hurt' || en.state === 'protect') {
                en.currentFrame++;
                let maxF = en.state === 'hurt' ? en.hurtFrames : en.protectFrames;
                if (en.currentFrame >= maxF) { en.state = 'patrol'; en.currentFrame = 0; }
            } else { 
                en.currentFrame = (en.currentFrame + 1) % en.walkFrames;
                if (en.onGround) {
                    if (en.facing === 'left') en.x -= en.speed; else en.x += en.speed;
                    if (en.x < en.startX - en.range) en.facing = 'right';
                    if (en.x > en.startX + en.range) en.facing = 'left';
                }
            }
        }
    });

    // --- ANIMAÇÃO PLAYER ---
    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
        player.frameTimer = 0;
        if (player.state === 'dead') { if (player.currentFrame < player.deadFrames - 1) player.currentFrame++; }
        else if (player.state === 'hurt' || player.state === 'attacking') {
            player.currentFrame++;
            let maxF = player.state === 'hurt' ? player.hurtFrames : player.attackFrames;
            if (player.currentFrame >= maxF) { player.state = 'normal'; player.currentFrame = 0; }
        } else if (Math.abs(player.velX) > 0.1 && player.onGround) { player.currentFrame = (player.currentFrame + 1) % player.walkFrames; }
        else { player.currentFrame = 0; }
    }

    // --- CÂMERA DINÂMICA (CORREÇÃO PARA SEGUIR Y) ---
    let targetX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    let targetY = (player.y + player.height / 2) - (canvas.height / 2) / zoom;

    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;

    if (cameraX < 0) cameraX = 0;
    if (cameraX > mapWidth - (canvas.width / zoom)) cameraX = mapWidth - (canvas.width / zoom);
}

// --- DRAW ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); 
    ctx.scale(zoom, zoom); 
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));
    
    ctx.fillStyle = "#87CEEB"; 
    ctx.fillRect(cameraX, cameraY, canvas.width / zoom, canvas.height / zoom);

    platforms.forEach(p => { 
        ctx.fillStyle = "#4e342e"; ctx.fillRect(p.x, p.y, p.w, p.h); 
        ctx.fillStyle = "#2e7d32"; ctx.fillRect(p.x, p.y, p.w, 6); 
    });

    potions.forEach(p => { if(!p.collected) { if(potionImg.complete) ctx.drawImage(potionImg, p.x, p.y, p.w, p.h); else { ctx.fillStyle = "#ff0066"; ctx.fillRect(p.x, p.y, p.w, p.h); } } });

    enemies.concat(player).forEach(obj => {
        let isP = obj === player;
        let isJumping = !obj.onGround && Math.abs(obj.velY) > 1;
        let img = isP ? (obj.state === 'dead' ? obj.imgDead : obj.state === 'hurt' ? obj.imgHurt : obj.state === 'attacking' ? obj.imgAttack : (isJumping ? obj.imgJump : obj.imgWalk)) : (obj.state === 'dead' ? obj.imgDead : obj.state === 'hurt' ? obj.imgHurt : obj.state === 'protect' ? obj.imgProtect : obj.state === 'attacking' ? obj.imgAttack : (isJumping ? obj.imgJump : obj.imgWalk));
        let frames = isP ? (obj.state === 'dead' ? obj.deadFrames : obj.state === 'hurt' ? obj.hurtFrames : obj.state === 'attacking' ? obj.attackFrames : (isJumping ? obj.jumpFrames : obj.walkFrames)) : (obj.state === 'dead' ? obj.deadFrames : obj.state === 'hurt' ? obj.hurtFrames : obj.state === 'protect' ? obj.protectFrames : obj.state === 'attacking' ? obj.attackFrames : (isJumping ? obj.jumpFrames : obj.walkFrames));
        
        if (img && img.complete && img.naturalWidth !== 0) {
            let fw = img.width / frames;
            ctx.save();
            if(isP && obj.invincible && Math.floor(Date.now()/100)%2===0) ctx.globalAlpha = 0.5;
            if(obj.facing === 'left') { ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1); ctx.drawImage(img, Math.min(obj.currentFrame, frames - 1) * fw, 0, fw, img.height, 0, 0, obj.width, obj.height); }
            else { ctx.drawImage(img, Math.min(obj.currentFrame, frames - 1) * fw, 0, fw, img.height, obj.x, obj.y, obj.width, obj.height); }
            ctx.restore();
        }
    });

    ctx.restore();
    
    const centerX = (canvas.width / 2) - 52;
    ctx.fillStyle = "black"; ctx.fillRect(centerX, 20, 104, 14);
    ctx.fillStyle = "red"; ctx.fillRect(centerX + 2, 22, Math.max(0, (player.hp / player.maxHp) * 100), 10);
    
    if(player.state === 'dead') { 
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, canvas.width, canvas.height); 
        ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "20px Arial"; 
        ctx.fillText("VOCÊ MORREU - TOQUE EM ATACAR PARA VOLTAR", canvas.width/2, canvas.height/2); 
    }
}

// --- EVENTOS DE TECLADO ---
window.addEventListener('keydown', (e) => {
    if(player.state === 'dead' && (e.code === 'KeyR' || e.code === 'KeyJ')) restartGame();
    if(player.state !== 'normal') return;
    if(e.code === 'KeyA' || e.code === 'ArrowLeft') window.mover('left', true);
    if(e.code === 'KeyD' || e.code === 'ArrowRight') window.mover('right', true);
    if((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && player.onGround) window.pular();
    if(e.code === 'KeyJ') window.atacar();
});

window.addEventListener('keyup', (e) => {
    if(e.code === 'KeyA' || e.code === 'ArrowLeft') window.mover('left', false);
    if(e.code === 'KeyD' || e.code === 'ArrowRight') window.mover('right', false);
});

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
initEnemies(); gameLoop();


