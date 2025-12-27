const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.preload = "auto";

const gravity = 0.8;
const zoom = 2; 
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
    x: 140, y: 200, width: 100, height: 100,
    velX: 0, velY: 0, speed: 3, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 3, maxHp: 3, canAirAttack: true,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image(),
    attackFrames: 6, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", dialogueTimer: 0,
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
    player.walkFrames = 8;
    player.jumpFrames = (heroiPadrao === 'Knight') ? 6 : 8;
    player.hurtFrames = 3;
    player.deadFrames = (heroiPadrao === 'Knight') ? 4 : 3;
    player.attackFrames = (heroiPadrao === 'Knight') ? 5 : 6;

    // 4. Carrega os Assets da pasta correta
    player.imgIdle.src = `assets/${heroiPadrao}/Idle.png`;
    player.imgWalk.src = `assets/${heroiPadrao}/Walk.png`;
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
];

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
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
    { x: 0, y: 300, w: 7000, h: 150, type: 'pattern' },
];

// --- Cenário ---
const fundoImg = new Image();
fundoImg.src = 'assets/Battleground/fundo.png';

const platformImg = new Image();
platformImg.src = 'assets/Battleground/Ground.png';

let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

let keys = { left: false, right: false };

const backgroundObjects = [
    { x: 0, y: 0, width: 7000, height: 2000, img: fundoImg },

];

const foregroundObjects = [
    { x: 0, y: 5, width: 200, height: 300, img: middle_lane_tree2Img },

];

// NPCs
const farmerNpc = {
    x: 2560, y: 110, width: 70, height: 90, imgIdle: new Image(),
    idleFrames: 4, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    phrases: [
"Socorro!", 
],
    dialogueIndex: 0, dialogueTimer: 0,  lastDialogueIndex: -1,
};

farmerNpc.imgIdle.src = 'assets/Farmer/Idle.png';

const npcs = [farmerNpc];

// NPCs
function npcSay(npc, index=0, duration=120){ npc.dialogueIndex=index; npc.dialogueTimer=duration; }
function updateNPCs() {
    npcs.forEach(n => {

        let newIndex;

        if (player.x < 2350) newIndex = 0;
        else if (player.x < 2450) newIndex = 1;
        else if (player.x < 2550) newIndex = 2;
        else newIndex = 3;

        // só muda se for diferente
        if (newIndex !== n.lastDialogueIndex) {
            n.dialogueIndex = newIndex;
            n.dialogueTimer = 160;
            n.lastDialogueIndex = newIndex;
        } else if (n.dialogueTimer > 0) {
            n.dialogueTimer--;
        }

        // animação idle
        n.frameTimer++;
        if (n.frameTimer >= n.frameInterval) {
            n.frameTimer = 0;
            n.currentFrame = (n.currentFrame + 1) % n.idleFrames;
        }
    });
}

// --- FUNÇÃO GLOBAL PARA FALA DO PLAYER ---
window.playerSay = function(text, duration = 160) {
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
    player.y = 100; 
    player.velX = 0; 
    player.velY = 0; 
    player.state = 'idle';
    
    cameraX = 0; 
    isPaused = false; 
    gameState = 'playing';
    
    boss = null;
    initEnemies();
};
// Função para salvar o progresso e voltar ao menu raiz

