const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const gravity = 0.8;
const zoom = 1.6;
const mapWidth = 7000;
let cameraX = 0, cameraY = 0;
let gameState = 'menu'; // menu, playing, dead, victory

// --- JOGADOR ---
const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3, invincible: false, invincibilityTimer: 0,

    imgWalk: new Image(),
    imgDead: new Image(),
    imgJump: new Image(),
    imgHurt: new Image(),

    attacks: [
        { img: new Image(), frames: 6 },
        { img: new Image(), frames: 6 },
        { img: new Image(), frames: 6 }
    ],

    currentAttackIndex: 0,
    currentFrame: 0,
    walkFrames: 8,
    attackFrames: 6,
    jumpFrames: 8,
    deadFrames: 3,
    hurtFrames: 3,
    frameTimer: 0,
    frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];

function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 600, y: 320, hp: 3, speed: 1.2, range: 150 },
        { type: 'Red_Slime', x: 1500, y: 320, hp: 1, speed: 2.5, range: 450 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, speed: 1.8, range: 200, jumpTimer: 0 },
        {
            type: 'Enchantress',
            x: 6500, y: 250, hp: 10, speed: 2, range: 400,
            width: 120, height: 120,
            walkFrames: 8, attackFrames: 10, deadFrames: 5, hurtFrames: 3, jumpFrames: 8
        }
    ];

    enemies.forEach(en => {
        en.imgWalk = new Image();
        en.imgAttack = new Image();
        en.imgDead = new Image();
        en.imgHurt = new Image();
        en.imgJump = new Image();

        en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgDead.src = `assets/${en.type}/Dead.png`;
        en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgJump.src = `assets/${en.type}/Jump.png`;

        if (en.type.includes('Slime')) {
            en.width = 80;
            en.height = 80;
            en.walkFrames = 8;
            en.attackFrames = 4;
            en.deadFrames = 3;
            en.hurtFrames = 6;
            en.jumpFrames = 8;
            en.frameInterval = 10;
        }

        en.currentFrame = 0;
        en.frameTimer = 0;
        en.state = 'patrol';
        en.facing = 'left';
        en.velX = 0;
        en.velY = 0;
        en.onGround = false;
        en.startX = en.x;
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

// --- MENU / CONTROLES ---
window.escolherPersonagem = function (genero) {
    const folder = genero === 'menina' ? 'Knight' : 'Swordsman';

    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;

    player.attacks[0].img.src = `assets/${folder}/Attack_1.png`;
    player.attacks[1].img.src = `assets/${folder}/Attack_2.png`;
    player.attacks[2].img.src = `assets/${folder}/Attack_3.png`;

    gameState = 'playing';
    initEnemies();

    const menu = document.querySelector('.selection-menu');
    if (menu) menu.style.display = 'none';
};

window.mover = function (dir, estado) {
    if (gameState !== 'playing' || player.state !== 'normal') return;
    if (dir === 'left') { keys.left = estado; if (estado) keys.right = false; player.facing = 'left'; }
    if (dir === 'right') { keys.right = estado; if (estado) keys.left = false; player.facing = 'right'; }
};

window.pular = function () {
    if (gameState === 'playing' && player.onGround) {
        player.velY = player.jumpForce;
    }
};

window.atacar = function () {
    if (gameState !== 'playing') return;
    player.currentAttackIndex = Math.floor(Math.random() * 3);
    player.attackFrames = player.attacks[player.currentAttackIndex].frames;
    player.state = 'attacking';
    player.currentFrame = 0;
};

// --- UPDATE ---
function update() {
    if (gameState !== 'playing') return;

    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.8;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    player.onGround = false;
    platforms.forEach(p => {
        if (
            player.x + player.width > p.x &&
            player.x < p.x + p.w &&
            player.y + player.height <= p.y + player.velY &&
            player.y + player.height >= p.y
        ) {
            player.y = p.y - player.height;
            player.velY = 0;
            player.onGround = true;
        }
    });

    player.frameTimer++;
    if (player.frameTimer > player.frameInterval) {
        player.currentFrame = (player.currentFrame + 1) % player.walkFrames;
        player.frameTimer = 0;
    }

    cameraX = player.x - (canvas.width / 2) / zoom;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > mapWidth - canvas.width / zoom) {
        cameraX = mapWidth - canvas.width / zoom;
    }
}

// --- DRAW ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'menu') {
        ctx.fillStyle = "#87CEEB";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000";
        ctx.font = "bold 32px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SELECIONE SEU PERSONAGEM", canvas.width / 2, canvas.height / 2);
        return;
    }

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(cameraX, 0, canvas.width / zoom, canvas.height / zoom);

    platforms.forEach(p => {
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(p.x, p.y, p.w, p.h);
    });

    const img = player.onGround ? player.imgWalk : player.imgJump;
    if (img.complete && img.width > 0) {
        const fw = img.width / player.walkFrames;
        ctx.drawImage(
            img,
            Math.floor(player.currentFrame) * fw,
            0,
            fw,
            img.height,
            player.x,
            player.y,
            player.width,
            player.height
        );
    }

    ctx.restore();
}

// --- LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
