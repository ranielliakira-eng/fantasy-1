const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

// --- ÁUDIO ---
const bgMusic = new Audio('assets/sound/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

// --- CONFIGURAÇÕES GLOBAIS ---
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
    attacks: [ { img: new Image(), frames: 6 }, { img: new Image(), frames: 6 }, { img: new Image(), frames: 6 } ],
    currentAttackIndex: 0,
    currentFrame: 0, walkFrames: 8, attackFrames: 6, jumpFrames: 8, deadFrames: 3, hurtFrames: 3,
    frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 600, y: 320, hp: 3, speed: 1.2, range: 150 },
        { type: 'Red_Slime', x: 1500, y: 320, hp: 1, speed: 2.5, range: 450 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, speed: 1.8, range: 200, jumpTimer: 0 },
        { 
            type: 'Enchantress', x: 6500, y: 250, hp: 10, speed: 2, range: 400, 
            width: 120, height: 120, walkFrames: 8, attackFrames: 10, deadFrames: 5, hurtFrames: 3, jumpFrames: 8
        }
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

// --- PLATAFORMAS ---
const platforms = [
    { x: 0, y: 400, w: mapWidth, h: 60 },
    { x: 400, y: 300, w: 200, h: 20 },
    { x: 1400, y: 300, w: 300, h: 20 },
    { x: 2400, y: 320, w: 400, h: 20 },
    { x: 6400, y: 370, w: 500, h: 30 }
];

let keys = { left: false, right: false };

// --- FUNÇÕES DE CONTROLE ---
window.escolherPersonagem = function(genero) {
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    if (genero === 'menina') {
        player.walkFrames = 8; player.jumpFrames = 8; player.deadFrames = 4; player.hurtFrames = 2;
        player.attacks[0].frames = 4; player.attacks[1].frames = 5; player.attacks[2].frames = 4;
    } else {
        player.walkFrames = 8; player.jumpFrames = 8; player.deadFrames = 3; player.hurtFrames = 3;
        player.attacks[0].frames = 6; player.attacks[1].frames = 6; player.attacks[2].frames = 6;
    }
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.attacks[0].img.src = `assets/${folder}/Attack_1.png`;
    player.attacks[1].img.src = `assets/${folder}/Attack_2.png`;
    player.attacks[2].img.src = `assets/${folder}/Attack_3.png`;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(e => console.log("Áudio aguardando interação."));
    const menu = document.querySelector('.selection-menu');
    if (menu) menu.style.display = 'none';
};

window.mover = function(dir, estado) {
    // Agora permitimos registrar o movimento mesmo em 'hurt', 
    // ele só vai aplicar a velocidade quando o estado voltar a 'normal'
    if (gameState !== 'playing' || player.state === 'dead') return;
    
    if (dir === 'left') { 
        keys.left = estado; 
        if (estado) { keys.right = false; player.facing = 'left'; }
    }
    if (dir === 'right') { 
        keys.right = estado; 
        if (estado) { keys.left = false; player.facing = 'right'; }
    }
};

window.pular = function() {
    if (gameState === 'playing' && player.onGround && player.state === 'normal') {
        player.velY = player.jumpForce;
    }
};

window.atacar = function() {
    if (gameState === 'dead' || gameState === 'victory') { location.reload(); return; }
    if (gameState !== 'playing' || player.state !== 'normal') return;
    player.currentAttackIndex = Math.floor(Math.random() * 3);
    player.attackFrames = player.attacks[player.currentAttackIndex].frames;
    player.state = 'attacking'; player.currentFrame = 0; player.frameTimer = 0;
    checkPlayerHit();
};

function checkPlayerHit() {
    enemies.forEach(en => {
        if(en.state === 'dead') return;
        let dist = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if(dist < 90 && Math.abs(player.y - en.y) < 60) {
            if((player.facing === 'right' && en.x > player.x) || (player.facing === 'left' && en.x < player.x)) {
                en.hp--;
                if(en.hp <= 0) { 
                    en.state = 'dead'; en.currentFrame = 0; 
                    if(en.type === 'Enchantress') gameState = 'victory';
                } else { en.state = 'hurt'; en.currentFrame = 0; en.velX = (player.x < en.x) ? 5 : -5; }
            }
        }
    });
}

function takeDamage() {
    if(!player.invincible && player.state !== 'dead' && gameState === 'playing') {
        player.hp--;
        if(player.hp <= 0) { 
            player.state = 'dead'; gameState = 'dead'; 
            bgMusic.pause();
        } else { 
            player.invincible = true; 
            player.invincibilityTimer = 60; // 1 segundo de piscar
            player.state = 'hurt'; 
            player.currentFrame = 0;
            
            // Forçar a saída do estado "hurt" após 300ms se a animação falhar
            setTimeout(() => {
                if(player.state === 'hurt') player.state = 'normal';
            }, 300);
        }
    }
}