window.concluirCapituloEVoutar = function() {
    localStorage.setItem('capitulo_2_vencido', 'true');
    
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

// Dentro de la función checkMeleeHit
enemies.forEach(en => {
    if (en.state === 'dead') return; 

    if (hitboxX < en.x + en.width && hitboxX + alcance > en.x &&
        player.y < en.y + en.height && player.y + player.height > en.y) {
        
        en.hp--; 
        en.state = 'hurt';
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
                boss.dialogue = "O poder...";
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

// --- UPDATE ---
function update(){
    if(player.hp<=0){player.state='dead'; return;}
    if(gameState!=='playing'||isPaused) return;
    updateNPCs();

    if(player.y>=450){ player.hp=0; player.state='dead'; return;}

    if(player.state!=='attacking'){ if(keys.left) player.velX=-player.speed; else if(keys.right) player.velX=player.speed; else player.velX*=0.7; } else player.velX=0;

    if(player.dialogueTimer>0){ player.dialogueTimer--; if(player.dialogueTimer<=0) player.dialogue=""; }

// ===== FÍSICA VERTICAL =====
// assume que está no ar
player.onGround = false;

// aplica gravidade
player.velY += gravity;
if (player.velY > 20) player.velY = 20;

// move verticalmente
player.y += player.velY;

// --- colisão com plataformas retas ---
platforms.forEach(p => {
    if(p.type === 'sloped') return; // ignora slopes aqui

    const playerBottom = player.y + player.height;
    const playerPrevBottom = playerBottom - player.velY;

    const overlapX =
        player.x + player.width > p.x &&
        player.x < p.x + p.w;

    if (overlapX && playerPrevBottom <= p.y && playerBottom >= p.y) {
        player.y = p.y - player.height;
        player.velY = 0;
        player.onGround = true;
    }
});

// --- colisão com slopes ---
platforms.forEach(p => {
    if(p.type !== 'sloped') return;

    let relativeX = player.x + player.width/2 - p.x;
    let slopeY = p.y - relativeX * p.slope;

    if(player.x + player.width > p.x && player.x < p.x + p.w) {
        if(player.y + player.height > slopeY && player.y + player.height - player.velY <= slopeY) {
            player.y = slopeY - player.height;
            player.velY = 0;
            player.onGround = true;
        }
    }
});

// ===== MOVIMENTO HORIZONTAL =====
player.x += player.velX;

// limites do mapa
if (player.x < 0) player.x = 0;
if (player.x + player.width > mapWidth)
    player.x = mapWidth - player.width; 

    if(player.onGround) player.canAirAttack=true;

    // ANIMAÇÃO PLAYER
    player.frameTimer++;
    if(player.frameTimer>=player.frameInterval){
        player.frameTimer=0;
        if(player.state==='attacking'){
            player.currentFrame++; 
            if(player.currentFrame>=player.attackFrames){
                if(!player.onGround) player.state='jumping'; 
                else if(Math.abs(player.velX)>0.5) player.state='walking'; 
                else player.state='idle';
                player.currentFrame=0;
            }
        } else if(!player.onGround){ player.state='jumping'; player.currentFrame=(player.currentFrame+1)%player.jumpFrames; }
        else if(Math.abs(player.velX)>0.5){ player.state='walking'; player.currentFrame=(player.currentFrame+1)%player.walkFrames; }
        else{ player.state='idle'; player.currentFrame=(player.currentFrame+1)%player.idleFrames;}
    }

// --- CÂMERA DINÂMICA ---
let targetX = (player.x + player.width / 2) - (canvas.width / (2 * zoom));
let targetY = (player.y + player.height / 2) - (canvas.height / (2 * zoom));

// Suavização
cameraX += (targetX - cameraX) * 0.1;
cameraY += (targetY - cameraY) * 0.1;

// Limites da câmera
cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
cameraY = Math.max(0, Math.min(cameraY, mapHeight - canvas.height / zoom));

// --- LÓGICA DOS INIMIGOS (Dentro da função update) ---
enemies.forEach(en => {
    // 1. Definições iniciais de patrulha e gravidade
    if(en.patrolMinX === undefined){ en.patrolMinX = en.x - 120; en.patrolMaxX = en.x + 120; }
    let dist = Math.abs(player.x - en.x);
    en.velY += gravity; 
    en.y += en.velY; 
    en.onGround = false;

    // Colisão com plataformas
    platforms.forEach(p => {
        if(en.x + 40 < p.x + p.w && en.x + 60 > p.x && en.y + en.height >= p.y && en.y + en.height <= p.y + 10){ 
            en.y = p.y - en.height; 
            en.velY = 0; 
            en.onGround = true; 
        }
    });

    // 2. LÓGICA DE ESTADOS E ANIMAÇÃO
    
    // --- ESTADO MORTO (DEAD) ---
    if (en.state === 'dead') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            // "Travão": Só aumenta o frame se ainda não chegou ao último
            if (en.currentFrame < en.deadFrames - 1) {
                en.currentFrame++;
            }
        }
        return; // IMPORTANTE: Impede que o inimigo morto ande ou ataque
    }

    // --- ESTADO DE DANO (HURT) ---
    else if (en.state === 'hurt') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            en.currentFrame++;
            // Quando a animação de dano acaba, ele volta a perseguir
            if (en.currentFrame >= en.hurtFrames) {
                en.state = 'chase';
                en.currentFrame = 0;
            }
        }
    }

    // --- ESTADO DE PATRULHA (PATROL) ---
    else if (en.state === 'patrol') {
        if (en.facing === 'left') {
            en.x -= en.speed; 
            if (en.x <= en.patrolMinX) en.facing = 'right'; 
        } else {
            en.x += en.speed; 
            if (en.x >= en.patrolMaxX) en.facing = 'left'; 
        }
        if (dist < 100) en.state = 'chase';
        
        // Animação de caminhada
        en.frameTimer++;
        if(en.frameTimer >= en.frameInterval){
            en.currentFrame = (en.currentFrame + 1) % en.walkFrames;
            en.frameTimer = 0;
        }
    }

    // --- ESTADO DE PERSEGUIÇÃO (CHASE) ---
    else if (en.state === 'chase') { 
        const minDist = 30; 
        if (dist > minDist) { 
            if (player.x < en.x) { en.x -= en.speed * 1.2; en.facing = 'left'; } 
            else { en.x += en.speed * 1.2; en.facing = 'right'; }
        }
        if (dist <= en.attackRange && en.attackCooldown <= 0) { 
            en.state = 'attacking'; 
            en.currentFrame = 0; 
            en.frameTimer = 0;
        } 
        if (dist > 150) en.state = 'patrol'; 

        // Animação de caminhada (chase usa walkFrames)
        en.frameTimer++;
        if(en.frameTimer >= en.frameInterval){
            en.currentFrame = (en.currentFrame + 1) % en.walkFrames;
            en.frameTimer = 0;
        }
    }        

    // --- ESTADO DE ATAQUE (ATTACKING) ---
    else if (en.state === 'attacking') {
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            en.frameTimer = 0;
            en.currentFrame++;
            
            // Dano no player (frame 2 do ataque)
            if (en.currentFrame === 5 && dist <= en.attackRange) {
                player.hp -= 1;
                player.state = 'hurt'; // Faz o player reagir ao dano
                en.attackCooldown = 80;
            }
            
            // Finaliza o ataque
            if (en.currentFrame >= en.attackFrames) {
                en.currentFrame = 0;
                en.state = 'chase';
            }
        }
    }

    if (en.attackCooldown > 0) en.attackCooldown--;
});
    // PLAYER DIALOG
    playerDialogTriggers.forEach(trigger=>{
        if(!trigger.used && player.x>trigger.x){ playerSay(trigger.text,180); trigger.used=true;}
    });
