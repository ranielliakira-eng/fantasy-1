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
let cameraY = 0;
let gameState = 'menu';
let isPaused = false;
let isMuted = false;

// --- JOGADOR ---
const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 3, maxHp: 3, canAirAttack: true,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image (),
    attackFrames: 6, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 850, y: 205, hp: 1, speed: 1.1, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 910, y: 200, hp: 1, speed: 1.0, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 905, y: 207, hp: 1, speed: 0.9, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 907, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Blue_Slime', x: 3500, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3505, y: 203, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3495, y: 206, hp: 1, speed: 1.6, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Blue_Slime', x: 3700, y: 200, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3705, y: 198, hp: 1, speed: 1.5, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3495, y: 205, hp: 1, speed: 1.9, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Red_Slime', x: 4000, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4005, y: 205, hp: 1, speed: 2.4, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4010, y: 200, hp: 1, speed: 2.3, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4015, y: 205, hp: 1, speed: 2.1, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },

        { type: 'Blue_Slime', x: 5000, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2495, y: 207, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 5005, y: 200, hp: 1, speed: 1.6, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 4995, y: 205, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 5000, y: 203, hp: 1, speed: 1.3, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5000, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5000, y: 207, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Enchantress', x: 6600, y: 100, hp: 3, speed: 2, attackRange: 60, idleFrames: 8, walkFrames: 5, attackFrames: 6, hurtFrames: 2, deadFrames: 5, dialogue: "", dialogueTimer: 0,}
    ];

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        
        en.width = 100; en.height = 100;
        en.currentFrame = 0; en.frameTimer = 0; en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left'; en.attackCooldown = 0; en.velY = 0;
    en.onGround = false;
    });
}

const platforms = [
    { x: 0, y: 300, w: 2000, h: 200 },
	{ x: 1995, y: 280, w: 220, h: 20 },
	{ x: 2200, y: 300, w: 4800, h: 200 },	
    { x: 3000, y: 180, w: 300, h: 20 },
    { x: 3070, y: 60, w: 100, h: 20 },
];


// --- Cenário ---
const wellImg = new Image();
wellImg.src = 'assets/Battleground/Battleground1/summer_0/Environment/Well.png';

const Decor_CartImg = new Image();
Decor_CartImg.src = 'assets/Battleground/Battleground1/summer_0/Environment/Decor_Cart.png';

const fence_01Img = new Image();
fence_01Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/Fence_01.png';

const fence_02Img = new Image();
fence_02Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/Fence_02.png';

const fence_03Img = new Image();
fence_03Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/Fence_03.png';



let keys = { left: false, right: false };

const backgroundObjects = [
    { x: 30, y: 200, width: 100, height: 100, img: Decor_CartImg },
    { x: 600, y: 200, width: 100, height: 100, img: wellImg },
];

const foregroundObjects = [
    { x: 400, y: 250, width: 50, height: 50, img: fence_01Img },
    { x: 450, y: 250, width: 50, height: 50, img: fence_02Img },
    { x: 500, y: 250, width: 50, height: 50, img: fence_03Img },
];


// Boi
const oxNpc = {
    x: 120,
    y: 210,
    width: 100,
    height: 100,
    imgIdle: new Image(),
    idleFrames: 4,
    currentFrame: 0,
    frameTimer: 0,
    frameInterval: 20,
    phrases: [
        "Muuu!",
    ],
    dialogueIndex: 0,
    dialogueTimer: 0
};
oxNpc.imgIdle.src = 'assets/Animals/Without_shadow/Bull_Idle.png';

// NPC Satyr
const satyrNpc = {
    x: 300,           // posição X inicial
    y: 190,            // posição Y inicial
    width: 120,
    height: 120,
    imgIdle: new Image(),
    idleFrames: 6,
    currentFrame: 0,
    frameTimer: 0,
    frameInterval: 16,
    phrases: [
        "Que bom que você chegou!",
	"Cuidado com os Slimes!",
	"Os Slimes estão vindo da floresta.",
	"Minha colheita está sendo destruída pelos Slimes",
    ],
    dialogueIndex: 0,
    dialogueTimer: 0
};

satyrNpc.imgIdle.src = 'assets/Satyr_3/Idle.png';



const npcs = [oxNpc, satyrNpc];

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
    // 1. Esconde a tela de Game Over / Vitória
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.style.display = 'none';

    // 2. Reseta o Player 
    player.hp = player.maxHp; 
    player.x = 200; 
    player.y = 100;
    player.velX = 0; 
    player.velY = 0; 
    player.state = 'idle';

    // 3. Reseta o Mundo
    cameraX = 0; 
    isPaused = false; 
    gameState = 'playing';

    // 4. Recarrega os monstros
    initEnemies();
};

