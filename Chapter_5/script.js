const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('../Assets/Sounds/686217__humanoide9000__cinematic-orchestral-heroic-army-music.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.4; 
const mapWidth = 800;
const mapHeight = 450;
let cameraX = 0;
let cameraY = 0;
let gameState = 'loading';
let isPaused = false;
let isMuted = false;
let boss = null;

// --- JOGADOR (ESTRUTURA BASE) ---
const player = {
    x: 120, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 3, jumpForce: -15, attackFrameInterval: 5, attackCooldownMax: 0, attackCooldown: 0,
    facing: 'right', onGround: false, state: 'idle',
    hp: 4, maxHp: 4, canAirAttack: true,
    imgIdle: new Image(), imgWalk: new Image(), imgRun: new Image(), imgJump: new Image(),
    imgAttack: new Image(), imgHurt: new Image(), imgDead: new Image(),
    attackFrames: 6, walkFrames: 8, runFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", dialogueTimer: 0, moveTimer: 0, runThreshold: 40,
};

const player2 = {
    ...player,
    x: 160,
    active: false,
    imgIdle: new Image(), imgWalk: new Image(), imgRun: new Image(), imgJump: new Image(), 
     imgAttack: new Image(), imgHurt: new Image(), imgDead: new Image(),
};

let keysP2 = { left: false, right: false };

function obterPlayersAtivos() {
    const ativos = [];
    
    // O Player 1 está sempre ativo
    ativos.push(player);
    
    // O Player 2 só entra se a flag active for true
    if (player2 && player2.active) {
        ativos.push(player2);
    }
    
    return ativos;
}

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
        initPotions();
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
        p.runFrames = 7;
        p.jumpFrames   = 6;
        p.attackFrames = 5;
        p.hurtFrames = 3;
        p.deadFrames = 4;

        p.imgIdle.src   = '../Assets/Knight/Idle.png';
        p.imgWalk.src   = '../Assets/Knight/Walk.png';
        p.imgRun.src    = '../Assets/Knight/Run.png';
        p.imgJump.src   = '../Assets/Knight/Jump.png';
        p.imgAttack.src = '../Assets/Knight/Attack_1.png';
        p.imgHurt.src   = '../Assets/Knight/Hurt.png';
        p.imgDead.src   = '../Assets/Knight/Dead.png';
    }

    if (tipo === 'Swordsman') {
        p.idleFrames   = 8;
        p.walkFrames   = 8;
        p.runFrames = 8;
        p.jumpFrames   = 8;
        p.attackFrames = 6;
        p.hurtFrames = 3;
        p.deadFrames = 3;

        p.imgIdle.src   = '../Assets/Swordsman/Idle.png';
        p.imgWalk.src   = '../Assets/Swordsman/Walk.png';
        p.imgRun.src    = '../Assets/Swordsman/Run.png';
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
//    { x: 450, text: "Finalmente sai da floresta...", used: false },
];

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

	if (boss.state === 'attack1') {
                   window.playerSay("Inabalável!", 30);
	        return;
	}
            
            boss.hp--;
            boss.state = 'hurt';
            boss.currentFrame = 0;
            boss.frameTimer = 0;

            if (boss.hp <= 0) {
                boss.state = 'dead';
                boss.currentFrame = 0;
                boss.dialogue = "GRrrr...";
                boss.dialogueTimer = 180;
            }
        }
    }
}

