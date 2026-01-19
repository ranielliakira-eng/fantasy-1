const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('../Assets/Sounds/186876__soundmatch24__dead-walking.mp3');
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
    velX: 0, velY: 0, speed: 3, jumpForce: -15, attackFrameInterval: 5, attackCooldownMax: 0, attackCooldown: 0,
    facing: 'right', onGround: false, state: 'idle',
    hp: 3, maxHp: 3, canAirAttack: true,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image(),
    attackFrames: 6, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", dialogueTimer: 0,
};

const player2 = {
    ...player,
    x: 160,
    active: false,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), 
    imgHurt: new Image(), imgAttack: new Image(), imgIdle: new Image(),
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

    // 🔧 RESET VISUAL DO PLAYER 2
    player2.state = 'idle';
    player2.facing = 'right';
    player2.currentFrame = 0;
    player2.frameTimer = 0;
    player2.velX = 0;
    player2.velY = 0;
    player2.onGround = false;
}

    // 3. O GATILHO: Quando a imagem do P1 carregar, o jogo começa
    player.imgIdle.onload = () => {
        gameState = 'playing'; 
        initEnemies(); 
        if (!isMuted) bgMusic.play().catch(() => {}); 
    };

    // 4. Mostra controles se for mobile
    const controls = document.getElementById('mobile-controls');
    if(controls) controls.style.display = 'flex';
};

// Mantenha a função auxiliar que criamos no passo anterior
function configurarPlayer(p, escolha) {

    // Mapeia escolha do menu → herói real
    const tipo = (escolha === 'castanha') ? 'Knight' : 'Swordsman';

    if (tipo === 'Knight') {
        p.idleFrames   = 6;
        p.walkFrames   = 8;
        p.jumpFrames   = 6;
        p.attackFrames = 5;
        p.hurtFrames = 3;
        p.deadFrames = 4;

        p.imgIdle.src   = '../Assets/Knight/Idle.png';
        p.imgWalk.src   = '../Assets/Knight/Walk.png';
        p.imgJump.src   = '../Assets/Knight/Jump.png';
        p.imgAttack.src = '../Assets/Knight/Attack_1.png';
        p.imgHurt.src   = '../Assets/Knight/Hurt.png';
        p.imgDead.src   = '../Assets/Knight/Dead.png';
    }

    if (tipo === 'Swordsman') {
        p.idleFrames   = 8;
        p.walkFrames   = 8;
        p.jumpFrames   = 8;
        p.attackFrames = 6;
        p.hurtFrames = 3;
        p.deadFrames = 3;

        p.imgIdle.src   = '../Assets/Swordsman/Idle.png';
        p.imgWalk.src   = '../Assets/Swordsman/Walk.png';
        p.imgJump.src   = '../Assets/Swordsman/Jump.png';
        p.imgAttack.src = '../Assets/Swordsman/Attack_1.png';
        p.imgHurt.src   = '../Assets/Swordsman/Hurt.png';
        p.imgDead.src   = '../Assets/Swordsman/Dead.png';
    }

    // Reset seguro
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
    checkMeleeHit(p);
}

const playerDialogTriggers = [
    { x: 450, text: "Finalmente sai da floresta...", used: false },
    { x: 600, text: "Enchantress estava descontrolada...", used: false },
    { x: 900, text: "Espero que o fazendeiro cuide bem dela", used: false },
    { x: 1200, text: "Um vilarejo abandonado?", used: false },
    { x: 3650, text: "O vilarejo foi tomado por esqueletos", used: false },
];

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Skeleton', x: 2550, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 1700, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 2100, y: 200, hp: 2, speed: 0.8, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 2200, y: 200, hp: 2, speed: 1.1, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 2150, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 3550, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },

        { type: 'Skeleton', x: 3850, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 3950, y: 200, hp: 2, speed: 1.1, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },

        { type: 'Skeleton', x: 4350, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 4400, y: 200, hp: 2, speed: 1.2, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },

        { type: 'Skeleton', x: 4850, y: 200, hp: 2, speed: 0.9, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 4900, y: 200, hp: 2, speed: 1.2, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 4950, y: 200, hp: 2, speed: 0.8, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
        { type: 'Skeleton', x: 5000, y: 200, hp: 2, speed: 1.1, attackRange: 30, frameInterval: 8, idleFrames: 7, walkFrames: 8, attackFrames: 7, hurtFrames: 3, deadFrames: 3 },
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
    });
}