// Gatilho para o Boss (Aparece no X: 6400)
if (player.x > 6400 && !boss) {
    boss = {
        type: 'Boss',
        x: 6700,
        y: 200, 
        width: 100,
	height: 100,
        hp: 5, maxHp: 5,
        speed: 4,
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
    const folder = 'assets/Archer'; 
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

function bossDiz(texto, tempo = 120) {
boss.dialogue = texto;
    boss.dialogueTimer = tempo;
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

    // Entidades (Inimigos, Player e Boss)
    const allEntities = [...enemies, player];
    if (boss) allEntities.push(boss);

    allEntities.forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;
        if (obj.state === 'walking') { img = obj.imgWalk; totalF = obj.walkFrames; }
        else if (obj.state === 'attacking') { img = obj.imgAttack; totalF = obj.attackFrames; }
        else if (obj.state === 'jumping') { img = obj.imgJump; totalF = obj.jumpFrames || 8; }
        else if (obj.state === 'hurt') { img = obj.imgHurt; totalF = obj.hurtFrames; }
        else if (obj.state === 'dead') { img = obj.imgDead; totalF = obj.deadFrames; }

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
            ctx.fillStyle = "white"; ctx.fillRect(n.x  + n.width/2 - textWidth/2 - 5, n.y +85, textWidth + 10, 20);
            ctx.fillStyle = "black"; ctx.fillText(text, n.x  + n.width/2, n.y +100);
        }
    });

    // Foreground
    foregroundObjects.forEach(d => {
        if (d.img.complete) ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
    });

    ctx.restore(); // Fecha Câmera

    // 3. UI (Fixo na tela)
    if (gameState === 'playing') {
        // Vida Player
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);

        // Vida Boss
        if (boss && boss.hp > 0) {
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
            if (subtitle) subtitle.innerHTML = "O que ele fez bagunçou o clã dos anões, <br> mas o que você procura está além";

            // ESCONDE o reset e MOSTRA o botão de voltar ao menu (Próxima Fase)
            if (btnReset) btnReset.style.display = 'none';
            if (btnNext) btnNext.style.display = 'block';
        }
    }
}

