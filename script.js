// --- LÓGICA DE ATUALIZAÇÃO (Física e IA) ---
function update() {
    if (player.state === 'dead') {
        player.frameTimer++;
        if (player.frameTimer >= player.frameInterval) {
            if (player.currentFrame < (player.deadFrames || 4) - 1) player.currentFrame++;
            player.frameTimer = 0;
        }
        return;
    }

    if (gameState !== 'playing' || isPaused) return;

    if (player.hp <= 0) {
        player.state = 'dead';
        player.currentFrame = 0;
        return;
    }

    // Movimentação do Player
    if (keys.left) player.velX = -player.speed;
    else if (keys.right) player.velX = player.speed;
    else player.velX *= 0.7;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Colisão Plataformas
    player.onGround = false;
    platforms.forEach(p => {
        if (player.x + 40 < p.x + p.w && player.x + 60 > p.x && 
            player.y + player.height >= p.y && player.y + player.height <= p.y + 10) {
            player.y = p.y - player.height; 
            player.velY = 0; 
            player.onGround = true;
        }
    });

    // Animação do Player
    player.frameTimer++;
    if (player.frameTimer >= player.frameInterval) {
        player.frameTimer = 0;
        if (player.state === 'attacking') {
            player.currentFrame++;
            if (player.currentFrame >= player.attackFrames) {
                player.state = 'idle';
                player.currentFrame = 0;
            }
        } 
        else if (!player.onGround) {
            player.state = 'jumping';
            player.currentFrame = (player.currentFrame + 1) % (player.jumpFrames || 1);
        }
        else if (Math.abs(player.velX) > 0.5) {
            player.state = 'walking';
            player.currentFrame = (player.currentFrame + 1) % (player.walkFrames || 1);
        } 
        else {
            player.state = 'idle';
            player.currentFrame = (player.currentFrame + 1) % (player.idleFrames || 1);
        }
    }

    // Câmera
    let alvoX = (player.x + player.width / 2) - (canvas.width / 2) / zoom;
    cameraX += (alvoX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, mapWidth - canvas.width / zoom));

    // IA dos Inimigos
    enemies.forEach(en => {
        if (en.state === 'dead') {
            en.frameTimer++;
            if (en.frameTimer >= en.frameInterval) {
                if (en.currentFrame < (en.deadFrames || 4) - 1) en.currentFrame++;
                en.frameTimer = 0;
            }
            return;
        }

        if (en.state === 'hurt') {
            en.frameTimer++;
            if (en.frameTimer >= 30) {
                en.state = 'patrol';
                en.frameTimer = 0;
                en.currentFrame = 0;
            }
            return;
        }

        // Movimentação Básica (Patrulha/Chase)
        let dist = Math.abs(player.x - en.x);
        if (en.state === 'patrol') {
            en.x += (en.facing === 'left' ? -en.speed : en.speed);
            if (dist < 300) en.state = 'chase';
        } else if (en.state === 'chase') {
            if (player.x < en.x) { en.x -= en.speed * 1.2; en.facing = 'left'; }
            else { en.x += en.speed * 1.2; en.facing = 'right'; }
            if (dist > 500) en.state = 'patrol';
        }

        // Animação Inimigo
        en.frameTimer++;
        if (en.frameTimer >= en.frameInterval) {
            let framesTotais = (en.state === 'attacking') ? (en.attackFrames || 6) : (en.walkFrames || 8);
            en.currentFrame = (en.currentFrame + 1) % framesTotais;
            if (en.state === 'attacking' && en.currentFrame === 0) en.state = 'patrol';
            en.frameTimer = 0;
        }

        // Ataque Inimigo
        if (dist < (en.attackRange || 60) && (en.attackCooldown || 0) <= 0 && player.state !== 'dead') {
            en.state = 'attacking';
            en.currentFrame = 0;
            player.hp -= 0.5;
            en.attackCooldown = 80;
        }
        if (en.attackCooldown > 0) en.attackCooldown--;
    });
}

// --- LÓGICA DE DESENHO (Visual) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') return;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY)); 

    // Chão
    ctx.fillStyle = "#4e342e";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Personagens e Inimigos
    [...enemies, player].forEach(obj => {
        let img = obj.imgIdle;
        let totalF = obj.idleFrames || 8;

        if (obj.state === 'walking') { img = obj.imgWalk; totalF = obj.walkFrames || 8; }
        else if (obj.state === 'attacking') { img = obj.imgAttack; totalF = obj.attackFrames || 6; }
        else if (obj.state === 'jumping') { img = obj.imgJump; totalF = obj.jumpFrames || 8; }
        else if (obj.state === 'hurt') { 
            img = obj.imgHurt; 
            totalF = (obj.type === 'Enchantress') ? 2 : (obj.hurtFrames || 4); 
        }
        else if (obj.state === 'dead') { img = obj.imgDead; totalF = obj.deadFrames || 5; }

        if (img.complete && img.width > 0) {
            const fw = img.width / totalF;
            const fh = img.height;
            let drawHeight = obj.height;
            let drawY = obj.y;

            // Ajuste especial para o sprite da Enchantress (Hurt)
            if (obj.type === 'Enchantress' && obj.state === 'hurt') {
                drawHeight = obj.height * 1.5; 
                drawY = obj.y - (obj.height * 0.5);
            }

            ctx.save();
            if (obj.facing === 'left') {
                ctx.translate(obj.x + obj.width, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, 0, 0, obj.width, drawHeight);
            } else {
                ctx.drawImage(img, (obj.currentFrame % totalF) * fw, 0, fw, fh, obj.x, drawY, obj.width, drawHeight);
            }
            ctx.restore();
        }
    });

    ctx.restore();

    // HUD
    if (gameState === 'playing') {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 20, 150, 15);
        ctx.fillStyle = "red"; ctx.fillRect(20, 20, (player.hp / player.maxHp) * 150, 15);
    }
}