// --- UPDATE ---
function update() {
    if (gameState !== 'playing') return;

    if(player.invincible) { player.invincibilityTimer--; if(player.invincibilityTimer <= 0) player.invincible = false; }

    if (player.state === 'normal' || player.state === 'hurt') {
        if (keys.left) player.velX = -player.speed;
        else if (keys.right) player.velX = player.speed;
        else player.velX *= 0.4;
    } else player.velX *= 0.7;

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

    enemies.forEach(en => {
        if(en.state === 'dead') {
            en.frameTimer++; if(en.frameTimer > en.frameInterval) { en.currentFrame++; en.frameTimer = 0; }
            return;
        }
        en.velY += gravity; en.y += en.velY; en.x += en.velX; en.velX *= 0.9;
        platforms.forEach(p => {
            if (en.x + 30 < p.x + p.w && en.x + 50 > p.x) {
                if (en.velY >= 0 && en.y + en.height <= p.y + en.velY + 5 && en.y + en.height >= p.y - 10) { en.velY = 0; en.y = p.y - en.height; en.onGround = true;}
            }
        });

        let d = Math.abs((player.x + player.width/2) - (en.x + en.width/2));
        if (en.type === 'Green_Slime') {
            if(en.facing === 'left') en.x -= en.speed; else en.x += en.speed;
            if(en.x < en.startX - en.range) en.facing = 'right'; if(en.x > en.startX + en.range) en.facing = 'left';
        } else if (en.type === 'Red_Slime') {
            if (d < en.range) { if (player.x < en.x) { en.x -= en.speed; en.facing = 'left'; } else { en.x += en.speed; en.facing = 'right'; } }
        } else if (en.type === 'Blue_Slime' && en.onGround) {
            en.jumpTimer++; if (en.jumpTimer > 70) { en.velY = -12; en.velX = (en.facing === 'left') ? -5 : 5; en.jumpTimer = 0; en.onGround = false; }
            if(en.x < en.startX - en.range) en.facing = 'right'; if(en.x > en.startX + en.range) en.facing = 'left';
        }

        if(d < 50 && Math.abs(player.y - en.y) < 30) takeDamage();
        en.frameTimer++; if(en.frameTimer > en.frameInterval) { en.currentFrame = (en.currentFrame + 1) % en.walkFrames; en.frameTimer = 0; }
    });

    // Câmera dinâmica
    let targetX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    let targetY = (player.y + player.height / 2) - (canvas.height / 2) / zoom;
    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > mapWidth - canvas.width / zoom) cameraX = mapWidth - canvas.width / zoom;

    // Animação do Player
// Animação do Player
    player.frameTimer++;
    if (player.frameTimer > player.frameInterval) {
        if (player.state === 'attacking') {
            player.currentFrame++; 
            if (player.currentFrame >= player.attackFrames) { 
                player.state = 'normal'; 
                player.currentFrame = 0; 
            }
        } else if (player.state === 'hurt') {
            player.currentFrame++;
            // Se acabar os frames de dor, volta a andar
            if (player.currentFrame >= player.hurtFrames) { 
                player.state = 'normal'; 
                player.currentFrame = 0; 
            }
        } else {
            // Se não estiver atacando nem levando dano, anima andar ou pular
            let maxF = player.onGround ? (Math.abs(player.velX) > 0.1 ? player.walkFrames : 1) : player.jumpFrames;
            player.currentFrame = (player.currentFrame + 1) % maxF;
        }
        player.frameTimer = 0;
    }
// --- DRAW ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    ctx.fillStyle = "#87CEEB"; 
    ctx.fillRect(cameraX, cameraY, canvas.width / zoom, canvas.height / zoom);

    platforms.forEach(p => { ctx.fillStyle = "#4e342e"; ctx.fillRect(p.x, p.y, p.w, p.h); });

    enemies.concat(player).forEach(obj => {
        let isP = obj === player;
        let img = isP ? (obj.state === 'attacking' ? obj.attacks[obj.currentAttackIndex].img : (obj.state === 'hurt' ? obj.imgHurt : (obj.onGround ? obj.imgWalk : obj.imgJump))) : (obj.state === 'dead' ? obj.imgDead : obj.imgWalk);
        let frames = isP ? (obj.state === 'attacking' ? obj.attackFrames : (obj.state === 'hurt' ? obj.hurtFrames : (obj.onGround ? obj.walkFrames : obj.jumpFrames))) : (obj.state === 'dead' ? obj.deadFrames : obj.walkFrames);
        
        if (img.complete && img.width > 0) {
            const fw = img.width / frames;
            ctx.save();
            if(isP && obj.invincible && Math.floor(Date.now()/100)%2===0) ctx.globalAlpha = 0.5;
            if(obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1);
                ctx.drawImage(img, Math.floor(obj.currentFrame % frames) * fw, 0, fw, img.height, 0, 0, obj.width, obj.height);
            } else {
                ctx.drawImage(img, Math.floor(obj.currentFrame % frames) * fw, 0, fw, img.height, obj.x, obj.y, obj.width, obj.height);
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
        ctx.font = "18px Arial"; ctx.fillText("Toque em ATACAR ou Pressione J para reiniciar", canvas.width/2, canvas.height/2 + 50);
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

// --- CONTROLES DE TECLADO ---
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



