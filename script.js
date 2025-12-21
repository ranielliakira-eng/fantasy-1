const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

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
    hp: 10, maxHp: 10,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image (),
    attackFrames: 6, walkFrames: 8, idleFrames: 8, jumpFrames: 8, deadFrames: 4,
    currentFrame: 0, frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 850, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 910, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 905, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 907, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Blue_Slime', x: 2500, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2505, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2495, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2700, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2705, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 2720, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Red_Slime', x: 4000, y: 300, hp: 1, speed: 2.5, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4005, y: 300, hp: 1, speed: 2.5, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4010, y: 300, hp: 1, speed: 2.5, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 4015, y: 300, hp: 1, speed: 2.5, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },

        { type: 'Blue_Slime', x: 5000, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 5010, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 }, 
        { type: 'Blue_Slime', x: 5005, y: 300, hp: 1, speed: 1.8, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 4995, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Green_Slime', x: 5000, y: 300, hp: 1, speed: 1.2, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5000, y: 300, hp: 1, speed: 2.5, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        { type: 'Red_Slime', x: 5000, y: 300, hp: 1, speed: 2.5, attackRange: 50, frameInterval: 4, walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3 },
        
        { type: 'Enchantress', x: 6600, y: 300, hp: 3, speed: 2, attackRange: 100, idleFrames: 5, walkFrames: 8, attackFrames: 6, hurtFrames: 2, deadFrames: 5, dialogue: "", dialogueTimer: 0,}
    ];

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
        
        en.width = 100; en.height = 100;
        en.currentFrame = 0; en.frameTimer = 0; en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left'; en.attackCooldown = 0;
    });
}

const platforms = [
    { x: 0, y: 400, w: mapWidth, h: 60 },
    { x: 6400, y: 280, w: 500, h: 20 }
];

let keys = { left: false, right: false };

// --- SISTEMA ---
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
    player.hp = player.maxHp; player.x = 100; player.y = 100;
    player.velX = 0; player.velY = 0; player.state = 'idle';
    cameraX = 0; isPaused = false; gameState = 'playing';
    initEnemies();
};

window.escolherPersonagem = function(genero) {
    const menu = document.getElementById('selection-menu');
    if (menu) menu.style.display = 'none';
    
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    player.idleFrames = (genero === 'menina') ? 6 : 8;
    player.walkFrames = (genero === 'menina') ? 8 : 8;
    player.jumpFrames = (genero === 'menina') ? 6 : 8;
    player.hurtFrames = (genero === 'menina') ? 3 : 3;
    player.deadFrames = (genero === 'menina') ? 4 : 3;
    player.attackFrames = (genero === 'menina') ? 5 : 6;

    player.imgIdle.src = `assets/${folder}/Idle.png`;
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});
    document.getElementById('mobile-controls').style.display = 'flex';
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
    if (gameState !== 'playing' || isPaused || !player.onGround) return;
    if (player.state === 'attacking') return;

    player.state = 'attacking'; 
    player.currentFrame = 0;
    checkMeleeHit();
};

function checkMeleeHit() {
    // 1. Defina o novo alcance (ex: 30 pixels em vez de 60)
    let alcance = 10; 
    
    // 2. Ajuste a posição inicial
    // Direita: Começa colado no player. Esquerda: Recua apenas o tamanho do alcance.
    let hitboxX = player.facing === 'right' ? player.x + player.width : player.x - alcance;

    enemies.forEach(en => {
        if (en.state === 'dead') {
    en.frameTimer++;
    if (en.frameTimer >= en.frameInterval) {
        if (en.currentFrame < en.deadFrames - 1) {
            en.currentFrame++;
        } else {
            // Se for a Enchantress, ela pode sumir ou ficar caída
            if (en.type === 'Enchantress') {
                en.dialogue = "A energia... se esvai...";
                en.dialogueTimer = 100;
            }
        }
        en.frameTimer = 0;
    }
    return;
}
        if (en.state === 'dead') return;

        // 3. Use a variável 'alcance' na verificação de colisão
        if (hitboxX < en.x + en.width && 
            hitboxX + alcance > en.x && 
            player.y < en.y + en.height && 
            player.y + player.height > en.y) {
            
            en.hp -= 1;

            if (en.type !== 'Enchantress') {
                en.state = 'hurt';
                en.currentFrame = 0;
                en.frameTimer = 0;
            }

            if(en.hp <= 0) {
                en.state = 'dead';
                en.currentFrame = 0;
            }
        }
    });
}