window.escolherPersonagem = function(genero) {
    const menu = document.getElementById('selection-menu');
    if (menu) menu.style.display = 'none';
    
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    player.idleFrames = (genero === 'menina') ? 6 : 8;
    player.walkFrames = (genero === 'menina') ? 8 : 8;
    player.jumpFrames = (genero === 'menina') ? 6 : 8;
    player.hurtFrames = (genero === 'menina') ? 3 : 3;
    player.deadFrames = (genero === 'menina') ? 4 : 3;
    player.attackFrames = (genero === 'menina') ? 5 : 6;

    player.imgIdle.src = `assets/${folder}/Idle.png`;
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});
    document.getElementById('mobile-controls').style.display = 'flex';
};

window.mover = function(dir, estado) {
    if (gameState !== 'playing' || player.state === 'dead' || isPaused) return;
    if (dir === 'left') keys.left = estado;
    if (dir === 'right') keys.right = estado;
    if (estado) player.facing = dir;
};

window.pular = function() {
    if (gameState === 'playing' && player.onGround && !isPaused) {
        player.velY = player.jumpForce; 
        player.onGround = false;        
    }
};

window.atacar = function() {
    if (player.state === 'dead') { window.resetGame(); return; }
    if (gameState !== 'playing' || isPaused) return;
    if (player.state === 'attacking') return;

    // Ataque no ar: só 1 por pulo
    if (!player.onGround && !player.canAirAttack) return;

    player.state = 'attacking';
    player.currentFrame = 0;

    if (!player.onGround) {
        player.canAirAttack = false;
    }

    checkMeleeHit();
};

function npcSay(npc, index = 0, duration = 120) {
    npc.dialogueIndex = index;      // índice da frase na lista
    npc.dialogueTimer = duration;   // tempo em frames (ex: 120 frames = 2s se 60 FPS)
}

function updateNPCs() {
    npcs.forEach(n => {
        // Reduz timer de fala se estiver ativo
        if (n.dialogueTimer > 0) {
            n.dialogueTimer--;
        } else {
            // Se o timer zerou, troca de frase aleatoriamente
            n.dialogueIndex = Math.floor(Math.random() * n.phrases.length);
            n.dialogueTimer = 180 + Math.floor(Math.random() * 120); // 3-5s
        }
 	n.frameTimer++;
        if (n.frameTimer >= n.frameInterval) {
            n.frameTimer = 0;
            n.currentFrame = (n.currentFrame + 1) % n.idleFrames;
        }

    });
}


function checkMeleeHit() {
    // Alcance do ataque
    let alcance = 1;

    // Posição da hitbox conforme direção
    let hitboxX = player.facing === 'right'
        ? player.x + player.width
        : player.x - alcance;

    enemies.forEach(en => {
        if (en.state === 'dead') return;

        // Verificação de colisão
        if (
            hitboxX < en.x + en.width &&
            hitboxX + alcance > en.x &&
            player.y < en.y + en.height &&
            player.y + player.height > en.y
        ) {
            en.hp--;

            if (en.type !== 'Enchantress') {
                en.state = 'hurt';
                en.currentFrame = 0;
                en.frameTimer = 0;
            }

            if (en.hp <= 0) {
                en.state = 'dead';
                en.currentFrame = 0;
                en.frameTimer = 0;
            }
        }
    });
}


