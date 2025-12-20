const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav'); // Corrigido para "sounds"
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.6; 
const mapWidth = 7000; 
let cameraX = 0, cameraY = 0;
let gameState = 'menu';

// --- JOGADOR (100x100) ---
const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3, invincible: false, invincibilityTimer: 0,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    attacks: [ { img: new Image(), frames: 6 }, { img: new Image(), frames: 6 }, { img: new Image(), frames: 6 } ],
    currentAttackIndex: 0,
    currentFrame: 0, walkFrames: 8, attackFrames: 6, jumpFrames: 8, deadFrames: 3, hurtFrames: 3,
    frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 600, y: 320, hp: 1, speed: 1.2, range: 150, damage: 1 },
        { type: 'Red_Slime', x: 1500, y: 320, hp: 1, speed: 2.5, range: 450, damage: 1 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, speed: 1.8, range: 200, damage: 1, jumpTimer: 1 },
        { type: 'Enchantress', x: 6500, y: 250, hp: 10, speed: 2, range: 400, damage: 1, width: 100, height: 100, walkFrames: 8, attackFrames: 10, deadFrames: 5, hurtFrames: 3, jumpFrames: 8 }
    ];

    enemies.forEach(en => {
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgJump = new Image(); en.imgJump.src = `assets/${en.type}/Jump.png`;

        if(en.type.includes('Slime')) {
            en.width = 80; en.height = 80;
            en.walkFrames = 8; en.attackFrames = 4; en.deadFrames = 3; en.hurtFrames = 6; en.jumpFrames = 8;
            en.frameInterval = 10;
        }
        en.currentFrame = 0; en.frameTimer = 0; en.state = 'patrol'; en.facing = 'left';
        en.velX = 0; en.velY = 0; en.onGround = false; en.startX = en.x;
    });
}

const platforms = [
    { x: 0, y: 400, w: mapWidth, h: 60 },
    { x: 400, y: 300, w: 200, h: 20 },
    { x: 1400, y: 300, w: 300, h: 20 },
    { x: 2400, y: 320, w: 400, h: 20 },
    { x: 6400, y: 370, w: 500, h: 30 }
];

let keys = { left: false, right: false };

window.escolherPersonagem = function(genero) {
    if (genero === 'menina') {
        const folder = 'Knight';
        player.imgWalk.src = `assets/${folder}/Walk.png`;
        player.imgJump.src = `assets/${folder}/Jump.png`;
        player.imgDead.src = `assets/${folder}/Dead.png`;
        player.imgHurt.src = `assets/${folder}/Hurt.png`;
        
        // Frames específicos para os 3 ataques da Menina
        player.attacks[0].img.src = `assets/${folder}/Attack_1.png`;
        player.attacks[0].frames = 5; // Ajuste o número real aqui
        player.attacks[1].img.src = `assets/${folder}/Attack_2.png`;
        player.attacks[1].frames = 2; // Ajuste o número real aqui
        player.attacks[2].img.src = `assets/${folder}/Attack_3.png`;
        player.attacks[2].frames = 5; // Ajuste o número real aqui

        player.walkFrames = 8;
        player.jumpFrames = 6;
        player.deadFrames = 4;
        player.hurtFrames = 3;
    } else {
        const folder = 'Swordsman';
        player.imgWalk.src = `assets/${folder}/Walk.png`;
        player.imgJump.src = `assets/${folder}/Jump.png`;
        player.imgDead.src = `assets/${folder}/Dead.png`;
        player.imgHurt.src = `assets/${folder}/Hurt.png`;

        // Frames específicos para os 3 ataques do Menino
        player.attacks[0].img.src = `assets/${folder}/Attack_1.png`;
        player.attacks[0].frames = 6;
        player.attacks[1].img.src = `assets/${folder}/Attack_2.png`;
        player.attacks[1].frames = 3;
        player.attacks[2].img.src = `assets/${folder}/Attack_3.png`;
        player.attacks[2].frames = 4;

        player.walkFrames = 8;
        player.jumpFrames = 8;
        player.deadFrames = 3;
        player.hurtFrames = 3;
    }
    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});
    document.querySelector('.selection-menu').style.display = 'none';
};

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
    player.currentAttackIndex = Math.floor(Math.random() * 3);
    player.state = 'attacking'; player.currentFrame = 0; player.frameTimer = 0;
    checkPlayerHit();
};