// --- PLATAFORMAS ---
const platforms = [
    { x: 0, y: 300, w: 7000, h: 150, type: 'pattern' },
    { x: 2550, y: 200, w: 110, h: 10, type: 'pattern', alpha: 0 },
];

// --- Cenário ---
const fundoImg = new Image();
fundoImg.src = '../Assets/Battleground/fundo2.png';

const platformImg = new Image();
platformImg.src = '../Assets/Battleground/Platformer/Ground_02.png';

const middle_lane_tree2Img = new Image();
middle_lane_tree2Img.src = '../Assets/Battleground/Trees/middle_lane_tree2.png';
const middle_lane_tree5Img = new Image();
middle_lane_tree5Img.src = '../Assets/Battleground/Trees/middle_lane_tree5.png';
const middle_lane_tree6Img = new Image();
middle_lane_tree6Img.src = '../Assets/Battleground/Trees/middle_lane_tree6.png';

const tree5Img = new Image();
tree5Img.src = '../Assets/Battleground/Trees/jungle_tree_5.png';
const tree6Img = new Image();
tree6Img.src = '../Assets/Battleground/Trees/jungle_tree_6.png';
const tree7Img = new Image();
tree7Img.src = '../Assets/Battleground/Trees/jungle_tree_7.png';

const tree9Img = new Image();
tree9Img.src = '../Assets/Battleground/Trees/jungle_tree_9.png';

const casa3Img = new Image();
casa3Img.src = '../Assets/Battleground/House/casa3.png';

const casa4Img = new Image();
casa4Img.src = '../Assets/Battleground/House/casa4.png';

const casa4_1Img = new Image();
casa4_1Img.src = '../Assets/Battleground/House/casa4_1.png';

const casa5Img = new Image();
casa5Img.src = '../Assets/Battleground/House/casa5.png';

const mesaImg = new Image();
mesaImg.src = '../Assets/Battleground/Environment/mesa.png';
const cadeiraImg = new Image();
cadeiraImg.src = '../Assets/Battleground/Environment/Chair.png';
const BottleImg = new Image();
BottleImg.src = '../Assets/Battleground/Environment/Bottle.png';
const paoImg = new Image();
paoImg.src = '../Assets/Battleground/Environment/Bread.png';
const Street_LanternImg = new Image();
Street_LanternImg.src = '../Assets/Battleground/Environment/Street_Lantern.png';

const lapideImg = new Image();
lapideImg.src = '../Assets/Battleground/Environment/lapide.png';
const cripta1Img = new Image();
cripta1Img.src = '../Assets/Battleground/Environment/cripta1.png';
const cripta2Img = new Image();
cripta2Img.src = '../Assets/Battleground/Environment/cripta2.png';

let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

let keys = { left: false, right: false };

