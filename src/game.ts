// src/game.ts
import {CONFIG} from './config';
import {GameState, PowerupType, Rect} from './types';
import {Input} from './input';
import {AudioSys} from './audio';
import {Storage} from './storage';
import {Renderer} from './renderer';
import {LEVELS} from './levels';
import {ParticleSystem} from './particles';
import {Paddle} from './entities/paddle';
import {Ball} from './entities/ball';
import {Brick} from './entities/brick';
import {Powerup} from './entities/powerup';
import {Boss} from './entities/boss';

export class Game {
    state: GameState = GameState.Menu;
    renderer: Renderer;
    particles: ParticleSystem;

    paddle: Paddle;
    balls: Ball[] = [];
    bricks: Brick[] = [];
    powerups: Powerup[] = [];
    lasers: Rect[] = [];
    hazards: Rect[] = [];
    boss: Boss | null = null;

    currentLevel = 0;
    lives = 3;
    score = 0;
    highScore = 0;
    combo = 0;
    hitStopTimer = 0;
    laserTimer = 0;

    activePowerups: Map<PowerupType, number> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.particles = new ParticleSystem();
        this.paddle = new Paddle();
        this.highScore = Storage.getHighScore();
        this.addBall();
    }

    addBall(): Ball {
        const b = new Ball();
        this.balls.push(b);
        return b;
    }

    loadLevel(levelIndex: number) {
        this.bricks = [];
        this.boss = null;
        this.hazards = [];

        const isBossLevel = (levelIndex + 1) % 5 === 0;

        if (isBossLevel) {
            this.boss = new Boss(levelIndex);
        } else {
            const layout = LEVELS[levelIndex % LEVELS.length];
            const bw = (CONFIG.GAME_WIDTH - (CONFIG.BRICK_COLS + 1) * CONFIG.BRICK_SPACING) / CONFIG.BRICK_COLS;
            const bh = 20;

            for (let r = 0; r < layout.length; r++) {
                const rowStr = layout[r];
                for (let c = 0; c < rowStr.length; c++) {
                    const char = rowStr[c];
                    if (char !== ' ') {
                        const hp = char === 'X' ? 1 : parseInt(char, 10);
                        const isInd = char === 'X';
                        const x = CONFIG.BRICK_SPACING + c * (bw + CONFIG.BRICK_SPACING);
                        const y = CONFIG.BRICK_TOP_OFFSET + r * (bh + CONFIG.BRICK_SPACING);
                        this.bricks.push(new Brick(x, y, bw, bh, hp, isInd));
                    }
                }
            }
        }

        this.balls = [];
        this.addBall().reset();
        this.paddle.reset();
        this.powerups = [];
        this.lasers = [];
        this.activePowerups.clear();
        this.combo = 0;
        this.hitStopTimer = 0;
        this.state = GameState.Playing;

        // Save progress at the start of every new level
        Storage.saveProgress(this.currentLevel, this.score, this.lives);
    }

    restart() {
        this.lives = 3;
        this.score = 0;
        this.currentLevel = 0;
        Storage.clearProgress();
        this.loadLevel(this.currentLevel);
    }

    handleInput() {
        if (Input.consume('KeyM')) AudioSys.toggleMute();

        switch (this.state) {
            case GameState.Menu:
                if (Input.consume('Space') || Input.consume('Enter')) {
                    AudioSys.init();
                    const saved = Storage.loadProgress();
                    if (saved) {
                        this.lives = saved.lives;
                        this.score = saved.score;
                        this.currentLevel = saved.level;
                        this.loadLevel(this.currentLevel);
                    } else {
                        this.restart();
                    }
                }
                break;
            case GameState.GameOver:
                if (Input.consume('Space') || Input.consume('Enter')) {
                    AudioSys.init();
                    this.restart();
                }
                break;
            case GameState.LevelComplete:
                if (Input.consume('Space') || Input.consume('Enter')) {
                    AudioSys.init();
                    this.currentLevel++;
                    this.loadLevel(this.currentLevel);
                }
                break;
            case GameState.Playing:
                if (Input.consume('Escape')) this.state = GameState.Paused;
                if (Input.consume('Space') || document.activeElement?.tagName === 'CANVAS' && Input.mouseDeltaX !== 0 && Input.consume('Click')) {
                    AudioSys.init();
                    this.balls.forEach(b => b.launch(this.paddle.x, this.paddle.w));
                }
                break;
            case GameState.Paused:
                if (Input.consume('Escape') || Input.consume('Space')) this.state = GameState.Playing;
                break;
        }
    }

    update(dt: number) {
        this.handleInput();
        Input.resetMouseDelta();

        if (this.state !== GameState.Playing) return;

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }

        for (const [type, time] of this.activePowerups.entries()) {
            this.activePowerups.set(type, time - dt * 1000);
            if (this.activePowerups.get(type)! <= 0) {
                this.activePowerups.delete(type);
                this.removePowerupEffect(type);
            }
        }

        this.paddle.update(dt);
        this.particles.update(dt);

        if (this.boss?.active) {
            this.boss.update(dt);
            if (this.boss.hazardTimer <= 0) {
                this.boss.resetHazardTimer();
                this.hazards.push({
                    x: this.boss.x + this.boss.w / 2 - CONFIG.HAZARD_SIZE / 2,
                    y: this.boss.y + this.boss.h,
                    w: CONFIG.HAZARD_SIZE,
                    h: CONFIG.HAZARD_SIZE
                });
                AudioSys.playTone(150, 'triangle', 0.1);
            }
        }

        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.y += CONFIG.HAZARD_SPEED * dt;

            if (h.y > CONFIG.GAME_HEIGHT) {
                this.hazards.splice(i, 1);
            } else if (this.rectIntersect(h, this.paddle)) {
                this.hazards.splice(i, 1);
                this.loseLife();
            }
        }

        for (const p of this.powerups) {
            p.update(dt);
            if (p.active && this.rectIntersect(p, this.paddle)) {
                p.active = false;
                this.applyPowerup(p.type);
                AudioSys.playTone(600, 'sine', 0.2);
            }
        }
        this.powerups = this.powerups.filter(p => p.active);

        if (this.activePowerups.has(PowerupType.Laser)) {
            this.laserTimer -= dt;
            if (this.laserTimer <= 0) {
                this.laserTimer = CONFIG.LASER_COOLDOWN;
                this.lasers.push({
                    x: this.paddle.x + 8,
                    y: this.paddle.y,
                    w: CONFIG.LASER_WIDTH,
                    h: CONFIG.LASER_HEIGHT
                });
                this.lasers.push({
                    x: this.paddle.x + this.paddle.w - 8 - CONFIG.LASER_WIDTH,
                    y: this.paddle.y,
                    w: CONFIG.LASER_WIDTH,
                    h: CONFIG.LASER_HEIGHT
                });
                AudioSys.playTone(700, 'sawtooth', 0.05);
            }
        }

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.y -= CONFIG.LASER_SPEED * dt;
            let hit = false;

            if (l.y + l.h < 0) {
                hit = true;
            } else if (this.boss?.active && this.rectIntersect(l, this.boss)) {
                hit = true;
                this.boss.hit();
                this.score += 20;
                this.particles.emit(l.x + l.w / 2, l.y, CONFIG.COLORS.BOSS, 5);
                AudioSys.playTone(200, 'square', 0.05);
            } else {
                for (const brick of this.bricks) {
                    if (!brick.active) continue;
                    if (this.rectIntersect(l, brick)) {
                        hit = true;
                        if (brick.hit()) {
                            this.score += 10;
                            this.particles.emit(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.getColor(), 5);
                            AudioSys.playTone(300, 'square', 0.05);
                        } else {
                            AudioSys.playTone(250, 'triangle', 0.05);
                        }
                        break;
                    }
                }
            }

            if (hit) this.lasers.splice(i, 1);
        }

        for (const ball of this.balls) {
            if (ball.active && !ball.stuckToPaddle) {
                ball.history.unshift({x: ball.x, y: ball.y});
                if (ball.history.length > 10) ball.history.pop();
            }
        }

        const SUBSTEPS = 3;
        const subDt = dt / SUBSTEPS;

        for (const ball of this.balls) {
            if (!ball.active || ball.stuckToPaddle) {
                ball.update(this.paddle.x, this.paddle.w);
                continue;
            }

            for (let step = 0; step < SUBSTEPS; step++) {
                ball.x += ball.vx * subDt;
                this.checkWallCollision(ball, true);
                this.checkPaddleCollision(ball);
                this.checkBrickCollision(ball, true);
                this.checkBossCollision(ball, true);

                ball.y += ball.vy * subDt;
                this.checkWallCollision(ball, false);
                this.checkPaddleCollision(ball);
                this.checkBrickCollision(ball, false);
                this.checkBossCollision(ball, false);
            }
        }

        const activeBalls = this.balls.filter(b => b.active);
        if (activeBalls.length === 0) {
            this.loseLife();
        } else {
            this.balls = activeBalls;
        }

        const hasDestructible = this.bricks.some(b => b.active && !b.isIndestructible);
        const bossAlive = this.boss?.active ?? false;

        if (!hasDestructible && !bossAlive) {
            this.state = GameState.LevelComplete;
        }
    }

    loseLife() {
        this.lives--;
        this.lasers = [];
        this.hazards = [];
        this.activePowerups.clear();
        this.paddle.setWidthMultiplier(1.0);
        this.renderer.triggerShake(400);
        AudioSys.playTone(150, 'sawtooth', 0.4);

        if (this.lives <= 0) {
            this.state = GameState.GameOver;
            Storage.clearProgress(); // Wipe save if you completely die

            if (this.score > this.highScore) {
                this.highScore = this.score;
                Storage.setHighScore(this.score);
            }
        } else {
            this.balls = [];
            this.addBall().reset();
            this.paddle.reset();
            this.combo = 0;
            // Save the lost life state so they can't exploit closing the app
            Storage.saveProgress(this.currentLevel, this.score, this.lives);
        }
    }

    rectIntersect(r1: Rect, r2: Rect): boolean {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    }

    checkWallCollision(ball: Ball, isX: boolean) {
        if (isX) {
            if (ball.x - ball.r < 0) {
                ball.x = ball.r;
                ball.vx *= -1;
                AudioSys.playTone(300, 'square', 0.05);
            } else if (ball.x + ball.r > CONFIG.GAME_WIDTH) {
                ball.x = CONFIG.GAME_WIDTH - ball.r;
                ball.vx *= -1;
                AudioSys.playTone(300, 'square', 0.05);
            }
        } else {
            if (ball.y - ball.r < 0) {
                ball.y = ball.r;
                ball.vy *= -1;
                AudioSys.playTone(300, 'square', 0.05);
            } else if (ball.y - ball.r > CONFIG.GAME_HEIGHT) {
                ball.active = false;
            }
        }
    }

    checkPaddleCollision(ball: Ball) {
        if (ball.vy > 0 &&
            ball.x + ball.r > this.paddle.x &&
            ball.x - ball.r < this.paddle.x + this.paddle.w &&
            ball.y + ball.r > this.paddle.y &&
            ball.y - ball.r < this.paddle.y + this.paddle.h) {

            ball.y = this.paddle.y - ball.r;

            if (this.activePowerups.has(PowerupType.Magnetic)) {
                ball.stuckToPaddle = true;
                ball.stuckOffset = ball.x - (this.paddle.x + this.paddle.w / 2);
                AudioSys.playTone(500, 'sine', 0.1);
                return;
            }

            const hitPoint = ball.x - (this.paddle.x + this.paddle.w / 2);
            const normalizedHit = hitPoint / (this.paddle.w / 2);
            const angle = normalizedHit * (Math.PI / 3);

            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const newSpeed = Math.min(speed * 1.02, CONFIG.BALL_MAX_SPEED);

            ball.vx = Math.sin(angle) * newSpeed;
            ball.vy = -Math.cos(angle) * newSpeed;

            this.combo = 0;
            AudioSys.playTone(400, 'square', 0.1);
        }
    }

    checkBrickCollision(ball: Ball, isX: boolean) {
        if (this.boss?.active) return;

        const br = {x: ball.x - ball.r, y: ball.y - ball.r, w: ball.r * 2, h: ball.r * 2};

        for (const brick of this.bricks) {
            if (!brick.active) continue;

            if (this.rectIntersect(br, brick)) {
                if (isX) {
                    ball.vx *= -1;
                    ball.x += ball.vx > 0 ? 1 : -1;
                } else {
                    ball.vy *= -1;
                    ball.y += ball.vy > 0 ? 1 : -1;
                }

                if (brick.hit()) {
                    this.combo++;
                    this.score += 10 * this.combo;
                    this.particles.emit(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.getColor(), 10);

                    this.hitStopTimer = 0.04;

                    if (!brick.isIndestructible && Math.random() < 0.30) {
                        const types = [PowerupType.Wide, PowerupType.Multi, PowerupType.Slow, PowerupType.ExtraLife, PowerupType.Magnetic, PowerupType.Laser];
                        const type = types[Math.floor(Math.random() * types.length)];
                        this.powerups.push(new Powerup(brick.x + brick.w / 2 - CONFIG.POWERUP_SIZE / 2, brick.y, type));
                    }
                    AudioSys.playTone(200 + this.combo * 20, 'square', 0.1);
                } else {
                    AudioSys.playTone(250, 'triangle', 0.1);
                }
                break;
            }
        }
    }

    checkBossCollision(ball: Ball, isX: boolean) {
        if (!this.boss?.active) return;

        const br = {x: ball.x - ball.r, y: ball.y - ball.r, w: ball.r * 2, h: ball.r * 2};

        if (this.rectIntersect(br, this.boss)) {
            if (isX) {
                ball.vx *= -1;
                ball.x += ball.vx > 0 ? 1 : -1;
            } else {
                ball.vy *= -1;
                ball.y += ball.vy > 0 ? 1 : -1;
            }

            this.boss.hit();
            this.combo++;
            this.score += 50 * this.combo;
            this.particles.emit(ball.x, ball.y, CONFIG.COLORS.BOSS, 15);
            this.hitStopTimer = 0.06;
            AudioSys.playTone(150 + this.combo * 10, 'sawtooth', 0.15);
        }
    }

    applyPowerup(type: PowerupType) {
        this.activePowerups.set(type, CONFIG.POWERUP_DURATION);
        switch (type) {
            case PowerupType.Wide:
                this.paddle.setWidthMultiplier(1.5);
                break;
            case PowerupType.Multi:
                if (this.balls.length < 5) {
                    const source = this.balls[0];
                    if (source) {
                        for (let i = 0; i < 2; i++) {
                            const nb = this.addBall();
                            nb.spawn(source.x, source.y, (Math.random() - 0.5) * 200, -CONFIG.BALL_BASE_SPEED);
                        }
                    }
                }
                break;
            case PowerupType.Slow:
                this.balls.forEach(b => b.speedMulti = 0.6);
                break;
            case PowerupType.ExtraLife:
                this.lives++;
                this.activePowerups.delete(type);
                break;
            case PowerupType.Magnetic:
            case PowerupType.Laser:
                break;
        }
    }

    removePowerupEffect(type: PowerupType) {
        switch (type) {
            case PowerupType.Wide:
                this.paddle.setWidthMultiplier(1.0);
                break;
            case PowerupType.Slow:
                this.balls.forEach(b => b.speedMulti = 1.0);
                break;
            case PowerupType.Magnetic:
                this.balls.forEach(b => b.launch(this.paddle.x, this.paddle.w));
                break;
        }
    }

    render() {
        this.renderer.beginFrame(CONFIG.TICK_RATE / 1000);

        for (const brick of this.bricks) {
            if (brick.active) {
                this.renderer.drawRect(brick.x, brick.y, brick.w, brick.h, brick.getColor(), 2);
            }
        }

        if (this.boss?.active) {
            this.renderer.drawRect(this.boss.x, this.boss.y, this.boss.w, this.boss.h, CONFIG.COLORS.BOSS, 8);
            this.renderer.drawRect(this.boss.x + this.boss.w / 2 - 15, this.boss.y + this.boss.h / 2 - 10, 30, 20, '#111', 4);

            const hpPercent = this.boss.hp / this.boss.maxHp;
            this.renderer.drawRect(this.boss.x, this.boss.y - 12, this.boss.w, 6, 'rgba(255,0,0,0.3)');
            this.renderer.drawRect(this.boss.x, this.boss.y - 12, this.boss.w * hpPercent, 6, '#00ff00');
        }

        for (const h of this.hazards) {
            this.renderer.drawCircle(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, CONFIG.COLORS.HAZARD);
        }

        for (const l of this.lasers) {
            this.renderer.drawRect(l.x, l.y, l.w, l.h, CONFIG.COLORS.LASER, 2);
        }

        for (const p of this.powerups) {
            this.renderer.drawRect(p.x, p.y, p.w, p.h, p.getColor(), 4);
            this.renderer.drawText(p.getLetter(), p.x + p.w / 2, p.y + p.h / 2, 12, 'center');
        }

        this.particles.draw(this.renderer);

        if (this.activePowerups.has(PowerupType.Magnetic)) {
            this.renderer.drawRect(this.paddle.x, this.paddle.y - 4, this.paddle.w, 4, 'rgba(233, 196, 106, 0.4)', 2);
        }

        this.renderer.drawRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, CONFIG.COLORS.PADDLE, 6);

        if (this.activePowerups.has(PowerupType.Laser)) {
            this.renderer.drawRect(this.paddle.x + 6, this.paddle.y - 8, 8, 8, CONFIG.COLORS.POWERUP_LASER, 2);
            this.renderer.drawRect(this.paddle.x + this.paddle.w - 14, this.paddle.y - 8, 8, 8, CONFIG.COLORS.POWERUP_LASER, 2);
        }

        for (const ball of this.balls) {
            if (ball.active) {
                for (let i = 0; i < ball.history.length; i++) {
                    const pos = ball.history[i];
                    const alpha = 0.5 * (1 - (i / ball.history.length));
                    const trailR = ball.r * (1 - (i / ball.history.length) * 0.4);
                    this.renderer.drawCircle(pos.x, pos.y, trailR, CONFIG.COLORS.BALL, alpha);
                }
                this.renderer.drawCircle(ball.x, ball.y, ball.r, CONFIG.COLORS.BALL, 1.0);
            }
        }

        this.renderer.drawText(`SCORE: ${this.score}`, 10, 20, 16);
        this.renderer.drawText(`HI: ${this.highScore}`, 10, 40, 14);
        this.renderer.drawText(`LEVEL: ${this.currentLevel + 1}`, 10, 60, 12);
        this.renderer.drawText(`LIVES: ${this.lives}`, CONFIG.GAME_WIDTH - 80, 20, 16);

        if (this.combo > 1) {
            this.renderer.drawText(`${this.combo}x COMBO`, CONFIG.GAME_WIDTH / 2, 20, 16, 'center');
        }

        if (AudioSys.getMuted()) {
            this.renderer.drawText(`Muted`, CONFIG.GAME_WIDTH - 50, 40, 12);
        }

        if (this.state === GameState.Menu) {
            const hasSave = !!Storage.loadProgress();
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(0,0,0,0.7)');
            this.renderer.drawText('BREAKOUT', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 40, 48, 'center');
            this.renderer.drawText(hasSave ? 'Press Space to Resume' : 'Press Space to Start', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 20, 24, 'center');
        } else if (this.state === GameState.Paused) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(0,0,0,0.5)');
            this.renderer.drawText('PAUSED', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, 32, 'center');
        } else if (this.state === GameState.GameOver) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(0,0,0,0.7)');
            this.renderer.drawText('GAME OVER', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 20, 48, 'center');
            this.renderer.drawText('Press Space to Restart', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 30, 24, 'center');
        } else if (this.state === GameState.LevelComplete) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(0,0,0,0.7)');
            this.renderer.drawText('LEVEL COMPLETE!', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 20, 36, 'center');
            this.renderer.drawText('Press Space for Next Level', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 30, 24, 'center');
        }

        this.renderer.endFrame();
    }
}