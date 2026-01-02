const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.preload = "auto";

const gravity = 0.8;
const zoom = 1.6;
const mapWidth = 10000;
const mapHeight = 450;
let cameraX = 0;
let cameraY = 0;
let gameState = 'loading';
let isPaused = false;
let isMuted = false;
let boss = null;

// --- JOGADOR (ESTRUTURA BASE) ---
const player = {
    x: 140, y: 200, width: 100, height: 100,
    velX: 0, velY: 0, speed: 3, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 4, maxHp: 4, canAirAttack: true,
    imgWalk: new Image(), imgRun: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image(), faction: 'player',
    attackFrames: 6, runFrames: 8, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", dialogueTimer: 0,
    holdLeft: 0, holdRight: 0, runThreshold: 180, runningSpeedMultiplier: 1.8,
};

// --- INICIALIZAÇÃO AUTOMÁTICA ---
window.onload = function() {
    // 1. Esconde menu antigo
    const selectionMenu = document.getElementById('selection-menu');
    if (selectionMenu) selectionMenu.style.display = 'none';

    // 2. Lê a escolha do herói
    const escolhaMenu = localStorage.getItem('heroi_da_jornada') || 'loiro';
    const heroiPadrao = (escolhaMenu === 'castanha') ? 'Knight' : 'Swordsman';

    // 3. Configura Frames
    player.idleFrames = (heroiPadrao === 'Knight') ? 6 : 8;
    player.runFrames = (heroiPadrao === 'Knight') ? 7 : 8;
    player.walkFrames = 8;
    player.jumpFrames = (heroiPadrao === 'Knight') ? 6 : 8;
    player.hurtFrames = 3;
    player.deadFrames = (heroiPadrao === 'Knight') ? 4 : 3;
    player.attackFrames = (heroiPadrao === 'Knight') ? 5 : 6;

    // 4. Carrega Assets
    player.imgIdle.src = `assets/${heroiPadrao}/Idle.png`;
    player.imgWalk.src = `assets/${heroiPadrao}/Walk.png`;
    player.imgRun.src = `assets/${heroiPadrao}/Run.png`;
    player.imgJump.src = `assets/${heroiPadrao}/Jump.png`;
    player.imgHurt.src = `assets/${heroiPadrao}/Hurt.png`;
    player.imgDead.src = `assets/${heroiPadrao}/Dead.png`;
    player.imgAttack.src = `assets/${heroiPadrao}/Attack_1.png`;

    // 5. Inicia o jogo
    player.imgIdle.onload = () => {
        gameState = 'playing';
        initEnemies();
        if (!isMuted) bgMusic.play().catch(() => {});
    };

    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'flex';
};

const potionImg = new Image();
potionImg.src = 'assets/Potion/LifePotionSmall.png';

let potions = [
    { x: 8075, y: 250, width: 32, height: 32, active: true },
];

// --- INIMIGOS E BOSS ---
let enemies = [];