// --- LÓGICA (UPDATE) ---
function update() {

    if (player.hp <= 0) {
        player.state = 'dead';
        return;
    }

    if (gameState !== 'playing' || isPaused) return;

    // Atualiza NPCs (fala e animação)
    updateNPCs();

    // PLAYER – FÍSICA
    player.velY += gravity;
    player.x += player.velX;

// Limita player dentro do mapa
if (player.x < 0) player.x = 0;
if (player.x + player.width > mapWidth) player.x = mapWidth - player.width;


    player.y += player.velY;

if (Math.abs(player.x - oxNpc.x) < 150 && oxNpc.dialogueTimer <= 0) {
    npcSay(oxNpc, 0, 120); // exibe "Muuu!" por 2 segundos
}

if (player.y >= 450) {  // limite do canvas
        player.hp = 0;       // player morre
        player.state = 'dead';
        return;
    }

    // INPUT (bloqueia só durante ataque)
if (player.state !== 'attacking') {
    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.7;
} else {
    player.velX = 0;
}

    // COLISÃO PLAYER
    player.onGround = false;
    platforms.forEach(p => {
        if (
            player.x + 40 < p.x + p.w &&
            player.x + 60 > p.x &&
            player.y + player.height >= p.y &&
            player.y + player.height <= p.y + 10
        ) {
            player.y = p.y - player.height;
            player.velY = 0;
            player.onGround = true;
        }
    });

    // ANIMAÇÃO PLAYER
    player.frameTimer++;
if (player.frameTimer >= player.frameInterval) {
    player.frameTimer = 0;

    // Ataque sempre tem prioridade
    if (player.state === 'attacking') {
        player.currentFrame++;
        if (player.currentFrame >= player.attackFrames) {
            // Depois de atacar, decide se está no ar ou no chão
            if (!player.onGround) {
                player.state = 'jumping';
            } else if (Math.abs(player.velX) > 0.5) {
                player.state = 'walking';
            } else {
                player.state = 'idle';
            }
            player.currentFrame = 0;
        }
    } 
    // Só mudar para pulo se não estiver atacando
    else if (!player.onGround) {
        player.state = 'jumping';
        player.currentFrame = (player.currentFrame + 1) % player.jumpFrames;
    } 
    else if (Math.abs(player.velX) > 0.5) {
        player.state = 'walking';
        player.currentFrame = (player.currentFrame + 1) % player.walkFrames;
    } 
    else {
        player.state = 'idle';
        player.currentFrame = (player.currentFrame + 1) % player.idleFrames;
    }
}


    // CÂMERA
    cameraX += ((player.x + player.width / 2) - (canvas.width / 2) - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width));

    // INIMIGOS
enemies.forEach(en => {

    if (en.patrolMinX === undefined) {
        en.patrolMinX = en.x - 120;
        en.patrolMaxX = en.x + 120;
    }

    if (en.facing === undefined) {
        en.facing = 'left';
    }

    

        let dist = Math.abs(player.x - en.x);

        en.velY += gravity;
        en.y += en.velY;
        en.onGround = false;

        platforms.forEach(p => {
            if (
                en.x + 40 < p.x + p.w &&
                en.x + 60 > p.x &&
                en.y + en.height >= p.y &&
                en.y + en.height <= p.y + 10
            ) {
                en.y = p.y - en.height;
                en.velY = 0;
                en.onGround = true;
            }
        });

if (en.state === 'dead') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval && en.currentFrame < en.deadFrames - 1) {
            en.currentFrame++;
        }
        return;
    }

        // BLUE SLIME – PULO
        if (en.type === 'Blue_Slime') {
            if (en.jumpTimer === undefined) en.jumpTimer = 0;
            if (en.onGround) en.jumpTimer++;
            if (en.onGround && en.jumpTimer > 120) {
                en.velY = -12;
                en.jumpTimer = 0;
            }
        }

        // ESTADOS
        if (en.state === 'hurt') {
            en.frameTimer++;
            if (en.frameTimer >= 30) {
                en.state = 'patrol';
                en.frameTimer = 0;
                en.currentFrame = 0;
            }
        }
else if (en.state === 'patrol') {

    if (en.facing === 'left') {
        en.x -= en.speed;
        if (en.x <= en.patrolMinX) {
            en.facing = 'right';
        }
    } else {
        en.x += en.speed;
        if (en.x >= en.patrolMaxX) {
            en.facing = 'left';
        }
    }

    if (dist < 100) {
        en.state = 'chase';
    }
}

        else if (en.state === 'chase') {
            if (player.x < en.x) {
                en.x -= en.speed * 1.2;
                en.facing = 'left';
            } else {
                en.x += en.speed * 1.2;
                en.facing = 'right';
            }
            if (dist <= en.attackRange) en.state = 'attacking';
            if (dist > 150) en.state = 'patrol';
        }
        else if (en.state === 'attacking') {
            if (en.attackCooldown <= 0) {
                player.hp -= 1;
                en.attackCooldown = 80;
            }
        }

        if (en.attackCooldown > 0) en.attackCooldown--;

        // ANIMAÇÃO INIMIGO
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            let totalF = (en.state === 'attacking') ? en.attackFrames : en.walkFrames;
            en.currentFrame = (en.currentFrame + 1) % totalF;
            en.frameTimer = 0;
        }
    });
}


