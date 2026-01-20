const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('../Assets/Sounds/363467__deleted_user_6109353__roman-marching-music-loop-with-happy-harp.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.preload = "auto";

const gravity = 0.8;
const zoom = 1.6;
const mapWidth = 7000;
const mapHeight = 2000;
let cameraX = 0;
let cameraY = 0;
let gameState = 'loading';
let isPaused = false;
let isMuted = false;
let boss = null;
const BOSS_Y_TOLERANCE = 120;

// Flechas globais
window.arrows = [];
window.arrowImg = new Image();
window.arrowImg.src = '../Assets/Archer/Arrow.png';

function criarPlayer(xInicial) {
    return {
        x: xInicial, y: 900, width: 100, height: 100,
        velX: 0, velY: 0, speed: 3, jumpForce: -15,
        facing: 'right', onGround: false, state: 'idle',
        hp: 4, maxHp: 4, canAirAttack: true,
        faction: 'player',

        currentFrame: 0,
        frameTimer: 0,
        frameInterval: 6,

        dialogue: "",
        dialogueTimer: 0,

        holdLeft: 0, holdRight: 0,
        runThreshold: 180, runningSpeedMultiplier: 1.8,

        attackCooldown: 0, attackCooldownMax: 25,

        imgIdle: new Image(), imgWalk: new Image(), imgRun: new Image(),
        imgJump: new Image(), imgAttack: new Image(),
        imgHurt: new Image(), imgDead: new Image(),

        active: true
    };
}

const player = criarPlayer(120);
let keys = { left: false, right: false };

const player2 = criarPlayer(160);
player2.active = false;
let keysP2 = { left: false, right: false };

// --- HELPERS ---
function obterPlayersAtivos() {
    const lista = [];
    if (player.state !== 'dead') lista.push(player);
    if (player2.active && player2.state !== 'dead') lista.push(player2);
    return lista;
}

function obterAlvoMaisProximo(origem) {
    let alvo = null;
    let menorDist = Infinity;

    obterPlayersAtivos().forEach(p => {
        const dx = p.x - origem.x;
        const dy = p.y - origem.y;
        const dist = Math.hypot(dx, dy);

        if (dist < menorDist) {
            menorDist = dist;
            alvo = p;
        }
    });
    return alvo;
}

function isEnemy(a, b) {
    if (!a || !b) return false;
    return a.faction !== b.faction;
}

// --- INICIALIZAÇÃO AUTOMÁTICA ---
window.onload = function() {
    const numJogadores = parseInt(localStorage.getItem('jogadores_total')) || 1;
    const escolhaP1 = localStorage.getItem('heroi_da_jornada') || 'loiro';
    const escolhaP2 = (escolhaP1 === 'loiro') ? 'castanha' : 'loiro';

    // 1. Configura o Player 1
    configurarPlayer(player, escolhaP1);

    // 2. Configura o Player 2
    if (numJogadores === 2) {
        player2.active = true;
        configurarPlayer(player2, escolhaP2);
        player2.state = 'idle';
        player2.facing = 'right';
    }

    // 3. Inicia assets e jogo
    player.imgIdle.onload = () => {
        gameState = 'playing';
        initEnemies();
        initPotions();
        if (!isMuted) bgMusic.play().catch(() => {});
    };

    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'flex';
};

function configurarPlayer(p, escolha) {
    const tipo = (escolha === 'castanha') ? 'Knight' : 'Swordsman';

    if (tipo === 'Knight') {
        p.idleFrames = 6; p.walkFrames = 8; p.runFrames = 7; p.jumpFrames = 6;
        p.attackFrames = 5; p.hurtFrames = 3; p.deadFrames = 4;
        p.imgIdle.src = '../Assets/Knight/Idle.png';
        p.imgWalk.src = '../Assets/Knight/Walk.png';
        p.imgRun.src = '../Assets/Knight/Run.png';
        p.imgJump.src = '../Assets/Knight/Jump.png';
        p.imgAttack.src = '../Assets/Knight/Attack_1.png';
        p.imgHurt.src = '../Assets/Knight/Hurt.png';
        p.imgDead.src = '../Assets/Knight/Dead.png';
    } else {
        p.idleFrames = 8; p.walkFrames = 8; p.runFrames = 8; p.jumpFrames = 8;
        p.attackFrames = 6; p.hurtFrames = 3; p.deadFrames = 3;
        p.imgIdle.src = '../Assets/Swordsman/Idle.png';
        p.imgWalk.src = '../Assets/Swordsman/Walk.png';
        p.imgRun.src = '../Assets/Swordsman/Run.png'
        p.imgJump.src = '../Assets/Swordsman/Jump.png';
        p.imgAttack.src = '../Assets/Swordsman/Attack_1.png';
        p.imgHurt.src = '../Assets/Swordsman/Hurt.png';
        p.imgDead.src = '../Assets/Swordsman/Dead.png';
    }
    p.currentFrame = 0;
    p.frameTimer = 0;
}

// --- FÍSICA E MOVIMENTO ---
function aplicarFisicaCompleta(p, k) {
    if (p.state === 'dead') return;

    // 1. INPUT E VELOCIDADE X
    if (p.state !== 'attacking') {
        // Lógica de corrida
        if (k.left) p.holdLeft++; else p.holdLeft = 0;
        if (k.right) p.holdRight++; else p.holdRight = 0;

        let currentSpeed = p.speed;
        let running = (p.holdLeft > p.runThreshold || p.holdRight > p.runThreshold);
        if (running) currentSpeed *= p.runningSpeedMultiplier;

        if (k.left) {
            p.velX = -currentSpeed;
            p.state = p.onGround ? (running ? 'running' : 'walking') : 'jumping';
        } else if (k.right) {
            p.velX = currentSpeed;
            p.state = p.onGround ? (running ? 'running' : 'walking') : 'jumping';
        } else {
            p.velX *= 0.7; // Atrito
            if (Math.abs(p.velX) < 0.1) p.velX = 0;
            if (p.onGround) p.state = 'idle';
        }
    } else {
        p.velX = 0;
    }

    // 2. APLICAR MOVIMENTO X E CHECAR COLISÃO (PAREDES)
    p.x += p.velX;

    // Limites do Mapa
    if (p.x < 0) p.x = 0;
    if (p.x + p.width > mapWidth) p.x = mapWidth - p.width;

    // Colisão Horizontal com Plataformas
    platforms.forEach(pl => {
        if (pl.type === 'sloped') return; // Ignora rampas na colisão lateral

        if (checkRectOverlap(p, pl)) {
            if (p.velX > 0) { // Indo para direita -> Colide com esquerda da plataforma
                p.x = pl.x - p.width;
            } else if (p.velX < 0) { // Indo para esquerda -> Colide com direita da plataforma
                p.x = pl.x + pl.w;
            }
            p.velX = 0;
        }
    });

    // 3. APLICAR MOVIMENTO Y E CHECAR COLISÃO (CHÃO E TETO)
    p.onGround = false;
    p.velY += gravity;
    if (p.velY > 20) p.velY = 20;
    p.y += p.velY;

    platforms.forEach(pl => {
        // Lógica de Rampa (Mantida)
        if (pl.type === 'sloped') {
             let relativeX = (p.x + p.width / 2) - pl.x;
             if (relativeX >= 0 && relativeX <= pl.w) {
                 let slopeY = pl.y - (relativeX * (pl.slope || 0));
                 // Margem de tolerância para "grudar" na rampa
                 if (p.y + p.height >= slopeY && p.y + p.height - p.velY <= slopeY + 25) {
                     p.y = slopeY - p.height;
                     p.velY = 0;
                     p.onGround = true;
                 }
             }
             return;
        }

        // Colisão Vertical Sólida (Box)
        if (checkRectOverlap(p, pl)) {
            if (p.velY > 0) { 
                // Caindo -> Colide com o topo (Chão)
                p.y = pl.y - p.height;
                p.onGround = true;
                p.velY = 0;
            } else if (p.velY < 0) { 
                // Subindo -> Colide com o fundo (Teto)
                p.y = pl.y + pl.h;
                p.velY = 0;
            }
        }
    });

    // Animação de Pulo
    if (!p.onGround && p.state !== 'attacking' && p.state !== 'hurt') {
        p.state = 'jumping';
    }
}

// Função auxiliar simples para verificar sobreposição retangular
function checkRectOverlap(player, platform) {
    return (
        player.x < platform.x + platform.w &&
        player.x + player.width > platform.x &&
        player.y < platform.y + platform.h &&
        player.y + player.height > platform.y
    );
}

function atualizarAnimacaoPlayer(p) {
    p.frameTimer++;
    if (p.frameTimer >= p.frameInterval) {
        p.frameTimer = 0;

        // Ataque
        if (p.state === 'attacking') {
            p.currentFrame++;
            if (p.currentFrame >= p.attackFrames) {
                p.currentFrame = 0;
                p.state = p.onGround ? 'idle' : 'jumping';
            }
            return;
        }

        // Morte
        if (p.state === 'dead') {
            if (p.currentFrame < p.deadFrames - 1) p.currentFrame++;
            return;
        }

        // Hurt
        if (p.state === 'hurt') {
            p.currentFrame++;
            if(p.currentFrame >= p.hurtFrames) {
                p.state = 'idle';
                p.currentFrame = 0;
            }
            return;
        }

        // Ciclos Normais
        let maxFrames = p.idleFrames;
        if (p.state === 'walking') maxFrames = p.walkFrames;
        if (p.state === 'running') maxFrames = p.runFrames;
        if (p.state === 'jumping') maxFrames = p.jumpFrames;

        p.currentFrame = (p.currentFrame + 1) % maxFrames;
    }
}

function todosPlayersMortos() {
    let mortos = 0;
    let ativos = 1;
    if (player.hp <= 0 || player.state === 'dead') mortos++;
    if (player2.active) {
        ativos++;
        if (player2.hp <= 0 || player2.state === 'dead') mortos++;
    }
    return mortos === ativos;
}

// --- ITENS E OBJETOS ---
let potions = [];

function initPotions() {
    potions = [
        { x: 930, y: 1870, width: 32, height: 32, active: true },
    ];
}

const potionImg = new Image();
potionImg.src = '../Assets/Battleground/Potions/LifePotionSmall.png';

// --- INIMIGOS E BOSS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Warrior_1', x: 2800, y: 1850, hp: 4, maxHP: 4, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 6, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Warrior_1', x: 2700, y: 1850, hp: 4, maxHP: 4, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 6, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Warrior_2', x: 2900, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 3100, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 3050, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 4000, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 3900, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 3950, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 5600, y: 1850, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 5500, y: 1850, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.3, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
    ];

    boss = {
        type: 'Archer',
        x: 6300, y: 1850, velY: 0, width: 100, height: 100,
        hp: 5, maxHp: 5, speed: 1.5,
        attackRange: 500, state: 'idle', facing: 'left',
        viuPlayer: false, dialogue: "", dialogueTimer: 0,
        currentFrame: 0, frameTimer: 0, frameInterval: 6,
        idleFrames: 6, walkFrames: 8, attackFrames: 14,
        hurtFrames: 3, deadFrames: 3,
        phrases: ["EU DERROTEI O REI ANÃO! HAHAHA", "VOCÊ SERÁ O PRÓXIMO!", "MUAHAHAHA"],
        dialogueIndex: 0,
        imgIdle: new Image(), imgWalk: new Image(), imgAttack: new Image(),
        imgHurt: new Image(), imgDead: new Image(),
        canShoot: true
    };

    boss.imgIdle.src = '../Assets/Archer/Idle.png';
    boss.imgWalk.src = '../Assets/Archer/Walk.png';
    boss.imgAttack.src = '../Assets/Archer/Shot_1.png';
    boss.imgHurt.src = '../Assets/Archer/Hurt.png';
    boss.imgDead.src = '../Assets/Archer/Dead.png';

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `../Assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `../Assets/${en.type}/Walk.png`;
        en.imgRun = new Image(); en.imgRun.src = `../Assets/${en.type}/Run.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `../Assets/${en.type}/Attack_1.png`;
        en.imgProtect = new Image(); en.imgProtect.src = `../Assets/${en.type}/Protect.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `../Assets/${en.type}/Hurt.png`;
        en.imgDead = new Image(); en.imgDead.src = `../Assets/${en.type}/Dead.png`;
        
        en.currentFrame = 0; en.frameTimer = 0;
        if (en.frameInterval === undefined) en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left'; en.attackCooldown = 1;
        en.velY = 0; en.onGround = false;
    });
}

// --- PLATAFORMAS (Recortado para brevidade, mantendo estrutura) ---
const platforms = [
    { x: 0, y: 1000, w: 2000, h: 100, type: 'pattern' },
    { x: 2000, y: 1050, w: 200, h: 600, type: 'pattern' },
    { x: 2150, y: 1150, w: 3000, h: 100, type: 'pattern' },
    { x: 5150, y: 550, w: 200, h: 700, type: 'pattern' },
    { x: 5000, y: 1050, w: 150, h: 25, type: 'pattern' },
    { x: 4750, y: 950, w: 150, h: 25, type: 'pattern' },
    { x: 2250, y: 850, w: 2500, h: 100, type: 'pattern' },
    { x: 2150, y: 0, w: 200, h: 950, type: 'pattern' },
    { x: 2350, y: 750, w: 150, h: 25, type: 'pattern' },
    { x: 2600, y: 650, w: 150, h: 25, type: 'pattern' },
    { x: 2750, y: 550, w: 2500, h: 100, type: 'pattern' },
    { x: 5700, y: 0, w: 200, h: 1600, type: 'pattern' },
    { x: 5350, y: 650, w: 100, h: 25, type: 'pattern' },
    { x: 5400, y: 750, w: 100, h: 25, type: 'pattern' },
    { x: 5600, y: 850, w: 100, h: 25, type: 'pattern' },
    { x: 5550, y: 950, w: 100, h: 25, type: 'pattern' },
    { x: 5350, y: 1050, w: 100, h: 25, type: 'pattern' },
    { x: 5400, y: 1150, w: 100, h: 25, type: 'pattern' },
    { x: 5600, y: 1250, w: 100, h: 25, type: 'pattern' },
    { x: 5550, y: 1350, w: 100, h: 25, type: 'pattern' },
    { x: 5450, y: 1450, w: 100, h: 25, type: 'pattern' },
    { x: 2750, y: 1550, w: 3000, h: 100, type: 'pattern' },
    { x: 2600, y: 1650, w: 100, h: 25, type: 'pattern' },
    { x: 2500, y: 1750, w: 100, h: 25, type: 'pattern' },
    { x: 2300, y: 1850, w: 100, h: 100, type: 'pattern' },
    { x: 0, y: 1950, w: 7000, h: 100, type: 'pattern' },
    { x: 6000, y: 1825, w: 50, h: 10, type: 'pattern' },
    { x: 6300, y: 1825, w: 50, h: 10, type: 'pattern' },
];

// --- CARREGAMENTO DE CENÁRIO (Imagens) ---
// Para economizar espaço, mantive os nomes e arrays originais
const fundoImg = new Image(); fundoImg.src = '../Assets/Battleground/fundo3.png';
const platformImg = new Image(); platformImg.src = '../Assets/Battleground/Platformer/Ground_1.png';
const tree4Img = new Image(); tree4Img.src = '../Assets/Battleground/Trees/winter_conifer_tree_4.png';
const tree5Img = new Image(); tree5Img.src = '../Assets/Battleground/Trees/winter_conifer_tree_5.png';
const tree7Img = new Image(); tree7Img.src = '../Assets/Battleground/Trees/winter_conifer_tree_7.png';

const cadeiraImg = new Image(); cadeiraImg.src = '../Assets/Battleground/Environment/Chair.png';
const Banner1Img = new Image(); Banner1Img.src = '../Assets/Battleground/Environment/Banner1.png';
const Banner2Img = new Image(); Banner2Img.src = '../Assets/Battleground/Environment/Banner2.png';
const Barrel1Img = new Image(); Barrel1Img.src = '../Assets/Battleground/Environment/Barrel1.png';
const BoardImg = new Image(); BoardImg.src = '../Assets/Battleground/Environment/Board.png';
const Crate1Img = new Image(); Crate1Img.src = '../Assets/Battleground/Environment/Crate1.png';
const CuirassImg = new Image(); CuirassImg.src = '../Assets/Battleground/Environment/Cuirass.png';
const Cuirass1Img = new Image(); Cuirass1Img.src = '../Assets/Battleground/Environment/Cuirass1.png';
const HelmentImg = new Image(); HelmentImg.src = '../Assets/Battleground/Environment/Helment.png';
const Helment1Img = new Image(); Helment1Img.src = '../Assets/Battleground/Environment/Helment1.png';
const mesaImg = new Image(); mesaImg.src = '../Assets/Battleground/Environment/mesa.png';
const SackImg = new Image(); SackImg.src = '../Assets/Battleground/Environment/Sack.png';
const Shield1Img = new Image(); Shield1Img.src = '../Assets/Battleground/Environment/Shield1.png';
const Shield2Img = new Image(); Shield2Img.src = '../Assets/Battleground/Environment/Shield2.png';
const Shield3Img = new Image(); Shield3Img.src = '../Assets/Battleground/Environment/Shield3.png';
const Storage1Img = new Image(); Storage1Img.src = '../Assets/Battleground/Environment/Storage1.png';
const SwordImg = new Image(); SwordImg.src = '../Assets/Battleground/Environment/Sword.png';
const Sword1Img = new Image(); Sword1Img.src = '../Assets/Battleground/Environment/Sword1.png';
const Sword2Img = new Image(); Sword2Img.src = '../Assets/Battleground/Environment/Sword2.png';
const Sword3Img = new Image(); Sword3Img.src = '../Assets/Battleground/Environment/Sword3.png';
const Tool_BoardImg = new Image(); Tool_BoardImg.src = '../Assets/Battleground/Environment/Tool_Board.png';
const Weapon1Img = new Image(); Weapon1Img.src = '../Assets/Battleground/Environment/Weapon1.png';
const Wooden_BarrelImg = new Image(); Wooden_BarrelImg.src = '../Assets/Battleground/Environment/Wooden_Barrel.png';
const Wooden_CrateImg = new Image(); Wooden_CrateImg.src = '../Assets/Battleground/Environment/Wooden_Crate.png';

const DeadWarrior_2Img = new Image(); DeadWarrior_2Img.src = '../Assets/Battleground/Environment/DeadWarrior_2.png';
const DeadWarrior_3Img = new Image(); DeadWarrior_3Img.src = '../Assets/Battleground/Environment/DeadWarrior_3.png';

const crystal_orange1Img = new Image(); crystal_orange1Img.src = '../Assets/Battleground/Crystals/crystal_orange1.png';
const crystal_orange2Img = new Image(); crystal_orange2Img.src = '../Assets/Battleground/Crystals/crystal_orange2.png';
const crystal_orange3Img = new Image(); crystal_orange3Img.src = '../Assets/Battleground/Crystals/crystal_orange3.png';
const crystal_orange4Img = new Image(); crystal_orange4Img.src = '../Assets/Battleground/Crystals/crystal_orange4.png';
const crystal_orange5Img = new Image(); crystal_orange5Img.src = '../Assets/Battleground/Crystals/crystal_orange5.png';

let platformPattern = null;

platformImg.onload = () => { platformPattern = ctx.createPattern(platformImg, 'repeat'); };

// Lista resumida de objetos de fundo (Background)
const backgroundObjects = [
    { x: 0, y: 0, width: 7000, height: 2000, img: fundoImg },
    { x: 0, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 100, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 200, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 300, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 425, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 550, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 675, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 800, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 900, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 1025, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 1100, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 1200, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 1275, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 1350, y: 800, width: 150, height: 200, img: tree5Img },

    { x: 2500, y: 1050, width: 100, height: 100, img: BoardImg },
    { x: 2600, y: 1100, width: 50, height: 50, img: Barrel1Img },
    { x: 2750, y: 1105, width: 50, height: 50, img: Crate1Img },
    { x: 3300, y: 1100, width: 50, height: 50, img: SackImg },
    { x: 3600, y: 1050, width: 50, height: 50, img: Shield2Img },
    { x: 4000, y: 1125, width: 25, height: 25, img: cadeiraImg },
    { x: 4025, y: 1125, width: 75, height: 25, img: mesaImg },
    { x: 4100, y: 1125, width: 25, height: 25, img: cadeiraImg },
    { x: 4500, y: 1100, width: 50, height: 50, img: Sword1Img },
    { x: 4600, y: 1100, width: 50, height: 50, img: Sword2Img },

    { x: 4000, y: 825, width: 25, height: 25, img: cadeiraImg },
    { x: 4025, y: 825, width: 75, height: 25, img: mesaImg },
    { x: 4100, y: 825, width: 25, height: 25, img: cadeiraImg },
    { x: 4050, y: 810, width: 25, height: 25, img: HelmentImg },

    { x: 3300, y: 800, width: 50, height: 50, img: Barrel1Img },
    { x: 3600, y: 805, width: 50, height: 50, img: Crate1Img },
    { x: 4200, y: 750, width: 100, height: 100, img: Storage1Img },

    { x: 3800, y: 1450, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 3900, y: 1450, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 4000, y: 1450, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 4100, y: 1452, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 4150, y: 1452, width: 100, height: 100, img: DeadWarrior_3Img },

    { x: 3750, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 3950, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 4050, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 4150, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },

    { x: 3050, y: 400, width: 50, height: 50, img: Shield3Img },

    { x: 3090, y: 430, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 3100, y: 525, width: 75, height: 25, img: mesaImg },
    { x: 3190, y: 430, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 3200, y: 525, width: 75, height: 25, img: mesaImg },

    { x: 3300, y: 500, width: 50, height: 50, img: Wooden_BarrelImg },
    { x: 3350, y: 500, width: 50, height: 50, img: Wooden_CrateImg },

    { x: 1900, y: 1800, width: 50, height: 50, img: Shield3Img },

    { x: 490, y: 1830, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 500, y: 1925, width: 75, height: 25, img: mesaImg },
    { x: 690, y: 1830, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 700, y: 1925, width: 75, height: 25, img: mesaImg },

    { x: 850, y: 1900, width: 50, height: 50, img: Wooden_BarrelImg },
    { x: 925, y: 1900, width: 50, height: 50, img: Wooden_CrateImg },

    { x: 3000, y: 1850, width: 100, height: 100, img: Tool_BoardImg },

    { x: 3000, y: 1450, width: 100, height: 100, img: crystal_orange1Img },
    { x: 3500, y: 1450, width: 100, height: 100, img: crystal_orange2Img },
    { x: 3600, y: 1450, width: 100, height: 100, img: crystal_orange3Img },
];

const foregroundObjects = [

    { x: -25, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 25, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 250, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 350, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 475, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 600, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 700, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 850, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 950, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 1075, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 1150, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 1250, y: 800, width: 150, height: 200, img: tree5Img },
    { x: 1325, y: 800, width: 150, height: 200, img: tree4Img },
    { x: 1400, y: 800, width: 150, height: 200, img: tree5Img },

    { x: 4200, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 4250, y: 1450, width: 100, height: 100, img: DeadWarrior_3Img },

    { x: 590, y: 1830, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 600, y: 1925, width: 75, height: 25, img: mesaImg },

    { x: 3500, y: 1500, width: 50, height: 50, img: crystal_orange4Img },
    { x: 3100, y: 1525, width: 25, height: 25, img: crystal_orange5Img },
    { x: 3120, y: 1525, width: 25, height: 25, img: crystal_orange5Img },
];

// --- NPCs ---
const Warrior_3Npc = {
    x: 1900, y: 900, width: 100, height: 100, imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [
"Alto lá!",
"Está ocorrendo uma guerra",
],
    dialogueIndex: 0, dialogueTimer: 0,  lastDialogueIndex: -1,
};

Warrior_3Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const Warrior_3_1Npc = {
    x: 3900, y: 1050, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    velY: 0, onGround: false, facing: 'right',phrases: [ ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_1Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const Warrior_3_2Npc = {
    x: 4000, y: 1050, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "O clã Vermelho está dizendo que foi a gente" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_2Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const Warrior_3_3Npc = {
    x: 3700, y: 750, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'right',
    phrases: [ "Um anão não derrubaria o rei..." ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_3Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';


const Warrior_3_4Npc = {
    x: 4500, y: 450, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "Lá em baixo está um caos" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_4Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const Warrior_3_5Npc = {
    x: 4000, y: 450, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_5Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const Warrior_3_6Npc = {
    x: 4050, y: 450, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "Se preparem para luta" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_6Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const Warrior_3_7Npc = {
    x: 4100, y: 450, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'right',
    phrases: [ "" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_7Npc.imgIdle.src = '../Assets/Warrior_3/Idle.png';

const npcs = [Warrior_3Npc, Warrior_3_1Npc, Warrior_3_2Npc, Warrior_3_3Npc,  Warrior_3_4Npc, Warrior_3_5Npc, Warrior_3_6Npc, Warrior_3_7Npc];


// --- FUNÇÕES DE UPDATE GERAIS ---
function updateNPCs() {
    npcs.forEach(n => {
        const alvo = obterAlvoMaisProximo(n);
        if (!alvo) return;

        const distance = Math.hypot(alvo.x - n.x, alvo.y - n.y);
        
        if (distance < (n.range || 200)) {
            // Lógica simples de diálogo
            if (n.dialogueTimer <= 0) {
                 n.dialogue = n.phrases[0] || "";
                 n.dialogueTimer = 120;
            }
        }
        if (n.dialogueTimer > 0) n.dialogueTimer--;
    });
}

function updatePotions() {
    for (let i = potions.length - 1; i >= 0; i--) {
        const pot = potions[i];
        if (!pot.active) continue;

        // Verifica todos os players ativos
        obterPlayersAtivos().forEach(pl => {
            if (
                pl.x < pot.x + pot.width &&
                pl.x + pl.width > pot.x &&
                pl.y < pot.y + pot.height &&
                pl.y + pl.height > pot.y
            ) {
                if (pl.hp < pl.maxHp) {
                    pl.hp++;
                    pot.active = false;
                    window.playerSay("HP +1", 60, pl);
                } else {
                    window.playerSay("Vida Cheia", 30, pl);
                }
            }
        });
    }
}

// --- FUNÇÃO GLOBAL DE FALA ---
window.playerSay = function(text, duration = 120, alvo = player) {
    alvo.dialogue = text;
    alvo.dialogueTimer = duration;
};

// --- CONTROLES DE ESTADO DO JOGO ---
window.togglePause = function() { 
    if (gameState !== 'playing') return; 
    isPaused = !isPaused; 
    if (isPaused) bgMusic.pause(); 
    else if (!isMuted) bgMusic.play().catch(() => {}); 
};

window.resetGame = function () {
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.style.display = 'none';

    player.hp = player.maxHp;
    player.x = 120; player.y = 100;
    player.state = 'idle'; player.velX = 0; player.velY = 0;
    
    if (player2.active) {
        player2.hp = player2.maxHp;
        player2.x = 160; player2.y = 100;
        player2.state = 'idle';
    }

    cameraX = 0;
    isPaused = false;

    gameState = 'playing';
    initEnemies();
    initPotions();
};

window.concluirCapituloEVoutar = function() {
    localStorage.setItem('capitulo_3_vencido', 'true');
    window.location.href = "cutscene.html";
};

// --- AÇÕES DO PLAYER (Bindings) ---
window.mover = function(p, kObj, dir, estado) {
    if (gameState !== 'playing' || p.state === 'dead' || isPaused) return;
    if (dir === 'left') kObj.left = estado;
    if (dir === 'right') kObj.right = estado;
    if (estado) p.facing = dir;
};

window.pular = function(p) {
    if (gameState === 'playing' && p.onGround && !isPaused && p.state !== 'dead') {
        p.velY = p.jumpForce;
        p.onGround = false;
        p.state = 'jumping';
    }
};

window.atacar = function(p) {
    if (p.state === 'dead' || p.state === 'attacking' || p.attackCooldown > 0 || isPaused) return;
    p.state = 'attacking';
    p.currentFrame = 0;
    p.frameTimer = 0;
    p.attackCooldown = p.attackCooldownMax;
    checkMeleeHit(p);
};

// --- COMBATE ---
function checkMeleeHit(p) {
    const alcance = p.width * 0.1;
    const hitboxX = p.facing === 'right' ? p.x + p.width * 0.7 : p.x - alcance + p.width * 0.3;

    // Inimigos
    enemies.forEach(en => {
        if (en.state === 'dead') return;
        if (hitboxX < en.x + en.width && hitboxX + alcance > en.x &&
            p.y < en.y + en.height && p.y + p.height > en.y) {
            enemyTakeDamage(en, p);
        }
    });

    // Boss
    if (boss && boss.state !== 'dead') {
        if (hitboxX < boss.x + boss.width && hitboxX + alcance > boss.x &&
            p.y < boss.y + boss.height && p.y + p.height > boss.y) {
            bossTakeDamage(p);
        }
    }
}

function enemyTakeDamage(en, p) {
    if (en.state === 'dead') return;
    
    // Bloqueio do Warrior_2
if (en.state === 'protect') { 
    window.playerSay("Bloqueado!", 40); 
    return; 
}
if (Math.random() < (en.blockChance || 0)) {
    en.state = 'protect';
    en.currentFrame = 0;
    en.frameTimer = 0;
    window.playerSay("Defendeu!", 40); 
    return;
}
    en.hp--;
    en.state = 'hurt';
    en.currentFrame = 0;
    // Knockback
    en.x += (p.x < en.x) ? 25 : -25;
    en.velY = -10;

    if (en.hp <= 0) en.state = 'dead';
}

function bossTakeDamage(p) {
    if (!boss || boss.state === 'dead' || boss.invulnerable) return;

    boss.hp--;
    boss.state = 'hurt';
    boss.currentFrame = 0;

const direcao = (p.x < boss.x) ? 20 : -20;
    boss.x += direcao;
    boss.velY = -5;

    boss.invulnerable = true;
    setTimeout(() => boss.invulnerable = false, 400);

    if (boss.hp <= 0) {
        boss.state = 'dead';
        boss.dialogue = "Não foi isso que planejei...";
        boss.dialogueTimer = 180;
        localStorage.setItem('capitulo_3_vencido', 'true');
    }
}

// --- LÓGICA DO BOSS ---
function updateBossLogic() {
    if (!boss) return;

    // Física Simples (Gravidade)
    boss.velY = (boss.velY || 0) + 0.8;
    boss.y += boss.velY;
    let groundLevel = 1950; 
    if (boss.y + boss.height > groundLevel) { 
        boss.y = groundLevel - boss.height;
        boss.velY = 0;
        boss.onGround = true;
    }

    if (boss.hp <= 0) {
        if (boss.state !== 'dead') {
            boss.state = 'dead';
            boss.currentFrame = 0;
            setTimeout(() => { if(window.concluirCapituloEVoutar) window.concluirCapituloEVoutar(); }, 3000);
        }
        boss.frameTimer++;
        if (boss.frameTimer >= boss.frameInterval) {
            boss.frameTimer = 0;
            if (boss.currentFrame < (boss.deadFrames || 3) - 1) boss.currentFrame++;
        }
        return;
    }

const alvo = obterAlvoMaisProximo(boss);
if (!alvo) return;

 let distX = Math.abs(
    (alvo.x + alvo.width / 2) - (boss.x + boss.width / 2)
);

let distY = Math.abs(
    (alvo.y + alvo.height / 2) - (boss.y + boss.height / 2)
);
   
const mesmoNivel = distY < BOSS_Y_TOLERANCE;

    // Detecta Player
if (!boss.viuPlayer && distX < 150 && mesmoNivel) {
        boss.viuPlayer = true;
        boss.dialogue = boss.phrases[0];
        boss.dialogueTimer = 180;
    }

    if (boss.state !== 'hurt' && boss.state !== 'attacking') {
        boss.facing = (alvo.x < boss.x) ? 'left' : 'right';

        const limiteEsquerda = 6000;
        const limiteDireita = 6950;

if (mesmoNivel && distX < 500 && distX > 50 && boss.attackCooldown <= 0) {
            boss.state = 'attacking';
            boss.currentFrame = 0;
            boss.canShoot = true;
        } else if (mesmoNivel && distX < 200) {
            // Tenta se afastar, mas respeita o limite da direita
            let novaPos = boss.x + ((alvo.x < boss.x) ? boss.speed : -boss.speed);
            if (novaPos > limiteEsquerda && novaPos < limiteDireita) {
                boss.x = novaPos;
                boss.state = 'walking';
            } else {
                boss.state = 'idle';
            }
        } else if (distX > 400 && boss.viuPlayer) { 
            // Tenta se aproximar, mas respeita o limite da esquerda
            let novaPos = boss.x + ((alvo.x < boss.x) ? -boss.speed : boss.speed);
            if (novaPos > limiteEsquerda && novaPos < limiteDireita) {
                boss.x = novaPos;
                boss.state = 'walking';
            } else {
                boss.state = 'idle';
            }
        } else {
            boss.state = 'idle';
        }
    }

    if (boss.attackCooldown > 0) boss.attackCooldown--;
    if (boss.dialogueTimer > 0) boss.dialogueTimer--;

    // Animação Boss
    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;

        // Disparo de Flecha no frame certo
        if (boss.state === 'attacking' && boss.currentFrame === 9 && boss.canShoot) {
            let dir = boss.facing === 'left' ? -1 : 1;
            window.arrows.push({
                x: boss.x + (boss.width/2) + (dir * 40),
                y: boss.y + 40,
                velX: dir * 5,
                width: 30, height: 60
            });
            boss.canShoot = false;
        }

        boss.currentFrame++;
        let maxFrames = (boss.state === 'attacking') ? 14 : (boss.state === 'walking' ? 8 : 6);
        if (boss.state === 'hurt') maxFrames = boss.hurtFrames;

        if (boss.currentFrame >= maxFrames) {
            boss.currentFrame = 0;
            if (boss.state === 'attacking' || boss.state === 'hurt') {
                boss.state = 'idle';
                boss.attackCooldown = 60;
            }
        }
    }
}

// --- UPDATE PRINCIPAL ---
function update() {
    if (gameState !== 'playing') return;

    if (isPaused) { return; }

    // 1. Verifica Morte
    if (todosPlayersMortos()) {
        resetGame(); // Ou mostrar tela de Game Over
        return;
    }
    if (player.y > 2000) { player.hp = 0; player.state = 'dead'; }

updateNPCs();

    // 2. Atualiza Players
    aplicarFisicaCompleta(player, keys);
    atualizarAnimacaoPlayer(player);
    if (player2.active) {
        aplicarFisicaCompleta(player2, keysP2);
        atualizarAnimacaoPlayer(player2);
    }

    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.dialogueTimer > 0) player.dialogueTimer--;

if (player2.active) {
    if (player2.attackCooldown > 0) player2.attackCooldown--;
    if (player2.dialogueTimer > 0) player2.dialogueTimer--;
}
    // 3. Câmera
    let alvoCam = (player.state !== 'dead') ? player : player2;
    if (player2.active && player.state !== 'dead') {
        alvoCam = { x: (player.x + player2.x)/2, y: (player.y + player2.y)/2 };
    }
    let targetX = (alvoCam.x + 50) - (canvas.width / (2 * zoom));
    let targetY = (alvoCam.y) - (canvas.height / (2 * zoom));
    
    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
    cameraY = Math.max(0, Math.min(cameraY, mapHeight - canvas.height / zoom));

    // 4. Atualiza Flechas (Iterar ao contrário para splice seguro)
    if (window.arrows) {
        for (let i = window.arrows.length - 1; i >= 0; i--) {
            let ar = window.arrows[i];
            ar.x += ar.velX;

            // Colisão com Player
            let alvoHit = obterAlvoMaisProximo(ar);
            if (!alvoHit) continue;
            if (ar.x < alvoHit.x + alvoHit.width && ar.x + 20 > alvoHit.x &&
                ar.y < alvoHit.y + alvoHit.height && ar.y + 10 > alvoHit.y) {
                if (alvoHit.state !== 'dead' && alvoHit.state !== 'hurt') {
                    alvoHit.hp--;
                    alvoHit.state = 'hurt';
	    alvoHit.currentFrame = 0; 
                    alvoHit.x += (ar.velX > 0) ? 30 : -30; 
                    alvoHit.velY = -5;

                    window.arrows.splice(i, 1);
                    continue;
                }
            }
            if (ar.x < 0 || ar.x > mapWidth || Math.abs(ar.x - boss.x) > 1500) {
                window.arrows.splice(i, 1);
            }
        }
    }

    // 5. Atualiza Boss
    if (boss) updateBossLogic();

    // 6. Atualiza Inimigos
    enemies.forEach(en => {
        if (en.hp <= 0 && en.state !== 'dead') {
            en.state = 'dead';
            en.currentFrame = 0;
        }
        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval && en.currentFrame < en.deadFrames - 1) {
                en.currentFrame++; en.frameTimer = 0;
            }
            return;
        }

// --- PROTECT (bloqueio) ---
if (en.state === 'protect') {
    en.frameTimer++;
    if (en.frameTimer >= en.frameInterval) {
        en.frameTimer = 0;
        en.currentFrame++;

        if (en.currentFrame >= (en.blockFrames || 2)) {
            en.currentFrame = 0;
            en.state = 'patrol';
        }
    }
    return;
}


const alvo = obterAlvoMaisProximo(en);
if (!alvo) return;

const distH = Math.abs(alvo.x - en.x);
const distV = Math.abs(alvo.y - en.y);

if (distH < 300 && distV < 200 && en.state !== 'attacking') {
    en.state = 'chase';

    if (distH < en.attackRange && en.attackCooldown <= 0) {
        en.state = 'attacking';
        en.currentFrame = 0;
    } 
    else if (distH > 50) {
        if (alvo.x < en.x) { en.x -= en.speed; en.facing = 'left'; }
        else { en.x += en.speed; en.facing = 'right'; }
    }

} else if (en.state !== 'attacking') {
    en.state = 'patrol';
}

        
        // Attack Cooldown e Animação
        if (en.attackCooldown > 0) en.attackCooldown--;
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            // Dano no frame certo
            if (en.state === 'attacking' && en.currentFrame === 2 && distH < en.attackRange) {
                if (alvo.hp > 0) { alvo.hp--; alvo.state = 'hurt'; }
            }
            en.currentFrame++;
            let maxF = (en.state === 'chase') ? en.runFrames : en.walkFrames;
            if (en.state === 'attacking') maxF = en.attackFrames;
            
            if (en.currentFrame >= maxF) {
                en.currentFrame = 0;
                if (en.state === 'attacking') {
                    en.state = 'chase';
                    en.attackCooldown = 60;
                }
            }
        }
    });

    updatePotions();
}

// --- DRAW ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, -Math.floor(cameraX * zoom), -Math.floor(cameraY * zoom));

    // Background
    backgroundObjects.forEach(d => { if (d.img.complete) ctx.drawImage(d.img, d.x, d.y, d.width, d.height); });

    // Plataformas
    platforms.forEach(p => {
        if (p.type === 'pattern' && platformPattern) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = platformPattern;
            ctx.fillRect(0, 0, p.w, p.h);
            ctx.restore();
        } else if (p.type === 'sloped') {
             ctx.fillStyle = "#4a3b2a";
             ctx.beginPath();
             ctx.moveTo(p.x, p.y);
             ctx.lineTo(p.x + p.w, p.y - (p.w * (p.slope || 0)));
             ctx.lineTo(p.x + p.w, p.y + 100);
             ctx.lineTo(p.x, p.y + 100);
             ctx.fill();
        }
    });

    // Entidades
    const allEntities = [...enemies, ...npcs, player];
    if (player2.active) allEntities.push(player2);
    if (boss) allEntities.push(boss);

    allEntities.forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;
        if (obj.state === 'protect') { img = obj.imgProtect; totalF = obj.blockFrames || 2;}
        else if (obj.state === 'running') { img = obj.imgRun; totalF = obj.runFrames; }
        else if (obj.state === 'walking' || obj.state === 'patrol') { img = obj.imgWalk; totalF = obj.walkFrames; }
        else if (obj.state === 'chase' || obj.state === 'running') { img = obj.imgRun || obj.imgWalk; totalF = obj.runFrames || obj.walkFrames; }
        else if (obj.state === 'attacking') { img = obj.imgAttack; totalF = obj.attackFrames; }
        else if (obj.state === 'jumping') { img = obj.imgJump; totalF = obj.jumpFrames; }
        else if (obj.state === 'hurt') { img = obj.imgHurt; totalF = obj.hurtFrames; }
        else if (obj.state === 'dead') { img = obj.imgDead; totalF = obj.deadFrames; }

        if (img && img.complete && img.width > 0) {
            const fw = img.width / totalF;
            const fh = img.height;
            ctx.save();
            if (obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, obj.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, 0, 0, obj.width, obj.height);
            } else {
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, obj.x, obj.y, obj.width, obj.height);
            }
            ctx.restore();

            // Balão de fala
            if (obj.state !== 'dead' && obj.dialogue && obj.dialogueTimer > 0) {
                ctx.font = "bold 14px Arial";
                const width = ctx.measureText(obj.dialogue).width;
                ctx.fillStyle = "rgba(0,0,0,0.7)";
                ctx.fillRect(obj.x + obj.width/2 - width/2 - 5, obj.y - 30, width + 10, 20);
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillText(obj.dialogue, obj.x + obj.width/2, obj.y - 15);
            }
        }
    });

    // Flechas
    if (window.arrows && window.arrowImg.complete) {
        window.arrows.forEach(ar => {
            ctx.save();
            if (ar.velX < 0) {
                ctx.translate(ar.x + ar.width, ar.y); ctx.scale(-1, 1);
                ctx.drawImage(window.arrowImg, 0, 0, ar.width, ar.height);
            } else {
                ctx.drawImage(window.arrowImg, ar.x, ar.y, ar.width, ar.height);
            }
            ctx.restore();
        });
    }

    // Foreground
    foregroundObjects.forEach(f => { if (f.img.complete) ctx.drawImage(f.img, f.x, f.y, f.width, f.height); });
    
    // Potions
    potions.forEach(p => { if (p.active && potionImg.complete) ctx.drawImage(potionImg, p.x, p.y, p.width, p.height); });

    ctx.restore();

    // UI
    if (gameState === 'playing') {
        // Vida Player 1
        ctx.fillStyle = "black"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);
        
        // Vida Boss
        if (boss && boss.hp > 0 && boss.viuPlayer) {
            ctx.fillStyle = "black"; ctx.fillRect(canvas.width/2 - 200, 40, 400, 20);
            ctx.fillStyle = "purple"; ctx.fillRect(canvas.width/2 - 200, 40, (boss.hp / boss.maxHp) * 400, 20);
            ctx.strokeStyle = "white"; ctx.strokeRect(canvas.width/2 - 200, 40, 400, 20);
            ctx.textAlign = "center"; ctx.fillStyle = "white"; ctx.fillText("ARCHER", canvas.width/2, 35);
        }
    }
    
    // Telas de Fim
    const screen = document.getElementById('game-over-screen');
    if (screen) {
        const title = screen.querySelector('h1');
        const btnReset = document.getElementById('btn-reset');
        const btnNext = document.getElementById('btn-next-chapter');

        if (player.hp <= 0) {
            screen.style.display = 'flex';
            if(title) title.innerText = "VOCÊ CAIU...";
            if(btnReset) btnReset.style.display = 'block';
            if(btnNext) btnNext.style.display = 'none';
        } else if (boss && boss.state === 'dead' && boss.hp <= 0) {
            screen.style.display = 'flex';
            screen.style.backgroundColor = "rgba(0,0,0,0.8)";
            if(title) title.innerHTML = "Você derrubou <br> Archer";
            if (subtitle) subtitle.innerHTML = "Vingou o Rei Anão";
            if(btnReset) btnReset.style.display = 'none';
            if(btnNext) btnNext.style.display = 'block';
        }
    }
}

// --- GAME LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();

// --- EVENTOS DE TECLADO ---
window.addEventListener('keydown', (e) => {
    const k = e.key;
    // P1
    if (k.toLowerCase() === 'a') window.mover(player, keys, 'left', true);
    if (k.toLowerCase() === 'd') window.mover(player, keys, 'right', true);
    if (k.toLowerCase() === 'w') window.pular(player);
    if (k === ' ') window.atacar(player);
    
    // P2
    if (player2.active) {
        if (k === 'ArrowLeft') window.mover(player2, keysP2, 'left', true);
        if (k === 'ArrowRight') window.mover(player2, keysP2, 'right', true);
        if (k === 'ArrowUp') window.pular(player2);
        if (k.toLowerCase() === 'l') window.atacar(player2);
    }

    if (k.toLowerCase() === 'r') {
        if (player.hp <= 0) window.resetGame();
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k.toLowerCase() === 'a') window.mover(player, keys, 'left', false);
    if (k.toLowerCase() === 'd') window.mover(player, keys, 'right', false);
    if (player2.active) {
        if (k === 'ArrowLeft') window.mover(player2, keysP2, 'left', false);
        if (k === 'ArrowRight') window.mover(player2, keysP2, 'right', false);
    }
});

// Botões HTML
document.addEventListener('DOMContentLoaded', () => {
    const btnReset = document.getElementById('btn-reset');
    const btnNext = document.getElementById('btn-next-chapter');
    if (btnReset) btnReset.onclick = () => window.resetGame();
    if (btnNext) btnNext.onclick = () => window.concluirCapituloEVoutar();
});

// ================================
// CONTROLES MOBILE – PLAYER 1
// ================================
window.moverLeft = function (estado) {
    window.mover(player, keys, 'left', estado);
};

window.moverRight = function (estado) {
    window.mover(player, keys, 'right', estado);
};

window.pularPlayer = function () {
    window.pular(player);
};

window.atacarPlayer = function () {
    window.atacar(player);
};