function atualizarAnimacaoPlayer(p) {
    // 1. Estados Prioritários
    if (p.state === 'attacking') {
        p.frameTimer++;
        if (p.frameTimer >= p.attackFrameInterval) {
            p.frameTimer = 0;
            p.currentFrame++;
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
            if (p.currentFrame < p.deadFrames - 1) p.currentFrame++;
        }
        return;
    }

    if (p.state === 'hurt') {
        p.frameTimer++;
        if (p.frameTimer >= p.frameInterval) {
            p.frameTimer = 0;
            p.currentFrame++;
            if (p.currentFrame >= p.hurtFrames) {
                p.state = 'idle';
                p.currentFrame = 0;
            }
        }
        return;
    }

    // 2. Animações Normais (Walk, Run, Jump, Idle)
    p.frameTimer++;
    if (p.frameTimer >= p.frameInterval) {
        p.frameTimer = 0;

        if (!p.onGround) {
            p.state = 'jumping';
            p.currentFrame = (p.currentFrame + 1) % p.jumpFrames;
        } 
        else if (p.state === 'running') {
            p.currentFrame = (p.currentFrame + 1) % p.runFrames;
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

let potions = [];

function initPotions() {
    potions = [
        { x: 750, y: 150, width: 32, height: 32, active: true },
        { x: 740, y: 150, width: 32, height: 32, active: true },
        { x: 760, y: 150, width: 32, height: 32, active: true },
    ];
}

const potionImg = new Image();
potionImg.src = '../Assets/Battleground/Potions/LifePotionSmall.png';

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

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Musketeer', x: 200, y: 100, hp: 4, maxHP: 4, width: 100, height: 100, speed: 1.5, faction: 'ally', attackRange: 60, damage: 1, frameInterval: 8, idleFrames: 5, walkFrames: 8, runFrames: 8, attackFrames: 5, hurtFrames: 2, deadFrames: 4, state: 'patrol' },
];

    boss = {
        type: 'Dragon',
        x: 600, y: 150, velY: 0, width: 250, height: 250,
        hp: 50, maxHp: 50, speed: 1.4,
        faction: 'enemy',
        healCooldown: 0, isHealActive: false, attackCooldown: 0,
        state: 'idle', facing: 'left', viuPlayer: false,
        currentFrame: 0, frameTimer: 0, frameInterval: 8,
        idleFrames: 3, walkFrames: 5, attack1Frames: 8, hurtFrames: 2, deadFrames: 5,
        imgIdle: new Image(), imgWalk: new Image(), imgAttack1: new Image(),
        imgHurt: new Image(), imgDead: new Image(),
        phrases: ["GRRRR!"],
        dialogueIndex: 0, dialogueTimer: 0
    };

    boss.imgIdle.src = `../Assets/Dragon/Idle.png`;
    boss.imgWalk.src = `../Assets/Dragon/Walk.png`;
    boss.imgAttack1.src = `../Assets/Dragon/Attack_1.png`;
    boss.imgHurt.src = `../Assets/Dragon/Hurt.png`;
    boss.imgDead.src = `../Assets/Dragon/Dead.png`;

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

function enemySay(en, type) {
    const list = en.phrases[type];
    en.dialogue = list[Math.floor(Math.random() * list.length)];
    en.dialogueTimer = 120;
}

function isEnemy(a, b) {
    if (!a || !b) return false;
    // Se são da mesma facção, não são inimigos
    if (a.faction === b.faction) return false;
    // Player e Ally são amigos
    if ((a.faction === 'player' && b.faction === 'ally') || 
        (a.faction === 'ally' && b.faction === 'player')) {
        return false;
    }
    return true;
}

// --- NOVAS VARIÁVEIS PARA O SCREEN SHAKE ---
let screenShakeTimer = 0;
let shakeIntensity = 0;

function startShake(duration, intensity) {
    screenShakeTimer = duration;
    shakeIntensity = intensity;
}

// --- PLATAFORMAS ---
const platforms = [
    { x: 0, y: 200, w: 800, h: 150, type: 'pattern' },
];

// --- Cenário ---
const fundoImg = new Image();
fundoImg.src = '../Assets/Battleground/fundo5.png';
const fundo1Img = new Image();
fundo1Img.src = '../Assets/Battleground/fundo5_1.png';

const platformImg = new Image();
platformImg.src = '../Assets/Battleground/Platformer/Ground_2.png';

let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

let keys = { left: false, right: false };

const backgroundObjects = [
    { x: 0, y: 0, width: 800, height: 450, img: fundoImg },
    { x: 0, y: 0, width: 800, height: 450, img: fundo1Img },
];

const foregroundObjects = [];

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
    initPotions();
};

window.concluirCapituloEVoutar = function() {
    localStorage.setItem('capitulo_5_vencido', 'true');
    window.location.href = "fim.html";
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

// --- UPDATE ---
function update(){
    if (gameState !== 'playing') return;

    if (isPaused) {
        if (boss && boss.state === 'dead') {
            updateDragonBossLogic();
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

    updatePotions();

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
if (player.state !== 'attacking' && player.state !== 'hurt') { 
    if (keys.left) player.velX = -player.speed; 
    else if (keys.right) player.velX = player.speed; 
    else player.velX *= 0.7; 
} else if (player.state === 'hurt') {
    // No estado de dano, apenas a fricção age, permitindo o recuo
    player.velX *= 0.9; 
}

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
enemies.forEach(en => {
    const alvo = obterAlvoMaisProximo(en);
    if (!alvo) return;

    const dist = Math.abs(alvo.x - en.x);

    if (en.patrolMinX === undefined) { en.patrolMinX = en.x - 120; en.patrolMaxX = en.x + 120; }
    if (en.facing === undefined) en.facing = 'left';

    en.velY += gravity; 
    en.y += en.velY; 
    en.onGround = false;

    platforms.forEach(p => {
        if (en.x + 40 < p.x + p.w && en.x + 60 > p.x && en.y + en.height >= p.y && en.y + en.height <= p.y + 10) { 
            en.y = p.y - en.height; 
            en.velY = 0; 
            en.onGround = true; 
        }
    });

    // --- LÓGICA DE ESTADOS ---

    // 1. ESTADO: MORTO
    if (en.state === 'dead') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            if (en.currentFrame < en.deadFrames - 1) {
                en.currentFrame++;
            }
        }
        return; // Sai da função para não processar outros estados
    }

    // 2. ESTADO: DANO (HURT)
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
        return; // Sai da função para não processar outros estados
    }

    // 3. ESTADO: ATAQUE (Aqui estava o erro de sumiço)
    else if (en.state === 'attacking') {
        const attackFrameDamage = 2; // Frame onde o dano é aplicado
        en.frameTimer++;
        
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            en.currentFrame++;

            // Aplicação de dano no momento exato da animação
if (en.currentFrame === attackFrameDamage && dist <= en.attackRange) {
    if (alvo.state !== 'dead') {
        if (alvo === boss) {
            alvo.hp -= en.damage;
            alvo.state = 'hurt';
            alvo.currentFrame = 0;
        } 
        else {
            alvo.hp -= en.damage;
            alvo.state = 'hurt';
            alvo.currentFrame = 0;
            const direcao = (alvo.x < en.x) ? -1 : 1;
            alvo.velX = direcao * 8;
            alvo.velY = -4;
        }
        en.attackCooldown = 80;
    }
}

            // Finaliza o ataque
            if (en.currentFrame >= en.attackFrames) {
                en.currentFrame = 0;
                en.frameTimer = 0;
                en.state = 'chase'; 
            }
        }
        // IMPORTANTE: Não deixamos o código continuar para a "animação genérica" abaixo
    }

    // 4. ESTADO: PATRULHA
else if (en.state === 'patrol') {
        if (en.facing === 'left') {
            en.x -= en.speed;
            if (en.x <= en.patrolMinX) en.facing = 'right';
        } else {
            en.x += en.speed;
            if (en.x >= en.patrolMaxX) en.facing = 'left';
        }

        // Se for um aliado, ele tem "visão aguçada" para detectar o Boss ou inimigos
        let campoDeVisao = (en.faction === 'ally') ? 600 : 100; 

        if (dist < campoDeVisao) {
            en.state = 'chase';
            en.currentFrame = 0;
        }
    }

    // 5. ESTADO: PERSEGUIÇÃO (CHASE)
    else if (en.state === 'chase') {
        const minDist = 10; // Reduzido para garantir que ele encoste na hitbox do Boss
        if (dist > minDist) {
            if (alvo.x < en.x) { 
                en.x -= en.speed * 1.5; // Aliados correm um pouco mais rápido para ajudar
                en.facing = 'left'; 
            }
            else { 
                en.x += en.speed * 1.5; 
                en.facing = 'right'; 
            }
        }
        
        // Se estiver no alcance de ataque, inicia o ataque
        if (dist <= en.attackRange && en.attackCooldown <= 0) {
            en.state = 'attacking';
            en.currentFrame = 0;
            en.frameTimer = 0;
        }
        
        // Se o alvo sumir (muito longe), volta a patrulhar
        if (dist > 800) {
            en.state = 'patrol';
            en.currentFrame = 0;
        }
    }

    // --- ATUALIZAÇÃO DE COOLDOWN E ANIMAÇÕES GENÉRICAS ---

    if (en.attackCooldown > 0) { 
        en.attackCooldown--; 
    }

    // Esta parte só roda para IDLE e WALK (Patrol/Chase), evitando conflito com ATAQUE
    if (en.state !== 'attacking' && en.state !== 'dead' && en.state !== 'hurt') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            let totalF = (en.state === 'patrol' || en.state === 'chase') ? en.walkFrames : en.idleFrames;
            en.currentFrame = (en.currentFrame + 1) % totalF;
        }
    }
});

    // PLAYER DIALOG
    playerDialogTriggers.forEach(trigger=>{
        if(!trigger.used && player.x>trigger.x){ playerSay(trigger.text,180); trigger.used=true;}
    });

