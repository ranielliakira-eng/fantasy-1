const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1.6; 
const mapWidth = 7000; 
let cameraX = 0;
let cameraY = 0;
let gameState = 'menu';
let isPaused = false;
let isMuted = false;

// --- JOGADOR ---
const player = {
    x: 100, y: 100, width: 100, height: 100,
    velX: 0, velY: 0, speed: 5, jumpForce: -15,
    facing: 'right', onGround: false, state: 'idle',
    hp: 3, maxHp: 3, canAirAttack: true,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: 

new Image(),
    imgAttack: new Image(), imgIdle: new Image(),
    attackFrames: 6, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6, dialogue: "", 

dialogueTimer: 0,
};

const playerDialogTriggers = [
    { x: 600, text: "Esses Slimes não deveriam estar aqui.", used: false },
    { x: 1800, text: "A floresta está ficando mais densa.", used: false },
    { x: 4800, text: "Slimes de cores diferentes juntos?", used: false },
    { x: 6200, text: "Acho que sei o que juntou aqueles Slimes...", used: false 

},
];

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 200, hp: 1, speed: 1.2, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 850, y: 200, hp: 1, speed: 1.1, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 910, y: 200, hp: 1, speed: 1.0, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 905, y: 200, hp: 1, speed: 0.9, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 907, y: 200, hp: 1, speed: 1.2, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 1050, y: 200, hp: 1, speed: 1.2, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
		{ type: 'Green_Slime', x: 1120, y: 200, hp: 1, speed: 1.2, 

attackRange: 30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 

6, deadFrames: 3 },
        
        { type: 'Blue_Slime', x: 2995, y: 200, hp: 1, speed: 1.8, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 }, 
        { type: 'Blue_Slime', x: 3000, y: 200, hp: 1, speed: 1.7, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 }, 
        { type: 'Blue_Slime', x: 3005, y: 200, hp: 1, speed: 1.6, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Blue_Slime', x: 3010, y: 200, hp: 1, speed: 1.7, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 }, 
        { type: 'Blue_Slime', x: 3015, y: 200, hp: 1, speed: 1.5, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 }, 
        { type: 'Blue_Slime', x: 3020, y: 200, hp: 1, speed: 1.9, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        
        { type: 'Red_Slime', x: 4000, y: 200, hp: 1, speed: 2.5, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Red_Slime', x: 4005, y: 200, hp: 1, speed: 2.4, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Red_Slime', x: 4010, y: 200, hp: 1, speed: 2.3, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Red_Slime', x: 4015, y: 200, hp: 1, speed: 2.1, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },

        { type: 'Blue_Slime', x: 5000, y: 200, hp: 1, speed: 1.8, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 }, 
        { type: 'Blue_Slime', x: 2495, y: 207, hp: 1, speed: 1.7, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 }, 
        { type: 'Blue_Slime', x: 5005, y: 200, hp: 1, speed: 1.6, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 4995, y: 205, hp: 1, speed: 1.2, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Green_Slime', x: 5000, y: 203, hp: 1, speed: 1.3, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Red_Slime', x: 5000, y: 200, hp: 1, speed: 2.5, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
        { type: 'Red_Slime', x: 5000, y: 207, hp: 1, speed: 2.5, attackRange: 

30, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 

3 },
   
        { 
            type: 'Enchantress',
            x: 6600, y: 100, hp: 3, speed: 2, attackRange: 60,
            idleFrames: 8, walkFrames: 5, attackFrames: 6, hurtFrames: 2, 

deadFrames: 5,
            dialogue: "", dialogueTimer: 0,
            phrases: { idle: ["O equilíbrio foi quebrado","A energia da terra 

foi corrompida!"] }
        }
    ];

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/

${en.type}/Attack_1.png`;
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
    { x: 0, y: 300, w: 2000, h: 200, type: 'pattern' },
    { x: 620, y: 200, w: 80, h: 80, type: 'pattern', alpha: 1 },
    { x: 1970, y: 270, w: 210, h: 20, type: 'stretch' },
    { x: 2150, y: 300, w: 4800, h: 200, type: 'pattern' },  
];

const platformImg = new Image();
platformImg.src = 

'assets/Battleground/Battleground1/summer_0/Environment/Ground_11.png';
let platformPattern = null;
platformImg.onload = () => { platformPattern = ctx.createPattern(platformImg, 

'repeat'); };

// --- BACKGROUND ---
const wellImg = new Image(); wellImg.src = 

'assets/Battleground/Battleground1/summer_0/Environment/Well.png';
// ... árvores, casas e outros objetos ...

let keys = { left: false, right: false };

// --- NPCs ---
const oxNpc = {
    x: 120, y: 210, width: 115, height: 115, imgIdle: new Image(),
    idleFrames: 4, currentFrame: 0, frameTimer: 0, frameInterval: 20,
    phrases: ["Muuu!"], dialogueIndex: 0, dialogueTimer: 0
};
oxNpc.imgIdle.src = 'assets/Animals/Without_shadow/Bull_Idle.png';

const satyrNpc = {
    x: 300, y: 190, width: 120, height: 120, imgIdle: new Image(),
    idleFrames: 6, currentFrame: 0, frameTimer: 0, frameInterval: 16,
    phrases: ["Que bom que você chegou!", "Cuidado com os Slimes!", "Os Slimes 

estão vindo da floresta."],
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
window.togglePause = function() { if (gameState !== 'playing') return; isPaused 

= !isPaused; if (isPaused) bgMusic.pause(); else if (!isMuted) bgMusic.play

().catch(() => {}); };
window.toggleSom = function() { isMuted = !isMuted; bgMusic.muted = isMuted; 

const btn = document.getElementById('btn-audio'); if(btn) btn.innerText = 

isMuted ? "Mudo" : "Som"; };
window.resetGame = function() {
    const screen = document.getElementById('game-over-screen'); if(screen) 

screen.style.display='none';
    player.hp = player.maxHp; player.x = 200; player.y = 100; player.velX = 0; 

player.velY = 0; player.state='idle';
    cameraX=0; isPaused=false; gameState='playing';
    initEnemies();
};

// Escolher personagem
window.escolherPersonagem = function(genero) {
    const menu = document.getElementById('selection-menu'); if(menu) 

menu.style.display='none';
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
window.mover = function(dir, estado) { if(gameState!=='playing'||

player.state==='dead'||isPaused) return; if(dir==='left') keys.left=estado; if

(dir==='right') keys.right=estado; if(estado) player.facing=dir; };
window.pular = function() { if(gameState==='playing' && player.onGround && !

isPaused){player.velY=player.jumpForce; player.onGround=false;} };
window.atacar = function() { if(player.state==='dead'){window.resetGame(); 

return;} if(gameState!=='playing'||isPaused)return; if

(player.state==='attacking')return; if(!player.onGround && !

player.canAirAttack)return; player.state='attacking'; player.currentFrame=0; if

(!player.onGround) player.canAirAttack=false; checkMeleeHit(); };

// NPCs
function npcSay(npc, index=0, duration=120){ npc.dialogueIndex=index; 

npc.dialogueTimer=duration; }
function updateNPCs(){ npcs.forEach(n=>{ if(n.dialogueTimer>0)n.dialogueTimer--; 

else{ n.dialogueIndex=Math.floor(Math.random()*n.phrases.length); 

n.dialogueTimer=180+Math.floor(Math.random()*120);} n.frameTimer++; if

(n.frameTimer>=n.frameInterval){ n.frameTimer=0; n.currentFrame=(n.currentFrame

+1)%n.idleFrames; } }); }

// HIT MELEE
function checkMeleeHit(){
    let alcance = player.width*0.4;
    let hitboxX = player.facing==='right'? player.x+player.width: player.x-

alcance;
    enemies.forEach(en=>{
        if(en.state==='dead') return;
        if(hitboxX<en.x+en.width && hitboxX+alcance>en.x && player.y<en.y

+en.height && player.y+player.height>en.y){
            en.hp--; if(en.type!=='Enchantress'){ en.state='hurt'; 

en.currentFrame=0; en.frameTimer=0;}
            if(en.hp<=0){ en.state='dead'; en.dialogue=""; en.dialogueTimer=0; 

en.currentFrame=0; en.frameTimer=0;}
        }
    });
}

// --- UPDATE ---
function update(){
    if(player.hp<=0){player.state='dead'; return;}
    if(gameState!=='playing'||isPaused) return;
    updateNPCs();

    player.velY+=gravity; player.x+=player.velX;
    if(player.x<0)player.x=0; if(player.x+player.width>mapWidth)

player.x=mapWidth-player.width;
    player.y+=player.velY;

    if(Math.abs(player.x-oxNpc.x)<150 && oxNpc.dialogueTimer<=0){ npcSay

(oxNpc,0,120); }
    if(player.y>=450){ player.hp=0; player.state='dead'; return;}

    if(player.state!=='attacking'){ if(keys.left) player.velX=-player.speed; 

else if(keys.right) player.velX=player.speed; else player.velX*=0.7; } else 

player.velX=0;

    if(player.dialogueTimer>0){ player.dialogueTimer--; if

(player.dialogueTimer<=0) player.dialogue=""; }

    // COLISÃO PLATAFORMAS
    player.onGround=false;
    platforms.forEach(p=>{
        if(player.x+40<p.x+p.w && player.x+60>p.x && player.y+player.height>=p.y 

&& player.y+player.height<=p.y+10){
            player.y=p.y-player.height; player.velY=0; player.onGround=true;
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
        } else if(!player.onGround){ player.state='jumping'; 

player.currentFrame=(player.currentFrame+1)%player.jumpFrames; }
        else if(Math.abs(player.velX)>0.5){ player.state='walking'; 

player.currentFrame=(player.currentFrame+1)%player.walkFrames; }
        else{ player.state='idle'; player.currentFrame=(player.currentFrame

+1)%player.idleFrames;}
    }

    cameraX += ((player.x + player.width/2) - (canvas.width/2) - cameraX)*0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width));

    // INIMIGOS
    enemies.forEach(en=>{
        if(en.patrolMinX===undefined){ en.patrolMinX=en.x-120; 

en.patrolMaxX=en.x+120;}
        if(en.facing===undefined) en.facing='left';
        let dist=Math.abs(player.x-en.x);

        if(en.type==='Enchantress' && en.state!=='dead' && dist<200 && 

en.dialogueTimer<=0){
            en.dialogue=en.phrases.idle[0]; en.dialogueTimer=180;
        }

        en.velY+=gravity; en.y+=en.velY; en.onGround=false;
        platforms.forEach(p=>{
            if(en.x+40<p.x+p.w && en.x+60>p.x && en.y+en.height>=p.y && en.y

+en.height<=p.y+10){ en.y=p.y-en.height; en.velY=0; en.onGround=true; }
        });

        if(en.state==='dead'){ if(en.frameTimer>=en.frameInterval && 

en.currentFrame<en.deadFrames-1){ en.currentFrame++; en.frameTimer=0;} return; }

        if(en.type==='Blue_Slime' && en.onGround){ en.jumpCooldown--; if

(en.jumpCooldown<=0){ en.velY=-12; en.onGround=false; 

en.jumpCooldown=en.jumpInterval; } }

        if(en.state==='hurt'){ en.frameTimer++; if(en.frameTimer>=30){ 

en.state='patrol'; en.frameTimer=0; en.currentFrame=0;} }
        else if(en.state==='patrol'){ if(en.facing==='left'){ en.x-=en.speed; 

if(en.x<=en.patrolMinX) en.facing='right'; } else{ en.x+=en.speed; if

(en.x>=en.patrolMaxX) en.facing='left'; } if(dist<100) en.state='chase'; }
        else if(en.state==='chase'){ if(player.x<en.x){ en.x-=en.speed*1.2; 

en.facing='left'; } else{ en.x+=en.speed*1.2; en.facing='right'; } if

(dist<=en.attackRange && en.attackCooldown<=0){ en.state='attacking'; 

en.currentFrame=0; } if(dist>150) en.state='patrol'; }
        else if(en.state==='attacking'){ const attackFrame=2; en.frameTimer++; 

if(en.frameTimer>=en.frameInterval){ en.frameTimer=0; en.currentFrame++; if

(en.currentFrame===attackFrame && dist<=en.attackRange){ player.hp-=1; 

en.attackCooldown=80;} if(en.currentFrame>=en.attackFrames){ en.currentFrame=0; 

en.state='chase'; } } }

        if(en.attackCooldown>0) en.attackCooldown--;
        en.frameTimer++; if(en.frameTimer>=en.frameInterval){ let totalF=

(en.state==='attacking')?en.attackFrames:en.walkFrames; en.currentFrame=

(en.currentFrame+1)%totalF; en.frameTimer=0; }
    });

    // PLAYER DIALOG
    playerDialogTriggers.forEach(trigger=>{
        if(!trigger.used && player.x>trigger.x){ playerSay(trigger.text,180); 

trigger.used=true;}
    });
}

// --- DRAW ---
function draw(){ /* mantido igual ao seu código anterior */ }

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
    if(k==='r'){ const boss = enemies.find(en=>en.type==='Enchantress'); if

(player.state==='dead'||(boss&&boss.state==='dead')) window.resetGame(); }
});
window.addEventListener('keyup',(e)=>{
    const k=e.key.toLowerCase();
    if(k==='a') window.mover('left',false);
    if(k==='d') window.mover('right',false);
});

const btnReset = document.getElementById('btn-reset');
if(btnReset){ btnReset.addEventListener('pointerdown',(e)=>{ e.preventDefault(); 

window.resetGame(); }); }
