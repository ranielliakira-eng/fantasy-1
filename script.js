const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

// --- CONFIGURAÇÕES GLOBAIS ---
const bgMusic = new Audio('assets/sounds/song.wav');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const gravity = 0.8;
const zoom = 1; 
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
    facing: 'right', onGround: false, state: 'normal',
    hp: 3, maxHp: 3,
    imgWalk: new Image(), imgDead: new Image(), imgJump: new Image(), imgHurt: new Image(),
    imgAttack: new Image(), imgIdle: new Image (),
    attackFrames: 6, walkFrames: 8,
    currentFrame: 0, frameTimer: 0, frameInterval: 6
};

// --- INIMIGOS ---
let enemies = [];
function initEnemies() {
    enemies = [
        { type: 'Green_Slime', x: 800, y: 320, hp: 1, damage: 1, speed: 1.2, range: 200, attackType: 'melee', attackRange: 50, state: 'patrol', walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3, currentFrame: 0, frameTimer: 0, frameInterval: 4 },
        { type: 'Blue_Slime', x: 2500, y: 320, hp: 1, damage: 1, speed: 1.8, range: 250, attackType: 'melee', attackRange: 50, state: 'jumping', walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3, currentFrame: 0, frameTimer: 0, frameInterval: 4 },
        { type: 'Red_Slime', x: 4000, y: 320, hp: 1, damage: 1, speed: 2.5, range: 450, attackType: 'melee', attackRange: 50, state: 'chase', walkFrames: 8, attackFrames: 4, hurtFrames: 6, deadFrames: 3, currentFrame: 0, frameTimer: 0, frameInterval: 4 },
        { type: 'Enchantress', x: 6600, y: 300, hp: 3, damage: 1, speed: 2, range: 400, attackType: 'melee', attackRange: 100, walkFrames: 8, attackFrames: 6, hurtFrames: 2, hurtFrames: 6, deadFrames: 5, currentFrame: 0, frameTimer: 0, frameInterval: 4  }
    ];

    enemies.forEach(en => {
        en.imgIdle = new Image(); en.imgIdle.src = `assets/${en.type}/Idle.png`;
        en.imgWalk = new Image(); en.imgWalk.src = `assets/${en.type}/Walk.png`;
        en.imgAttack = new Image(); en.imgAttack.src = `assets/${en.type}/Attack_1.png`;
        en.imgHurt = new Image(); en.imgHurt.src = `assets/${en.type}/Hurt.png`;
        en.imgDead = new Image(); en.imgDead.src = `assets/${en.type}/Dead.png`;
                
        en.width = 100; en.height = 100;
        en.currentFrame = 0; en.frameTimer = 0; en.frameInterval = 8;
        en.state = 'patrol'; en.facing = 'left';
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
    player.velX = 0; player.velY = 0; player.state = 'normal';
    cameraX = 0; isPaused = false; gameState = 'playing';
    initEnemies();
};

window.escolherPersonagem = function(genero) {
    console.log("Botão clicado! Gênero selecionado:", genero);

    // 1. Tenta encontrar o menu para esconder
    const menu = document.getElementById('selection-menu');
    if (menu) {
        menu.style.display = 'none';
    } else {
        console.error("Erro: Não achei o elemento com ID 'selection-menu'");
    }
    
    const folder = (genero === 'menina') ? 'Knight' : 'Swordsman';
    
    // Configura os frames específicos para cada personagem
    if (genero === 'menina') {
        player.idleFrames = 6;
        player.walkFrames = 8;
        player.jumpFrames = 6;
        player.hurtFrames = 3;
        player.deadFrames = 4;
        player.attackFrames = 5;
    } else {
        player.idleFrames = 8;
        player.walkFrames = 8;
        player.jumpFrames = 8;
        player.hurtFrames = 3;
        player.deadFrames = 3;
        player.attackFrames = 6;
    }

    // Carrega as imagens
    player.imgIdle.src = `assets/${folder}/Idle.png`;
    player.imgWalk.src = `assets/${folder}/Walk.png`;
    player.imgJump.src = `assets/${folder}/Jump.png`;
    player.imgHurt.src = `assets/${folder}/Hurt.png`;
    player.imgDead.src = `assets/${folder}/Dead.png`;
    player.imgAttack.src = `assets/${folder}/Attack_1.png`;

    gameState = 'playing';
    initEnemies();
    bgMusic.play().catch(() => {});
    
    document.getElementById('selection-menu').style.display = 'none';
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
        player.state = 'jumping'; 
        player.currentFrame = 0; 
        console.log("Pulo realizado!");
    }
};

window.atacar = function() {
    // Se estiver morto, reinicia
    if (player.state === 'dead') { window.resetGame(); return; }
    
    // Bloqueios: Só ataca se estiver jogando, sem pausa e NO CHÃO
    if (gameState !== 'playing' || isPaused || !player.onGround) return;

    // Se já estiver atacando, não faz nada (evita spam de animação)
    if (player.state === 'attacking') return;

    // Inicia o ataque
    player.state = 'attacking'; 
    player.currentFrame = 0;

    if (typeof checkMeleeHit === "function") {
        checkMeleeHit(); 
    }
};

// --- LÓGICA ---
function update() {
    // 1. Processamento de Morte
    if (player.state === 'dead') {
        player.frameTimer++;
        if (player.frameTimer >= player.frameInterval) {
            if (player.currentFrame < (player.deadFrames || 4) - 1) player.currentFrame++;
            player.frameTimer = 0;
        }
        return; 
    }

    if (gameState !== 'playing' || isPaused) return;

    // 2. Verificação de Saúde
    if (player.hp <= 0) {
        player.state = 'dead';
        player.currentFrame = 0;
        return;
    }

    // 3. Movimentação Horizontal
    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.7; // Atrito

    // 4. Física
    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // 5. Colisão com Chão
    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + 40 < p.x + p.w && player.x + 60 > p.x && 
            player.y + player.height >= p.y && player.y + player.height <= p.y + 10) {
            player.y = p.y - player.height; 
            player.velY = 0; 
            player.onGround = true;
        }
    });

    // 6. MÁQUINA DE ESTADOS (Animação) - O segredo para o WALK funcionar
    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
        player.frameTimer = 0;

        if (player.state === 'attacking') {
            player.currentFrame++;
            // Quando acaba o ataque, volta para IDLE para a lógica abaixo reavaliar
            if (player.currentFrame >= player.attackFrames) {
                player.state = 'idle';
                player.currentFrame = 0;
            }
        } 
        else if (!player.onGround) {
            player.state = 'jumping';
            player.currentFrame = (player.currentFrame + 1) % (player.jumpFrames || 1);
        }
        else if (Math.abs(player.velX) > 0.5) { // Se estiver se movendo...
            player.state = 'walking';
            player.currentFrame = (player.currentFrame + 1) % (player.walkFrames || 1);
        } 
        else { // Se estiver parado...
            player.state = 'idle';
            player.currentFrame = (player.currentFrame + 1) % (player.idleFrames || 1);
        }
    }

    // 7. Câmera
    let alvoX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    cameraX += (alvoX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));

    // 8. Processar Inimigos
    if (typeof enemies !== 'undefined') {
        enemies.forEach(en => {
             // Lógica de animação simples para inimigos
             en.frameTimer++;
             if (en.frameTimer >= en.frameInterval) {
                 en.currentFrame = (en.currentFrame + 1) % (en.walkFrames || 1);
                 en.frameTimer = 0;
             }
        });
    }
}
    // 6. Atualização da Câmera
    let alvoX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    cameraX += (alvoX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));
}
    // 6. Câmera Suave
    let alvoX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    cameraX += (alvoX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));

    // 7. IA dos Inimigos
    // 7. IA e Animação dos Inimigos
    enemies.forEach(en => {
        // Se o inimigo estiver morto, processa apenas a animação de morte
        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                if (en.currentFrame < (en.deadFrames || 4) - 1) {
                    en.currentFrame++;
                }
                en.frameTimer = 0;
            }
            return; 
        }

        // Recuperação do estado de dano (Hurt)
        if (en.state === 'hurt') {
            en.frameTimer++;
            if (en.frameTimer >= 20) { // Fica travado por 20 frames ao apanhar
                en.state = 'patrol';
                en.frameTimer = 0;
            }
        }

        // Animação de movimento/ataque do inimigo
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            let framesTotais = 8;
            if (en.state === 'attacking') framesTotais = en.attackFrames || 6;
            else framesTotais = en.walkFrames || 8;

            en.currentFrame = (en.currentFrame + 1) % framesTotais;
            
            // Se terminou a animação de ataque, volta a patrulhar
            if (en.state === 'attacking' && en.currentFrame === 0) {
                en.state = 'patrol';
            }
            en.frameTimer = 0;
        }

        // Lógica de Ataque contra o Jogador
        let dist = Math.abs(player.x - en.x);
        if (dist < (en.attackRange || 100) && en.attackCooldown <= 0 && player.state !== 'dead') {
            en.state = 'attacking';
            en.currentFrame = 0;
            
            if (en.attackType === 'melee') {
                if (dist < 60) player.hp -= 10; 
            } else if (en.attackType === 'ranged') {
                if (typeof dispararProjetil === "function") dispararProjetil(en); 
            }
            en.attackCooldown = 80; // Tempo entre ataques do inimigo
        }
        if (en.attackCooldown > 0) en.attackCooldown--;
    });

