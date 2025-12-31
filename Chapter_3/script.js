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
const mapWidth = 7000;
const mapHeight = 2000;
let cameraX = 0;
let cameraY = 0;
let gameState = 'loading';
let isPaused = false;
let isMuted = false;
let boss = null;

// --- JOGADOR (ESTRUTURA BASE) ---
const player = {
    x: 140, y: 900, width: 100, height: 100,
    velX: 0, velY: 0, speed: 3, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 4, maxHp: 4, canAirAttack: true,
    imgWalk: new Image(), imgRun: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image(), faction: 'player', 
    attackFrames: 6, runFrames: 8, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", dialogueTimer: 0, 
    holdLeft: 0, holdRight: 0, runThreshold: 180, runningSpeedMultiplier: 1.8,
};

// --- INICIALIZAÇÃO AUTOMÁTICA (PADRÃO SWORDSMAN / KNIGHT) ---
window.onload = function() {
    // 1. Esconde o menu de seleção antigo do Chapter_1
    const selectionMenu = document.getElementById('selection-menu');
    if (selectionMenu) selectionMenu.style.display = 'none';

    // 2. Lê a escolha do herói do Menu Principal
    // 'loiro' -> Swordsman | 'castanha' -> Knight
    const escolhaMenu = localStorage.getItem('heroi_da_jornada') || 'loiro'; 
    const heroiPadrao = (escolhaMenu === 'castanha') ? 'Knight' : 'Swordsman';
    
    // 3. Configura Frames Específicos
    // Knight (Baronesa) tem 6 frames de Idle/Jump, Swordsman tem 8
    player.idleFrames = (heroiPadrao === 'Knight') ? 6 : 8;
    player.runFrames = (heroiPadrao === 'Knight') ? 7 : 8;
    player.walkFrames = 8;
    player.jumpFrames = (heroiPadrao === 'Knight') ? 6 : 8;
    player.hurtFrames = 3;
    player.deadFrames = (heroiPadrao === 'Knight') ? 4 : 3;
    player.attackFrames = (heroiPadrao === 'Knight') ? 5 : 6;

    // 4. Carrega os Assets da pasta correta
    player.imgIdle.src = `assets/${heroiPadrao}/Idle.png`;
    player.imgWalk.src = `assets/${heroiPadrao}/Walk.png`;
    player.imgRun.src = `assets/${heroiPadrao}/Run.png`;
    player.imgJump.src = `assets/${heroiPadrao}/Jump.png`;
    player.imgHurt.src = `assets/${heroiPadrao}/Hurt.png`;
    player.imgDead.src = `assets/${heroiPadrao}/Dead.png`;
    player.imgAttack.src = `assets/${heroiPadrao}/Attack_1.png`;

    // 5. Inicia o jogo após carregar as imagens
    player.imgIdle.onload = () => {
        gameState = 'playing'; 
        initEnemies(); 
        if (!isMuted) bgMusic.play().catch(() => {}); 
    };
    
    const controls = document.getElementById('mobile-controls');
    if(controls) controls.style.display = 'flex';
};

const playerDialogTriggers = [
    { x: 100, text: "", used: false },

];

const potionImg = new Image();
potionImg.src = 'assets/Potion/LifePotionSmall.png';

// Torna a lista de flechas globalmente acessível
window.arrows = []; 

// Configura a imagem da flecha globalmente
window.arrowImg = new Image();
window.arrowImg.src = 'assets/Archer/Arrow.png';

let potions = [
    { x: 500, y: 1900, width: 32, height: 32, active: true },
];
// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Warrior_1', x: 2400, y: 1800, hp: 4, maxHP: 4, width: 100, height: 100, speed: 1.8, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 6, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
        { type: 'Warrior_1', x: 2700, y: 1800, hp: 4, maxHP: 4, width: 100, height: 100, speed: 1.8, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 6, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 2, deadFrames: 4, state: 'patrol' },

        { type: 'Warrior_2', x: 2900, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 3100, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 3200, y: 1450, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },

        { type: 'Warrior_2', x: 5200, y: 1800, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },
        { type: 'Warrior_2', x: 5000, y: 1800, hp: 3, maxHP: 3, width: 100, height: 100, speed: 1.5, faction: 'enemy', attackRange: 50, frameInterval: 8, idleFrames: 4, walkFrames: 8, runFrames: 6, attackFrames: 4, hurtFrames: 3, deadFrames: 4 , blockFrames: 2, isBlocking: false, blockChance: 0.3, state: 'patrol' },

];

boss = {

    type: 'Archer',

    x: 6000, y: 1850,
 
   velY: 0, width: 100, height: 100,

    hp: 5, maxHp: 5, speed: 1.5,

    attackRange: 500,
    state: 'idle', facing: 'left',

    viuPlayer: false, dialogue: "", dialogueTimer: 0,

    

    // Frames e Imagens

    currentFrame: 0, frameTimer: 0, frameInterval: 6,

    idleFrames: 6, walkFrames: 8, 
 
   attackFrames: 14, // Animação de carregar o arco costuma ser longa

    hurtFrames: 3, deadFrames: 3,

    

    imgIdle: new Image(), imgWalk: new Image(),

    imgAttack: new Image(), // Aqui usaremos o Shot_1.png

    imgHurt: new Image(), imgDead: new Image()

};

// Carregamento das imagens do Boss (Usando Shot_1.png)

    boss.imgIdle.src = `assets/Archer/Idle.png`;

    boss.imgWalk.src = `assets/Archer/Walk.png`;

    boss.imgAttack.src = `assets/Archer/Shot_1.png`;
 
    boss.imgHurt.src = `assets/Archer/Hurt.png`;

    boss.imgDead.src = `assets/Archer/Dead.png`;


    
    
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