if (boss && boss.falaTimer > 0) {
    ctx.save();
    ctx.font = "italic bold 16px 'Segoe UI', Arial";
    
    // Mede a largura do texto para centralizar o balão
    let textWidth = ctx.measureText(boss.fala).width;
    let bx = boss.x - cameraX + (boss.width / 2) - (textWidth / 2);
    let by = boss.y - 30; // Posição acima da cabeça

    // Fundo do balão (Sombra/Preto)
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(bx - 10, by - 20, textWidth + 20, 30);
    
    // Texto da fala
    ctx.fillStyle = "#dfa9ff"; // Roxo claro/mágico
    ctx.fillText(boss.fala, bx, by);
    ctx.restore();
}
} // FIM DA FUNÇÃO DRAW

// --- OUTRAS FUNÇÕES ---
function enemySay(en, type) {
    const list = en.phrases[type];
    en.dialogue = list[Math.floor(Math.random() * list.length)];
    en.dialogueTimer = 120;
}

// --- LÓGICA DO BOSS ---
function updateBossLogic() {
    if (!boss) return;

    let dist = Math.abs((player.x + player.width / 2) - (boss.x + boss.width / 2));

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
    boss.velY = (boss.velY || 0) + 0.8;
    boss.y += boss.velY;
    if (boss.y + boss.height > 300) {
        boss.y = 300 - boss.height;
        boss.velY = 0;
    }

    // 3. ANIMAÇÃO E TIMERS
    if (boss.falaTimer > 0) boss.falaTimer--;
    
    // --- LÓGICA DE SUMMONING ---
    if (boss.state !== 'hurt' && boss.state !== 'dead') {
        if (boss.summonCooldown > 0) {
            boss.summonCooldown--;
        } else {
            bossSummonFireSpirit();
            boss.summonCooldown = 60; // Espera 10 segundos para invocar de novo
            boss.state = 'attacking'; // Usa a animação de ataque para invocar
            boss.currentFrame = 0;
        }
    }

    boss.frameTimer++;
    if (boss.frameTimer >= boss.frameInterval) {
        boss.frameTimer = 0;
        
        let maxFrames = 1;
        if (boss.state === 'idle') maxFrames = boss.idleFrames;
        else if (boss.state === 'walking') maxFrames = boss.walkFrames;
        else if (boss.state === 'attacking') maxFrames = boss.attackFrames;
        else if (boss.state === 'hurt') maxFrames = boss.hurtFrames;

        boss.currentFrame++;

        if (boss.state === 'attacking' && boss.currentFrame === 9) {
            if (dist < (boss.attackRange || 100) && player.hp > 0) {
                player.hp -= (boss.damage || 1);
                player.state = 'hurt';
                player.currentFrame = 0;
                player.x += (player.x < boss.x) ? -40 : 40;
            }
        }

        if (boss.currentFrame >= maxFrames) {
            boss.currentFrame = 0;
            if (b