function checkPlayerHit() {
    enemies.forEach(en => {
        if(en.state === 'dead' || en.state === 'hurt') return;
        let pCenterX = player.x + player.width/2;
        let eCenterX = en.x + en.width/2;
        let dist = Math.abs(pCenterX - eCenterX);
        if(dist < 110 && Math.abs(player.y - en.y) < 70) { 
            if((player.facing === 'right' && eCenterX > pCenterX) || (player.facing === 'left' && eCenterX < pCenterX)) {
                en.hp--;
                if(en.hp <= 0) { en.state = 'dead'; en.currentFrame = 0; if(en.type === 'Enchantress') gameState = 'victory'; }
                else { en.state = 'hurt'; en.currentFrame = 0; en.velX = (player.x < en.x) ? 8 : -8; }
            }
        }
    });
}

function takeDamage(amount = 1) {
    if(!player.invincible && player.state !== 'dead' && gameState === 'playing') {
        player.hp -= amount;
        if(player.hp <= 0) { player.hp = 0; player.state = 'dead'; gameState = 'dead'; }
        else { 
            player.invincible = true; player.invincibilityTimer = 60; 
            player.state = 'hurt'; player.currentFrame = 0;
            player.velY = -7; player.velX = (player.facing === 'right') ? -8 : 8;
        }
    }
}