// Se o Boss existir, rodar a lógica dele
if (boss) {
    updateDragonBossLogic(); 
}
}

function aplicarFisicaCompleta(p, k) {
    if (p.state === 'dead') return;

    // MOVIMENTO HORIZONTAL COM CORRIDA
    if (p.state !== 'attacking' && p.state !== 'hurt') {
        if (k.left || k.right) {
            p.moveTimer++; // Incrementa enquanto a tecla está pressionada
            
            if (p.moveTimer > p.runThreshold) {
                p.state = 'running';
                const runSpeed = p.speed * 1.8;
                p.velX = k.left ? -runSpeed : runSpeed;
            } else {
                p.state = 'walking';
                p.velX = k.left ? -p.speed : p.speed;
            }
        } else {
            p.moveTimer = 0; // Reseta ao soltar a tecla
            p.velX *= 0.7;

            if (Math.abs(p.velX) < 0.1) {
                p.velX = 0;
                if (p.onGround && p.state !== 'attacking' && p.state !== 'hurt') {
                    p.state = 'idle';
                }
            }
        }
    } else {
        p.moveTimer = 0;
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

function obterAlvoMaisProximo(entidade) {
    let possiveisAlvos = [];

    // Se quem está procurando for um Inimigo comum ou o Boss
    if (entidade.faction === 'enemy' || entidade.type === 'Dragon') {
        // Alvos são os Players e os Aliados deles
        possiveisAlvos = [
            ...obterPlayersAtivos(),
            ...enemies.filter(en => en.faction === 'ally' && en.state !== 'dead')
        ];
    } 
    // Se quem está procurando for um ALIADO (Ex: Musketeer)
    else if (entidade.faction === 'ally') {
        // Alvos são o Boss (prioridade) e outros Inimigos
        if (boss && boss.state !== 'dead') possiveisAlvos.push(boss);
        
        const inimigosComuns = enemies.filter(en => en.faction === 'enemy' && en !== entidade && en.state !== 'dead');
        possiveisAlvos.push(...inimigosComuns);
    }

    // Remove alvos mortos ou inválidos
    possiveisAlvos = possiveisAlvos.filter(a => a && a.hp > 0 && a.state !== 'dead');

    if (possiveisAlvos.length === 0) return null;

    // Retorna o que estiver mais perto horizontalmente
    return possiveisAlvos.reduce((a, b) => {
        let distA = Math.abs(a.x - entidade.x);
        let distB = Math.abs(b.x - entidade.x);
        return distA < distB ? a : b;
    });
}

function bossDiz(texto, tempo = 120) {
boss.dialogue = texto;
    boss.dialogueTimer = tempo;
}

function updateDragonBossLogic() {
    if (!boss || boss.state === 'dead') return;

    // 1. Define quem é o alvo mais próximo no momento
    const alvo = obterAlvoMaisProximo(boss);
    if (!alvo) return; // Se todos morrerem, o boss para

    // Gravidade e Colisão simples com o chão
    boss.velY += gravity;
    boss.y += boss.velY;
    
    let chaoY = platforms[0].y;
    if (boss.y + boss.height > chaoY) { 
        boss.y = chaoY - boss.height + 10; 
        boss.velY = 0; 
    }

    // Cálculos baseados no ALVO (e não apenas no player1)
    const bossCenterX = boss.x + boss.width / 2;
    const alvoCenterX = alvo.x + alvo.width / 2;
    const distH = Math.abs(alvoCenterX - bossCenterX);
    const distV = Math.abs(alvo.y - boss.y);

    // --- LÓGICA DE DETECÇÃO ---
    if (!boss.viuPlayer) {
        if (distH < 500 && distV < 200) {
            boss.viuPlayer = true;
            boss.dialogue = "GRRRR!";
            boss.dialogueTimer = 180;
        } else {
            boss.state = 'idle'; 
            return;
        }
    }

    // --- LÓGICA DE MOVIMENTAÇÃO E ESTADOS ---
    if (boss.state !== 'hurt' && boss.state !== 'attack1') {
        // Vira para o alvo mais próximo
        boss.facing = (alvo.x < boss.x) ? 'left' : 'right';

        if (boss.attackCooldown > 0) {
            boss.state = 'idle';
        } 
        else {
            if (distH >= 50 && distH <= 220) {
                boss.state = 'attack1';
                boss.currentFrame = 0;
                boss.frameTimer = 0;
            } 
            else {
                boss.state = 'walking';
                if (distH > 200) {
                    boss.x += (alvo.x < boss.x) ? -boss.speed : boss.speed;
                } 
                else if (distH < 50) {
                    boss.x += (alvo.x < boss.x) ? boss.speed : -boss.speed;
                }
            }
        }
    }

    // --- ANIMAÇÃO E EVENTOS POR FRAME ---
    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;
        boss.currentFrame++;

        let maxFrames = 1;
        if (boss.state === 'walking') maxFrames = 5;    
        if (boss.state === 'attack1') maxFrames = 9;   
        if (boss.state === 'hurt') maxFrames = 3;

        // Efeito de tremer a tela ao caminhar
        if (boss.state === 'walking' && (boss.currentFrame === 1 || boss.currentFrame === 3)) {
            startShake(8, 4); 
        }

        // Momento do dano (Frame 5 da animação de ataque)
if (boss.state === 'attack1' && boss.currentFrame === 5) {
    const bossCenterX = boss.x + boss.width / 2;
    
    // 1. Criamos uma lista combinada: Players Ativos + Inimigos que são Aliados
    const alvosPotenciais = [
        ...obterPlayersAtivos(),
        ...enemies.filter(en => en.faction === 'ally' && en.state !== 'dead')
    ];
    
    alvosPotenciais.forEach(v => {
        const vCenterX = v.x + v.width / 2;
        const distH = Math.abs(vCenterX - bossCenterX);
        const distV = Math.abs(v.y - boss.y);
        
        let isAhead = (boss.facing === 'left' && vCenterX < bossCenterX) || 
                      (boss.facing === 'right' && vCenterX > bossCenterX);

        // Se estiver na frente e no alcance (220), aplica o dano
        if (isAhead && distH <= 220 && distV < 150) {
            
            if (v.hp !== undefined) { // Verifica se é uma entidade com HP
                // Se for o Player, usamos a lógica de dano variável
                if (v === player || v === player2) {
                    let danoFinal = (Math.random() < 0.5) ? 3 : 4;
                    processDamage(danoFinal, v);
                } 
                // Se for um Inimigo Aliado (Musketeer, etc)
                else {
                    v.hp -= 1;
                    v.state = 'hurt';
                    v.currentFrame = 0;
                    v.velX = (bossCenterX < vCenterX) ? 10 : -10;
                    v.velY = -5;
                }
            }
        }
    });
    startShake(12, 6); // Trepidação um pouco mais forte no acerto
}

        // Reset da animação ou retorno ao estado Idle
        if (boss.currentFrame >= maxFrames) {
            if (boss.state === 'attack1') {
                boss.state = 'idle';
                boss.attackCooldown = 200; // Tempo de espera após atacar
            } else if (boss.state === 'hurt') {
                boss.state = 'idle';
            }
            boss.currentFrame = 0;
        }
    }

    // Timers de sistema
    if (boss.dialogueTimer > 0) boss.dialogueTimer--;
    if (boss.attackCooldown > 0) boss.attackCooldown--;
}

// --- FUNÇÃO ADICIONADA: DANO DO BOSS ---
function aplicarDanoBoss(dmg) {
    const alvo = obterAlvoMaisProximo(boss);
    if (alvo) {
        processDamage(dmg, alvo);
    }
}

function processDamage(dmg, alvo) {
 if (!alvo || alvo.state === 'dead' || alvo.invulnerable) return;

    if (alvo.state !== 'hurt' && alvo.state !== 'dead') {
        alvo.hp -= dmg;
        alvo.state = 'hurt';
        alvo.currentFrame = 0;
        alvo.frameTimer = 0;

        // Adicionando Knockback que faltava aqui:
        const direcao = (alvo.x < (boss ? boss.x : alvo.x)) ? -1 : 1;
        alvo.velX = direcao * 10; // Impulso horizontal
        alvo.velY = -5;          // Pequeno pulo ao levar dano
        
        cameraX += (Math.random() - 0.5) * 20;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    // --- CÁLCULO DO SHAKE ---
    let shakeX = 0;
    let shakeY = 0;
    if (screenShakeTimer > 0) {
        // Gera um deslocamento aleatório baseado na intensidade
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
        screenShakeTimer--;
    }

    ctx.save();
    
    // --- APLICAÇÃO DA CÂMERA + SHAKE ---
    // Adicionamos shakeX e shakeY ao final dos cálculos de translação
    ctx.setTransform(
        zoom, 0, 0, zoom,
        -Math.floor((cameraX + shakeX) * zoom),
        -Math.floor((cameraY + shakeY) * zoom)
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
    const allEntities = [...enemies, player];
    if (player2 && player2.active) allEntities.push(player2); 
    if (boss) allEntities.push(boss);

    allEntities.forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;

        if (obj.state === 'walking' || obj.state === 'patrol'  || obj.state === 'chase') { img = obj.imgWalk; totalF = obj.walkFrames; }
        else if (obj.state === 'running') { img = obj.imgRun; totalF = obj.runFrames; }
        else if (obj.state === 'attacking' || obj.state === 'attack1') { img = obj.imgAttack || obj.imgAttack1; totalF = obj.attackFrames || obj.attack1Frames; }
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

    // Foreground
    foregroundObjects.forEach(d => {
        if (d.img.complete) ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
    });

    // Potions
    potions.forEach(p => { if (p.active && potionImg.complete) ctx.drawImage(potionImg, p.x, p.y, p.width, p.height); });
    ctx.restore();

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

// Vida Boss (Só aparece se o Boss existir E tiver visto o player)
if (boss && boss.hp > 0 && boss.viuPlayer) {
    ctx.fillStyle = "rgba(0,0,0,0.7)"; 
    ctx.fillRect(canvas.width/2 - 200, 40, 400, 20);
    
    ctx.fillStyle = "purple"; 
    ctx.fillRect(canvas.width/2 - 200, 40, (boss.hp / boss.maxHp) * 400, 20);
    
    ctx.strokeStyle = "white"; 
    ctx.strokeRect(canvas.width/2 - 200, 40, 400, 20);
    
    ctx.fillStyle = "white"; 
    ctx.font = "bold 14px Arial"; 
    ctx.textAlign = "center";
    ctx.fillText("Dragon", canvas.width/2, 35);
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
                if (title) title.innerHTML = "Você derrubou <br> Dragon";
                if (subtitle) subtitle.innerHTML = "Vocês sente o caos se dissipar.";
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
    let ativos = 1; 
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
    localStorage.setItem('capitulo_4_vencido', 'true');
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