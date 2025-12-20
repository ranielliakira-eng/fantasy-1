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

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 600, y: 320, hp: 1, speed: 1.2, range: 150, damage: 1 },
        { type: 'Red_Slime', x: 1500, y: 320, hp: 1, speed: 2.5, range: 450, damage: 1 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, speed: 1.8, range: 200, damage: 1 },
        { 
            type: 'Enchantress', x: 6600, y: 250, hp: 3, speed: 2, 
            attackType: 'melee', range: 400,
            dialogs: [
                { triggerHp: 3, text: "Você não entende!" },
                { triggerHp: 2, text: "O desequilibrio!" },
                { triggerHp: 1, text: "Você precisa ir mais longe!" }
            ]
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
        en.walkFrames = 8; en.attackFrames = en.type === 'Enchantress' ? 6 : 4;
        en.deadFrames = en.type === 'Enchantress' ? 5 : 3;
        en.hurtFrames = en.type === 'Enchantress' ? 2 : 6;
        en.jumpFrames = 8; en.frameInterval = 5;
        en.currentFrame = 0; en.frameTimer = 0; en.state = 'patrol'; en.facing = 'left';
        en.velX = 0; en.velY = 0; en.onGround = false;
        en.currentSpeech = "";
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

// --- FUNÇÕES EXPOSTAS AO WINDOW ---
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
    bgMusic.play().catch(() => {});

    // --- AQUI ESTÁ A MÁGICA ---
    // 1. Esconde o menu de seleção
    const menu = document.getElementById('selection-menu');
    if(menu) menu.style.display = 'none';

    // 2. Mostra os botões de controle (ID que colocamos na div controls)
    const controles = document.getElementById('mobile-controls');
    if(controles) controles.style.display = 'flex';
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
                if (en.type === 'Enchantress' && en.dialogs) {
                    let fala = en.dialogs.find(d => d.triggerHp === en.hp + 1); 
                    if (fala) {
                        en.currentSpeech = fala.text;
                        setTimeout(() => { en.currentSpeech = ""; }, 2000);
                    }
                }
                if(en.hp <= 0) { en.state = 'dead'; en.currentFrame = 0; }
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

    let targetX = (player.x + player.width/2) - (canvas.width/2)/zoom;
    let targetY = (player.y + player.height/2) - (canvas.height/2)/zoom;
    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width/zoom));

    enemies.forEach((en, i) => {
        en.velY += gravity; en.y += en.velY; en.x += en.velX; en.velX *= 0.9;
        platforms.forEach(p => {
            if (en.x + 30 < p.x + p.w && en.x + 50 > p.x) {
                if (en.velY >= 0 && en.y + en.height <= p.y + en.velY + 5 && en.y + en.height >= p.y - 10) { 
                    en.velY = 0; en.y = p.y - en.height;
                }
            }
        });

        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if (en.state !== 'attacking' && en.state !== 'hurt' && en.state !== 'dead') {
            if (dist < en.range) {
                if (player.x < en.x) { en.x -= en.speed; en.facing = 'left'; } 
                else { en.x += en.speed; en.facing = 'right'; }
            }
            if(dist < 75) { en.state = 'attacking'; en.currentFrame = 0; }
        }

        en.frameTimer++;
        if(en.frameTimer > en.frameInterval) {
            if (en.state === 'dead') {
                en.currentFrame++;
                if (en.currentFrame >= en.deadFrames) {
                    if (en.type === 'Enchantress') { gameState = 'victory'; en.currentFrame = en.deadFrames - 1; } 
                    else { enemies.splice(i, 1); return; }
                }
            } else if (en.state === 'hurt') {
                en.currentFrame++;
                if (en.currentFrame >= en.hurtFrames) { en.state = 'patrol'; en.currentFrame = 0; en.velX = 0; }
            } else if (en.state === 'attacking') {
                en.currentFrame++;
                if (en.currentFrame >= en.attackFrames) {
                    if(dist < 80) takeDamage(en.damage);
                    en.state = 'patrol'; en.currentFrame = 0;
                }
            } else {
                en.currentFrame = (en.currentFrame + 1) % en.walkFrames;
            }
            en.frameTimer = 0;
        }
    });

    player.frameTimer++;
    if (player.frameTimer > player.frameInterval) {
        if (player.state === 'attacking') {
            player.currentFrame++;
            if (player.currentFrame >= player.attackFrames) { player.state = 'normal'; player.currentFrame = 0; }
        } else if (player.state === 'hurt') {
            player.currentFrame++;
            if (player.currentFrame >= player.hurtFrames) { player.state = 'normal'; player.currentFrame = 0; }
        } else if (player.state === 'dead') {
             player.currentFrame = Math.min(player.currentFrame + 1, player.deadFrames - 1);
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
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    platforms.forEach(p => { 
        ctx.fillStyle = "#4e342e"; 
        ctx.fillRect(p.x, p.y, p.w, p.h); 
    });

    enemies.concat(player).forEach(obj => {
        let isP = obj === player;
        let img, frames;

        if (isP) {
            if (obj.state === 'attacking') { img = obj.imgAttack; frames = obj.attackFrames; }
            else if (obj.state === 'dead') { img = obj.imgDead; frames = obj.deadFrames; }
            else if (obj.state === 'hurt') { img = obj.imgHurt; frames = obj.hurtFrames; }
            else { img = (obj.onGround ? obj.imgWalk : obj.imgJump); frames = (obj.onGround ? obj.walkFrames : obj.jumpFrames); }
        } else {
            img = (obj.state === 'attacking' ? obj.imgAttack : (obj.state === 'dead' ? obj.imgDead : (obj.state === 'hurt' ? obj.imgHurt : obj.imgWalk)));
            frames = (obj.state === 'attacking' ? obj.attackFrames : (obj.state === 'dead' ? obj.deadFrames : (obj.state === 'hurt' ? obj.hurtFrames : obj.walkFrames)));
        }

        if (img && img.complete && img.width > 0) {
            const fw = img.width / frames;
            ctx.save();
            if(isP && obj.invincible && Math.floor(Date.now()/100)%2 === 0) ctx.globalAlpha = 0.5;
            let fx = (Math.floor(obj.currentFrame) % frames) * fw;
            if(obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1);
                ctx.drawImage(img, fx, 0, fw, img.height, 0, 0, obj.width, obj.height);
            } else {
                ctx.drawImage(img, fx, 0, fw, img.height, obj.x, obj.y, obj.width, obj.height);
            }
            ctx.restore();
        }

        if (!isP && obj.type === 'Enchantress' && obj.currentSpeech) {
            ctx.save();
            ctx.fillStyle = "white"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
            ctx.shadowColor = "black"; ctx.shadowBlur = 4;
            ctx.fillText(obj.currentSpeech, obj.x + obj.width / 2, obj.y - 10);
            ctx.restore();
        }
    });

    ctx.restore();

    if (gameState === 'playing') {
        ctx.fillStyle = "black"; ctx.fillRect(20, 20, 154, 24);
        ctx.fillStyle = "#ff0000"; ctx.fillRect(22, 22, (player.hp / player.maxHp) * 150, 20);
    }

    if (gameState === 'dead' || gameState === 'victory') {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "bold 30px Arial";
        ctx.fillText(gameState === 'victory' ? "VITÓRIA!" : "FIM DE JOGO", canvas.width/2, canvas.height/2);
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