function checkMeleeHit() {
    // Cria uma caixa invisível na frente do jogador dependendo do lado que ele olha
    let hitboxX = player.facing === 'right' ? player.x + player.width : player.x - 50;
    let hitboxWidth = 60; // Largura do alcance da espada

    enemies.forEach(en => {
        if (en.state === 'dead') return; // Não bate em quem já morreu

        // Verifica colisão entre a hitbox da espada e o corpo do inimigo
        if (hitboxX < en.x + en.width && 
            hitboxX + hitboxWidth > en.x &&
            player.y < en.y + en.height && 
            player.y + player.height > en.y) {
            
            en.hp -= 1;
            en.state = 'hurt'; // Inimigo entra em estado de dano
            en.currentFrame = 0; // Reseta animação para mostrar o dano
            
            if(en.hp <= 0) {
                en.state = 'dead';
                en.currentFrame = 0;
            }
        }
    });
}

// --- DESENHO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY)); 

    // 1. Desenhar o Chão
    ctx.fillStyle = "#4e342e";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // 2. Desenhar Personagens e Inimigos
    [...enemies, player].forEach(obj => {
        let img = obj.imgWalk; // Imagem padrão
        let totalFrames = 8;    // Valor padrão caso algo falhe

        // --- LÓGICA DINÂMICA DE IMAGEM E FRAMES ---
        if (obj.state === 'attacking') {
            img = obj.imgAttack;
            totalFrames = obj.attackFrames || 6;
        } else if (obj.state === 'dead') {
            img = obj.imgDead;
            totalFrames = obj.deadFrames || 4;
        } else if (obj.state === 'hurt') {
            img = obj.imgHurt || obj.imgWalk; // Usa walk se não tiver imagem de dano
            totalFrames = obj.hurtFrames || 2;
        } else if (obj === player && !obj.onGround) {
            img = obj.imgJump;
            totalFrames = obj.jumpFrames || 8;
        } else {
            img = obj.imgWalk;
            totalFrames = obj.walkFrames || 8;
        }

        // --- RENDERIZAÇÃO ---
        if(img && img.complete && totalFrames > 0) {
            // fw é a largura total da imagem dividida pela quantidade de bonequinhos nela
            const fw = img.width / totalFrames;
            
            ctx.save();
            if(obj.facing === 'left') {
                // Inverte o desenho horizontalmente para olhar para a esquerda
                ctx.translate(obj.x + obj.width, obj.y); 
                ctx.scale(-1, 1);
                ctx.drawImage(
                    img, 
                    (obj.currentFrame % totalFrames) * fw, 0, // Onde começa o corte (X)
                    fw, img.height,                          // Tamanho do corte
                    0, 0,                                    // Posição no canvas (após translate)
                    obj.width, obj.height                    // Tamanho do desenho
                );
            } else {
                // Desenha normal para a direita
                ctx.drawImage(
                    img, 
                    (obj.currentFrame % totalFrames) * fw, 0, 
                    fw, img.height, 
                    obj.x, obj.y, 
                    obj.width, obj.height
                );
            }
            ctx.restore();
        }
    });

    ctx.restore();

    // 3. Interface (Barra de Vida)
    if (gameState === 'playing') {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
gameLoop();

// Eventos
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', true);
    if(k === 'd') window.mover('right', true);
    if(k === 'w' || k === ' ') window.pular();
    if(k === 'k') window.atacar();
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if(k === 'a') window.mover('left', false);
    if(k === 'd') window.mover('right', false);
});






