function initEnemies() {
    // Reset Enemies
    enemies = [
        { type: 'Orc_Warrior', x: 2000, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

        { type: 'Orc_Warrior', x: 2500, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Warrior', x: 2525, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

        { type: 'Orc_Warrior', x: 3000, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Warrior', x: 3025, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Berserk', x: 3050, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.8, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

        { type: 'Orc_Warrior', x: 4000, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Warrior', x: 4025, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },


        { type: 'Orc_Berserk', x: 4500, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.8, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Berserk', x: 4550, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.8, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

        { type: 'Orc_Warrior', x: 5000, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Warrior', x: 5025, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

        { type: 'Orc_Warrior', x: 6000, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Warrior', x: 6025, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Orc_Berserk', x: 6050, y: 200, hp: 6, maxHP: 6, width: 100, height: 100, speed: 1.8, faction: 'enemy', attackRange: 70, damage: 2, frameInterval: 8, idleFrames: 5, walkFrames: 7, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

    ];

    // Reset Boss
    boss = {
        type: 'Orc_Shaman',
        x: 9000, y: 200, velY: 0, width: 120, height: 120,
        hp: 5, maxHp: 5, speed: 3, damage: 1,
        healCooldown: 0, isHealActive: false, attackCooldown: 0,
        state: 'idle', facing: 'left', viuPlayer: false,
        currentFrame: 0, frameTimer: 0, frameInterval: 8,
        idleFrames: 5, walkFrames: 7, attack1Frames: 4, attack2Frames: 2, healFrames: 6, hurtFrames: 2, deadFrames: 5,
        imgIdle: new Image(), imgWalk: new Image(), imgRun: new Image(),
        imgAttack1: new Image(), imgAttack2: new Image(), imgHeal: new Image(), imgMagic: new Image(),
        imgHurt: new Image(), imgDead: new Image(),
        phrases: [ "Essas terras pertencem aos Orcs!" ],
        dialogueIndex: 0, dialogueTimer: 0
    };

    // Load Boss Images
    boss.imgIdle.src = `assets/Orc_Shaman/Idle.png`;
    boss.imgWalk.src = `assets/Orc_Shaman/Walk.png`;
    boss.imgRun.src = `assets/Orc_Shaman/Run.png`; // Corrigido: Estava sobrescrevendo Walk
    boss.imgAttack1.src = `assets/Orc_Shaman/Attack_1.png`;
    boss.imgAttack2.src = `assets/Orc_Shaman/Attack_2.png`;
    boss.imgMagic.src = `assets/Orc_Shaman/Magic_2.png`;
    boss.imgHurt.src = `assets/Orc_Shaman/Hurt.png`;
    boss.imgDead.src = `assets/Orc_Shaman/Dead.png`;

    // Load Enemies Images
    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgRun = new Image(); en.imgRun.src = `assets/${en.type}/Run.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgProtect = new Image(); en.imgProtect.src = `assets/${en.type}/Protect.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;

        en.width = 100; en.height = 100;
        en.currentFrame = 0; en.frameTimer = 0;
        if (en.frameInterval === undefined) en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left'; en.attackCooldown = 1;
        en.velY = 0; en.onGround = false;
    });
}

// --- PLATAFORMAS E CENÁRIO ---
const platforms = [
    { x: 0, y: 300, w: 10000, h: 150, type: 'pattern' },
];

const fundoImg = new Image();
fundoImg.src = 'assets/Battleground/fundo.png';

const platformImg = new Image();
platformImg.src = 'assets/Battleground/Ground1.png';

const birch_1Img = new Image();
birch_1Img.src = 'assets/Battleground/trees/birch_1.png';

const casa1Img = new Image();
casa1Img.src = 'assets/Battleground/casa/casa1.png';
const casa2Img = new Image();
casa2Img.src = 'assets/Battleground/casa/casa2.png';
const casa3Img = new Image();
casa3Img.src = 'assets/Battleground/casa/casa3.png';
const casa4Img = new Image();
casa4Img.src = 'assets/Battleground/casa/casa4.png';


let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

let keys = { left: false, right: false };

const backgroundObjects = [
    { x: 0, y: 0, width: 7000, height: 2000, img: fundoImg },
    { x: 3500, y: 100, width: 200, height: 200, img: casa2Img },
];

const foregroundObjects = [
    { x: 250, y: 100, width: 200, height: 200, img: birch_1Img },
    { x: 3550, y: 100, width: 200, height: 200, img: casa2Img },

];

// --- NPCs ---

const Warrior_3Npc = {
    x: 50, y: 200, width: 100, height: 100, imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'right',
    phrases: [ "A Vingança do Rei" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';


const Warrior_3_1Npc = {
    x: 25, y: 200, width: 100, height: 100, imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'right',
    phrases: [ ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: 0,
};
Warrior_3_1Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';

const Warrior_2Npc = {
    x: 350, y: 200, width: 100, height: 100, imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "Vingança do Rei", "Daqui para frente, o campo está cheio de orcs. Boa sorte."],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_2Npc.imgIdle.src = 'assets/Warrior_2/Idle.png';

const Warrior_1Npc = {
    x: 8000, y: 200, width: 100, height: 100, imgIdle: new Image(),
    idleFrames: 6, currentFrame: 0, frameTimer: 0, frameInterval: 8,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "Você carrega a carta do Líder", "Por favor, aceite essa poção" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_1Npc.imgIdle.src = 'assets/Warrior_1/Idle.png';

const npcs = [Warrior_3Npc, Warrior_3_1Npc, Warrior_2Npc, Warrior_1Npc];

function updateNPCs() {
    npcs.forEach(n => {
        const dx = player.x - n.x;
        const dy = player.y - n.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < n.range) {
            let proximityIndex = Math.floor((1 - (distance / n.range)) * n.phrases.length);
            proximityIndex = Math.max(0, Math.min(proximityIndex, n.phrases.length - 1));

            if (proximityIndex > n.lastDialogueIndex) {
                n.dialogueIndex = proximityIndex;
                n.dialogueTimer = 160;
                n.lastDialogueIndex = proximityIndex;
            }
        } else {
            if (distance > n.range * 3) {
                n.lastDialogueIndex = -1;
            }
        }

        if (n.dialogueTimer > 0) n.dialogueTimer--;

        n.frameTimer++;
        if (n.frameTimer >= n.frameInterval) {
            n.frameTimer = 0;
            n.currentFrame = (n.currentFrame + 1) % n.idleFrames;
        }
    });
}

function updatePotions() {
    potions.forEach(p => {
        if (p.active) {
            if (player.x < p.x + p.width && player.x + player.width > p.x &&
                player.y < p.y + p.height && player.y + player.height > p.y) {

                if (player.hp < player.maxHp) {
                    player.hp = Math.min(player.hp + 1, player.maxHp);
                    p.active = false;
                    window.playerSay("HP +1", 60);
                } else {
                    if (player.dialogueTimer <= 0) window.playerSay("Vida Cheia", 30);
                }
            }
        }
    });
}

function isEnemy(a, b) {
    if (!a || !b) return false;
    return a.faction !== b.faction;
}

function drawNPCDialogues(ctx) {
    npcs.forEach(n => {
        if (n.dialogueTimer > 0) {
            const text = n.phrases[n.dialogueIndex];
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            const textWidth = ctx.measureText(text).width;
            const padding = 10;
            const posX = n.x + n.width / 2;
            const posY = n.y - 20;

            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(posX - (textWidth / 2) - padding, posY - 20, textWidth + (padding * 2), 30);
            ctx.fillStyle = "white";
            ctx.fillText(text, posX, posY);
        }
    });
}

// --- FUNÇÕES DE SISTEMA ---
window.playerSay = function(text, duration = 80) {
    player.dialogue = text;
    player.dialogueTimer = duration;
};

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
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.style.display = 'none';

    player.hp = player.maxHp;
    player.x = 140;
    player.y = 200;
    player.velX = 0;
    player.velY = 0;
    player.state = 'idle';
    potions.forEach(p => p.active = true);
    cameraX = 0;
    isPaused = false;
    gameState = 'playing';

    boss = null;
    initEnemies();
};

window.concluirCapituloEVoutar = function() {
    localStorage.setItem('capitulo_4_vencido', 'true');
    window.location.href = "../index.html";
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
    if (!player.onGround && !player.canAirAttack) return;
    player.state = 'attacking';
    player.currentFrame = 0;
    if (!player.onGround) player.canAirAttack = false;
    checkMeleeHit();
};

// --- COLISÃO DE ATAQUE DO PLAYER ---
function checkMeleeHit() {
    let alcance = player.width * -0.2;
    let hitboxX = player.facing === 'right' ? player.x + player.width : player.x - alcance;

    // 1. Inimigos Comuns
    enemies.forEach(en => {
        if (en.state === 'dead') return;

        if (hitboxX < en.x + en.width && hitboxX + alcance > en.x &&
            player.y < en.y + en.height && player.y + player.height > en.y) {

            // Warrior_2 Block Logic
            if (en.type === 'Warrior_2') {
                if (en.state === 'blocking') {
                    window.playerSay("Bloqueado!", 40);
                    return;
                }
                if (Math.random() < en.blockChance) {
                    en.state = 'blocking'; en.currentFrame = 0; en.frameTimer = 0;
                    window.playerSay("Defendeu!", 40);
                    return;
                }
            }

            en.hp--;
            en.state = 'hurt';

            const forcaInimigoX = 25;
            const forcaInimigoY = -8;

            if (player.x < en.x) en.x += forcaInimigoX;
            else en.x -= forcaInimigoX;

            en.velY = forcaInimigoY;
            en.currentFrame = 0;
            en.frameTimer = 0;

            if (en.hp <= 0) {
                en.state = 'dead';
                en.currentFrame = 0;
                en.frameTimer = 0;
            }
        }
    });

    // 2. Boss
    if (boss && boss.state !== 'dead') {
        if (hitboxX < boss.x + boss.width && hitboxX + alcance > boss.x &&
            player.y < boss.y + boss.height && player.y + player.height > boss.y) {

if (boss.state === 'healing') {

            window.playerSay("Imune!", 30); // Opcional: dá um aviso ao jogador

            return;
 // Sai da função e não tira vida

        }

            boss.hp--;
            if (boss.hp <= 0) {
                boss.state = 'dead';
                boss.currentFrame = 0;
                boss.dialogue = "Não foi isso que planejei...";
                boss.dialogueTimer = 180;
                localStorage.setItem('capitulo_4_vencido', 'true');
            } else {
                boss.state = 'hurt';
                boss.currentFrame = 0;
                boss.frameTimer = 0;
            }
        }
    }
}

// --- UPDATE LOOP ---
function update() {
    if (player.hp <= 0) { player.state = 'dead'; return; }
    if (gameState !== 'playing' || isPaused) return;

    updatePotions();
    updateNPCs();

    if (boss) updateBossLogic();

    if (player.dialogueTimer > 0) {
        player.dialogueTimer--;
        if (player.dialogueTimer <= 0) player.dialogue = "";
    }

    if (player.y >= 2000) { player.hp = 0; player.state = 'dead'; return; }

    // Física Vertical Player
    player.onGround = false;
    player.velY += gravity;
    if (player.velY > 20) player.velY = 20;
    player.y += player.velY;

    // Colisão Plataformas
    platforms.forEach(p => {
        if (p.type === 'sloped') return;

        let pCenterX = p.x + p.w / 2;
        let pCenterY = p.y + p.h / 2;
        let playerCenterX = player.x + player.width / 2;
        let playerCenterY = player.y + player.height / 2;

        let diffX = playerCenterX - pCenterX;
        let diffY = playerCenterY - pCenterY;
        let minXDist = p.w / 2 + player.width / 2;
        let minYDist = p.h / 2 + player.height / 2;

        if (Math.abs(diffX) < minXDist && Math.abs(diffY) < minYDist) {
            let overlapX = minXDist - Math.abs(diffX);
            let overlapY = minYDist - Math.abs(diffY);

            if (overlapX >= overlapY) {
                if (diffY > 0) {
                    player.y += overlapY; player.velY = 0;
                } else {
                    player.y -= overlapY; player.velY = 0; player.onGround = true;
                }
            } else {
                if (diffX > 0) player.x += overlapX;
                else player.x -= overlapX;
                player.velX = 0;
            }
        }
    });

    player.x += player.velX;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > mapWidth) player.x = mapWidth - player.width;
    if (player.onGround) player.canAirAttack = true;

    // Movimento e Estado
    if (player.state !== 'attacking') {
        if (keys.left) player.holdLeft++; else player.holdLeft = 0;
        if (keys.right) player.holdRight++; else player.holdRight = 0;

        let speed = player.speed;
        let running = (player.holdLeft > player.runThreshold || player.holdRight > player.runThreshold);
        if (running) speed *= player.runningSpeedMultiplier;

        if (keys.left) player.velX = -speed;
        else if (keys.right) player.velX = speed;
        else player.velX *= 0.7;

        if (!player.onGround) player.state = 'jumping';
        else if (running) player.state = 'running';
        else if (Math.abs(player.velX) > 0.5) player.state = 'walking';
        else player.state = 'idle';
    } else {
        player.velX = 0;
    }

    // Animação Player
    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
        player.frameTimer = 0;
        if (player.state === 'attacking') {
            player.currentFrame++;
            if (player.currentFrame >= player.attackFrames) {
                if (!player.onGround) player.state = 'jumping';
                else if (Math.abs(player.velX) > 0.5) player.state = 'walking';
                else player.state = 'idle';
                player.currentFrame = 0;
            }
        } else if (!player.onGround) {
            player.state = 'jumping'; player.currentFrame = (player.currentFrame + 1) % player.jumpFrames;
        } else if (player.state === 'running') {
            player.currentFrame = (player.currentFrame + 1) % player.runFrames;
        } else if (player.state === 'walking') {
            player.currentFrame = (player.currentFrame + 1) % player.walkFrames;
        } else {
            player.state = 'idle'; player.currentFrame = (player.currentFrame + 1) % player.idleFrames;
        }
    }

    // Câmera
    let targetX = (player.x + player.width / 2) - (canvas.width / (2 * zoom));
    let targetY = (player.y + player.height / 2) - (canvas.height / (2 * zoom));
    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
    cameraY = Math.max(0, Math.min(cameraY, mapHeight - canvas.height / zoom));

    // Lógica Inimigos
    enemies.forEach(en => {
        // Morte
        if (en.hp <= 0) {
            if (en.state !== 'dead') { en.state = 'dead'; en.currentFrame = 0; en.frameTimer = 0; }
            if (en.target && en.target.hp <= 0) { en.target = null; en.state = 'patrol'; }
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0;
                if (en.currentFrame < en.deadFrames - 1) en.currentFrame++;
            }
            return;
        }

        // Patrulha e Física
        if (en.patrolMinX === undefined) { en.patrolMinX = en.x - 120; en.patrolMaxX = en.x + 120; }
        en.velY += gravity; en.y += en.velY; en.onGround = false;

        platforms.forEach(p => {
            if (en.x + 40 < p.x + p.w && en.x + 60 > p.x &&
                en.y + en.height >= p.y && en.y + en.height <= p.y + 10) {
                en.y = p.y - en.height; en.velY = 0; en.onGround = true;
            }
        });

        // Escolha de Alvo
        if (!en.target || en.target.state === 'dead' || !isEnemy(en, en.target)) {
            let possibleTargets = [];
            if (isEnemy(en, player)) possibleTargets.push(player);
            enemies.forEach(other => { if (other !== en && isEnemy(en, other) && other.state !== 'dead') possibleTargets.push(other); });
            if (typeof npcs !== 'undefined') { npcs.forEach(npc => { if (isEnemy(en, npc) && npc.state !== 'dead') possibleTargets.push(npc); }); }

            let nearest = null, minDist = Infinity;
            possibleTargets.forEach(t => {
                let distH = Math.abs(t.x - en.x);
                let distV = Math.abs(t.y - en.y);
                if (distH < 350 && distV < 100 && distH < minDist) { minDist = distH; nearest = t; }
            });

            if (nearest) { en.target = nearest; en.state = 'chase'; }
            else { en.target = null; en.state = 'patrol'; }
        }

        const alvo = en.target;
        let distH = Infinity, distV = Infinity;
        if (alvo) { distH = Math.abs(alvo.x - en.x); distV = Math.abs(alvo.y - en.y); }

        if (en.state === 'dead') { return; }
        else if (en.state === 'blocking') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0;
                if (en.currentFrame < (en.blockFrames || 2) - 1) en.currentFrame++;
                else { en.state = 'chase'; en.currentFrame = 0; }
            }
        }
        else if (en.state === 'hurt') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0; en.currentFrame++;
                if (en.currentFrame >= en.hurtFrames) { en.currentFrame = 0; en.state = 'patrol'; en.target = null; }
            }
        }
        else if (en.state === 'patrol') {
            en.target = null;
            if (en.facing === 'left') {
                en.x -= en.speed;
                if (en.x <= en.patrolMinX) en.facing = 'right';
            } else {
                en.x += en.speed;
                if (en.x >= en.patrolMaxX) en.facing = 'left';
            }
            if (Math.abs(player.x - en.x) < 200 && Math.abs(player.y - en.y) < 100 && player.hp > 0) { en.target = player; en.state = 'chase'; }
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) { en.currentFrame = (en.currentFrame + 1) % en.walkFrames; en.frameTimer = 0; }
        }
        else if ((en.state === 'chase' || en.state === 'chase_npc') && alvo) {
            if (distH > 30) {
                if (alvo.x < en.x) { en.x -= en.speed * 1.2; en.facing = 'left'; }
                else { en.x += en.speed * 1.2; en.facing = 'right'; }
            }
            if (alvo.y < en.y - 60 && distV < 150 && en.onGround) { en.velY = -13; en.onGround = false; }
            if (distH <= en.attackRange && distV < 50 && en.attackCooldown <= 0) { en.state = 'attacking'; en.currentFrame = 0; en.frameTimer = 0; }
            if (distH > 400 || distV > 100 || alvo.hp <= 0) { en.target = null; en.state = 'patrol'; en.currentFrame = 0; en.frameTimer = 0; return; }
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) { en.currentFrame = (en.currentFrame + 1) % en.runFrames; en.frameTimer = 0; }
        }
        else if (en.state === 'attacking') {
            en.velX = 0;
            if (!alvo || alvo.hp <= 0 || !isEnemy(en, alvo)) { en.state = 'patrol'; en.target = null; en.currentFrame = 0; return; }
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0; en.currentFrame++;
                if (en.currentFrame === 3 && distH <= en.attackRange && isEnemy(en, alvo)) {
                    if (alvo.hp !== undefined && alvo.hp > 0) {
                        alvo.hp -= en.damage || 1;
                        if (alvo.state !== undefined) alvo.state = 'hurt';
                        if (alvo.velX !== undefined) alvo.velX = (en.x < alvo.x) ? 22 : -22;
                        if (alvo.velY !== undefined) alvo.velY = -6;
                    }
                    en.attackCooldown = 80;
                }
                if (en.currentFrame >= en.attackFrames) {
                    en.currentFrame = 0; en.attackCooldown = 80;
                    if (!en.target || en.target.hp <= 0) { en.target = null; en.state = 'patrol'; } else { en.state = 'chase'; }
                    return;
                }
            }
        }
        if (en.attackCooldown > 0) en.attackCooldown--;
    });
}

