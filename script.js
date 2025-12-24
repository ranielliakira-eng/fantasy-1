const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 2; 
const mapWidth = 7000;
const mapHeight = 450;
let cameraX = 0;
let cameraY = 0;
let gameState = 'menu';
let isPaused = false;
let isMuted = false;

let boss = null;

// --- JOGADOR ---
const player = {
    x: 200, y: 200, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 3, maxHp: 3, canAirAttack: true,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image(),
    attackFrames: 6, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", dialogueTimer: 0,
};

const playerDialogTriggers = [
    { x: 600, text: "Esses Slimes não deveriam estar aqui.", used: false },
    { x: 1800, text: "A floresta está ficando mais densa.", used: false },
    { x: 6200, text: "Acho que sei o que juntou aqueles Slimes...", used: false },
];

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1000, y: 200, hp: 1, speed: 1.3, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1200, y: 200, hp: 1, speed: 1.4, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1300, y: 200, hp: 1, speed: 1.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1400, y: 200, hp: 1, speed: 1.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1500, y: 200, hp: 1, speed: 1.4, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1250, y: 200, hp: 1, speed: 1.3, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1450, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
       
        { type: 'Blue_Slime', x: 2980, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3000, y: 200, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3025, y: 200, hp: 1, speed: 1.6, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3100, y: 200, hp: 1, speed: 1.6, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3125, y: 200, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3150, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        
        { type: 'Red_Slime', x: 4000, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4050, y: 200, hp: 1, speed: 2.4, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4100, y: 200, hp: 1, speed: 2.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4200, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },

        { type: 'Green_Slime', x: 5000, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 5100, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
         	
        { type: 'Blue_Slime', x: 5000, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 5125, y: 207, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 

        { type: 'Red_Slime', x: 5000, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5150, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
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
    { x: 2150, y: 300, w: 4800, h: 150, type: 'pattern' }, 
];

// --- Cenário ---
const platformImg = new Image();
platformImg.src = 'assets/Battleground/Battleground1/summer_0/Environment/Ground_11.png';

const tree1Img = new Image();
tree1Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree1.png';
const tree2Img = new Image();
tree2Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree2.png';
const tree3Img = new Image();
tree3Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree3.png';
const tree4Img = new Image();
tree4Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree4.png';
const tree5Img = new Image();
tree5Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree5.png';
const tree6Img = new Image();
tree6Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree6.png';
const tree7Img = new Image();
tree7Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree7.png';
const tree8Img = new Image();
tree8Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree8.png';
const tree9Img = new Image();
tree9Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree9.png';
const tree10Img = new Image();
tree10Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree10.png';
const tree11Img = new Image();
tree11Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/trees/middle_lane_tree11.png';

const wellImg = new Image();
wellImg.src = 'assets/Battleground/Battleground1/summer_0/Environment/Well.png';

const house1Img = new Image();
house1Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/House1.png';

const Decor_CartImg = new Image();
Decor_CartImg.src = 'assets/Battleground/Battleground1/summer_0/Environment/Decor_Cart.png';

const fence_01Img = new Image();
fence_01Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/Fence_01.png';

const fence_02Img = new Image();
fence_02Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/Fence_02.png';

const fence_03Img = new Image();
fence_03Img.src = 'assets/Battleground/Battleground1/summer_0/Environment/Fence_03.png';

let platformPattern = null;

platformImg.onload = () => {
    platformPattern = ctx.createPattern(platformImg, 'repeat');
};

let keys = { left: false, right: false };

const backgroundObjects = [
        { x: 30, y: 200, width: 100, height: 100, img: Decor_CartImg },
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

	{ x: 6425, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6475, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6525, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6575, y: 275, width: 25, height: 25, img: tree11Img },
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

	{ x: 6400, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6450, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6500, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6550, y: 275, width: 25, height: 25, img: tree11Img },
	{ x: 6600, y: 275, width: 25, height: 25, img: tree11Img },
];

// --- NPCs ---
const oxNpc = {
    x: 120, y: 220, width: 100, height: 100, imgIdle: new Image(),
    idleFrames: 4, currentFrame: 0, frameTimer: 0, frameInterval: 20,
    phrases: ["Muuu!"], dialogueIndex: 0, dialogueTimer: 0
};
oxNpc.imgIdle.src = 'assets/Animals/Without_shadow/Bull_Idle.png';

const satyrNpc = {
    x: 300, y: 190, width: 120, height: 120, imgIdle: new Image(),
    idleFrames: 6, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    phrases: [
"Que bom que você chegou!", 
"Cuidado com os Slimes!", 
"Os Slimes estão vindo da floresta."
],
    dialogueIndex: 0, dialogueTimer: 0
};
satyrNpc.imgIdle.src = 'assets/Satyr_3/Idle.png';

const npcs = [oxNpc, satyrNpc];

// --- FUNÇÃO GLOBAL PARA FALA DO PLAYER ---
window.playerSay = function(text, duration = 120) {
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
    player.x = 200; 
    player.y = 100; 
    player.velX = 0; 
    player.velY = 0; 
    player.state = 'idle';
    
    cameraX = 0; 
    isPaused = false; 
    gameState = 'playing';
    
    boss = null; // <--- ADICIONE ISSO: Remove o boss atual para ele dar spawn de novo no gatilho
    initEnemies();
};

// Escolher personagem
window.escolherPersonagem = function(genero) {
    const menu = document.getElementById('selection-menu'); if(menu) menu.style.display='none';
    const folder = (genero==='menina')?'Knight':'Swordsman';
    player.idleFrames = (genero==='menina')?6:8;
    player.walkFrames = (genero==='menina')?8:8;
    player.jumpFrames = (genero==='menina')?6:8;
    player.hurtFrames = (genero==='menina')?3:3;
    player.deadFrames = (genero==='menina')?4:3;
    player.attackFrames = (genero==='menina')?5:6;
    player.imgIdle.src = `assets/${folder}/Idle.png`;
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;
    gameState='playing'; initEnemies(); bgMusic.play().catch(()=>{}); 
    document.getElementById('mobile-controls').style.display='flex';
};

// Movimentação
window.mover = function(dir, estado) { if(gameState!=='playing'||player.state==='dead'||isPaused) return; if(dir==='left') keys.left=estado; if(dir==='right') keys.right=estado; if(estado) player.facing=dir; };
window.pular = function() { if(gameState==='playing' && player.onGround && !isPaused){player.velY=player.jumpForce; player.onGround=false;} };
window.atacar = function() { if(player.state==='dead'){window.resetGame(); return;} if(gameState!=='playing'||isPaused)return; if(player.state==='attacking')return; if(!player.onGround && !player.canAirAttack)return; player.state='attacking'; player.currentFrame=0; if(!player.onGround) player.canAirAttack=false; checkMeleeHit(); };

// NPCs
function npcSay(npc, index=0, duration=120){ npc.dialogueIndex=index; npc.dialogueTimer=duration; }
function updateNPCs(){ npcs.forEach(n=>{ if(n.dialogueTimer>0)n.dialogueTimer--; else{ n.dialogueIndex=Math.floor(Math.random()*n.phrases.length); n.dialogueTimer=180+Math.floor(Math.random()*120);} n.frameTimer++; if(n.frameTimer>=n.frameInterval){ n.frameTimer=0; n.currentFrame=(n.currentFrame+1)%n.idleFrames; } }); }

// HIT MELEE
function checkMeleeHit() {
    let alcance = player.width * -0.2;
    let hitboxX = player.facing === 'right' ? player.x + player.width : player.x - alcance;

    // 1. Dano nos inimigos comuns
    enemies.forEach(en => {
        if (en.state === 'dead') return;
        let hitY = en.y + (en.height * 0.3);
        let hitHeight = en.height * 0.7;

        if (hitboxX < en.x + en.width && hitboxX + alcance > en.x &&
            player.y < hitY + hitHeight && player.y + player.height > hitY) {
            en.hp--;
            en.state = 'hurt';
            en.currentFrame = 0;
            if (en.hp <= 0) en.state = 'dead';
        }
    });

    // 2. NOVA: Dano no Boss
    if (boss && boss.state !== 'dead') {
        // Como o Boss é maior (200px), a detecção precisa ser generosa
        if (hitboxX < boss.x + boss.width && hitboxX + alcance > boss.x &&
            player.y < boss.y + boss.height && player.y + player.height > boss.y) {
            
            boss.hp--;
            boss.state = 'hurt';
            boss.currentFrame = 0;
            boss.frameTimer = 0;

            if (boss.hp <= 0) {
                boss.state = 'dead';
                boss.currentFrame = 0;
                // Opcional: O Boss diz algo ao morrer
                boss.dialogue = "Impossível...";
                boss.dialogueTimer = 180;
            }
        }
    }
}

// --- UPDATE ---
function update(){
    if(player.hp<=0){player.state='dead'; return;}
    if(gameState!=='playing'||isPaused) return;
    updateNPCs();

    if(Math.abs(player.x-oxNpc.x)<150 && oxNpc.dialogueTimer<=0){ npcSay(oxNpc,0,120); }
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


// INIMIGOS
    enemies.forEach(en=>{
        if(en.patrolMinX===undefined){ en.patrolMinX=en.x-120; en.patrolMaxX=en.x+120;}
        if(en.facing===undefined) en.facing='left';
        let dist=Math.abs(player.x-en.x);

        en.velY+=gravity; en.y+=en.velY; en.onGround=false;

        platforms.forEach(p=>{
            if(en.x+40<p.x+p.w && en.x+60>p.x && en.y+en.height>=p.y && en.y+en.height<=p.y+10){ en.y=p.y-en.height; en.velY=0; en.onGround=true; }
        });

        if(en.state==='dead'){ if(en.frameTimer>=en.frameInterval && en.currentFrame<en.deadFrames-1){ en.currentFrame++; en.frameTimer=0;} return; }

        if(en.type==='Blue_Slime' && en.onGround){ en.jumpCooldown--; if(en.jumpCooldown<=0){ en.velY=-12; en.onGround=false; en.jumpCooldown=en.jumpInterval; } }

// --- LÓGICA DE ESTADOS ---
        if(en.state === 'hurt') {
            en.frameTimer++;
            if(en.frameTimer >= 30) { 
                en.state = 'patrol'; 
                en.frameTimer = 0; 
                en.currentFrame = 0;
            }
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
                if(player.x < en.x) { en.x -= en.speed * 1.2; en.facing = 'left'; } 
                else { en.x += en.speed * 1.2; en.facing = 'right'; }
            }
            if(dist <= en.attackRange && en.attackCooldown <= 0) { 
                en.state = 'attacking'; 
                en.currentFrame = 0; 
                en.frameTimer = 0;
            } 
            if(dist > 150) en.state = 'patrol'; 
        }        
        else if(en.state === 'attacking') {
            const attackFrame = 2; // Frame do Slime que causa dano
            en.frameTimer++;
            if(en.frameTimer >= en.frameInterval) {
                en.frameTimer = 0;
                en.currentFrame++;
                
                // Aplica o dano no frame correto
                if(en.currentFrame === attackFrame && dist <= en.attackRange) {
                    player.hp -= 1;
                    en.attackCooldown = 80;
                }
                
                // Volta a perseguir após o ataque
                if(en.currentFrame >= en.attackFrames) {
                    en.currentFrame = 0;
                    en.state = 'chase';
                }
            }
        }

        // Cooldown e Animação Geral (fora dos estados)
        if(en.attackCooldown > 0) en.attackCooldown--;

        // Atualiza a animação para estados que não são 'attacking' (que já tem sua lógica acima)
        if(en.state !== 'attacking' && en.state !== 'dead') {
            en.frameTimer++;
            if(en.frameTimer >= en.frameInterval) {
                let totalF = (en.state === 'patrol' || en.state === 'chase') ? en.walkFrames : en.idleFrames;
                en.currentFrame = (en.currentFrame + 1) % totalF;
                en.frameTimer = 0;
            }
        }
    }); // Fim do forEach

    // PLAYER DIALOG
    playerDialogTriggers.forEach(trigger=>{
        if(!trigger.used && player.x>trigger.x){ playerSay(trigger.text,180); trigger.used=true;}
    });
// Gatilho para o Boss (Aparece no X: 6500)
if (player.x > 6500 && !boss) {
    boss = {
        type: 'Boss',
        x: 6700, // Ele aparece um pouco à frente
        y: 100, 
        width: 100, height: 100, // Boss é maior!
        hp: 10, maxHp: 10,
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
    const folder = 'assets/Enchantress'; 
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
boss.dialogue = texto; // Use 'dialogue' em vez de 'fala'
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
        // Vida Player
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);

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
    const subtitle = screen ? screen.querySelector('p') : null; // Captura o parágrafo (subtítulo)

    if (screen) {
        // CASO A: DERROTA (Player morreu)
        if (player.hp <= 0 || player.state === 'dead') {
            screen.style.display = 'flex';
            screen.style.backgroundColor = "rgba(139, 0, 0, 0.8)"; // Vermelho escuro
            
            if (title) title.innerText = "VOCÊ CAIU...";
            if (subtitle) subtitle.innerText = "Aperte JOGAR para voltar para o início";
        } 
        
        // CASO B: VITÓRIA (Boss morreu)
        else if (boss && boss.state === 'dead' && boss.hp <= 0) {
            if (screen.style.display !== 'flex') {
                screen.style.display = 'flex';
                screen.style.backgroundColor = "rgba(0, 0, 0, 0.8)"; // Verde escuro
                
                if (title) title.innerHTML = "Você derrubou <br>  Enchantress";
                if (subtitle) subtitle.innerHTML = "Mas o desequilíbrio permanece... <br>Algo pior espreita nas sombras.";
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

// --- LÓGICA DO BOSS (ENCHANTRESS) ---
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
            if (dist < (boss.attackRange || 100) && player.hp > 0) {
                player.hp -= (boss.damage || 1);
                player.state = 'hurt';
                player.currentFrame = 0;
                // Knockback
                player.x += (player.x < boss.x) ? -40 : 40;
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
                if (Math.random() < 0.3) bossDiz("Fuja!");
            } else {
                boss.state = 'idle';
            }
        }
    }

    if (boss.attackCooldown > 0) boss.attackCooldown--;
}

// --- LOOP PRINCIPAL E INPUTS ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Inicia o loop
gameLoop();

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') window.mover('left', true);
    if (k === 'd') window.mover('right', true);
    if (k === 'w' || k === ' ') window.pular();
    if (k === 'k') window.atacar();
    if (k === 'r') { if (player.state === 'dead') window.resetGame(); }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') window.mover('left', false);
    if (k === 'd') window.mover('right', false);
});

// Listener para o botão de reset (HTML)
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
    btnReset.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.resetGame();
    });
}