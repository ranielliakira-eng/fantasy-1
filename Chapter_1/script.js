const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('../Assets/Sounds/371148__mrthenoronha__cool-game-theme-loop.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.6; 
const mapWidth = 7000;
const mapHeight = 450;
let cameraX = 0;
let cameraY = 0;
let gameState = 'loading';
let isPaused = false;
let isMuted = false;
let boss = null;

// --- JOGADOR (ESTRUTURA BASE) ---
const player = {
    x: 120, y: 200, width: 100, height: 100,
    velX: 0, velY: 0, speed: 3, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 7, maxHp: 7, 
    comboStep: 1, lastAttackTime: 0,
    canAirAttack: true,  attackFrameInterval: 7,
    attackCooldownMax: 0, attackCooldown: 0,
    runTimer: 0, isRunning: false, runThreshold: 60,
    dialogue: "", dialogueTimer: 0,

    imgIdle: new Image(), imgWalk: new Image(), imgRun: new Image(),
    imgJump: new Image(), imgHurt: new Image(), imgDead: new Image(), 
    imgAttack1: new Image(), imgAttack2: new Image(), imgAttack3: new Image(), 

    idleFrames: 8, walkFrames: 8, runFrames: 8,
    jumpFrames: 8, hurtFrames: 3, deadFrames: 3,
    attack1Frames: 6, attack2Frames: 3, attack3Frames: 4, 
    currentFrame: 0, frameTimer: 0, frameInterval: 8,

};


let keys = { left: false, right: false };

const player2 = {
    ...player,
    x: 160,
    active: false,
    imgIdle: new Image(), imgWalk: new Image(), imgRun: new Image(),
    imgJump: new Image(), imgHurt: new Image(), imgDead: new Image(), 
    imgAttack1: new Image(), imgAttack2: new Image(), imgAttack3: new Image(), 
};

let keysP2 = { left: false, right: false };

// --- INICIALIZAÇÃO AUTOMÁTICA (PADRÃO SWORDSMAN / KNIGHT) ---
window.onload = function() {
    const numJogadores = parseInt(localStorage.getItem('jogadores_total')) || 1;
    const escolhaP1 = localStorage.getItem('heroi_da_jornada') || 'loiro';
    const escolhaP2 = (escolhaP1 === 'loiro') ? 'castanha' : 'loiro';

    // 1. Configura o Player 1 (Sempre ativo)
    configurarPlayer(player, escolhaP1);
    
    // 2. Configura o Player 2 (Apenas se selecionado no menu)
    if (numJogadores === 2) {
    player2.active = true;
    configurarPlayer(player2, escolhaP2);

    player2.state = 'idle';
    player2.facing = 'right';
    player2.currentFrame = 0;
    player2.frameTimer = 0;
    player2.velX = 0;
    player2.velY = 0;
    player2.onGround = false;
}
    player.imgIdle.onload = () => {
        gameState = 'playing'; 
        initEnemies(); 
        if (!isMuted) bgMusic.play().catch(() => {}); 
    };
    const controls = document.getElementById('mobile-controls');
    if(controls) controls.style.display = 'flex';
};

function configurarPlayer(p, escolha) {
    const tipo = (escolha === 'castanha') ? 'Knight' : 'Swordsman';

    if (tipo === 'Knight') {
        p.idleFrames   = 6;
        p.walkFrames   = 8;
        p.runFrames   = 7;
        p.jumpFrames   = 6;
        p.hurtFrames = 3;
        p.deadFrames = 4;

        p.attack1Frames = 5;
        p.attack2Frames = 2;
        p.attack3Frames = 5;

        p.imgIdle.src   = '../Assets/Knight/Idle.png';
        p.imgWalk.src   = '../Assets/Knight/Walk.png';
        p.imgRun.src   = '../Assets/Knight/Run.png';
        p.imgJump.src   = '../Assets/Knight/Jump.png';
        p.imgHurt.src   = '../Assets/Knight/Hurt.png';
        p.imgDead.src   = '../Assets/Knight/Dead.png';

        p.imgAttack1.src = '../Assets/Knight/Attack_1.png';
        p.imgAttack2.src = '../Assets/Knight/Attack_2.png';
        p.imgAttack3.src = '../Assets/Knight/Attack_3.png';

        p.imgAttack = p.imgAttack1;
    }

    if (tipo === 'Swordsman') {
        p.idleFrames   = 8;
        p.walkFrames   = 8;
        p.runFrames   = 8;
        p.jumpFrames   = 8;
        p.hurtFrames = 3;
        p.deadFrames = 3;

        p.attack1Frames = 6;
        p.attack2Frames = 3;
        p.attack3Frames = 4;

        p.imgIdle.src   = '../Assets/Swordsman/Idle.png';
        p.imgWalk.src   = '../Assets/Swordsman/Walk.png';
        p.imgRun.src   = '../Assets/Swordsman/Run.png';
        p.imgJump.src   = '../Assets/Swordsman/Jump.png';
        p.imgHurt.src   = '../Assets/Swordsman/Hurt.png';
        p.imgDead.src   = '../Assets/Swordsman/Dead.png';

        p.imgAttack1.src = '../Assets/Swordsman/Attack_1.png';
        p.imgAttack2.src = '../Assets/Swordsman/Attack_2.png';
        p.imgAttack3.src = '../Assets/Swordsman/Attack_3.png';

        p.imgAttack = p.imgAttack1;
    }
    p.currentFrame = 0;
    p.frameTimer = 0;
}


// Versão genérica: adicione o parâmetro 'p' e 'k' (keys)
function processarMovimento(p, k, dir, estado) {
    if(gameState !== 'playing' || p.state === 'dead' || isPaused) return;
    if(dir === 'left') k.left = estado;
    if(dir === 'right') k.right = estado;
    if(estado) p.facing = dir;
}

function processarPulo(p) {
    if(gameState === 'playing' && p.onGround && !isPaused) {
        p.velY = p.jumpForce;
        p.onGround = false;
    }
}

function processarAtaque(p) {
    if(p.state === 'dead') return;
    if(gameState !== 'playing' || isPaused || p.state === 'attacking') return;
    p.state = 'attacking';
    p.currentFrame = 0;
    checkMeleeHit(p); // Passamos o player que atacou para a função de hit
}

const playerDialogTriggers = [
    { x: 600, text: "Esses Slimes não deveriam estar aqui.", used: false },
    { x: 1800, text: "A floresta está ficando mais densa.", used: false },
    { x: 6100, text: "Floresta está cheia de Slimes...", used: false },
    { x: 6300, text: "Enchantress, você está bem?", used: false },
];

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 200, hp: 5, speed: 1.2, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1000, y: 200, hp: 5, speed: 1.3, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1200, y: 200, hp: 5, speed: 1.4, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1300, y: 200, hp: 5, speed: 1.5, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1400, y: 200, hp: 5, speed: 1.5, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1500, y: 200, hp: 5, speed: 1.4, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1250, y: 200, hp: 5, speed: 1.3, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1450, y: 200, hp: 5, speed: 1.2, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
       
        { type: 'Blue_Slime', x: 2980, y: 200, hp: 5, speed: 1.8, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3000, y: 200, hp: 5, speed: 1.7, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3025, y: 200, hp: 5, speed: 1.6, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3100, y: 200, hp: 5, speed: 1.6, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 

        { type: 'Red_Slime', x: 4000, y: 200, hp: 5, speed: 2.5, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4050, y: 200, hp: 5, speed: 2.4, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4100, y: 200, hp: 5, speed: 2.2, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4200, y: 200, hp: 5, speed: 2.5, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },

        { type: 'Green_Slime', x: 5000, y: 200, hp: 5, speed: 1.2, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 5100, y: 200, hp: 5, speed: 1.2, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
         	
        { type: 'Blue_Slime', x: 5000, y: 200, hp: 5, speed: 1.8, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 5125, y: 207, hp: 5, speed: 1.7, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 

        { type: 'Red_Slime', x: 5000, y: 200, hp: 5, speed: 2.5, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5150, y: 200, hp: 5, speed: 2.5, damage: 1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
];

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `../Assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `../Assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `../Assets/${en.type}/Attack_1.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `../Assets/${en.type}/Hurt.png`;
        en.imgDead = new Image(); en.imgDead.src = `../Assets/${en.type}/Dead.png`;

        en.width = 100; en.height = 100;
        en.currentFrame = 0; en.frameTimer = 0;
        if (en.frameInterval === undefined) en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left'; en.attackCooldown = 0;
        en.velY = 0; en.onGround = false;

        if (en.type === 'Blue_Slime') {
            en.jumpCooldown = Math.floor(Math.random() * 120) + 30;
            en.jumpInterval = Math.floor(Math.random() * 90) + 60;
        }
    });
}

// --- PLATAFORMAS ---
const platforms = [

// --- Cerca ---
    { x: 450, y: 270, w: 70, h: 50, type: 'pattern', alpha: 0 },
// --- Chão parte 1 ---
    { x: 0, y: 300, w: 2000, h: 150, type: 'pattern' },
// --- Poço ---
    { x: 620, y: 223, w: 5, h: 80, type: 'pattern', alpha: 0 },
// --- Árvore ---
    { x: 2020, y: 270, w: 150, h: 20, type: 'stretch', alpha: 0 },
// --- Chão parte 2 ---
    { x: 2150, y: 300, w: 4850, h: 150, type: 'pattern' }, 
];

// --- Cenário ---
const fundoImg = new Image();
fundoImg.src = '../Assets/Battleground/fundo1.png';

const platformImg = new Image();
platformImg.src = '../Assets/Battleground/Platformer/Ground_11.png';

const tree1Img = new Image();
tree1Img.src = '../Assets/Battleground/Trees/middle_lane_tree1.png';
const tree2Img = new Image();
tree2Img.src = '../Assets/Battleground/Trees/middle_lane_tree2.png';
const tree3Img = new Image();
tree3Img.src = '../Assets/Battleground/Trees/middle_lane_tree3.png';
const tree4Img = new Image();
tree4Img.src = '../Assets/Battleground/Trees/middle_lane_tree4.png';
const tree5Img = new Image();
tree5Img.src = '../Assets/Battleground/Trees/middle_lane_tree5.png';
const tree6Img = new Image();
tree6Img.src = '../Assets/Battleground/Trees/middle_lane_tree6.png';
const tree7Img = new Image();
tree7Img.src = '../Assets/Battleground/Trees/middle_lane_tree7.png';
const tree8Img = new Image();
tree8Img.src = '../Assets/Battleground/Trees/middle_lane_tree8.png';
const tree9Img = new Image();
tree9Img.src = '../Assets/Battleground/Trees/middle_lane_tree9.png';
const tree10Img = new Image();
tree10Img.src = '../Assets/Battleground/Trees/middle_lane_tree10.png';
const tree11Img = new Image();
tree11Img.src = '../Assets/Battleground/Trees/middle_lane_tree11.png';

const wellImg = new Image();
wellImg.src = '../Assets/Battleground/Environment/Well.png';

const house1Img = new Image();
house1Img.src = '../Assets/Battleground/House/casa1.png';

const Decor_CartImg = new Image();
Decor_CartImg.src = '../Assets/Battleground/Environment/Decor_Cart.png';

const fence_01Img = new Image();
fence_01Img.src = '../Assets/Battleground/Environment/Fence_01.png';

const fence_02Img = new Image();
fence_02Img.src = '../Assets/Battleground/Environment/Fence_02.png';

const fence_03Img = new Image();
fence_03Img.src = '../Assets/Battleground/Environment/Fence_03.png';

let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

const backgroundObjects = [
	{ x: 0, y: 0, width: 7000, height: 1000, img: fundoImg },
	{ x: 120, y: 230, width: 75, height: 75, img: Decor_CartImg },
	{ x: 270, y: 100, width: 250, height: 200, img: house1Img },
	{ x: 600, y: 200, width: 100, height: 100, img: wellImg },

	{ x: 1000, y: 250, width: 50, height: 50, img: tree9Img },
	{ x: 1110, y: 250, width: 50, height: 50, img: tree10Img },
	{ x: 1330, y: 250, width: 50, height: 50, img: tree9Img },
	{ x: 1440, y: 250, width: 50, height: 50, img: tree8Img },
	
	{ x: 2470, y: 5, width: 250, height: 300, img: tree5Img },
	
	{ x: 2900, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3010, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3120, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3230, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3340, y: 5, width: 250, height: 300, img: tree2Img },
	
	{ x: 3450, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3560, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3570, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3680, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 3790, y: 5, width: 250, height: 300, img: tree2Img },

	{ x: 4450, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 4560, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 4570, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 4680, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 4790, y: 5, width: 250, height: 300, img: tree2Img },

	{ x: 5450, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 5560, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 5570, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 5680, y: 5, width: 250, height: 300, img: tree2Img },
	{ x: 5790, y: 5, width: 250, height: 300, img: tree2Img },
];

const foregroundObjects = [

	{ x: 400, y: 260, width: 50, height: 50, img: fence_01Img },
	{ x: 450, y: 260, width: 50, height: 50, img: fence_02Img },
	{ x: 500, y: 260, width: 50, height: 50, img: fence_03Img },

	{ x: 1960, y: 110, width: 380, height: 200, img: tree1Img },
	
	{ x: 1220, y: 250, width: 50, height: 50, img: tree11Img },
	
	{ x: 3060, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 3220, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 3560, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 3720, y: 5, width: 300, height: 300, img: tree3Img },

	{ x: 4060, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 4220, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 4560, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 4720, y: 5, width: 300, height: 300, img: tree3Img },

	{ x: 5060, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 5220, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 5560, y: 5, width: 300, height: 300, img: tree3Img },
	{ x: 5720, y: 5, width: 300, height: 300, img: tree3Img },
];

// --- NPCs ---
const oxNpc = {
    x: 10, y: 200, width: 110, height: 110, imgIdle: new Image(),
    idleFrames: 4, currentFrame: 0, frameTimer: 0, frameInterval: 20,
    phrases: ["Muuu!"], dialogueIndex: 0, dialogueTimer: 0
};

oxNpc.imgIdle.src = '../Assets/Animals/Bull_Idle.png';

const farmerNpc = {
    x: 220, y: 225, width: 80, height: 80, imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    phrases: [
"Que bom que você chegou!", 
"Enchantress entrou na floresta", 
"Ajude-a, ela está sozinha."
],
    dialogueIndex: 0, dialogueTimer: 0
};

farmerNpc.imgIdle.src = '../Assets/Farmer/IdleM.png';

const npcs = [oxNpc, farmerNpc];

// --- FUNÇÃO GLOBAL PARA FALA DO PLAYER ---
window.playerSay = function(text, duration = 120) {
    player.dialogue = text;
    player.dialogueTimer = duration;
};

function resetPlayer(p, xInicial) {
    p.hp = p.maxHp;
    p.x = xInicial;
    p.y = 100;
    p.velX = 0;
    p.velY = 0;
    p.state = 'idle';
    p.currentFrame = 0;
    p.frameTimer = 0;
    p.onGround = false;
    p.canAirAttack = true;
}


// --- FUNÇÕES DO SISTEMA ---
window.togglePause = function() { if (gameState !== 'playing') return; isPaused = !isPaused; if (isPaused) bgMusic.pause(); else if (!isMuted) bgMusic.play().catch(() => {}); };
window.toggleSom = function() { isMuted = !isMuted; bgMusic.muted = isMuted; const btn = document.getElementById('btn-audio'); if(btn) btn.innerText = isMuted ? "Mudo" : "Som"; };
window.resetGame = function () {
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.style.display = 'none';

    resetPlayer(player, 120);

    if (player2 && player2.active) {
        resetPlayer(player2, 160);
    }

    cameraX = 0;
    isPaused = false;
    gameState = 'playing';

    boss = null;
    initEnemies();
};

window.concluirCapituloEVoutar = function() {
    localStorage.setItem('capitulo_1_vencido', 'true');
    
window.location.href = "../index.html";

};

// Movimentação
window.mover = function(p, kObj, dir, estado) {
    if (gameState !== 'playing' || p.state === 'dead' || isPaused) return;
    if (dir === 'left') kObj.left = estado;
    if (dir === 'right') kObj.right = estado;
    if (estado) p.facing = dir;
};

// Pulo
window.pular = function(p) {
    if (gameState === 'playing' && p.onGround && !isPaused && p.state !== 'dead') {
        p.velY = p.jumpForce;
        p.onGround = false;
        p.state = 'jump';
    }
};

window.atacar = function(p) {
    if (p.state === 'dead' || p.state === 'attacking' || isPaused || p.attackCooldown > 0) return;

    const agora = Date.now();
    if (agora - p.lastAttackTime > 800) {
        p.comboStep = 1;
    }

    // Ajusta a imagem E a quantidade de frames para aquele golpe específico
    if (p.comboStep === 1) {
        p.imgAttack = p.imgAttack1;
        p.attackFrames = p.attack1Frames;
    } else if (p.comboStep === 2) {
        p.imgAttack = p.imgAttack2;
        p.attackFrames = p.attack2Frames;
    } else if (p.comboStep === 3) {
        p.imgAttack = p.imgAttack3;
        p.attackFrames = p.attack3Frames;
        p.attackCooldown = 60;
    }

    p.state = 'attacking';
    p.currentFrame = 0;
    p.frameTimer = 0;
    p.lastAttackTime = agora;

    checkMeleeHit(p);

    p.comboStep = (p.comboStep % 3) + 1;
};

// NPCs
function npcSay(npc, index=0, duration=120){ npc.dialogueIndex=index; npc.dialogueTimer=duration; }
function updateNPCs() {
    npcs.forEach(n => {

        if (n.dialogueTimer > 0) {
            n.dialogueTimer--;
        } else {
            n.dialogueIndex++;

            if (n.dialogueIndex >= n.phrases.length) {
                n.dialogueIndex = 0;
            }

            n.dialogueTimer = 180;
        }

        // animação idle
        n.frameTimer++;
        if (n.frameTimer >= n.frameInterval) {
            n.frameTimer = 0;
            n.currentFrame = (n.currentFrame + 1) % n.idleFrames;
        }
    });
}
// HIT MELEE
function checkMeleeHit(p) {
    let alcance = p.width * 0.1; 
    let hitboxX = p.facing === 'right' ? p.x + p.width * 0.7 : p.x - alcance + p.width * 0.3;

    enemies.forEach(en => {
        if (en.state === 'dead') return;
        
        let hitY = en.y + (en.height * 0.3);
        let hitHeight = en.height * 0.7;

        if (hitboxX < en.x + en.width && hitboxX + alcance > en.x &&
            p.y < hitY + hitHeight && p.y + p.height > hitY) {
            
            en.hp--;
            if (en.hp <= 0) {
                en.state = 'dead';
                en.currentFrame = 0;
                en.frameTimer = 0;
            } else {
                en.state = 'hurt';
                en.currentFrame = 0;
                en.frameTimer = 0;
            }
        }
    });

    if (boss && boss.state !== 'dead') {
        if (hitboxX < boss.x + boss.width && hitboxX + alcance > boss.x &&
            p.y < boss.y + boss.height && p.y + p.height > boss.y) {
            
            boss.hp--;
            boss.state = 'hurt';
            boss.currentFrame = 0;
            boss.frameTimer = 0;

            if (boss.hp <= 0) {
                boss.state = 'dead';
                boss.currentFrame = 0;
                boss.dialogue = "O equilíbrio...";
                boss.dialogueTimer = 180;
            }
        }
    }
}

function atualizarAnimacaoPlayer(p) {
    // 1. PRIORIDADE MÁXIMA: MORTE
    if (p.state === 'dead') {
        p.frameTimer++;
        if (p.frameTimer >= p.frameInterval) {
            p.frameTimer = 0;
            if (p.currentFrame < p.deadFrames - 1) {
                p.currentFrame++;
            }
        }
        return;
    }

    // 2. PRIORIDADE: DANO (HURT)
    // Se estiver no estado hurt, toca a animação uma vez e depois volta ao normal
    if (p.state === 'hurt') {
        p.frameTimer++;
        if (p.frameTimer >= p.frameInterval) {
            p.frameTimer = 0;
            p.currentFrame++;
            
            // Quando a animação de dano termina (usando hurtFrames que você definiu)
            if (p.currentFrame >= p.hurtFrames) {
                p.currentFrame = 0;
                p.state = 'idle'; // Volta para idle para o loop decidir o próximo estado
            }
        }
        return; 
    }

    // 3. PRIORIDADE: ATAQUE
    if (p.state === 'attacking') {
        p.frameTimer++;
        if (p.frameTimer >= p.attackFrameInterval) {
            p.frameTimer = 0;
            p.currentFrame++;

            if (p.currentFrame === p.attackFrames - 1) {
                checkMeleeHit(p);
            }

            if (p.currentFrame >= p.attackFrames) {
                p.currentFrame = 0;
                p.state = p.onGround ? 'idle' : 'jumping';
            }
        }
        return;
    }

    // 4. MOVIMENTAÇÃO NORMAL (IDLE, WALK, RUN, JUMP)
    p.frameTimer++;
    if (p.frameTimer >= p.frameInterval) {
        p.frameTimer = 0;

        if (!p.onGround) {
            p.state = 'jumping';
            p.currentFrame = (p.currentFrame + 1) % p.jumpFrames;
        }
        else if (Math.abs(p.velX) > 0.5) {
            if (p.isRunning) {
                p.state = 'running';
                p.currentFrame = (p.currentFrame + 1) % p.runFrames;
            } else {
                p.state = 'walking';
                p.currentFrame = (p.currentFrame + 1) % p.walkFrames;
            }
        }
        else {
            p.state = 'idle';
            p.currentFrame = (p.currentFrame + 1) % p.idleFrames;
        }
    }
}

// --- UPDATE ---
function update(){
    if(gameState !== 'playing' || isPaused) return;

    // Marca Player 1 como morto (sem parar o jogo)
    if (player.hp <= 0 && player.state !== 'dead') {
        player.state = 'dead';
    }

    // Marca Player 2 como morto (se ativo)
    if (player2.active && player2.hp <= 0 && player2.state !== 'dead') {
        player2.state = 'dead';
    }

    updateNPCs();
    aplicarFisicaCompleta(player, keys);

if (player2.active) {
    aplicarFisicaCompleta(player2, keysP2);
}

atualizarAnimacaoPlayer(player);

if (player2.active) atualizarAnimacaoPlayer(player2);

if (player.attackCooldown > 0) player.attackCooldown--;
if (player2.active && player2.attackCooldown > 0) player2.attackCooldown--;

if (todosPlayersMortos()) {
    resetGame();
}

    if(Math.abs(player.x-oxNpc.x)<150 && oxNpc.dialogueTimer<=0){ npcSay(oxNpc,0,120); }
    if(player.y>=450){ player.hp=0; player.state='dead'; return;}

    if(player.state!=='attacking'){ if(keys.left) player.velX=-player.speed; else if(keys.right) player.velX=player.speed; else player.velX*=0.7; } else player.velX=0;

    if(player.dialogueTimer>0){ player.dialogueTimer--; if(player.dialogueTimer<=0) player.dialogue=""; }


// limites do mapa
if (player.x < 0) player.x = 0;
if (player.x + player.width > mapWidth)
    player.x = mapWidth - player.width; 

    if(player.onGround) player.canAirAttack=true;

// 1. Determina o alvo da câmera (Média entre P1 e P2)
let alvoX, alvoY;

if (player2.active && player.state !== 'dead' && player2.state !== 'dead') {
    // Se ambos estão vivos, tira a média
    alvoX = (player.x + player2.x) / 2;
    alvoY = (player.y + player2.y) / 2;
} else if (player.state !== 'dead') {
    // Se só o P1 está vivo
    alvoX = player.x;
    alvoY = player.y;
} else {
    // Se o P1 morreu, foca no P2
    alvoX = player2.x;
    alvoY = player2.y;
}

// 2. Calcula onde a câmera deveria estar (Target)
let targetX = (alvoX + player.width / 2) - (canvas.width / (2 * zoom));
let targetY = (alvoY + player.height / 2) - (canvas.height / (2 * zoom));

// 3. Suavização (Interpolação)
cameraX += (targetX - cameraX) * 0.1;
cameraY += (targetY - cameraY) * 0.1;

// 4. Limites da câmera para não sair do mapa
cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
cameraY = Math.max(0, Math.min(cameraY, mapHeight - canvas.height / zoom));

// INIMIGOS
    enemies.forEach(en=>{

    const alvo = obterAlvoMaisProximo(en);
    if (!alvo) return;

    const dist = Math.abs(alvo.x - en.x);

        if(en.patrolMinX===undefined){ en.patrolMinX=en.x-120; en.patrolMaxX=en.x+120;}
        if(en.facing===undefined) en.facing='left';
 
        en.velY+=gravity; en.y+=en.velY; en.onGround=false;

        platforms.forEach(p=>{
            if(en.x+40<p.x+p.w && en.x+60>p.x && en.y+en.height>=p.y && en.y+en.height<=p.y+10){ en.y=p.y-en.height; en.velY=0; en.onGround=true; }
        });

if(en.type === 'Blue_Slime' && en.onGround && en.state !== 'dead') { en.jumpCooldown--; if(en.jumpCooldown<=0){ en.velY=-12; en.onGround=false; en.jumpCooldown=en.jumpInterval; } }

// --- LÓGICA DE ESTADOS ---
        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0;
                if (en.currentFrame < en.deadFrames - 1) {
                    en.currentFrame++;
                }
            }
            return; 
        }

if (en.state === 'hurt') {
    if (en.hp <= 0) {
        en.state = 'dead';
        en.currentFrame = 0;
        en.frameTimer = 0;
        return;
    }

    en.frameTimer++;
    if (en.frameTimer >= en.frameInterval) {
        en.frameTimer = 0;
        en.currentFrame++;

        if (en.currentFrame >= en.hurtFrames) {
            en.state = 'chase';
            en.currentFrame = 0;
        }
    }
    return;
}

        else if(en.state === 'patrol') {
            if(en.facing === 'left') {
                en.x -= en.speed; 
                if(en.x <= en.patrolMinX) en.facing = 'right'; 
            } else {
                en.x += en.speed; 
                if(en.x >= en.patrolMaxX) en.facing = 'left'; 
            }
            if(dist < 100) en.state = 'chase';
        }
        else if(en.state === 'chase') { 
            const minDist = 30; 
            if(dist > minDist) { 
                if(alvo.x < en.x) { en.x -= en.speed * 1.2; en.facing = 'left'; } 
                else { en.x += en.speed * 1.2; en.facing = 'right'; }
            }
            // Ataque
            if(dist <= en.attackRange && en.attackCooldown <= 0) { 
                en.state = 'attacking'; 
                en.currentFrame = 0; 
                en.frameTimer = 0;
            } 
            // Desiste de perseguir se for muito longe
            if(dist > 300) en.state = 'patrol'; 
        }        
        else if(en.state === 'attacking') {
            const attackFrame = 2; 
            en.frameTimer++;
            if(en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0;
                en.currentFrame++;
                
if(en.currentFrame === attackFrame && dist <= en.attackRange) {
    if (alvo.state !== 'dead') {
        alvo.hp -= en.damage;
        alvo.state = 'hurt';
        alvo.currentFrame = 0;
        alvo.frameTimer = 0;
        
        alvo.x += (alvo.x < en.x) ? -20 : 20;
    }
    en.attackCooldown = 80;
}
                
                if(en.currentFrame >= en.attackFrames) {
                    en.currentFrame = 0;
                    en.state = 'chase';
                }
            }
        }

        // Atualiza animação genérica (apenas se NÃO estiver atacando, morto ou ferido)
        if(en.attackCooldown > 0) en.attackCooldown--;

        if(en.state !== 'attacking' && en.state !== 'dead' && en.state !== 'hurt') {
            en.frameTimer++;
            if(en.frameTimer >= en.frameInterval) {
                let totalF = (en.state === 'patrol' || en.state === 'chase') ? en.walkFrames : en.idleFrames;
                en.currentFrame = (en.currentFrame + 1) % totalF;
                en.frameTimer = 0;
            }
        }
    }); // <--- Fim do forEach dos inimigos

    // PLAYER DIALOG
    playerDialogTriggers.forEach(trigger=>{
        if(!trigger.used && player.x>trigger.x){ playerSay(trigger.text,180); trigger.used=true;}
    });

if ((player.x > 6400 || player2.x > 6400) && !boss) {
    boss = {
        type: 'Boss',
        x: 6700,
        y: 200, 
        width: 100, height: 100,
        hp: 15, maxHp: 15,
        speed: 2,
        state: 'idle',
        facing: 'left',
        damage: 1,
        attackRange: 60,
        attackCooldown: 0,
        currentFrame: 0,
        frameTimer: 0,
        frameInterval: 8,fala: "",
        falaTimer: 0,

        idleFrames: 5, walkFrames: 8, attackFrames: 6, hurtFrames: 2, deadFrames: 5,
        
        // Imagens (Generalizado: você só precisa garantir que as pastas existam)
        imgIdle: new Image(), imgWalk: new Image(), imgAttack: new Image(), 
        imgHurt: new Image(), imgDead: new Image()
    };
    
    // Carregamento automático das imagens (ajuste a pasta conforme seu assets)
    const folder = '../Assets/Enchantress'; 
    boss.imgIdle.src = `${folder}/Idle.png`;
    boss.imgWalk.src = `${folder}/Walk.png`;
    boss.imgAttack.src = `${folder}/Attack_1.png`;
    boss.imgHurt.src = `${folder}/Hurt.png`;
    boss.imgDead.src = `${folder}/Dead.png`;
}

// Se o Boss existir, rodar a lógica dele
if (boss) {
    updateBossLogic(); 
}
}

function aplicarFisicaCompleta(p, k) {
    if (p.state === 'dead') return;

    // MOVIMENTO HORIZONTAL
if (p.state !== 'attacking') {
        if (k.left || k.right) {
            p.runTimer++;

            if (p.runTimer > p.runThreshold && p.onGround) {
                p.isRunning = true;
                p.speed = 5;
            } else {
                p.isRunning = false;
                p.speed = 3;
            }

            p.velX = k.left ? -p.speed : p.speed;
        } else {
            // Reseta se soltar as teclas ou parar
            p.runTimer = 0;
            p.isRunning = false;
            p.speed = 3;
            p.velX *= 0.7;
        }
    } else {
        p.velX = 0;
    }

    p.x += p.velX;

    // LIMITES DO MAPA
    if (p.x < 0) p.x = 0;
    if (p.x + p.width > mapWidth) p.x = mapWidth - p.width;

    // ===== FÍSICA VERTICAL =====
    p.onGround = false;
    p.velY += gravity;
    if (p.velY > 20) p.velY = 20;
    p.y += p.velY;

    // COLISÃO COM PLATAFORMAS
    platforms.forEach(pl => {
        if (pl.type === 'sloped') return;

        const bottom = p.y + p.height;
        const prevBottom = bottom - p.velY;

        const overlapX =
            p.x + p.width > pl.x &&
            p.x < pl.x + pl.w;

        if (overlapX && prevBottom <= pl.y && bottom >= pl.y) {
            p.y = pl.y - p.height;
            p.velY = 0;
            p.onGround = true;
        }
    });
}

function obterAlvoMaisProximo(en) {
    let alvos = [];

    if (player.hp > 0 && player.state !== 'dead') {
        alvos.push(player);
    }

    if (player2.active && player2.hp > 0 && player2.state !== 'dead') {
        alvos.push(player2);
    }

    if (alvos.length === 0) return null;

    return alvos.reduce((a, b) => {
        return Math.abs(a.x - en.x) < Math.abs(b.x - en.x) ? a : b;
    });
}


function bossDiz(texto, tempo = 120) {
boss.dialogue = texto;
    boss.dialogueTimer = tempo;
}

// --- OUTRAS FUNÇÕES ---
function enemySay(en, type) {
    const list = en.phrases[type];
    en.dialogue = list[Math.floor(Math.random() * list.length)];
    en.dialogueTimer = 120;
}

// --- LÓGICA DO BOSS (ENCHANTRESS) ---
function updateBossLogic() {
    if (!boss) return;

    const alvo = obterAlvoMaisProximo(boss);
    if (!alvo) return;

    const dist = Math.abs(alvo.x - boss.x);


    // 1. ESTADO DE MORTE
    if (boss.state === 'dead') {
        boss.frameTimer++;
        if (boss.frameTimer >= boss.frameInterval) {
            boss.frameTimer = 0;
            if (boss.currentFrame < boss.deadFrames - 1) {
                boss.currentFrame++;
            }
        }
        return; 
    }

    // 2. GRAVIDADE E CHÃO
    boss.velY = (boss.velY || 0) + gravity;
    boss.y += boss.velY;

    // Colisão simples com o chão para o Boss
    if (boss.y + boss.height > 300) {
        boss.y = 300 - boss.height;
        boss.velY = 0;
    }

    // 3. ANIMAÇÃO E TIMERS
    if (boss.falaTimer > 0) boss.falaTimer--;
    
    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;
        
        let maxFrames = 1;
        if (boss.state === 'idle') maxFrames = boss.idleFrames;
        else if (boss.state === 'walking') maxFrames = boss.walkFrames;
        else if (boss.state === 'attacking') maxFrames = boss.attackFrames;
        else if (boss.state === 'hurt') maxFrames = boss.hurtFrames;

        boss.currentFrame++;

        // VERIFICAÇÃO DE DANO (No frame 3 do ataque)
if (boss.state === 'attacking' && boss.currentFrame === 3) {
    if (dist < boss.attackRange) {
        alvo.hp -= boss.damage || 1;
        alvo.state = 'hurt';
        alvo.currentFrame = 0;

        // Knockback
        alvo.x += (alvo.x < boss.x) ? -40 : 40;
    }
}


        // RESET DE ESTADOS
        if (boss.currentFrame >= maxFrames) {
            boss.currentFrame = 0;
            if (boss.state === 'hurt' || boss.state === 'attacking') {
                boss.state = 'idle';
                if (boss.state === 'attacking') boss.attackCooldown = 100;
            }
        }
    }

    // 4. GATILHOS DE FALA
    if (dist < 400 && !boss.viuPlayer) {
        bossDiz("Não venha! O desequilíbrio...");
        boss.viuPlayer = true;
    }

    // 5. IA DE MOVIMENTO
    if (boss.state !== 'hurt' && boss.state !== 'attacking') {
        boss.facing = (player.x < boss.x) ? 'left' : 'right';

        if (dist > (boss.attackRange || 80)) {
            boss.state = 'walking';
            boss.x += (player.x < boss.x) ? -boss.speed : boss.speed;
        } else {
            if ((boss.attackCooldown || 0) <= 0) {
                boss.state = 'attacking';
                boss.currentFrame = 0;
                if (Math.random() < 0.3) bossDiz("Eu não consigo me controlar!");
            } else {
                boss.state = 'idle';
            }
        }
    }

    if (boss.attackCooldown > 0) boss.attackCooldown--;
}

function draw() {
    // 1. PRIMEIRO: Limpamos a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    // 2. DEPOIS: Desenhamos o mundo (Câmera)
    ctx.save();
    ctx.setTransform(
        zoom, 0, 0, zoom,
        -Math.floor(cameraX * zoom),
        -Math.floor(cameraY * zoom)
    );

    // Background
    backgroundObjects.forEach(d => {
        if (d.img.complete) ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
    });

    // Plataformas
    platforms.forEach(p => {
        ctx.save();
        if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
        if (p.type === 'stretch') {
            ctx.drawImage(platformImg, p.x, p.y, p.w, p.h);
        } else if (p.type === 'pattern') {
            if (platformPattern) {
                ctx.translate(p.x, p.y);
                ctx.fillStyle = platformPattern;
                ctx.fillRect(0, 0, p.w, p.h);
            }
        } else if (p.type === 'sloped') {
            ctx.fillStyle = "brown";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.w, p.y + p.w * p.slope);
            ctx.lineTo(p.x + p.w, p.y + p.w * p.slope + p.h);
            ctx.lineTo(p.x, p.y + p.h);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    });

    // --- ENTIDADES (Inimigos, Players e Boss) ---
    // Inserimos o Player 2 no array de desenho se ele estiver ativo
    const allEntities = [...enemies, player];
    if (player2 && player2.active) allEntities.push(player2); 
    if (boss) allEntities.push(boss);

    allEntities.forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;
        if (obj.state === 'walking' || obj.state === 'walk') { img = obj.imgWalk; totalF = obj.walkFrames; }
        else if (obj.state === 'running') { img = obj.imgRun; totalF = obj.runFrames; }
        else if (obj.state === 'attacking') { img = obj.imgAttack; totalF = obj.attackFrames; }
        else if (obj.state === 'jumping' || obj.state === 'jump') { img = obj.imgJump; totalF = obj.jumpFrames; }
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

            // Balão de fala das entidades
            if (obj.state !== 'dead' && obj.dialogue && obj.dialogueTimer > 0) {
                ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
                let textWidth = ctx.measureText(obj.dialogue).width;
                ctx.fillStyle = "white"; ctx.fillRect(obj.x + obj.width / 2 - textWidth / 2 - 5, obj.y - 35, textWidth + 10, 20);
                ctx.strokeStyle = "black"; ctx.strokeRect(obj.x + obj.width / 2 - textWidth / 2 - 5, obj.y - 35, textWidth + 10, 20);
                ctx.fillStyle = "black"; ctx.fillText(obj.dialogue, obj.x + obj.width / 2, obj.y - 20);
            }
        }
    });

    // NPCs
    npcs.forEach(n => {
        if (!n.imgIdle.complete) return;
        const fw = n.imgIdle.width / n.idleFrames;
        const fh = n.imgIdle.height;
        ctx.drawImage(n.imgIdle, n.currentFrame * fw, 0, fw, fh, n.x, n.y, n.width, n.height);
        if (n.dialogueTimer > 0) {
            const text = n.phrases[n.dialogueIndex];
            ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = "white"; ctx.fillRect(n.x + n.width/2 - textWidth/2 - 5, n.y - 25, textWidth + 10, 20);
            ctx.fillStyle = "black"; ctx.fillText(text, n.x + n.width/2, n.y - 10);
        }
    });

    // Foreground
    foregroundObjects.forEach(d => {
        if (d.img.complete) ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
    });

    ctx.restore(); // Fecha Câmera

    // 3. UI (Fixo na tela)
    if (gameState === 'playing') {
        // Vida Player 1
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);
        ctx.strokeStyle = "white"; ctx.strokeRect(20, 20, 150, 15);

        // VIDA PLAYER 2 (Lado direito)
        if (player2 && player2.active) {
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(canvas.width - 170, 20, 150, 15);
            ctx.fillStyle = "blue"; ctx.fillRect(canvas.width - 170, 20, (player2.hp / player2.maxHp) * 150, 15);
            ctx.strokeStyle = "white"; ctx.strokeRect(canvas.width - 170, 20, 150, 15);
        }

        // Vida Boss
        if (boss && boss.hp > 0) {
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(canvas.width/2 - 200, 40, 400, 20);
            ctx.fillStyle = "purple"; ctx.fillRect(canvas.width/2 - 200, 40, (boss.hp / boss.maxHp) * 400, 20);
            ctx.strokeStyle = "white"; ctx.strokeRect(canvas.width/2 - 200, 40, 400, 20);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
            ctx.fillText("ENCHANTRESS", canvas.width/2, 35);
        }
    }

    // --- 4. TELAS FINAIS ---
    const screen = document.getElementById('game-over-screen');
    const title = screen ? screen.querySelector('h1') : null;
    const subtitle = screen ? screen.querySelector('p') : null;
    const btnReset = document.getElementById('btn-reset');
    const btnNext = document.getElementById('btn-next-chapter');

    if (screen) {
        // Lógica de Derrota: Só morre se ambos estiverem mortos (ou se o P1 morrer sozinho no modo 1P)
        const p1Morto = (player.hp <= 0 || player.state === 'dead');
        const p2Morto = (!player2.active || player2.hp <= 0 || player2.state === 'dead');

        if (p1Morto && p2Morto) {
            screen.style.display = 'flex';
            screen.style.backgroundColor = "rgba(139, 0, 0, 0.8)"; 
            if (title) title.innerText = "VOCÊS CAÍRAM...";
            if (subtitle) subtitle.innerText = "Tente novamente para prosseguir";
            if (btnReset) btnReset.style.display = 'block';
            if (btnNext) btnNext.style.display = 'none';
        } 
        // CASO B: VITÓRIA (Boss morreu)
        else if (boss && boss.state === 'dead' && boss.hp <= 0) {
            if (screen.style.display !== 'flex') {
                screen.style.display = 'flex';
                screen.style.backgroundColor = "rgba(0, 0, 0, 0.8)"; 
                if (title) title.innerHTML = "Você derrubou <br> Enchantress";
                if (subtitle) subtitle.innerHTML = "Mas o desequilíbrio permanece... <br>Algo pior espreita nas sombras.";
                if (btnReset) btnReset.style.display = 'none';
                if (btnNext) btnNext.style.display = 'block';
            }
        }
    }

    // Balão de fala do Boss (mantendo sua lógica original)
    if (boss && boss.falaTimer > 0) {
        ctx.save();
        ctx.font = "italic bold 16px 'Segoe UI', Arial";
        let textWidth = ctx.measureText(boss.fala).width;
        let bx = boss.x - cameraX + (boss.width / 2) - (textWidth / 2);
        let by = boss.y - 30;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(bx - 10, by - 20, textWidth + 20, 30);
        ctx.fillStyle = "#dfa9ff"; 
        ctx.fillText(boss.fala, bx, by);
        ctx.restore();
    }
}

function todosPlayersMortos() {
    let mortos = 0;
    let ativos = 1; // Player 1 sempre existe

    if (player.hp <= 0 || player.state === 'dead') mortos++;

    if (player2.active) {
        ativos++;
        if (player2.hp <= 0 || player2.state === 'dead') mortos++;
    }

    return mortos === ativos;
}

// --- LOOP PRINCIPAL ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop(); // Inicia o loop

// --- FUNÇÃO PARA SALVAR E VOLTAR AO MENU ---
window.irParaMenu = function() {
    localStorage.setItem('capitulo_1_vencido', 'true');
    window.location.href = "../index.html";
};

// --- INPUTS DO TECLADO ---
window.addEventListener('keydown', (e) => {
    const k = e.key; // Usamos e.key para detectar setas corretamente

    // --- CONTROLES PLAYER 1 (WASD + K) ---
    if (k.toLowerCase() === 'a') window.mover(player, keys, 'left', true);
    if (k.toLowerCase() === 'd') window.mover(player, keys, 'right', true);
    if (k.toLowerCase() === 'w') window.pular(player);
    if (k.toLowerCase() === ' ') window.atacar(player);
    
    // --- CONTROLES PLAYER 2 (SETAS + L) ---
    if (player2.active) {
        if (k === 'ArrowLeft')  window.mover(player2, keysP2, 'left', true);
        if (k === 'ArrowRight') window.mover(player2, keysP2, 'right', true);
        if (k === 'ArrowUp')    window.pular(player2);
        if (k === 'l' || k === 'L') window.atacar(player2);
    }

    // Tecla R (Reiniciar)
    if (k.toLowerCase() === 'r') {
        const p1Morto = player.hp <= 0;
        const p2Morto = !player2.active || player2.hp <= 0;
        if (boss && boss.state === 'dead') window.irParaMenu();
        else if (p1Morto && p2Morto) window.resetGame();
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key;
    // P1
    if (k.toLowerCase() === 'a') window.mover(player, keys, 'left', false);
    if (k.toLowerCase() === 'd') window.mover(player, keys, 'right', false);
    // P2
    if (k === 'ArrowLeft')  window.mover(player2, keysP2, 'left', false);
    if (k === 'ArrowRight') window.mover(player2, keysP2, 'right', false);
});

// --- LÓGICA DOS BOTÕES DA TELA FINAL ---
document.addEventListener('DOMContentLoaded', () => {
    const btnReset = document.getElementById('btn-reset');
    const btnNext = document.getElementById('btn-next-chapter');
    if (btnReset) {
        btnReset.onclick = () => window.resetGame();
    }
    if (btnNext) {
        btnNext.onclick = () => window.irParaMenu();
    }

});
