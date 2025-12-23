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
let cameraX = 0, cameraY = 0;
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
        { type: 'Green_Slime', x: 850, y: 200, hp: 1, speed: 1.1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 910, y: 200, hp: 1, speed: 1.0, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 905, y: 200, hp: 1, speed: 0.9, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 907, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 1050, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
	    { type: 'Green_Slime', x: 1120, y: 200, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Blue_Slime', x: 2995, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3000, y: 200, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3005, y: 200, hp: 1, speed: 1.6, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Blue_Slime', x: 3010, y: 200, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3015, y: 200, hp: 1, speed: 1.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 3020, y: 200, hp: 1, speed: 1.9, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Red_Slime', x: 4000, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4005, y: 200, hp: 1, speed: 2.4, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4010, y: 200, hp: 1, speed: 2.3, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4015, y: 200, hp: 1, speed: 2.1, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },

        { type: 'Blue_Slime', x: 5000, y: 200, hp: 1, speed: 1.8, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2495, y: 207, hp: 1, speed: 1.7, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 5005, y: 200, hp: 1, speed: 1.6, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 4995, y: 205, hp: 1, speed: 1.2, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 5000, y: 203, hp: 1, speed: 1.3, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5000, y: 200, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5000, y: 207, hp: 1, speed: 2.5, attackRange: 30, frameInterval: 8, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
   
        { type: 'Enchantress', x: 6600, y: 100, hp: 3, speed: 2, attackRange: 60, idleFrames: 8, walkFrames: 5, attackFrames: 6, hurtFrames: 2, deadFrames: 5, dialogue: "", dialogueTimer: 0,
            phrases: { idle: [
		"O equilíbrio foi quebrado",
		"A energia da terra foi corrompida!",
			     ]
		     }
        }
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

// ---Telhado esquerdo ---
    { x: 300, y: 275, w: 50, h: 20, type: 'sloped', slope: -0.5, alpha: 0 },
// --- Telhado direito ---
    { x: 420, y: 235, w: 50, h: 20, type: 'sloped', slope: 0.5,alpha: 0 },
// --- Cerca ---
    { x: 400, y: 370, w: 150, h: 50, type: 'pattern', alpha: 0 },
// --- Chão parte 1 ---
    { x: 0, y: 400, w: 2000, h: 50, type: 'pattern' },
// --- Poço ---
    { x: 612, y: 323, w: 70, h: 80, type: 'pattern', alpha: 0 },
// --- Árvore ---
    { x: 1970, y: 370, w: 210, h: 20, type: 'stretch', alpha: 0 },
// --- Chão parte 2 ---
    { x: 2150, y: 400, w: 4800, h: 50, type: 'pattern' }, 
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
    { x: 30, y: 400, width: 100, height: 100, img: Decor_CartImg },
	{ x: 270, y: 300, width: 250, height: 200, img: house1Img },
    { x: 600, y: 300, width: 100, height: 100, img: wellImg },

	{ x: 1000, y: 350, width: 50, height: 50, img: tree9Img },
	{ x: 1110, y: 350, width: 50, height: 50, img: tree10Img },
	{ x: 1330, y: 350, width: 50, height: 50, img: tree9Img },
	{ x: 1440, y: 350, width: 50, height: 50, img: tree8Img },
	
	{ x: 1960, y: 200, width: 380, height: 200, img: tree1Img },
	
	{ x: 2470, y: 105, width: 250, height: 300, img: tree5Img },
	
	{ x: 2900, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3010, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3120, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3230, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3340, y: 105, width: 250, height: 300, img: tree2Img },
	
	{ x: 3450, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3560, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3570, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3680, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 3790, y: 105, width: 250, height: 300, img: tree2Img },

	{ x: 4450, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 4560, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 4570, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 4680, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 4790, y: 105, width: 250, height: 300, img: tree2Img },

	{ x: 5450, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 5560, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 5570, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 5680, y: 105, width: 250, height: 300, img: tree2Img },
	{ x: 5790, y: 105, width: 250, height: 300, img: tree2Img },
];

const foregroundObjects = [

        { x: 400, y: 360, width: 50, height: 50, img: fence_01Img },
        { x: 450, y: 360, width: 50, height: 50, img: fence_02Img },
        { x: 500, y: 360, width: 50, height: 50, img: fence_03Img },
	
	    { x: 1220, y: 350, width: 50, height: 50, img: tree11Img },
	
	{ x: 3060, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 3220, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 3560, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 3720, y: 105, width: 300, height: 300, img: tree3Img },

	{ x: 4060, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 4220, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 4560, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 4720, y: 105, width: 300, height: 300, img: tree3Img },

	{ x: 5060, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 5220, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 5560, y: 105, width: 300, height: 300, img: tree3Img },
	{ x: 5720, y: 105, width: 300, height: 300, img: tree3Img },
];

// --- NPCs ---
const oxNpc = {
    x: 120, y: 310, width: 115, height: 115, imgIdle: new Image(),
    idleFrames: 4, currentFrame: 0, frameTimer: 0, frameInterval: 20,
    phrases: ["Muuu!"], dialogueIndex: 0, dialogueTimer: 0
};
oxNpc.imgIdle.src = 'assets/Animals/Without_shadow/Bull_Idle.png';

const satyrNpc = {
    x: 300, y: 290, width: 120, height: 120, imgIdle: new Image(),
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
    player.hp = player.maxHp; player.x = 200; player.y = 100; player.velX = 0; player.velY = 0; player.state='idle';
    cameraX=0; isPaused=false; gameState='playing';
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
function checkMeleeHit(){
    let alcance = player.width *-0.2;
    let hitboxX = player.facing === 'right' ? player.x + player.width : player.x - alcance;

    enemies.forEach(en => {
        if(en.state === 'dead') return;

        // Ajuste do hitbox vertical
        let hitY = en.y + (en.height * 0.3); // começa 30% de baixo do topo
        let hitHeight = en.height * 0.7;     // atinge 70% da altura

        if(
            hitboxX < en.x + en.width &&
            hitboxX + alcance > en.x &&
            player.y < hitY + hitHeight &&
            player.y + player.height > hitY
        ){
            en.hp--;
            if(en.type !== 'Enchantress'){
                en.state = 'hurt';
                en.currentFrame = 0;
                en.frameTimer = 0;
            }
            if(en.hp <= 0){
                en.state = 'dead';
                en.dialogue = "";
                en.dialogueTimer = 0;
                en.currentFrame = 0;
                en.frameTimer = 0;
            }
        }
    });
}

// --- UPDATE ---
function update(){
    if(player.hp<=0){player.state='dead'; return;}
    if(gameState!=='playing'||isPaused) return;
    updateNPCs();

    player.velY+=gravity; player.x+=player.velX;
    if(player.x<0)player.x=0; if(player.x+player.width>mapWidth)player.x=mapWidth-player.width;
    player.y+=player.velY;

    if(Math.abs(player.x-oxNpc.x)<150 && oxNpc.dialogueTimer<=0){ npcSay(oxNpc,0,120); }
    if(player.y>=mapHeight){ player.hp=0; player.state='dead'; return;}

    if(player.state!=='attacking'){ if(keys.left) player.velX=-player.speed; else if(keys.right) player.velX=player.speed; else player.velX*=0.7; } else player.velX=0;

    if(player.dialogueTimer>0){ player.dialogueTimer--; if(player.dialogueTimer<=0) player.dialogue=""; }

    // COLISÃO PLATAFORMAS
    player.onGround=false;

platforms.forEach(p => {
    let nextY = player.y + player.velY;

    if (p.type === 'sloped') {
        let topY = p.y + (player.x + player.width / 2 - p.x) * p.slope;
        if (player.x + player.width > p.x && player.x < p.x + p.w) {
            if (player.y + player.height <= topY && nextY + player.height >= topY) {
                player.y = topY - player.height;
                player.velY = 0;
                player.onGround = true;
            }
        }
    } else {
        if (player.x + 40 < p.x + p.w && player.x + 60 > p.x) {
            if (player.y + player.height <= p.y && nextY + player.height >= p.y) {
                player.y = p.y - player.height;
                player.velY = 0;
                player.onGround = true;
            }
        }
    }
});


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

        if(en.type==='Enchantress' && en.state!=='dead' && dist<200 && en.dialogueTimer<=0){
            en.dialogue=en.phrases.idle[0]; en.dialogueTimer=180;
        }

        en.velY+=gravity; en.y+=en.velY; en.onGround=false;

        platforms.forEach(p=>{
            if(en.x+40<p.x+p.w && en.x+60>p.x && en.y+en.height>=p.y && en.y+en.height<=p.y+10){ en.y=p.y-en.height; en.velY=0; en.onGround=true; }
        });

        if(en.state==='dead'){ if(en.frameTimer>=en.frameInterval && en.currentFrame<en.deadFrames-1){ en.currentFrame++; en.frameTimer=0;} return; }

        if(en.type==='Blue_Slime' && en.onGround){ en.jumpCooldown--; if(en.jumpCooldown<=0){ en.velY=-12; en.onGround=false; en.jumpCooldown=en.jumpInterval; } }

        if(en.state==='hurt'){ en.frameTimer++; if(en.frameTimer>=30){ en.state='patrol'; en.frameTimer=0; en.currentFrame=0;} }
        else if(en.state==='patrol'){ if(en.facing==='left'){ en.x-=en.speed; if(en.x<=en.patrolMinX) en.facing='right'; } else{ en.x+=en.speed; if(en.x>=en.patrolMaxX) en.facing='left'; } if(dist<100) en.state='chase'; }
else if(en.state==='chase'){ 
const minDist = 30; 
if(dist > minDist) { 
if(player.x < en.x){ 
            en.x -= en.speed*1.2; 
            en.facing='left'; 
        } else { 
            en.x += en.speed*1.2; 
            en.facing='right'; 
        }
    }
    if(dist <= en.attackRange && en.attackCooldown<=0){ 
        en.state='attacking'; 
        en.currentFrame=0; 
    } 
    if(dist > 150) en.state='patrol'; 
}        
else if(en.state==='attacking'){ const attackFrame=2; en.frameTimer++; if(en.frameTimer>=en.frameInterval){ en.frameTimer=0; en.currentFrame++; if(en.currentFrame===attackFrame && dist<=en.attackRange){ player.hp-=1; en.attackCooldown=80;} if(en.currentFrame>=en.attackFrames){ en.currentFrame=0; en.state='chase'; } } }

        else if(en.state==='attacking'){ 
    const attackFrame = 5; // frame que o ataque realmente acerta
    en.frameTimer++; 
    if(en.frameTimer >= en.frameInterval){ 
        en.frameTimer = 0; 
        en.currentFrame++;

        // dano só no frame do ataque e com hitbox
        if(en.currentFrame === attackFrame){ 
            let hitX = en.facing === 'right' ? en.x + en.width : en.x - en.attackRange;
            if(player.x + player.width > hitX && player.x < hitX + en.attackRange &&
               player.y + player.height > en.y && player.y < en.y + en.height) {
                player.hp -= 1;
                en.attackCooldown = 80;
            }
        }

        // final da animação de ataque
        if(en.currentFrame >= en.attackFrames){ 
            en.currentFrame = 0; 
            en.state = 'chase'; 
        } 
    } 
}

// cooldown do ataque
if(en.attackCooldown > 0) en.attackCooldown--;

// animação geral
en.frameTimer++; 
if(en.frameTimer >= en.frameInterval){ 
    let totalF = (en.state === 'attacking') ? en.attackFrames : en.walkFrames; 
    en.currentFrame = (en.currentFrame + 1) % totalF; 
    en.frameTimer = 0; 
}
});

    // PLAYER DIALOG
    playerDialogTriggers.forEach(trigger=>{
        if(!trigger.used && player.x>trigger.x){ playerSay(trigger.text,180); trigger.used=true;}
    });
}


function draw() {
    // 1. PRIMEIRO: Limpamos a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    // 2. DEPOIS: Desenhamos o mundo (Câmera)
    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // 3. Plataformas

    backgroundObjects.forEach(d => {
	if (d.img.complete) {
	    ctx.drawImage(d.img, d.x, d.y, d.width, d.height);
  	}
    });

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

    ctx.restore(); // só aqui
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
if (obj.state !== 'dead' && obj.dialogue && obj.dialogueTimer > 0) {
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";

    let textWidth = ctx.measureText(obj.dialogue).width;

    ctx.fillStyle = "white";
    ctx.fillRect(
        obj.x + obj.width / 2 - textWidth / 2 - 5,
        obj.y - 35,
        textWidth + 10,
        20
    );

    ctx.strokeStyle = "black";
    ctx.strokeRect(
        obj.x + obj.width / 2 - textWidth / 2 - 5,
        obj.y - 35,
        textWidth + 10,
        20
    );

    ctx.fillStyle = "black";
    ctx.fillText(
        obj.dialogue,
        obj.x + obj.width / 2,
        obj.y - 20
    );
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

 

// --- GAME LOOP ---
function gameLoop(){ update(); draw(); requestAnimationFrame(gameLoop);}
gameLoop();

// --- CONTROLES ---
window.addEventListener('keydown',(e)=>{
    const k=e.key.toLowerCase();
    if(k==='a') window.mover('left',true);
    if(k==='d') window.mover('right',true);
    if(k==='w'||k===' ') window.pular();
    if(k==='k') window.atacar();
    if(k==='r'){ const boss = enemies.find(en=>en.type==='Enchantress'); if(player.state==='dead'||(boss&&boss.state==='dead')) window.resetGame(); }
});
window.addEventListener('keyup',(e)=>{
    const k=e.key.toLowerCase();
    if(k==='a') window.mover('left',false);
    if(k==='d') window.mover('right',false);
});

const btnReset = document.getElementById('btn-reset');
if(btnReset){ btnReset.addEventListener('pointerdown',(e)=>{ e.preventDefault(); window.resetGame(); }); }