function update() {
    if (gameState !== 'playing') return;

    if(player.invincible) { player.invincibilityTimer--; if(player.invincibilityTimer <= 0) player.invincible = false; }

    if (player.state === 'normal' || player.state === 'hurt') {
        if (keys.left) player.velX = -player.speed;
        else if (keys.right) player.velX = player.speed;
        else player.velX *= 0.4;
    } else { player.velX *= 0.7; }

    player.velY += gravity; player.x += player.velX; player.y += player.velY;
    if(player.x < 0) player.x = 0;

    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + 40 < p.x + p.w && player.x + 60 > p.x) {
            if (player.velY >= 0 && player.y + player.height <= p.y + player.velY + 5 && player.y + player.height >= p.y - 10) {
                player.velY = 0; player.y = p.y - player.height; player.onGround = true;
            }
        }
    });

    // --- CÂMERA DINÂMICA (X e Y) ---
    let centroX = (canvas.width / 2) / zoom;
    let centroY = (canvas.height / 2) / zoom;
    
    // Calcula a posição alvo para centralizar o jogador
    let targetX = (player.x + player.width / 2) - centroX;
    let targetY = (player.y + player.height / 2) - centroY;
    
    // Suavização da câmera nos dois eixos
    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;

    // Limites para não sair do mapa
    if (cameraX < 0) cameraX = 0;
    if (cameraX > mapWidth - canvas.width / zoom) cameraX = mapWidth - canvas.width / zoom;
    // Opcional: limite superior da câmera para não mostrar muito o céu
    if (cameraY < -100) cameraY = -100; 

    // --- LÓGICA DE INIMIGOS ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i];
        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer > en.frameInterval) {
                en.currentFrame++; en.frameTimer = 0;
                if (en.currentFrame >= en.deadFrames) enemies.splice(i, 1);
            }
            continue;
        }
        
        en.velY += gravity; en.y += en.velY; en.x += en.velX; en.velX *= 0.9;
        platforms.forEach(p => {
            if (en.x + 30 < p.x + p.w && en.x + 50 > p.x) {
                if (en.velY >= 0 && en.y + en.height <= p.y + en.velY + 5 && en.y + en.height >= p.y - 10) { 
                    en.velY = 0; en.y = p.y - en.height; en.onGround = true;
                }
            }
        });

        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if (en.state !== 'attacking' && en.state !== 'hurt') {
            if (en.type === 'Green_Slime') {
                if(en.facing === 'left') en.x -= en.speed; else en.x += en.speed;
                if(en.x < en.startX - en.range) en.facing = 'right'; if(en.x > en.startX + en.range) en.facing = 'left';
            } else if (en.type === 'Red_Slime' || en.type === 'Enchantress') {
                if (dist < en.range) { if (player.x < en.x) { en.x -= en.speed; en.facing = 'left'; } else { en.x += en.speed; en.facing = 'right'; } }
            }
            if(dist < 75 && Math.abs(player.y - en.y) < 50) { en.state = 'attacking'; en.currentFrame = 0; }
        }

        en.frameTimer++;
        if(en.frameTimer > en.frameInterval) {
            if (en.state === 'attacking') {
                en.currentFrame++;
                if (en.currentFrame >= en.attackFrames) {
                    if(dist < 80) takeDamage(en.damage);
                    en.state = 'patrol'; en.currentFrame = 0;
                }
            } else if (en.state === 'hurt') {
                en.currentFrame++; if (en.currentFrame >= en.hurtFrames) { en.state = 'patrol'; en.currentFrame = 0; }
            } else { en.currentFrame = (en.currentFrame + 1) % en.walkFrames; }
            en.frameTimer = 0;
        }
    }

    player.frameTimer++;
    if (player.frameTimer > player.frameInterval) {
        if (player.state === 'attacking') {
            player.currentFrame++;
            if (player.currentFrame >= player.attackFrames) { player.state = 'normal'; player.currentFrame = 0; }
        } else if (player.state === 'hurt') {
            player.currentFrame++;
            if (player.currentFrame >= player.hurtFrames) { player.state = 'normal'; player.currentFrame = 0; }
        } else {
            let maxF = player.onGround ? (Math.abs(player.velX) > 0.1 ? player.walkFrames : 1) : player.jumpFrames;
            player.currentFrame = (player.currentFrame + 1) % maxF;
        }
        player.frameTimer = 0;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;
    ctx.save();
    ctx.scale(zoom, zoom);
    // Aplica a translação da câmera nos eixos X e Y
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));
    
    // Fundo acompanhando a câmera
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(cameraX, cameraY, canvas.width / zoom, canvas.height / zoom);
    
    platforms.forEach(p => { ctx.fillStyle = "#4e342e"; ctx.fillRect(p.x, p.y, p.w, p.h); });

    enemies.concat(player).forEach(obj => {
        let isP = obj === player;
        let img, frames;
        if (isP) {
            img = (obj.state === 'attacking' ? obj.attacks[obj.currentAttackIndex].img : (obj.state === 'hurt' ? obj.imgHurt : (obj.onGround ? obj.imgWalk : obj.imgJump)));
            frames = (obj.state === 'attacking' ? 6 : (obj.state === 'hurt' ? obj.hurtFrames : (obj.onGround ? obj.walkFrames : obj.jumpFrames)));
        } else {
            img = (obj.state === 'attacking' ? obj.imgAttack : (obj.state === 'dead' ? obj.imgDead : (obj.state === 'hurt' ? obj.imgHurt : obj.imgWalk)));
            frames = (obj.state === 'attacking' ? obj.attackFrames : (obj.state === 'dead' ? obj.deadFrames : (obj.state === 'hurt' ? obj.hurtFrames : obj.walkFrames)));
        }
        if (img && img.complete && img.width > 0) {
            const fw = img.width / frames;
            ctx.save();
            if(isP && obj.invincible && Math.floor(Date.now()/100)%2===0) ctx.globalAlpha = 0.5;
            if(obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1);
                ctx.drawImage(img, (Math.floor(obj.currentFrame) % frames) * fw, 0, fw, img.height, 0, 0, obj.width, obj.height);
            } else {
                ctx.drawImage(img, (Math.floor(obj.currentFrame) % frames) * fw, 0, fw, img.height, obj.x, obj.y, obj.width, obj.height);
            }
            ctx.restore();
        }
    });
    ctx.restore();

    if(gameState === 'playing') {
        ctx.fillStyle = "black"; ctx.fillRect(20, 20, 154, 24);
        ctx.fillStyle = "red"; ctx.fillRect(22, 22, (player.hp/player.maxHp)*150, 20);
    }
    if(gameState === 'dead' || gameState === 'victory') {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = gameState === 'victory' ? "gold" : "white";
        ctx.textAlign = "center"; ctx.font = "bold 34px Arial";
        ctx.fillText(gameState === 'victory' ? "VITÓRIA!" : "GAME OVER", canvas.width/2, canvas.height/2);
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a' || e.key === 'ArrowLeft') window.mover('left', true);
    if (key === 'd' || e.key === 'ArrowRight') window.mover('right', true);
    if (key === 'w' || key === ' ' || key === 'k') window.pular();
    if (key === 'j' || key === 'f') window.atacar();
});
window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a' || e.key === 'ArrowLeft') window.mover('left', false);
    if (key === 'd' || e.key === 'ArrowRight') window.mover('right', false);
});