// --- PLATAFORMAS ---
const platforms = [

// --- Chão parte 1 ---
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

// --- Cenário ---
const fundoImg = new Image();
fundoImg.src = 'assets/Battleground/fundo.png';

const platformImg = new Image();
platformImg.src = 'assets/Battleground/Ground1.png';

const tree4Img = new Image();
tree4Img.src = 'assets/Battleground/trees/winter_conifer_tree_4.png';
const tree5Img = new Image();
tree5Img.src = 'assets/Battleground/trees/winter_conifer_tree_5.png';
const tree7Img = new Image();
tree7Img.src = 'assets/Battleground/trees/winter_conifer_tree_7.png';

const cadeiraImg = new Image();
cadeiraImg.src = 'assets/Battleground/casa/cadeira.png';
const Banner1Img = new Image();
Banner1Img.src = 'assets/Battleground/casa/Banner1.png';
const Banner2Img = new Image();
Banner2Img.src = 'assets/Battleground/casa/Banner2.png';
const Barrel1Img = new Image();
Barrel1Img.src = 'assets/Battleground/casa/Barrel1.png';
const BoardImg = new Image();
BoardImg.src = 'assets/Battleground/casa/Board.png';
const Crate1Img = new Image();
Crate1Img.src = 'assets/Battleground/casa/Crate1.png';
const CuirassImg = new Image();
CuirassImg.src = 'assets/Battleground/casa/Cuirass.png';
const Cuirass1Img = new Image();
Cuirass1Img.src = 'assets/Battleground/casa/Cuirass1.png';
const HelmentImg = new Image();
HelmentImg.src = 'assets/Battleground/casa/Helment.png';
const Helment1Img = new Image();
Helment1Img.src = 'assets/Battleground/casa/Helment1.png';
const mesaImg = new Image();
mesaImg.src = 'assets/Battleground/casa/mesa.png';
const SackImg = new Image();
SackImg.src = 'assets/Battleground/casa/Sack.png';
const Shield1Img = new Image();
Shield1Img.src = 'assets/Battleground/casa/Shield1.png';
const Shield2Img = new Image();
Shield2Img.src = 'assets/Battleground/casa/Shield2.png';
const Shield3Img = new Image();
Shield3Img.src = 'assets/Battleground/casa/Shield3.png';
const Storage1Img = new Image();
Storage1Img.src = 'assets/Battleground/casa/Storage1.png';
const SwordImg = new Image();
SwordImg.src = 'assets/Battleground/casa/Sword.png';
const Sword1Img = new Image();
Sword1Img.src = 'assets/Battleground/casa/Sword1.png';
const Sword2Img = new Image();
Sword2Img.src = 'assets/Battleground/casa/Sword2.png';
const Sword3Img = new Image();
Sword3Img.src = 'assets/Battleground/casa/Sword3.png';
const Tool_BoardImg = new Image();
Tool_BoardImg.src = 'assets/Battleground/casa/Tool_Board.png';
const Weapon1Img = new Image();
Weapon1Img.src = 'assets/Battleground/casa/Weapon1.png';
const Wooden_BarrelImg = new Image();
Wooden_BarrelImg.src = 'assets/Battleground/casa/Wooden_Barrel.png';
const Wooden_CrateImg = new Image();
Wooden_CrateImg.src = 'assets/Battleground/casa/Wooden_Crate.png';

const DeadWarrior_2Img = new Image();
DeadWarrior_2Img.src = 'assets/Battleground/DeadWarrior_2.png';
const DeadWarrior_3Img = new Image();
DeadWarrior_3Img.src = 'assets/Battleground/DeadWarrior_3.png';

let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

let keys = { left: false, right: false };

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
    { x: 4100, y: 1450, width: 100, height: 100, img: DeadWarrior_3Img },
    { x: 4150, y: 1450, width: 100, height: 100, img: DeadWarrior_3Img },

    { x: 3750, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 3950, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 4050, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },
    { x: 4150, y: 1450, width: 100, height: 100, img: DeadWarrior_2Img },

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

];

// NPCs
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

Warrior_3Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';