// --- DESENHO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, -Math.floor(cameraX * zoom), -Math.floor(cameraY * zoom));

    backgroundObjects.forEach(d => { if (d.img.complete) ctx.drawImage(d.img, d.x, d.y, d.width, d.height); });

    platforms.forEach(p => {
        ctx.save();
        if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
        if (p.type === 'pattern' && platformPattern) {
            ctx.translate(p.x, p.y);
            ctx.fillStyle = platformPattern;
            ctx.fillRect(0, 0, p.w, p.h);
        }
        ctx.restore();
    });

    const allEntities = [...enemies, player];
    if (boss) allEntities.push(boss);

    allEntities.forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;

        if (obj.state === 'walking' || obj.state === 'patrol') { img = obj.imgWalk; totalF = obj.walkFrames; }
        else if (obj.state === 'running' || obj.state === 'chase') { img = obj.imgRun; totalF = obj.runFrames; }
        else if (obj.state === 'blocking' || obj.state === 'protect') { img = obj.imgProtect || obj.imgIdle; totalF = obj.blockFrames || 2; }
        else if (obj.state === 'attacking' || obj.state === 'attack1') { img = obj.imgAttack || obj.imgAttack1; totalF = obj.attackFrames || obj.attack1Frames; }
        else if (obj.state === 'attack2') { img = obj.imgAttack2; totalF = obj.attack2Frames; }
        else if (obj.state === 'healing') { img = obj.imgMagic; totalF = obj.healFrames; }
        else if (obj.state === 'jumping') { img = obj.imgJump; totalF = obj.jumpFrames || 8; }
        else if (obj.state === 'hurt') { img = obj.imgHurt; totalF = obj.hurtFrames; }
        else if (obj.state === 'dead') { img = obj.imgDead; totalF = obj.deadFrames; }

        if (img && img.complete && img.width > 0) {
            const fw = img.width / totalF;
            const fh = img.height;
            ctx.save();
            if (obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, obj.y); ctx.scale(-1, 1);
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, 0, 0, obj.width, obj.height);
            } else {
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, obj.x, obj.y, obj.width, obj.height);
            }
            ctx.restore();

            if (obj.state !== 'dead' && obj.dialogue && obj.dialogueTimer > 0) {
                ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
                let textWidth = ctx.measureText(obj.dialogue).width;
                ctx.fillStyle = "white"; ctx.fillRect(obj.x + obj.width / 2 - textWidth / 2 - 5, obj.y - 15, textWidth + 10, 20);
                ctx.strokeStyle = "black"; ctx.strokeRect(obj.x + obj.width / 2 - textWidth / 2 - 5, obj.y - 15, textWidth + 10, 20);
                ctx.fillStyle = "black"; ctx.fillText(obj.dialogue, obj.x + obj.width / 2, obj.y);
            }
        }
    });

    potions.forEach(p => { if (p.active && potionImg.complete) ctx.drawImage(potionImg, p.x, p.y, p.width, p.height); });

    npcs.forEach(n => {
        let img = n.imgIdle;
        let totalF = n.idleFrames;
        if (!img.complete) return;
        const fw = img.width / totalF;
        const fh = img.height;
        ctx.save();
        if (n.facing === 'left') {
            ctx.translate(n.x + n.width, n.y); ctx.scale(-1, 1);
            ctx.drawImage(img, (n.currentFrame % totalF) * fw, 0, fw, fh, 0, 0, n.width, n.height);
        } else {
            ctx.drawImage(img, (n.currentFrame % totalF) * fw, 0, fw, fh, n.x, n.y, n.width, n.height);
        }
        ctx.restore();
    });

    foregroundObjects.forEach(f => { if (f.img.complete) ctx.drawImage(f.img, f.x, f.y, f.width, f.height); });

    drawNPCDialogues(ctx);
    ctx.restore();

    if (gameState === 'playing') {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);

        if (boss && boss.hp > 0 && boss.viuPlayer) {
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(canvas.width / 2 - 200, 40, 400, 20);
            ctx.fillStyle = "purple"; ctx.fillRect(canvas.width / 2 - 200, 40, (boss.hp / boss.maxHp) * 400, 20);
            ctx.strokeStyle = "white"; ctx.strokeRect(canvas.width / 2 - 200, 40, 400, 20);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
            ctx.fillText("Orc Shaman", canvas.width / 2, 35);
        }
    }

    const screen = document.getElementById('game-over-screen');
    const title = screen ? screen.querySelector('h1') : null;
    const subtitle = screen ? screen.querySelector('p') : null;
    const btnReset = document.getElementById('btn-reset');
    const btnNext = document.getElementById('btn-next-chapter');

    if (screen) {
        if (player.hp <= 0 || player.state === 'dead') {
            screen.style.display = 'flex';
            screen.style.backgroundColor = "rgba(139, 0, 0, 0.8)";
            if (title) title.innerText = "VOCÊ CAIU...";
            if (subtitle) subtitle.innerText = "Tente novamente para prosseguir";
            if (btnReset) btnReset.style.display = 'block';
            if (btnNext) btnNext.style.display = 'none';
        }
        else if (boss && boss.state === 'dead' && boss.hp <= 0) {
            if (screen.style.display !== 'flex') {
                screen.style.display = 'flex';
                screen.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                if (title) title.innerHTML = "Você derrubou <br> Orc Shaman";
                if (subtitle) subtitle.innerHTML = "Os Orcs começaram a recuar para mais longe das montanhas";
                if (btnReset) btnReset.style.display = 'none';
                if (btnNext) btnNext.style.display = 'block';
            }
        }
    }
}