// --- DESENHO (DRAW) ---
function draw() {
    // 1. PRIMEIRO: Limpamos a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    // 2. DEPOIS: Desenhamos o mundo (Câmera)
    ctx.save();
    ctx.translate(-Math.floor(cameraX), 0);

    ctx.fillStyle = "#4CAF50";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

backgroundObjects.forEach(d => {
  if (d.img.complete) {
    ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
  }
});

    [...enemies, player].forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;
        if (obj.state === 'walking') { img = obj.imgWalk; totalF = obj.walkFrames; }
        else if (obj.state === 'attacking') { img = obj.imgAttack; totalF = obj.attackFrames; }
        else if (obj.state === 'jumping') { img = obj.imgJump; totalF = obj.jumpFrames || 8; }
        else if (obj.state === 'hurt') { img = obj.imgHurt; totalF = (obj.type === 'Enchantress' ? 2 : obj.hurtFrames); }
        else if (obj.state === 'dead') { img = obj.imgDead; totalF = obj.deadFrames; }

        if (img.complete && img.width > 0) {
            const fw = img.width / totalF;
            const fh = img.height;
            let dH = obj.height, dY = obj.y;

            if (obj.type === 'Enchantress' && obj.state === 'hurt') {
                dH = obj.height * 1.5; dY = obj.y - (obj.height * 0.5);
            }

            ctx.save();
            if (obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, dY); ctx.scale(-1, 1);
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, 0, 0, obj.width, dH);
            } else {
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, obj.x, dY, obj.width, dH);
            }
            ctx.restore();

            // DESENHO DO BALÃO DE FALA
            if (obj.dialogue && obj.dialogueTimer > 0) {
                ctx.font = "bold 16px Arial";
                ctx.textAlign = "center";
                let textWidth = ctx.measureText(obj.dialogue).width;
                ctx.fillStyle = "white";
                ctx.fillRect(obj.x + obj.width/2 - textWidth/2 - 5, obj.y -35, textWidth + 10, 20);
                ctx.strokeStyle = "black";
                ctx.strokeRect(obj.x + obj.width/2 - textWidth/2 - 5, obj.y -35, textWidth + 10, 20);
                ctx.fillStyle = "black";
                ctx.fillText(obj.dialogue, obj.x + obj.width/2, obj.y -20);
            }
        }
    });

	npcs.forEach(n => {
    if (!n.imgIdle.complete) return;

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(n.x + n.width/2, n.y + n.height, n.width/2, 10, 0, 0, Math.PI*2);
    ctx.fill();

    // Sprite Idle
    const fw = n.imgIdle.width / n.idleFrames;
    const fh = n.imgIdle.height;
    ctx.drawImage(n.imgIdle, n.currentFrame * fw, 0, fw, fh, n.x, n.y, n.width, n.height);

    // Animação do Idle
    n.frameTimer++;
    if (n.frameTimer >= n.frameInterval) {
        n.frameTimer = 0;
        n.currentFrame = (n.currentFrame + 1) % n.idleFrames;
    }

    // Balão de fala
    if (n.dialogueTimer > 0) {
        const text = n.phrases[n.dialogueIndex];
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = "white";
        ctx.fillRect(n.x + n.width/2 - textWidth/2 - 5, n.y - 25, textWidth + 10, 20);
        ctx.strokeStyle = "black";
        ctx.strokeRect(n.x + n.width/2 - textWidth/2 - 5, n.y - 25, textWidth + 10, 20);
        ctx.fillStyle = "black";
        ctx.fillText(text, n.x + n.width/2, n.y - 10);
        n.dialogueTimer--;
    }
});

foregroundObjects.forEach(d => {
  if (d.img.complete) {
    ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
  }
});

    ctx.restore(); // Fecha a câmera

    // 3. BARRA DE VIDA
    if (gameState === 'playing') {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);
    }

    // 4. POR ÚLTIMO: TELA DE VITÓRIA (Fica por cima de tudo)
    const boss = enemies.find(en => en.type === 'Enchantress');
    // Se ela estiver morta ou com 0 de HP, a tela aparece
    if (boss && boss.state === 'dead') {
    const screen = document.getElementById('game-over-screen');
    if (screen && screen.style.display !== 'flex') {
        screen.style.display = 'flex'; // Aqui o JS apenas "liga" a tela HTML
        }
    }
}

function enemySay(en, type) {
    const list = en.phrases[type];
    en.dialogue = list[Math.floor(Math.random() * list.length)];
    en.dialogueTimer = 120; // O balão fica por 2 segundos (60 frames por seg)
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', true);
    if(k === 'd') window.mover('right', true);
    if(k === 'w' || k === ' ') window.pular();
    if(k === 'k') window.atacar();
    
    // Sistema do botão R para reiniciar
    if (k === 'r') {
        const boss = enemies.find(en => en.type === 'Enchantress');
        // Se morreu ou se venceu a vilã, o R reseta
        if (player.state === 'dead' || (boss && boss.state === 'dead')) {
            window.resetGame();
        }
    }
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', false);
    if(k === 'd') window.mover('right', false);
});

// Localiza o botão que criamos no HTML
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
    btnReset.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // garante que não dê duplo clique ou scroll
        window.resetGame();
    });
}