const backgroundObjects = [
    { x: 0, y: 0, width: 7000, height: 2000, img: fundoImg },

    { x: -30, y: 5, width: 200, height: 300, img: middle_lane_tree2Img },
    { x: 100, y: 5, width: 200, height: 300, img: middle_lane_tree5Img },
    { x: 200, y: 5, width: 200, height: 300, img: middle_lane_tree6Img },

    { x: 1800, y: 105, width: 250, height: 200, img: casa3Img },
    { x: 2050, y: 120, width: 350, height: 180, img: casa5Img },
    { x: 2425, y: 5, width: 400, height: 300, img: casa4Img },
    { x: 2850, y: 105, width: 250, height: 200, img: casa3Img },
    { x: 3100, y: 105, width: 250, height: 200, img: casa3Img },
    
    { x: 3400, y: 270, width: 100, height: 30, img: mesaImg },
    { x: 3350, y: 270, width: 50, height: 30, img: cadeiraImg },
    { x: 3425, y: 270, width: 50, height: 30, img: cadeiraImg },
    { x: 3500, y: 270, width: 50, height: 30, img: cadeiraImg },
    { x: 3440, y: 245, width: 30, height: 30, img: BottleImg },
    { x: 3425, y: 245, width: 30, height: 30, img: paoImg },
    { x: 3475, y: 150, width: 120, height: 170, img: Street_LanternImg },
    { x: 3600, y: 105, width: 250, height: 200, img: casa3Img },
    { x: 3800, y: 105, width: 200, height: 200, img: tree5Img },

    { x: 4000, y: 105, width: 200, height: 200, img: tree6Img },
    { x: 4150, y: 105, width: 200, height: 200, img: tree6Img },
    { x: 4300, y: 105, width: 200, height: 200, img: tree5Img },
    { x: 4500, y: 105, width: 200, height: 200, img: tree7Img },
    { x: 4750, y: 105, width: 200, height: 200, img: tree5Img },
    { x: 4900, y: 105, width: 200, height: 200, img: tree5Img },
    { x: 5125, y: 205, width: 100, height: 100, img: tree9Img },


    { x: 5800, y: 260, width: 100, height: 50, img: lapideImg },
    { x: 5850, y: 260, width: 100, height: 50, img: lapideImg },
    { x: 5900, y: 260, width: 100, height: 50, img: lapideImg },
    { x: 6000, y: 105, width: 200, height: 200, img: cripta1Img },
    { x: 6300, y: 260, width: 100, height: 50, img: lapideImg },
    { x: 6600, y: 260, width: 100, height: 50, img: lapideImg },
    { x: 6800, y: 135, width: 200, height: 200, img: cripta2Img },
];

const foregroundObjects = [
    { x: 30, y: 5, width: 200, height: 300, img: middle_lane_tree2Img },
    { x: 170, y: 5, width: 200, height: 300, img: middle_lane_tree2Img },
    { x: 400, y: 260, width: 50, height: 50, img: tree5Img },
    { x: 4350, y: 105, width: 200, height: 200, img: tree5Img },
    { x: 4650, y: 105, width: 200, height: 200, img: tree7Img },
    { x: 5025, y: 105, width: 200, height: 200, img: tree5Img },

    { x: 5500, y: 250, width: 200, height: 50, img: casa4_1Img },

    { x: 6150, y: 260, width: 100, height: 50, img: lapideImg },
    { x: 6450, y: 260, width: 100, height: 50, img: lapideImg },
];

// --- NPCs ---
const farmerNpc = {
    x: 2560,
    y: 110,
    width: 70,
    height: 90,

    imgIdle: new Image(),
    idleFrames: 4,
    currentFrame: 0,
    frameTimer: 0,
    frameInterval: 20,

    phrases: [
        "Socorro!",
        "Quase todos fugiram do vilarejo.",
        "Wizard foi impedir os esqueletos no cemitério.",
    ],

    dialogue: "",
    dialogueIndex: -1,
    dialogueTimer: 0,

    // DISTÂNCIAS (em pixels)
    talkDistance: 220,
    stepDistance: 120
};

farmerNpc.imgIdle.src = '../Assets/Farmer/IdleF.png';

const roosterNpc = {
    x: 4180,
    y: 50,
    width: 60,
    height: 60,
    facing: "left",

    imgIdle: new Image(),
    idleFrames: 6,
    currentFrame: 0,
    frameTimer: 0,
    frameInterval: 20,

    

    phrases: [
        "HAAAAAAA!",
    ],

    dialogue: "",
    dialogueIndex: -1,
    dialogueTimer: 0,

    // DISTÂNCIAS (em pixels)
    talkDistance: 220,
    stepDistance: 120
};

roosterNpc.imgIdle.src = '../Assets/Animals/Rooster_animation_without_shadow.png';

const npcs = [farmerNpc, roosterNpc];


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
    localStorage.setItem('capitulo_2_vencido', 'true');
    