function updateBossLogic() {
    if (!boss || boss.state === 'dead') return;

    boss.velY += gravity;
    boss.y += boss.velY;
    if (boss.y + boss.height > 300) { boss.y = 300 - boss.height; boss.velY = 0; }

    const distH = Math.abs((player.x + player.width / 2) - (boss.x + boss.width / 2));
    const distV = Math.abs(player.y - boss.y);

    if (!boss.viuPlayer) {
        if (distH < 350 && distV < 100) {
            boss.viuPlayer = true;
            boss.dialogueIndex = 0;
            boss.dialogue = boss.phrases[boss.dialogueIndex];
            boss.dialogueTimer = 180;
        } else {
            boss.state = 'idle'; return;
        }
    } else {
        if (boss.dialogueTimer <= 0 && boss.dialogueIndex < boss.phrases.length - 1) {
            boss.dialogueIndex++;
            boss.dialogue = boss.phrases[boss.dialogueIndex];
            boss.dialogueTimer = 180;
        }
    }

    if (boss.hp === 1 && boss.healCooldown <= 0 && boss.state !== 'healing') {
        boss.state = 'healing';
        boss.currentFrame = 0;
        boss.dialogue = "Pelos ancestrais, eu me curo!";
        boss.dialogueTimer = 100;
    }

    if (boss.state !== 'hurt' && boss.state !== 'healing' && !boss.state.includes('attack')) {
        boss.facing = (player.x < boss.x) ? 'left' : 'right';

        if (boss.hp < 2 && boss.healCooldown > 0) {
            boss.state = 'walking';
            boss.x += (player.x < boss.x) ? boss.speed : -boss.speed;
        }
        else if (boss.attackCooldown <= 0) {
            if (distH < 50) {
                boss.state = 'attack2'; boss.currentFrame = 0;
            } else if (distH >= 50 && distH <= 80) {
                boss.state = 'attack1'; boss.currentFrame = 0;
            } else {
                boss.state = 'walking';
                boss.x += (player.x < boss.x) ? -boss.speed : boss.speed;
            }
        } else {
            boss.state = 'idle';
        }
    }

    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;
        boss.currentFrame++;

        let maxFrames = boss.idleFrames;
        if (boss.state === 'walking') maxFrames = boss.walkFrames;
        else if (boss.state === 'attack1') maxFrames = boss.attack1Frames;
        else if (boss.state === 'attack2') maxFrames = boss.attack2Frames;
        else if (boss.state === 'healing') maxFrames = boss.healFrames;
        else if (boss.state === 'hurt') maxFrames = boss.hurtFrames;

        if (boss.currentFrame >= maxFrames) {
            if (boss.state === 'healing') {
                boss.hp += 3;
                boss.healCooldown = 600;
                boss.isHealActive = false;
                boss.state = 'idle';
            } else if (boss.state === 'attack1') {
                if (distH < 90) aplicarDanoBoss(1);
                boss.state = 'idle';
                boss.attackCooldown = 80;
            } else if (boss.state === 'attack2') {
                if (distH < 60) aplicarDanoBoss(2);
                boss.state = 'idle';
                boss.attackCooldown = 60;
            } else if (boss.state === 'hurt') {
                boss.state = 'idle';
            }
            boss.currentFrame = 0;
        }
    }

    if (boss.dialogueTimer > 0) boss.dialogueTimer--;
    if (boss.attackCooldown > 0) boss.attackCooldown--;
    if (boss.healCooldown > 0) boss.healCooldown--;
}