const Warrior_3_1Npc = {
    x: 3900, y: 1050, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    velY: 0, onGround: false, facing: 'right',phrases: [ ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_1Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';

const Warrior_3_2Npc = {
    x: 4000, y: 1050, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "O clã Vermelho está dizendo que foi a gente" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_2Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';

const Warrior_3_3Npc = {
    x: 3700, y: 750, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'right',
    phrases: [ "Um anão nunca mataria seu rei..." ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_3Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';


const Warrior_3_4Npc = {
    x: 4500, y: 450, width: 100, height: 100, 
    imgIdle: new Image(),
    idleFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    range: 200, velY: 0, onGround: false, facing: 'left',
    phrases: [ "Lá em baixo está um caos" ],
    dialogueIndex: 0, dialogueTimer: 0, lastDialogueIndex: -1,
};
Warrior_3_4Npc.imgIdle.src = 'assets/Warrior_3/Idle.png';

const npcs = [Warrior_3Npc, Warrior_3_1Npc, Warrior_3_2Npc, Warrior_3_3Npc,  Warrior_3_4Npc];

// NPCs
function npcSay(npc, index=0, duration=120){ npc.dialogueIndex=index; npc.dialogueTimer=duration; }
function updateNPCs() {
    npcs.forEach(n => {
        // Cálculo da distância Euclidiana (Pitagórica) para evitar o problema dos andares
        const dx = player.x - n.x;
        const dy = player.y - n.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // LÓGICA DE DIÁLOGO
        if (distance < n.range) {
            // Calcula qual frase deve ser dita com base na proximidade (0 a phrases.length - 1)
            let proximityIndex = Math.floor((1 - (distance / n.range)) * n.phrases.length);
            proximityIndex = Math.max(0, Math.min(proximityIndex, n.phrases.length - 1));

            // OPÇÃO A: Apenas progride (não volta frases anteriores ao se afastar levemente)
            if (proximityIndex > n.lastDialogueIndex) {
                n.dialogueIndex = proximityIndex;
                n.dialogueTimer = 160; // Tempo que a fala fica visível
                n.lastDialogueIndex = proximityIndex;
            }
        } else {
            // LÓGICA DE ESQUECIMENTO:
            // Se o jogador se afastar mais que o triplo do range, o NPC "reseta" a conversa
            if (distance > n.range * 3) {
                n.lastDialogueIndex = -1;
            }
        }

        // Decrementa o timer da fala (para o balão sumir)
        if (n.dialogueTimer > 0) {
            n.dialogueTimer--;
        }

        // LÓGICA DE ANIMAÇÃO (Sprite)
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
            // Verifica colisão entre o player e a poção
            if (player.x < p.x + p.width &&
                player.x + player.width > p.x &&
                player.y < p.y + p.height &&
                player.y + player.height > p.y) {
                
                if (player.hp < player.maxHp) {
                    player.hp = Math.min(player.hp + 1, player.maxHp);
                    p.active = false; // Desativa a poção coletada
                    window.playerSay("HP +1", 60); 
                } else {
                    // Opcional: avisar que a vida já está cheia
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
            
            // Medir o texto para o fundo
            const textWidth = ctx.measureText(text).width;
            const padding = 10;
            

            const posX = n.x + n.width / 2;
            const posY = n.y - 20; 

            // Fundo do balão
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(posX - (textWidth/2) - padding, posY - 20, textWidth + (padding * 2), 30);

            // Texto
            ctx.fillStyle = "white";
            ctx.fillText(text, posX, posY);
        }
    });
}


// --- FUNÇÃO GLOBAL PARA FALA DO PLAYER ---
window.playerSay = function(text, duration = 80) {
    player.dialogue = text;
    player.dialogueTimer = duration;
};

// --- FUNÇÕES DO SISTEMA ---
window.togglePause = function() { if (gameState !== 'playing') return; isPaused = !isPaused; if (isPaused) bgMusic.pause(); else if (!isMuted) bgMusic.play().catch(() => {}); };
window.toggleSom = function() { isMuted = !isMuted; bgMusic.muted = isMuted; const btn = document.getElementById('btn-audio'); if(btn) btn.innerText = isMuted ? "Mudo" : "Som"; };
window.resetGame = function() {
    const screen = document.getElementById('game-over-screen'); 
    if(screen) screen.style.display='none';
    
    player.hp = player.maxHp; 
    player.x = 140; 
    player.y = 900; 
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
// Função para salvar o progresso e voltar ao menu raiz

window.concluirCapituloEVoutar = function() {
    localStorage.setItem('capitulo_3_vencido', 'true');
    
window.location.href = "../index.html"; // Volta para a pasta anterior (raiz)

};

// Movimentação
window.mover = function(dir, estado) { if(gameState!=='playing'||player.state==='dead'||isPaused) return; if(dir==='left') keys.left=estado; if(dir==='right') keys.right=estado; if(estado) player.facing=dir; };
window.pular = function() { if(gameState==='playing' && player.onGround && !isPaused){player.velY=player.jumpForce; player.onGround=false;} };
window.atacar = function() { if(player.state==='dead'){window.resetGame(); return;} if(gameState!=='playing'||isPaused)return; if(player.state==='attacking')return; if(!player.onGround && !player.canAirAttack)return; player.state='attacking'; player.currentFrame=0; if(!player.onGround) player.canAirAttack=false; checkMeleeHit(); };

// HIT MELEE
function checkMeleeHit() {
    let alcance = player.width * -0.2;
    let hitboxX = player.facing === 'right' ? player.x + player.width : player.x - alcance;

enemies.forEach(en => {
    if (en.state === 'dead') return; 

    if (hitboxX < en.x + en.width && hitboxX + alcance > en.x &&
        player.y < en.y + en.height && player.y + player.height > en.y) {

		// --- LÓGICA DE BLOQUEIO DO WARRIOR_2 ---
            if (en.type === 'Warrior_2') {
                // Se ele já estiver bloqueando, o dano é zero
                if (en.state === 'blocking') {
                    playerSay("Bloqueado!", 40);
                    return; 
                }
                
                // Chance de ativar o bloqueio no momento do hit
                if (Math.random() < en.blockChance) {
                    en.state = 'blocking';
                    en.currentFrame = 0;
                    en.frameTimer = 0;
                    playerSay("Defendeu!", 40);
                    return;
                }
            }
        
        en.hp--; 
        en.state = 'hurt';

	// --- LÓGICA DE KNOCKBACK (X e Y) ---
	const forcaInimigoX = 25;

        const forcaInimigoY = -8;
            if (player.x < en.x) {

                en.x += forcaInimigoX;
 
            } else {

                en.x -= forcaInimigoX;

            }

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

    // 2. Lógica para o Boss (Archer)
    if (boss && boss.state !== 'dead') {
        if (hitboxX < boss.x + boss.width && hitboxX + alcance > boss.x &&
            player.y < boss.y + boss.height && player.y + player.height > boss.y) {
            
            boss.hp--; // Retira vida do Boss
            
            if (boss.hp <= 0) {
                boss.state = 'dead';
                boss.currentFrame = 0;
                boss.dialogue = "Não foi isso que planejei...";
                boss.dialogueTimer = 180;

                // Salva progresso
                localStorage.setItem('capitulo_3_vencido', 'true');

                setTimeout(() => {
                    if(typeof mostrarTelaVitoria === 'function') mostrarTelaVitoria();
                }, 2000);
            } else {
                boss.state = 'hurt';
                boss.currentFrame = 0;
                boss.frameTimer = 0;
            }
        }
    }
}

// --- CONFIGURAÇÕES INICIAIS DO PLAYER (uma vez no setup)
player.holdLeft = 0;
player.holdRight = 0;
player.runThreshold = 180; // frames pressionado antes de correr
player.runningSpeedMultiplier = 1.8; // velocidade de corrida

// --- UPDATE ---
function update() {
    if (player.hp <= 0) { 
        player.state = 'dead'; 
        return; 
    }
    if (gameState !== 'playing' || isPaused) return;

    updatePotions();
    updateNPCs();
// === ADICIONE ESTAS LINHAS AQUI ===

    if (boss) {

        updateBossLogic();

    }
    
// =================================

// ===============================
// ATUALIZA DIÁLOGO DO PLAYER
// ===============================
if (player.dialogueTimer > 0) {
    player.dialogueTimer--;
    if (player.dialogueTimer <= 0) {
        player.dialogue = "";
    }
}


    if (player.y >= 2000) { 
        player.hp = 0; 
        player.state = 'dead'; 
        return;
    }


    // ===== FÍSICA VERTICAL =====
    player.onGround = false;
    player.velY += gravity;
    if (player.velY > 20) player.velY = 20; // limite de queda
    player.y += player.velY;

// --- colisão com plataformas retas (Sólida em todos os lados) ---
platforms.forEach(p => {
    if(p.type === 'sloped') return; // Continua ignorando as rampas aqui

    // Calcula a distância entre os centros do player e da plataforma
    let pCenterX = p.x + p.w / 2;
    let pCenterY = p.y + p.h / 2;
    let playerCenterX = player.x + player.width / 2;
    let playerCenterY = player.y + player.height / 2;

    let diffX = playerCenterX - pCenterX;
    let diffY = playerCenterY - pCenterY;

    // Distância mínima para haver colisão
    let minXDist = p.w / 2 + player.width / 2;
    let minYDist = p.h / 2 + player.height / 2;

    if (Math.abs(diffX) < minXDist && Math.abs(diffY) < minYDist) {
        let overlapX = minXDist - Math.abs(diffX);
        let overlapY = minYDist - Math.abs(diffY);

        // Resolve a colisão pelo lado de menor penetração
        if (overlapX >= overlapY) {
            if (diffY > 0) { // Colisão vindo de baixo (Teto)
                player.y += overlapY;
                player.velY = 0;
            } else { // Colisão vindo de cima (Chão)
                player.y -= overlapY;
                player.velY = 0;
                player.onGround = true;
            }
        } else { // Colisão lateral (Paredes)
            if (diffX > 0) player.x += overlapX;
            else player.x -= overlapX;
            player.velX = 0;
        }
    }
});

// --- colisão com rampas (Sloped) ---
platforms.forEach(p => {
    if(p.type !== 'sloped') return; // Só processa o que for rampa

    // Calcula a posição horizontal relativa do player dentro da rampa
    let relativeX = (player.x + player.width / 2) - p.x;

    // Se o player estiver dentro dos limites horizontais da rampa
    if (relativeX >= 0 && relativeX <= p.w) {
        // y_no_chao = ponto_inicial_y - (distancia_percorrida * inclinação)
        let slopeY = p.y - (relativeX * (p.slope || 0));

        // Verifica se o player está tocando ou descendo na rampa
        if (player.y + player.height >= slopeY && player.y + player.height - player.velY <= slopeY + 20) {
            player.y = slopeY - player.height;
            player.velY = 0;
            player.onGround = true;
        }
    }
});

    // ===== MOVIMENTO HORIZONTAL =====
    player.x += player.velX;

    // limites do mapa
    if(player.x < 0) player.x = 0;
    if(player.x + player.width > mapWidth)
        player.x = mapWidth - player.width;

    if(player.onGround) player.canAirAttack = true;

/// --- MOVIMENTO HORIZONTAL E ESTADO ---
if(player.state !== 'attacking') {
    // 1. Atualiza contadores de tecla
    if(keys.left) player.holdLeft++; else player.holdLeft = 0;
    if(keys.right) player.holdRight++; else player.holdRight = 0;

    // 2. Calcula velocidade base
    let speed = player.speed;

    // 3. Prioridade corrida
    let running = (player.holdLeft > player.runThreshold || player.holdRight > player.runThreshold);
    if(running) speed *= player.runningSpeedMultiplier;

    // 4. Aplica velocidade horizontal
    if(keys.left) player.velX = -speed;
    else if(keys.right) player.velX = speed;
    else player.velX *= 0.7; // desacelera se não estiver pressionando

    // 5. Atualiza estado do player
    if(!player.onGround) {
        player.state = 'jumping';
    } else if(running) {
        player.state = 'running';
    } else if(Math.abs(player.velX) > 0.5) {
        player.state = 'walking';
    } else {
        player.state = 'idle';
    }
} else {
    player.velX = 0; // não se move se atacando
}


// ===== ANIMAÇÃO PLAYER =====
player.frameTimer++;
if(player.frameTimer >= player.frameInterval){
    player.frameTimer = 0;

    if(player.state === 'attacking'){
        player.currentFrame++; 
        if(player.currentFrame >= player.attackFrames){
            if(!player.onGround) player.state='jumping';
            else if(player.holdLeft > player.runThreshold || player.holdRight > player.runThreshold) player.state='running';
            else if(Math.abs(player.velX) > 0.5) player.state='walking';
            else player.state='idle';
            player.currentFrame=0;
        }
    }
    else if(!player.onGround){
        player.state='jumping'; 
        player.currentFrame=(player.currentFrame+1)%player.jumpFrames;
    }
    else if(player.state === 'running'){ 
        player.currentFrame = (player.currentFrame+1) % player.runFrames; 
    }
    else if(player.state === 'walking'){ 
        player.currentFrame = (player.currentFrame+1) % player.walkFrames; 
    }
    else{ 
        player.state='idle'; 
        player.currentFrame=(player.currentFrame+1)%player.idleFrames;
    }
}

    // ===== CÂMERA DINÂMICA =====
    let targetX = (player.x + player.width / 2) - (canvas.width / (2 * zoom));
    let targetY = (player.y + player.height / 2) - (canvas.height / (2 * zoom));

    cameraX += (targetX - cameraX) * 0.1;
    cameraY += (targetY - cameraY) * 0.1;

    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
    cameraY = Math.max(0, Math.min(cameraY, mapHeight - canvas.height / zoom));

// Dentro da função update(), procure a parte das flechas e use esta lógica:
if (window.arrows) {
    for (let i = window.arrows.length - 1; i >= 0; i--) {
        let arrow = window.arrows[i];
        arrow.x += arrow.velX;

        // Colisão com o Player
        if (arrow.x < player.x + player.width &&
            arrow.x + 20 > player.x &&
            arrow.y < player.y + player.height &&
            arrow.y + 4 > player.y) {
            
            if (player.state !== 'hurt' && player.state !== 'dead') {
                player.hp -= 1;
                player.state = 'hurt';
                player.currentFrame = 0;
                window.arrows.splice(i, 1);
                continue;
            }
        }

        // Remove se sair da tela ou do limite do Boss
        if (Math.abs(arrow.x - boss.x) > 1000 || arrow.x < 0 || arrow.x > mapWidth) {
            window.arrows.splice(i, 1);
        }
    }
}
// ===== LÓGICA DOS INIMIGOS =====
enemies.forEach(en => {
// 1. VERIFICAÇÃO PRIORITÁRIA DE MORTE (Coloque aqui!)
    if (en.hp <= 0) {
        if (en.state !== 'dead') {
            en.state = 'dead';
            en.currentFrame = 0;
            en.frameTimer = 0;
        }
        if (en.target && en.target.hp <= 0) {
    en.target = null;
    en.state = 'patrol';
}
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            if (en.currentFrame < en.deadFrames - 1) {
                en.currentFrame++;
            }
        }
        return; // Sai da função deste inimigo específico, ignorando IA de movimento/ataque
    }
    // ----------------------------
    // 1. GRAVIDADE E PATRULHA BASE
    // ----------------------------
    if (en.patrolMinX === undefined) {
        en.patrolMinX = en.x - 120;
        en.patrolMaxX = en.x + 120;
    }

    en.velY += gravity;
    en.y += en.velY;
    en.onGround = false;

    // Colisão com plataformas
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
// ===============================
// ESCOLHA DE ALVO POR FACÇÃO
// ===============================
if (!en.target || en.target.state === 'dead' || !isEnemy(en, en.target)) {

    let possibleTargets = [];

    // Player
    if (isEnemy(en, player)) {
        possibleTargets.push(player);
    }

    // Outros inimigos / NPCs
    enemies.forEach(other => {
        if (other !== en && isEnemy(en, other) && other.state !== 'dead') {
            possibleTargets.push(other);
        }
    });

    // NPCs aliados (se existir array separado)
    if (typeof npcs !== 'undefined') {
        npcs.forEach(npc => {
            if (isEnemy(en, npc) && npc.state !== 'dead') {
                possibleTargets.push(npc);
            }
        });
    }

    // Escolhe o mais próximo
    let nearest = null;
    let minDist = Infinity;

    possibleTargets.forEach(t => {
        let d = Math.abs(t.x - en.x);
        if (d < minDist && d < 350) {
            minDist = d;
            nearest = t;
        }
    });

    if (nearest) {
        en.target = nearest;
        en.state = 'chase';
    } else {
        en.target = null;
        en.state = 'patrol';
    }
}
// ===============================
// DEFINIÇÃO DE ALVO E DISTÂNCIAS
// ===============================
const alvo = en.target;

let distH = Infinity;
let distV = Infinity;

if (alvo) {
    distH = Math.abs(alvo.x - en.x);
    distV = Math.abs(alvo.y - en.y);
}
// ===============================
// VALIDAÇÃO DE ALVO (ANTI-TRAVA)
// ===============================
if (!alvo || alvo.state === 'dead' || !isEnemy(en, alvo)) {
    en.target = null;
    en.state = 'patrol';
    en.currentFrame = 0;
}

    // ----------------------------
    // 3. DEAD
    // ----------------------------
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

    // ----------------------------
    // 4. BLOCKING
    // ----------------------------
    else if (en.state === 'blocking') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            if (en.currentFrame < en.blockFrames - 1) {
                en.currentFrame++;
            } else {
                en.state = 'chase';
                en.currentFrame = 0;
            }
        }
    }

    // ----------------------------
    // 5. HURT
    // ----------------------------
else if (en.state === 'hurt') {
    en.frameTimer++;
    if (en.frameTimer >= en.frameInterval) {
        en.frameTimer = 0;
        en.currentFrame++;
        if (en.currentFrame >= en.hurtFrames) {
            en.currentFrame = 0;
            en.state = 'patrol'; // Sempre volta para patrulha primeiro
            en.target = null;    // Limpa o alvo para forçar uma nova busca no próximo frame
        }
    }
}

    // ----------------------------
    // 6. PATROL
    // ----------------------------
  else if (en.state === 'patrol') {
    // Garante que o alvo foi limpo
    en.target = null;

    // Movimentação de patrulha baseada nos limites
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

    // Se o player entrar no alcance, muda para Chase
    const distToPlayer = Math.abs(player.x - en.x);
    if (distToPlayer < 200 && player.hp > 0) {
        en.target = player;
        en.state = 'chase';
    }

    // Atualiza animação de caminhada
    en.frameTimer++;
    if (en.frameTimer >= en.frameInterval) {
        en.currentFrame = (en.currentFrame + 1) % en.walkFrames;
        en.frameTimer = 0;
    }
}

    // ----------------------------
    // 7. CHASE (PLAYER OU NPC)
    // ----------------------------
    else if ((en.state === 'chase' || en.state === 'chase_npc') && alvo) {

        // Movimento horizontal
        if (distH > 30) {
            if (alvo.x < en.x) {
                en.x -= en.speed * 1.2;
                en.facing = 'left';
            } else {
                en.x += en.speed * 1.2;
                en.facing = 'right';
            }
        }

        // Pulo inteligente
        if (alvo.y < en.y - 60 && distV < 300 && en.onGround) {
            en.velY = -13;
            en.onGround = false;
        }

        // Ataque
        if (distH <= en.attackRange && distV < 50 && en.attackCooldown <= 0) {
            en.state = 'attacking';
            en.currentFrame = 0;
            en.frameTimer = 0;
        }

        // Desistência
if (distH > 400 || distV > 150 || alvo.hp <= 0) {
    en.target = null;
    en.state = 'patrol';
    en.currentFrame = 0;
    en.frameTimer = 0;
    return; // ← ISSO É FUNDAMENTAL
}

        // Animação corrida
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.currentFrame = (en.currentFrame + 1) % en.runFrames;
            en.frameTimer = 0;
        }
    }

    // ----------------------------
    // 8. ATTACKING
    // ----------------------------
    else if (en.state === 'attacking') {
    en.velX = 0;
    // CANCELA ATAQUE INVÁLIDO
    if (!alvo || alvo.hp <= 0 || !isEnemy(en, alvo)) {
        en.state = 'patrol';
        en.target = null;
        en.currentFrame = 0;
        return;
    }

    en.frameTimer++;
    if (en.frameTimer >= en.frameInterval) {
        en.frameTimer = 0;
        en.currentFrame++;

        // FRAME DE IMPACTO
        if (
            en.currentFrame === 3 &&
            distH <= en.attackRange &&
            isEnemy(en, alvo)
        ) {
            if (alvo.hp !== undefined && alvo.hp > 0) {
                alvo.hp -= 1;

                if (alvo.state !== undefined) alvo.state = 'hurt';
                if (alvo.velX !== undefined)
                    alvo.velX = (en.x < alvo.x) ? 22 : -22;
                if (alvo.velY !== undefined) alvo.velY = -6;
            }

            en.attackCooldown = 80;
        }

        //FIM DA ANIMAÇÃO
if (en.currentFrame >= en.attackFrames) {
    en.currentFrame = 0;
    en.attackCooldown = 80;

    // Se o alvo morreu no ataque, volta a patrulhar imediatamente
    if (!en.target || en.target.hp <= 0) {
        en.target = null;
        en.state = 'patrol';
    } else {
        en.state = 'chase';
    }
    return;
}
    }
}


    // ----------------------------
    // 9. COOLDOWN
    // ----------------------------
    if (en.attackCooldown > 0) en.attackCooldown--;
});
}
// === Desenho ===
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
    // Forçamos uma cor forte para teste
    ctx.fillStyle = "red"; 
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 5;

    ctx.beginPath();
    
    // Ponto A: Início da rampa
    let x1 = p.x - cameraX;
    let y1 = p.y - cameraY;
    
    // Ponto B: Fim da inclinação
    let x2 = (p.x + p.w) - cameraX;
    let y2 = (p.y - (p.w * (p.slope || 0))) - cameraY;

    // Desenhar um triângulo simples e alto para garantir visibilidade
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, y1 + 200);
    ctx.lineTo(x1, y1 + 200); 

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // DEBUG NO CONSOLE: Abre o F12 no navegador e vê se estes números aparecem
    // console.log(`Rampa em: X:${x1} Y:${y1} até X:${x2} Y:${y2}`);
}
        ctx.restore();
    });

    // Entidades (Inimigos, Player e Boss)
    const allEntities = [...enemies, player];
    if (boss) allEntities.push(boss);

    allEntities.forEach(obj => {
    let img = obj.imgIdle;
    let totalF = obj.idleFrames || 8;

    if (obj.state === 'walking' || obj.state === 'patrol') {
    
    img = obj.imgWalk;
 
       totalF = obj.walkFrames;
    
}
    else if (obj.state === 'running' || obj.state === 'chase') {

        img = obj.imgRun;
 
       totalF = obj.runFrames; 
    }
else if (obj.state === 'blocking' || obj.state === 'protect' || obj.state === 'Protect') {
        img = obj.imgProtect || obj.imgIdle; // Fallback para idle se não houver imagem
        totalF = obj.blockFrames || obj.protectFrames || 2;
    }
    else if (obj.state === 'running') {
        img = obj.imgRun; 
        totalF = obj.runFrames; 
    }
    else if (obj.state === 'attacking') { 
        img = obj.imgAttack; 
        totalF = obj.attackFrames; 
    }
    else if (obj.state === 'jumping') { 
        img = obj.imgJump; 
        totalF = obj.jumpFrames || 8; 
    }
    else if (obj.state === 'hurt') { 
        img = obj.imgHurt; 
        totalF = obj.hurtFrames; 
    }
    else if (obj.state === 'dead') { 
        img = obj.imgDead; 
        totalF = obj.deadFrames; 
    }

        if (img.complete && img.width > 0) {
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
                ctx.fillStyle = "white"; ctx.fillRect(obj.x + obj.width / 2 - textWidth / 2 - 5, obj.y - 15, textWidth + 10, 20);
                ctx.strokeStyle = "black"; ctx.strokeRect(obj.x + obj.width / 2 - textWidth / 2 - 5, obj.y - 15, textWidth + 10, 20);
                ctx.fillStyle = "black"; ctx.fillText(obj.dialogue, obj.x + obj.width / 2, obj.y);
            }
        }
    });


potions.forEach(p => {

    if (p.active && potionImg.complete) {

        ctx.drawImage(potionImg, p.x, p.y, p.width, p.height);

    }
});

    // NPCs
npcs.forEach(n => {
    // Escolhe a imagem e frames com base no estado
    let img = n.imgIdle;
    let totalF = n.idleFrames;

    if (n.state === 'Protect') {
        img = n.imgProtect;
        totalF = n.protectFrames;
    }

    if (!img.complete) return;
    const fw = img.width / totalF;
    const fh = img.height;

    ctx.save();
    if (n.facing === 'left') {
        ctx.translate(n.x + n.width, n.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, (n.currentFrame % totalF) * fw, 0, fw, fh, 0, 0, n.width, n.height);
    } else {
        ctx.drawImage(img, (n.currentFrame % totalF) * fw, 0, fw, fh, n.x, n.y, n.width, n.height);
    }
    ctx.restore();
});
// --- DESENHAR FOREGROUND OBJECTS ---

    foregroundObjects.forEach(f => {

        if (f.img.complete) {

            ctx.drawImage(f.img, f.x, f.y, f.width, f.height);

        }

    });

// Dentro da função draw(), substitua o bloco das arrows por este:
if (window.arrows) {
    window.arrows.forEach(arrow => {
        // Verifica se a imagem existe e foi carregada
        if (window.arrowImg.complete && window.arrowImg.naturalWidth > 0) {
            ctx.save();
            // Inverte a flecha se estiver indo para a esquerda
            if (arrow.velX < 0) {
                ctx.translate(arrow.x + arrow.width, arrow.y);
                ctx.scale(-1, 1);
                ctx.drawImage(window.arrowImg, 0, 0, arrow.width, arrow.height);
            } else {
                ctx.drawImage(window.arrowImg, arrow.x, arrow.y, arrow.width, arrow.height);
            }
            ctx.restore();
        } else {
            // --- MODO DE SEGURANÇA (Se não tiver imagem) ---
            // Desenha um retângulo VERMELHO brilhante para você ver a hitbox
            ctx.fillStyle = "red";
            ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height);
            
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.strokeRect(arrow.x, arrow.y, arrow.width, arrow.height);
        }
    });
}


    drawNPCDialogues(ctx);
    ctx.restore(); // Fecha Câmera

    // 3. UI (Fixo na tela)