// --- LÓGICA (UPDATE) ---
function update() {
    if (player.state === 'dead') {
        player.frameTimer++;
        if (player.frameTimer >= player.frameInterval) {
            if (player.currentFrame < player.deadFrames - 1) player.currentFrame++;
            player.frameTimer = 0;
        }
        return;
    }

    if (gameState !== 'playing' || isPaused) return;

    if (player.hp <= 0) { player.state = 'dead'; player.currentFrame = 0; return; }

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;
    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.7;

    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + 40 < p.x + p.w && player.x + 60 > p.x && 
            player.y + player.height >= p.y && player.y + player.height <= p.y + 10) {
            player.y = p.y - player.height; player.velY = 0; player.onGround = true;
        }
    });

    // Animação Player
    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
        player.frameTimer = 0;
        if (player.state === 'attacking') {
            player.currentFrame++;
            if (player.currentFrame >= player.attackFrames) { player.state = 'idle'; player.currentFrame = 0; }
        } else if (!player.onGround) {
            player.state = 'jumping';
            player.currentFrame = (player.currentFrame + 1) % player.jumpFrames;
        } else if (Math.abs(player.velX) > 0.5) {
            player.state = 'walking';
            player.currentFrame = (player.currentFrame + 1) % player.walkFrames;
        } else {
            player.state = 'idle';
            player.currentFrame = (player.currentFrame + 1) % player.idleFrames;
        }
    }

    cameraX += ((player.x + player.width/2 - canvas.width/2) - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width));

    // IA Inimigos
    enemies.forEach(en => {
        let dist = Math.abs(player.x - en.x);

        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval && en.currentFrame < en.deadFrames - 1) en.currentFrame++;
            return;
        }

        // Lógica de Fala da Enchantress
        if (en.type === 'Enchantress') {
            if (dist < 400 && en.state === 'patrol') {
                en.state = 'chase'; 
                en.dialogue = "A energia foi corrompida";
                en.dialogueTimer = 150; 
            }
            if (dist < 100 && en.state === 'chase' && Math.random() < 0.01) {
                en.dialogue = "Sinta a energia fluir pelo seu corpo";
                en.dialogueTimer = 90;
            }
        }

        // Estados de Dano e Movimento
        if (en.state === 'hurt') {
            en.frameTimer++;
            if (en.frameTimer % 10 === 0) en.currentFrame = (en.currentFrame + 1) % (en.hurtFrames || 2);
            if (en.frameTimer >= 30) { en.state = 'patrol'; en.frameTimer = 0; en.currentFrame = 0; }
        } else if (en.state === 'patrol') {
            en.x += (en.facing === 'left' ? -en.speed : en.speed);
            if (dist < 300) en.state = 'chase';
        } else if (en.state === 'chase') {
            if (player.x < en.x) { en.x -= en.speed * 1.2; en.facing = 'left'; }
            else { en.x += en.speed * 1.2; en.facing = 'right'; }
            if (dist > 500) en.state = 'patrol';
        }

        // Animação dos Inimigos
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            let totalF = (en.state === 'attacking') ? en.attackFrames : en.walkFrames;
            en.currentFrame = (en.currentFrame + 1) % totalF;
            if (en.state === 'attacking' && en.currentFrame === 0) en.state = 'patrol';
            en.frameTimer = 0;
        }

        // Ataque do Inimigo ao Player
        if (dist < en.attackRange && en.attackCooldown <= 0 && player.state !== 'dead') {
            en.state = 'attacking'; en.currentFrame = 0; player.hp -= 1; en.attackCooldown = 80;
        }
        if (en.attackCooldown > 0) en.attackCooldown--;
    });
}

// --- DESENHO (DRAW) ---
function draw() {
    // 1. PRIMEIRO: Limpamos a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    // 2. DEPOIS: Desenhamos o mundo (Câmera)
    ctx.save();
    ctx.translate(-Math.floor(cameraX), 0);

    ctx.fillStyle = "#4e342e";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

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
            if (obj.dialogue && obj.dialogueTimer > 0) {
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";
                let textWidth = ctx.measureText(obj.dialogue).width;
                ctx.fillStyle = "white";
                ctx.fillRect(obj.x + obj.width/2 - textWidth/2 - 5, obj.y - 35, textWidth + 10, 20);
                ctx.strokeStyle = "black";
                ctx.strokeRect(obj.x + obj.width/2 - textWidth/2 - 5, obj.y - 35, textWidth + 10, 20);
                ctx.fillStyle = "black";
                ctx.fillText(obj.dialogue, obj.x + obj.width/2, obj.y - 20);
            }
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
    if (boss && (boss.state === 'dead' || boss.hp <= 0)) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2e7d32"; 
        ctx.font = "bold 45px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Uma historia começa", canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = "20px Arial";
        ctx.fillStyle = "#333";
        ctx.fillText("Enchantress desmaia, mas sente que o que ela dizia significava algo...", canvas.width / 2, canvas.height / 2 + 30);
        ctx.font = "bold 18px Arial";
        ctx.fillText("Pressione 'K' para jogar novamente", canvas.width / 2, canvas.height / 2 + 80);
    }
}

function enemySay(en, type) {
    const list = en.phrases[type];
    en.dialogue = list[Math.floor(Math.random() * list.length)];
    en.dialogueTimer = 120; // O balão fica por 2 segundos (60 frames por seg)
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', true);
    if(k === 'd') window.mover('right', true);
    if(k === 'w' || k === ' ') window.pular();
    if(k === 'k') window.atacar();
    
    // Sistema do botão R para reiniciar
    if (k === 'r') {
        const boss = enemies.find(en => en.type === 'Enchantress');
        // Se morreu ou se venceu a vilã, o R reseta
        if (player.state === 'dead' || (boss && boss.state === 'dead')) {
            window.resetGame();
        }
    }
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', false);
    if(k === 'd') window.mover('right', false);
});