// --- FUNÇÃO ADICIONADA: DANO DO BOSS ---
function aplicarDanoBoss(dmg) {
    processDamage(dmg);
}

function processDamage(dmg) {
    if (player.state !== 'hurt') {
        player.hp -= dmg;
        player.state = 'hurt';
        player.currentFrame = 0;
        cameraX += (Math.random() - 0.5) * 20;
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();

window.irParaMenu = function() {
    localStorage.setItem('capitulo_4_vencido', 'true');
    window.location.href = "../index.html";
};

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') window.mover('left', true);
    if (k === 'd') window.mover('right', true);
    if (k === 'w' || k === ' ') window.pular();
    if (k === 'k') window.atacar();

    if (k === 'r') {
        if (boss && boss.state === 'dead' && boss.hp <= 0) {
            window.irParaMenu();
        } else if (player.hp <= 0 || player.state === 'dead') {
            window.resetGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') window.mover('left', false);
    if (k === 'd') window.mover('right', false);
});

document.addEventListener('DOMContentLoaded', () => {
    const btnReset = document.getElementById('btn-reset');
    const btnNext = document.getElementById('btn-next-chapter');
    if (btnReset) btnReset.onclick = () => window.resetGame();
    if (btnNext) btnNext.onclick = () => window.irParaMenu();

});