if (gameState === 'playing') {
    // Vida Player
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
    ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);

    // Vida Boss - ADICIONADO boss.viuPlayer PARA SÓ APARECER NO COMBATE
    if (boss && boss.hp > 0 && boss.viuPlayer) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(canvas.width/2 - 200, 40, 400, 20);
        ctx.fillStyle = "purple"; ctx.fillRect(canvas.width/2 - 200, 40, (boss.hp / boss.maxHp) * 400, 20);
        ctx.strokeStyle = "white"; ctx.strokeRect(canvas.width/2 - 200, 40, 400, 20);
        ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
        ctx.fillText("ARCHER", canvas.width/2, 35);
    }
}

// --- 4. TELAS FINAIS ---
const screen = document.getElementById('game-over-screen');
const title = screen ? screen.querySelector('h1') : null;
const subtitle = screen ? screen.querySelector('p') : null;
// Captura os dois botões individualmente
const btnReset = document.getElementById('btn-reset');
const btnNext = document.getElementById('btn-next-chapter');

if (screen) {
    // CASO A: DERROTA (Player morreu)
    if (player.hp <= 0 || player.state === 'dead') {
        screen.style.display = 'flex';
        screen.style.backgroundColor = "rgba(139, 0, 0, 0.8)"; 
        
        if (title) title.innerText = "VOCÊ CAIU...";
        if (subtitle) subtitle.innerText = "Tente novamente para prosseguir";
        
        // MOSTRA o reset e ESCONDE o próximo capítulo
        if (btnReset) btnReset.style.display = 'block';
        if (btnNext) btnNext.style.display = 'none';
    } 
    
    // CASO B: VITÓRIA (Boss morreu)
    else if (boss && boss.state === 'dead' && boss.hp <= 0) {
        if (screen.style.display !== 'flex') {
            screen.style.display = 'flex';
            screen.style.backgroundColor = "rgba(0, 0, 0, 0.8)"; 
            
            if (title) title.innerHTML = "Você derrubou <br> Archer";
            if (subtitle) subtitle.innerHTML = "Vingou a morte do rei anão";

            // ESCONDE o reset e MOSTRA o botão de voltar ao menu (Próxima Fase)
            if (btnReset) btnReset.style.display = 'none';
            if (btnNext) btnNext.style.display = 'block';
        }
    }
}
} // FIM DA FUNÇÃO DRAW