window.location.href = "cutscene.html";
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

// Ataque (usando a função checkMeleeHit que já ajustamos)
window.atacar = function(p) {
    if (
        p.state === 'dead' ||
        p.state === 'attacking' ||
        p.attackCooldown > 0 ||
        isPaused
    ) return;

    p.state = 'attacking';
    p.currentFrame = 0;
    p.frameTimer = 0;
    p.attackCooldown = p.attackCooldownMax;

    checkMeleeHit(p);
};

// NPCs
function distanciaAteNPC(npc) {
    let dist = Math.abs(player.x - npc.x);

    if (player2 && player2.active) {
        const distP2 = Math.abs(player2.x - npc.x);
        dist = Math.min(dist, distP2);
    }

    return dist;
}

function updateNPCs() {
    npcs.forEach(n => {

        const dist = distanciaAteNPC(n);

        // --- CONTROLE DE FALA POR DISTÂNCIA ---
        if (dist < n.talkDistance) {

            const stepSize = n.talkDistance / n.phrases.length;

            const index = Math.floor(
                (n.talkDistance - dist) / stepSize
            );

            const finalIndex = Math.min(
                n.phrases.length - 1,
                Math.max(0, index)
            );

            if (finalIndex !== n.dialogueIndex) {
                n.dialogueIndex = finalIndex;
                n.dialogue = n.phrases[finalIndex];
                n.dialogueTimer = 120;
            }

        } else {
            // Fora da distância → apenas esconde o balão
            n.dialogue = "";
        }

        // --- TIMER (apenas visual) ---
        if (n.dialogueTimer > 0) {
            n.dialogueTimer--;
        }

        // --- ANIMAÇÃO IDLE ---
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

    if (p.state === 'attacking') {
        p.frameTimer++;

        if (p.frameTimer >= p.attackFrameInterval) {
            p.frameTimer = 0;
            p.currentFrame++;

            // Fim do ataque
            if (p.currentFrame >= p.attackFrames) {
                p.currentFrame = 0;
                p.state = p.onGround ? 'idle' : 'jumping';
            }
        }
        return;
    }

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

    // ===== ANIMAÇÕES NORMAIS =====
    p.frameTimer++;

    if (p.frameTimer >= p.frameInterval) {
        p.frameTimer = 0;

        if (!p.onGround) {
            p.state = 'jumping';
            p.currentFrame = (p.currentFrame + 1) % p.jumpFrames;
        }
        else if (Math.abs(p.velX) > 0.5) {
            p.state = 'walking';
            p.currentFrame = (p.currentFrame + 1) % p.walkFrames;
        }
        else {
            p.state = 'idle';
            p.currentFrame = (p.currentFrame + 1) % p.idleFrames;
        }
    }
}

function bossSummonFireSpirit() {
    if (!boss || boss.state === 'dead') return;

    bossDiz("Algo está me controlando", 120);
    
    // Criar o Fire_Spirit
    const spirit = {
        type: 'Fire_Spirit',
        x: boss.x + (boss.facing === 'left' ? -10 : 10),
        y: boss.y +20,
        hp: 1,
        speed: 2.5,
        attackRange: 30,
        frameInterval: 6,
        idleFrames: 6,
        walkFrames: 7,
        attackFrames: 14,
        hurtFrames: 3,
        deadFrames: 5,
        imgIdle: new Image(),
        imgWalk: new Image(),
        imgAttack: new Image(),
        imgHurt: new Image(),
        imgDead: new Image(),
        width: 80,
        height: 80,
        currentFrame: 0,
        frameTimer: 0,
        state: 'chase',
        facing: 'left',
        attackCooldown: 0,
        velY: 0,
        onGround: false
    };

    // Carregamento dos assets da pasta informada
    const folder = '../Assets/Fire_Spirit';
    spirit.imgIdle.src = `${folder}/Idle.png`;
    spirit.imgWalk.src = `${folder}/Walk.png`;
    spirit.imgAttack.src = `${folder}/Attack.png`;
    spirit.imgHurt.src = `${folder}/Hurt.png`;
    spirit.imgDead.src = `${folder}/Dead.png`;

    enemies.push(spirit);
}

// --- UPDATE ---
function update(){
    if (gameState !== 'playing') return;

    if (isPaused) {
        if (boss && boss.state === 'dead') {
            updateBossLogic();
        }
        return;
    }

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

if (todosPlayersMortos()) {
    resetGame();
}
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

// --- LÓGICA DE ESTADOS ---
        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0;
                // Se ainda não chegou no último frame, avança
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
                
if (en.currentFrame === attackFrame && dist <= en.attackRange) {

    // Evita bater em morto
    if (alvo.state === 'dead') return;

    // DANO
    alvo.hp -= 1;
    alvo.state = 'hurt';
    alvo.currentFrame = 0;

    // KNOCKBACK (baseado na posição do inimigo)
    const direcao = (alvo.x < en.x) ? -1 : 1;
    alvo.velX = direcao * 6;
    alvo.velY = -4;

    // Cooldown do inimigo
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

if ((player.x > 6200 || player2.x > 6200) && !boss) {
    boss = {
        type: 'Boss',
        x: 6500,
        y: 200, 
        width: 100,
        height: 100,
        hp: 4, maxHp: 4,
        speed: 3,
        summonCooldown: 30,
        state: 'idle',
        facing: 'left',
        damage: 1,
        attackRange: 60,
        attackCooldown: 0,
        currentFrame: 0,
        frameTimer: 0,
        frameInterval: 8,
        fala: "",
        falaTimer: 0,
        minDist: 140,
        maxDist: 360,
        edgeMargin: 80,
        velX: 0,
        velY: 0,
        viuPlayer: false,

        idleFrames: 6,
        walkFrames: 7,
        attackFrames: 10,
        hurtFrames: 4,
        deadFrames: 4,
        
        // Imagens (Generalizado: você só precisa garantir que as pastas existam)
        imgIdle: new Image(), imgWalk: new Image(), imgAttack: new Image(), 
        imgHurt: new Image(), imgDead: new Image()
    };
    
    // Carregamento automático das imagens (ajuste a pasta conforme seu assets)
    const folder = '../Assets/Wizard'; 
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
        if (k.left) p.velX = -p.speed;
        else if (k.right) p.velX = p.speed;
        else p.velX *= 0.7;
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

function gotoBossAnimation() {
    boss.frameTimer++;

    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;
        boss.currentFrame++;

        // 🔥 FRAME EXATO DO SUMMON
        if (boss.state === 'summoning' && boss.currentFrame === 9) {
            bossSummonFireSpirit();
        }

        // FIM DA ANIMAÇÃO
        if (boss.currentFrame >= boss.attackFrames) {
            boss.currentFrame = 0;
            boss.state = 'idle';
            boss.animState = 'idle';
        }
    }
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

// --- LÓGICA DO BOSS ---
function updateBossLogic() {
    if (!boss) return;

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

boss.velY = (boss.velY || 0) + 0.8;
boss.y += boss.velY;
if (boss.y + boss.height > 300) {
    boss.y = 300 - boss.height;
    boss.velY = 0;
}

if (boss.falaTimer > 0) boss.falaTimer--;

    const alvo = obterAlvoMaisProximo(boss);
    if (!alvo) return;

    const bossCenter = boss.x + boss.width / 2;
    const alvoCenter = alvo.x + alvo.width / 2;
    const dist = Math.abs(bossCenter - alvoCenter);

if (dist < 400 && !boss.viuPlayer) {
    bossDiz("Um poder corrupto despertou!");
    boss.viuPlayer = true;
}

if (boss.state === 'summoning') {
    boss.velX = 0;

    // animação continua, IA NÃO roda
    gotoBossAnimation();
    return;
}

    // MORTE
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

    // GRAVIDADE
    boss.velY += gravity;
    boss.y += boss.velY;

    if (boss.y + boss.height >= 300) {
        boss.y = 300 - boss.height;
        boss.velY = 0;
    }

    // FACING
    boss.facing = alvoCenter < bossCenter ? 'left' : 'right';

    // ======================
    // IA PRINCIPAL
    // ======================

    // PLAYER CHEGOU PERTO → FUGIR
    if (dist < boss.minDist) {
        boss.state = 'flee';

        if (alvoCenter < bossCenter) {
            boss.velX = boss.speed;
        } else {
            boss.velX = -boss.speed;
        }
    }

    // DISTÂNCIA BOA → INVOCAR
    else if (dist >= boss.minDist && dist <= boss.maxDist) {
        boss.velX = 0;

        if (boss.summonCooldown <= 0) {
boss.state = 'summoning';
boss.animState = 'attacking';
boss.currentFrame = 0;
boss.frameTimer = 0;
boss.summonCooldown = 30;
        } else {
            boss.state = 'idle';
        }
    }

    // PLAYER MUITO LONGE → REPOSICIONAR
    else {
        boss.state = 'idle';
        boss.velX = 0;
    }

    // MOVIMENTO
    boss.x += boss.velX;

// ===== ESTADO VISUAL =====
if (boss.state === 'flee') {
    boss.animState = 'walking';
}
else if (boss.state === 'summoning') {
    boss.animState = 'attacking'; // usa animação de conjuração
}
else {
    boss.animState = 'idle';
}

    // LIMITES DO MAPA (NÃO SAIR DA TELA)
    if (boss.x < boss.edgeMargin) boss.x = boss.edgeMargin;
    if (boss.x + boss.width > mapWidth - boss.edgeMargin)
        boss.x = mapWidth - boss.width - boss.edgeMargin;

    // COOLDOWNS
    if (boss.summonCooldown > 0) boss.summonCooldown--;

    // ======================
    // ANIMAÇÃO
    // ======================
    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;

        let maxFrames = boss.idleFrames;
        if (boss.state === 'flee') maxFrames = boss.walkFrames;
        if (boss.state === 'summoning') maxFrames = boss.attackFrames;
        if (boss.state === 'hurt') maxFrames = boss.hurtFrames;

        boss.currentFrame = (boss.currentFrame + 1) % maxFrames;

        if (boss.state === 'summoning' && boss.currentFrame === maxFrames - 1) {
            boss.state = 'idle';
        }
    }
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
    const visualState = obj.animState || obj.state;

    let img = obj.imgIdle;
    let totalF = obj.idleFrames || 8;

    if (
        visualState === 'walking' ||
        visualState === 'walk' ||
        visualState === 'patrol' ||
        visualState === 'chase'
    ) {
        img = obj.imgWalk;
        totalF = obj.walkFrames;
    }
    else if (visualState === 'attacking') {
        img = obj.imgAttack;
        totalF = obj.attackFrames;
    }
    else if (visualState === 'jumping' || visualState === 'jump') {
        img = obj.imgJump;
        totalF = obj.jumpFrames;
    }
    else if (visualState === 'hurt') {
        img = obj.imgHurt;
        totalF = obj.hurtFrames;
    }
    else if (visualState === 'dead') {
        img = obj.imgDead;
        totalF = obj.deadFrames;
    }

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

    ctx.drawImage(
        n.imgIdle,
        n.currentFrame * fw, 0, fw, fh,
        n.x, n.y, n.width, n.height
    );

    // BALÃO DE FALA (SEMPRE VISÍVEL)
if (n.dialogue && n.dialogueTimer > 0) {

    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";

    const text = n.dialogue;
    const textWidth = ctx.measureText(text).width;

    const bx = n.x + n.width / 2 - textWidth / 2 - 6;
    const by = n.y + 100;

    ctx.fillStyle = "white";
    ctx.fillRect(
        bx,
        by,
        textWidth + 12,
        22
    );

    ctx.strokeStyle = "black";
    ctx.strokeRect(
        bx,
        by,
        textWidth + 12,
        22
    );

    ctx.fillStyle = "black";
    ctx.fillText(
        text,
        n.x + n.width / 2,
        by + 15
    );
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
    window.location.href = "../index.html"; // Sai da pasta Chapter_1 para a raiz
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