// --- OUTRAS FUNÇÕES ---
function enemySay(en, type) {
    const list = en.phrases[type];
    en.dialogue = list[Math.floor(Math.random() * list.length)];
    en.dialogueTimer = 120;
}

// --- LÓGICA DO BOSS ---
function updateArrows() {
    for (let i = arrows.length - 1; i >= 0; i--) {
        arrows[i].x += arrows[i].velX;

        // Colisão simples com o player
        if (arrows[i].x < player.x + player.width &&
            arrows[i].x + 20 > player.x &&
            arrows[i].y < player.y + player.height &&
            arrows[i].y + 4 > player.y) {
            
            if (player.state !== 'dead') {
                player.hp -= 1;
                player.state = 'hurt';
                arrows.splice(i, 1);
                continue;
            }
        }

        // Remove se sair do mapa
        if (arrows[i].x < 0 || arrows[i].x > mapWidth) {
            arrows.splice(i, 1);
        }
    }
}

function updateBossLogic() {
    if (!boss) return;

    // --- 1. FÍSICA (Gravidade) ---
    boss.velY = (boss.velY || 0) + 0.8;
    boss.y += boss.velY;

    let groundLevel = 1950; 
    if (boss.y + boss.height > groundLevel) { 
        boss.y = groundLevel - boss.height;
        boss.velY = 0;
        boss.onGround = true;
    }

    // --- 2. MORTE ---
    if (boss.hp <= 0) {
        if (boss.state !== 'dead') {
            boss.state = 'dead';
            boss.currentFrame = 0;
            setTimeout(() => { 
                if(window.concluirCapituloEVoutar) window.concluirCapituloEVoutar(); 
            }, 3000);
        }
        boss.frameTimer++;
        if (boss.frameTimer >= boss.frameInterval) {
            boss.frameTimer = 0;
            if (boss.currentFrame < (boss.deadFrames || 3) - 1) boss.currentFrame++;
        }
        return; 
    }

    // --- 3. INTELIGÊNCIA ARTIFICIAL (IA) ---
    // Distância Horizontal (X)
    let distX = Math.abs((player.x + player.width / 2) - (boss.x + boss.width / 2));
    // Distância Vertical (Y) - NOVO!
    let distY = Math.abs((player.y + player.height / 2) - (boss.y + boss.height / 2));

    // Ativar o Boss (Agora checa X e Y)
    if (!boss.viuPlayer) {
        // Se estiver perto horizontalmente E verticalmente
        if (distX < 300 && distY < 100) {
            boss.viuPlayer = true;
            boss.dialogue = "EU MATEI O REI E CULPEI O CLÃ AMARELO!";
            boss.dialogueTimer = 180; // CORRIGIDO (era dialogueTime)
        } else {
            boss.state = 'idle';
            return; 
        }
    }

    // Só decide movimento se NÃO estiver sofrendo dano nem atacando
    if (boss.state !== 'hurt' && boss.state !== 'attacking') {
        boss.facing = (player.x < boss.x) ? 'left' : 'right';

        // Lógica de combate
        if (distX < 500 && (boss.attackCooldown || 0) <= 0 && distY < 100) {
            // Só ataca se estiver alinhado verticalmente também (distY < 100)
            boss.state = 'attacking';
            boss.currentFrame = 0;
            boss.canShoot = true; 
        } else if (distX < 200) {
            // Foge
            boss.state = 'walking';
            let moveDir = (player.x < boss.x) ? boss.speed : -boss.speed;
            if (boss.x + moveDir > 4000 && boss.x + moveDir < mapWidth - 100) boss.x += moveDir;
        } else if (distX > 500) {
            // Persegue
            boss.state = 'walking';
            boss.x += (player.x < boss.x) ? -boss.speed : boss.speed;
        } else {
            boss.state = 'idle';
        }
    }

    // Atualiza timers
    if (boss.dialogueTimer > 0) boss.dialogueTimer--; // CORRIGIDO (era falaTimer)
    if (boss.attackCooldown > 0) boss.attackCooldown--;

    // --- 4. ANIMAÇÃO ---
    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;

        // Lógica do Tiro
        if (boss.state === 'attacking' && boss.currentFrame === 9 && boss.canShoot) {
            if (window.arrows) {
                let dir = boss.facing === 'left' ? -1 : 1;
                window.arrows.push({
                    x: boss.x + (boss.width / 2) + (dir * 40), 
                    y: boss.y + 60, 
                    velX: dir * 15, // Aumentei a velocidade (1.5 era muito lento)
                    width: 30,
                    height: 10
                });
                boss.canShoot = false;
            }
        }

        boss.currentFrame++;

        let maxFrames = 6; 
        if (boss.state === 'attacking') maxFrames = 14; 
        else if (boss.state === 'walking') maxFrames = 8;
        else if (boss.state === 'hurt') maxFrames = boss.hurtFrames;

        if (boss.currentFrame >= maxFrames) {
            boss.currentFrame = 0;
            if (boss.state === 'attacking') {
                boss.state = 'idle';
                boss.attackCooldown = 150;
            }
            else if (boss.state === 'hurt') {
                boss.state = 'idle';
                boss.attackCooldown = 20;
            }
        }
    }
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
    localStorage.setItem('capitulo_2_vencido', 'true');
    window.location.href = "../index.html"; // Sai da pasta Chapter_1 para a raiz
};

// --- INPUTS DO TECLADO ---
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') window.mover('left', true);
    if (k === 'd') window.mover('right', true);
    if (k === 'w' || k === ' ') window.pular();
    if (k === 'k') window.atacar();
    
    // Tecla R inteligente: Reinicia se morreu, ou vai para o menu se ganhou
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

