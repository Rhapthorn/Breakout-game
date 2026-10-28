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
import {StorageHelper} from './storageHelper';

interface Star {
    x: number;
    y: number;
    s: number;
}

interface Laser extends Rect {
    vx?: number;
}

interface FloatingText {
    text: string;
    x: number;
    y: number;
    color: string;
    alpha: number;
    vy: number;
}

export class Game {
    state: GameState = GameState.Menu;
    renderer: Renderer;
    particles: ParticleSystem;

    paddle: Paddle;
    balls: Ball[] = [];
    bricks: Brick[] = [];
    powerups: Powerup[] = [];
    lasers: Laser[] = [];
    hazards: Rect[] = [];
    boss: Boss | null = null;
    stars: Star[] = [];

    public initials: string[] = ['A', 'A', 'A'];
    public currentInitialIndex: number = 0;
    public soundEnabled: boolean = true;
    public optionsSelection: number = 0;

    currentLevel = 0;
    lives = 3;
    score = 0;
    highScore = 0;
    combo = 0;
    hitStopTimer = 0;
    laserTimer = 0;

    menuSelection = 0; // 0: Start, 1: Leaderboard, 2: Options, 3: Exit
    floatingTexts: FloatingText[] = [];
    leaderboardEntries: any[] = [];
    isLoadingLeaderboard = false;

    activePowers: Map<PowerupType, number> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.particles = new ParticleSystem();
        this.paddle = new Paddle();
        this.highScore = Storage.getHighScore();
        Storage.clearProgress();
        this.addBall();

        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.GAME_WIDTH,
                y: Math.random() * CONFIG.GAME_HEIGHT,
                s: Math.random() * 2 + 0.5
            });
        }
    }

    addBall(): Ball {
        const b = new Ball();
        this.balls.push(b);
        return b;
    }

    loadLevel(levelIndex: number) {
        this.currentLevel = levelIndex;

        Storage.saveProgress(this.currentLevel, this.score, this.lives);

        if (levelIndex >= CONFIG.MAX_LEVELS) {
            this.state = GameState.GameCompleted;
            Storage.clearProgress();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                Storage.setHighScore(this.score);
            }
            return;
        }

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
        this.activePowers.clear();
        this.combo = 0;
        this.hitStopTimer = 0;
        this.state = GameState.Playing;

        // 🚀 DYNAMIC DIFFICULTY: Scales every 3 levels
        const difficultyTier = Math.floor(this.currentLevel / 3);

        // 1. Increase ball speed by 15% per tier
        const speedBoost = 1.0 + (difficultyTier * 0.15);
        this.balls.forEach(b => b.speedMulti = speedBoost);

        // 2. Shrink paddle width by 10% per tier (but never smaller than 60% of original size)
        const paddleShrink = Math.max(0.6, 1.0 - (difficultyTier * 0.10));
        this.paddle.setWidthMultiplier(paddleShrink);

        Storage.saveProgress(this.currentLevel, this.score, this.lives);
    }

    restart() {
        this.lives = 3;
        this.score = 0;
        this.currentLevel = 0;
        this.loadLevel(this.currentLevel);
    }

    handleInput() {
        if (this.state === GameState.Menu) {
            const hasSave = !!Storage.loadProgress();
            const options = hasSave
                ? ['CONTINUE CAMPAIGN', 'START NEW CAMPAIGN', 'LEADERBOARD', 'OPTIONS', 'EXIT']
                : ['START CAMPAIGN', 'LEADERBOARD', 'OPTIONS', 'EXIT'];

            if (Input.consume('ArrowUp') || Input.consume('KeyW')) {
                this.menuSelection = (this.menuSelection - 1 + options.length) % options.length;
                AudioSys.playTone(400, 'sine', 0.05);
            }
            if (Input.consume('ArrowDown') || Input.consume('KeyS')) {
                this.menuSelection = (this.menuSelection + 1) % options.length;
                AudioSys.playTone(400, 'sine', 0.05);
            }
            if (Input.consume('Space') || Input.consume('Enter')) {
                AudioSys.init();
                const selectedOpt = options[this.menuSelection];

                if (selectedOpt === 'CONTINUE CAMPAIGN') {
                    const saved = Storage.loadProgress();
                    if (saved) {
                        this.lives = saved.lives;
                        this.score = saved.score;
                        this.currentLevel = saved.level;
                        this.loadLevel(this.currentLevel);
                        this.state = GameState.Playing;
                    } else {
                        this.score = 0;
                        this.lives = 3;
                        this.currentLevel = 0;
                        Storage.saveProgress(this.currentLevel, this.score, this.lives);
                        this.loadLevel(this.currentLevel);
                        this.state = GameState.Playing;
                    }
                } else if (selectedOpt === 'START CAMPAIGN' || selectedOpt === 'START NEW CAMPAIGN') {
                    Storage.clearProgress();
                    this.score = 0;
                    this.lives = 3;
                    this.currentLevel = 0;
                    Storage.saveProgress(this.currentLevel, this.score, this.lives);
                    this.loadLevel(this.currentLevel);
                    this.state = GameState.Playing;
                } else if (selectedOpt === 'LEADERBOARD') {
                    this.state = GameState.Leaderboard;
                    this.leaderboardEntries = JSON.parse(localStorage.getItem('breakout_leaderboard') || '[]');
                    this.isLoadingLeaderboard = false;
                } else if (selectedOpt === 'OPTIONS') {
                    this.state = GameState.Options;
                } else if (selectedOpt === 'EXIT') {
                    window.close();
                }
            }
        } else if (this.state === GameState.Leaderboard) {
            if (Input.consume('Escape') || Input.consume('Space') || Input.consume('Enter')) {
                this.state = GameState.Menu;
            }
        } else if (this.state === GameState.Options) {
            const optionsList = ['SOUND', 'BACK'];

            if (Input.consume('ArrowUp') || Input.consume('KeyW')) {
                this.optionsSelection = (this.optionsSelection - 1 + optionsList.length) % optionsList.length;
                if (this.soundEnabled) AudioSys.playTone(400, 'sine', 0.05);
            }
            if (Input.consume('ArrowDown') || Input.consume('KeyS')) {
                this.optionsSelection = (this.optionsSelection + 1) % optionsList.length;
                if (this.soundEnabled) AudioSys.playTone(400, 'sine', 0.05);
            }

            if (Input.consume('Enter') || Input.consume('Space') || Input.consume('ArrowLeft') || Input.consume('ArrowRight')) {
                if (this.optionsSelection === 0) {
                    this.soundEnabled = !this.soundEnabled;
                    AudioSys.toggleMute();
                    if (this.soundEnabled) AudioSys.playTone(600, 'sine', 0.05);
                } else if (this.optionsSelection === 1) {
                    this.state = GameState.Menu;
                    this.optionsSelection = 0;
                }
            }
        } else if (this.state === GameState.Playing) {
            if (Input.consume('Escape')) {
                this.state = GameState.Paused;
            }
            if (Input.consume('Space') || Input.consume('Enter')) {
                for (const ball of this.balls) {
                    if (typeof (ball as any).launch === 'function') {
                        (ball as any).launch(this.paddle.x, this.paddle.w);
                    }
                }
                AudioSys.playTone(600, 'sine', 0.1);
            }
        } else if (this.state === GameState.Paused) {
            if (Input.consume('Escape') || Input.consume('Space')) {
                this.state = GameState.Playing;
            }
            if (Input.consume('KeyQ')) {
                this.state = GameState.Menu;
                this.menuSelection = 0;
            }
        } else if (this.state === GameState.GameOver || this.state === GameState.GameCompleted) {
            if (Input.consume('Space') || Input.consume('Enter')) {
                AudioSys.init();
                this.restart();
            }
            if (Input.consume('KeyQ')) {
                this.state = GameState.Menu;
                this.menuSelection = 0;
            }
        } else if (this.state === GameState.LevelComplete) {
            if (Input.consume('Space') || Input.consume('Enter')) {
                AudioSys.init();
                if (this.currentLevel + 1 >= CONFIG.MAX_LEVELS) {
                    this.state = GameState.GameCompleted;
                } else {
                    this.loadLevel(this.currentLevel + 1);
                }
            }
        } else if (this.state === GameState.EnterInitials) {
            if (Input.consume('ArrowUp') || Input.consume('KeyW')) {
                let charCode = this.initials[this.currentInitialIndex].charCodeAt(0);
                charCode = charCode === 90 ? 65 : charCode + 1;
                this.initials[this.currentInitialIndex] = String.fromCharCode(charCode);
                AudioSys.playTone(400, 'sine', 0.05);
            }

            if (Input.consume('ArrowDown') || Input.consume('KeyS')) {
                let charCode = this.initials[this.currentInitialIndex].charCodeAt(0);
                charCode = charCode === 65 ? 90 : charCode - 1;
                this.initials[this.currentInitialIndex] = String.fromCharCode(charCode);
                AudioSys.playTone(400, 'sine', 0.05);
            }

            if (Input.consume('ArrowLeft') || Input.consume('KeyA')) {
                this.currentInitialIndex = Math.max(0, this.currentInitialIndex - 1);
                AudioSys.playTone(500, 'sine', 0.05);
            }

            if (Input.consume('ArrowRight') || Input.consume('KeyD')) {
                this.currentInitialIndex = Math.min(2, this.currentInitialIndex + 1);
                AudioSys.playTone(500, 'sine', 0.05);
            }

            if (Input.consume('Enter') || Input.consume('Space')) {
                const finalName = this.initials.join('');

                const currentScores = JSON.parse(localStorage.getItem('breakout_leaderboard') || '[]');
                currentScores.push({
                    playerName: finalName,
                    score: this.score,
                    levelReached: this.currentLevel + 1
                });

                currentScores.sort((a: any, b: any) => b.score - a.score);
                localStorage.setItem('breakout_leaderboard', JSON.stringify(currentScores.slice(0, 10)));

                StorageHelper.saveScore(this.score, this.currentLevel + 1);

                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    Storage.setHighScore(this.score);
                }

                AudioSys.playTone(800, 'sine', 0.1);
                this.state = GameState.Leaderboard;

                this.leaderboardEntries = JSON.parse(localStorage.getItem('breakout_leaderboard') || '[]');
                this.isLoadingLeaderboard = false;
            }
        }

        if (Input.consume('KeyM')) {
            AudioSys.toggleMute();
        }
    }

    update(dt: number) {
        this.handleInput();
        Input.resetMouseDelta();

        const starSpeed = this.state === GameState.Playing ? 25 : 10;
        for (const star of this.stars) {
            star.y += star.s * starSpeed * dt;

            if (star.y > CONFIG.GAME_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * CONFIG.GAME_WIDTH;
            }
        }

        if (this.state !== GameState.Playing) return;

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }

        for (const [type, time] of this.activePowers.entries()) {
            this.activePowers.set(type, time - dt * 1000);
            if (this.activePowers.get(type)! <= 0) {
                this.activePowers.delete(type);
                this.removePowerupEffect(type);
            }
        }

        this.paddle.update(dt);
        this.particles.update(dt);

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;

            ft.alpha -= dt * 1.5;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

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

        if (this.activePowers.has(PowerupType.Laser)) {
            this.laserTimer -= dt;
            if (this.laserTimer <= 0) {
                this.laserTimer = CONFIG.LASER_COOLDOWN;

                const hasMulti = this.activePowers.has(PowerupType.Multi);
                const spreadSpeed = 150;

                this.lasers.push({
                    x: this.paddle.x + 8,
                    y: this.paddle.y,
                    w: CONFIG.LASER_WIDTH,
                    h: CONFIG.LASER_HEIGHT,
                    vx: 0
                });
                this.lasers.push({
                    x: this.paddle.x + this.paddle.w - 8 - CONFIG.LASER_WIDTH,
                    y: this.paddle.y,
                    w: CONFIG.LASER_WIDTH,
                    h: CONFIG.LASER_HEIGHT,
                    vx: 0
                });

                if (hasMulti) {
                    this.lasers.push({
                        x: this.paddle.x - 4,
                        y: this.paddle.y,
                        w: CONFIG.LASER_WIDTH,
                        h: CONFIG.LASER_HEIGHT,
                        vx: -spreadSpeed
                    });
                    this.lasers.push({
                        x: this.paddle.x + this.paddle.w + 4,
                        y: this.paddle.y,
                        w: CONFIG.LASER_WIDTH,
                        h: CONFIG.LASER_HEIGHT,
                        vx: spreadSpeed
                    });
                }

                AudioSys.playTone(700, 'sawtooth', 0.05);
            }
        }

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.y -= CONFIG.LASER_SPEED * dt;

            if (l.vx) l.x += l.vx * dt;

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
        Storage.saveProgress(this.currentLevel, this.score, this.lives);
        this.lasers = [];
        this.hazards = [];
        this.activePowers.clear();
        this.paddle.setWidthMultiplier(1.0);
        this.renderer.triggerShake(400);
        AudioSys.playTone(150, 'sawtooth', 0.4);

        if (this.lives <= 0) {
            Storage.clearProgress();

            if (this.score > 0) {
                this.initials = ['A', 'A', 'A'];
                this.currentInitialIndex = 0;
                this.state = GameState.EnterInitials;
            } else {
                this.state = GameState.GameOver;
                StorageHelper.saveScore(this.score, this.currentLevel + 1);
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    Storage.setHighScore(this.score);
                }
            }
        } else {
            this.balls = [];
            this.addBall().reset();
            this.paddle.reset();
            this.combo = 0;
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

            if (this.activePowers.has(PowerupType.Magnetic)) {
                const maxCatch = this.paddle.isWide ? 3 : 1;
                const currentCaught = this.balls.filter(b => b.stuckToPaddle).length;

                if (currentCaught < maxCatch) {
                    ball.stuckToPaddle = true;
                    ball.stuckOffset = ball.x - (this.paddle.x + this.paddle.w / 2);
                    AudioSys.playTone(500, 'sine', 0.1);
                    return;
                }
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
                    this.floatingTexts.push({
                        text: `+${10 * this.combo}`,
                        x: brick.x + brick.w / 2,
                        y: brick.y,
                        color: '#00ffcc',
                        alpha: 1.0,
                        vy: -60
                    });
                    this.particles.emit(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.getColor(), 10);

                    this.hitStopTimer = 0.04;

                    // 🚀 ADD SCREEN SHAKE HERE
                    this.renderer.triggerShake(100);

                    if (!brick.isIndestructible && Math.random() < 0.30) {
                        const types = [PowerupType.Wide, PowerupType.Multi, PowerupType.Slow, PowerupType.ExtraLife, PowerupType.Magnetic, PowerupType.Laser];
                        const type = types[Math.floor(Math.random() * types.length)];
                        this.powerups.push(new Powerup(brick.x + brick.w / 2 - CONFIG.POWER_SIZE / 2, brick.y, type));
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
            this.floatingTexts.push({
                text: `+${50 * this.combo}`,
                x: this.boss!.x + this.boss!.w / 2,
                y: this.boss!.y,
                color: '#ffcc00',
                alpha: 1.0,
                vy: -70
            });
            this.particles.emit(ball.x, ball.y, CONFIG.COLORS.BOSS, 15);
            this.hitStopTimer = 0.06;

            // 🚀 ADD HEAVIER BOSS SHAKE HERE
            this.renderer.triggerShake(150);

            AudioSys.playTone(150 + this.combo * 10, 'sawtooth', 0.15);
        }
    }

    applyPowerup(type: PowerupType) {
        this.activePowers.set(type, CONFIG.POWER_DURATION);
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
                this.activePowers.delete(type);
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

        const bgIntensity = Math.min(60, this.currentLevel * 4);
        this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, `rgb(${bgIntensity / 2}, 10, ${bgIntensity})`);

        for (const star of this.stars) {
            this.renderer.drawCircle(star.x, star.y, star.s, 'rgba(255, 255, 255, 0.4)');
        }

        for (const brick of this.bricks) {
            if (brick.active) {
                this.renderer.drawRect(brick.x, brick.y, brick.w, brick.h, brick.getColor(), 2);
            }
        }

        if (this.boss?.active) {
            const bossColor = this.boss.isInvulnerable ? '#ffffff' : CONFIG.COLORS.BOSS;
            this.renderer.drawRect(this.boss.x, this.boss.y, this.boss.w, this.boss.h, bossColor, 8);

            this.boss.orbitalStrikes.forEach(strike => {
                strike.draw(this.renderer.ctx, CONFIG.GAME_HEIGHT);
            });

            this.boss.gravityOrbs.forEach(orb => {
                orb.draw(this.renderer.ctx);
            });

            const hpPercent = this.boss.hp / this.boss.maxHp;
            const barW = this.boss.w * 1.5;
            const barH = 8;
            const barX = this.boss.x + (this.boss.w / 2) - (barW / 2);
            const barY = this.boss.y - 20;

            this.renderer.drawRect(barX, barY, barW, barH, 'rgba(0,0,0,0.8)', 4);
            const hpColor = hpPercent > 0.5 ? '#00ffcc' : hpPercent > 0.2 ? '#ffaa00' : '#ff3333';
            this.renderer.drawRect(barX, barY, barW * hpPercent, barH, hpColor, 4);
            this.renderer.drawStrokeRect(barX, barY, barW, barH, '#ffffff', 1, 4);
        }

        for (const h of this.hazards) {
            this.renderer.drawCircle(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, CONFIG.COLORS.HAZARD);
        }

        for (const l of this.lasers) {
            this.renderer.drawRect(l.x, l.y, l.w, l.h, CONFIG.COLORS.LASER, 2);
        }

        for (const p of this.powerups) {
            this.renderer.drawRect(p.x, p.y, p.w, p.h, p.getColor(), 4);
            this.renderer.drawText(p.getLetter(), p.x + p.w / 2, p.y + p.h / 2, 12, 'center', '#ffffff');
        }

        this.particles.draw(this.renderer);

        if (this.activePowers.has(PowerupType.Magnetic)) {
            this.renderer.drawRect(this.paddle.x, this.paddle.y - 4, this.paddle.w, 4, 'rgba(233, 196, 106, 0.4)', 2);
        }

        this.renderer.drawRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, CONFIG.COLORS.PADDLE, 6);

        if (this.activePowers.has(PowerupType.Laser)) {
            this.renderer.drawRect(this.paddle.x + 6, this.paddle.y - 8, 8, 8, CONFIG.COLORS.POWER_LASER, 2);
            this.renderer.drawRect(this.paddle.x + this.paddle.w - 14, this.paddle.y - 8, 8, 8, CONFIG.COLORS.POWER_LASER, 2);
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

        this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, 40, 'rgba(10, 15, 30, 0.9)');
        this.renderer.drawStrokeRect(0, 0, CONFIG.GAME_WIDTH, 40, 'rgba(0, 229, 255, 0.3)', 2);

        this.renderer.drawText(`SCORE: ${this.score}`, 20, 20, 16, 'left', '#00e5ff');
        this.renderer.drawText(`HI: ${this.highScore}`, 150, 20, 14, 'left', '#aaaaaa');
        const displayLevel = Math.min(this.currentLevel + 1, CONFIG.MAX_LEVELS);
        this.renderer.drawText(`LEVEL: ${displayLevel} / ${CONFIG.MAX_LEVELS}`, CONFIG.GAME_WIDTH / 2, 20, 16, 'center', '#ffffff');
        this.renderer.drawText(`LIVES: ${this.lives}`, CONFIG.GAME_WIDTH - 20, 20, 16, 'right', '#ff3366');

        if (this.combo > 1) {
            this.renderer.drawGlowText(`${this.combo}x COMBO`, CONFIG.GAME_WIDTH / 2, 60, 20, 'center', '#ffcc00', '#ffaa00', 10);
        }

        if (AudioSys.getMuted()) {
            this.renderer.drawText(`Muted`, CONFIG.GAME_WIDTH - 50, 60, 12, 'right', '#ff5555');
        }

        if (this.state === GameState.Menu) {
            const hasSave = !!Storage.loadProgress();
            const options = hasSave
                ? ['CONTINUE CAMPAIGN', 'START NEW CAMPAIGN', 'LEADERBOARD', 'OPTIONS', 'EXIT']
                : ['START CAMPAIGN', 'LEADERBOARD', 'OPTIONS', 'EXIT'];

            if (this.menuSelection >= options.length) {
                this.menuSelection = 0;
            }

            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(5, 5, 15, 0.95)');

            this.renderer.drawGlowText('GALACTIC BREAKOUT', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 130, 48, 'center', '#ffffff', '#00e5ff', 20);
            this.renderer.drawText('v2.5.0', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 80, 14, 'center', '#00e5ff');

            options.forEach((opt, index) => {
                const isSelected = this.menuSelection === index;
                const color = isSelected ? '#00ffcc' : '#aaaaaa';
                const prefix = isSelected ? '> ' : '  ';
                const suffix = isSelected ? ' <' : '';

                this.renderer.drawText(
                    `${prefix}${opt}${suffix}`,
                    CONFIG.GAME_WIDTH / 2,
                    CONFIG.GAME_HEIGHT / 2 - 25 + (index * 32),
                    18,
                    'center',
                    color
                );
            });

            this.renderer.drawText('Use W/S or Arrow Keys to Navigate, Enter to Select', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 180, 12, 'center', '#666666');

        } else if (this.state === GameState.Leaderboard) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(5, 5, 15, 0.95)');
            this.renderer.drawGlowText('TOP PILOTS', CONFIG.GAME_WIDTH / 2, 70, 36, 'center', '#00e5ff', '#0088ff', 15);

            if (this.isLoadingLeaderboard) {
                this.renderer.drawText('FETCHING COMMLINK DATA...', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, 16, 'center', '#ffcc00');
            } else if (this.leaderboardEntries.length === 0) {
                this.renderer.drawText('NO FLIGHT RECORDS FOUND', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, 16, 'center', '#ff3366');
            } else {
                const startY = 150;
                const colRankX = CONFIG.GAME_WIDTH / 2 - 180;
                const colNameX = CONFIG.GAME_WIDTH / 2 - 90;
                const colScoreX = CONFIG.GAME_WIDTH / 2 + 60;
                const colWaveX = CONFIG.GAME_WIDTH / 2 + 160;

                this.renderer.drawText('RANK', colRankX, startY, 14, 'left', '#ff00ff');
                this.renderer.drawText('PILOT', colNameX, startY, 14, 'left', '#ff00ff');
                this.renderer.drawText('SCORE', colScoreX, startY, 14, 'left', '#ff00ff');
                this.renderer.drawText('WAVE', colWaveX, startY, 14, 'left', '#ff00ff');

                this.renderer.drawStrokeRect(CONFIG.GAME_WIDTH / 2 - 220, startY + 15, 440, 2, 'rgba(0, 229, 255, 0.3)', 1, 2);

                this.leaderboardEntries.slice(0, 5).forEach((entry, idx) => {
                    const rowY = startY + 45 + (idx * 35);
                    const color = idx === 0 ? '#00ffcc' : '#ffffff';

                    this.renderer.drawText(`#${idx + 1}`, colRankX, rowY, 14, 'left', color);
                    this.renderer.drawText(entry.playerName || 'PILOT', colNameX, rowY, 14, 'left', color);
                    this.renderer.drawText(String(entry.score || 0), colScoreX, rowY, 14, 'left', color);
                    this.renderer.drawText(String(entry.levelReached || 1), colWaveX, rowY, 14, 'left', color);
                });
            }

            this.renderer.drawText('Press Space or Escape to Return', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 60, 14, 'center', '#aaaaaa');
        } else if (this.state === GameState.Options) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(5, 5, 15, 0.95)');
            this.renderer.drawGlowText('OPTIONS', CONFIG.GAME_WIDTH / 2, 180, 36, 'center', '#ff00ff', '#aa00aa', 15);

            const optionsList = [
                `SOUND SFX: ${this.soundEnabled ? 'ON' : 'OFF'}`,
                'BACK TO MENU'
            ];

            optionsList.forEach((opt, index) => {
                const isSelected = index === this.optionsSelection;
                const color = isSelected ? '#00ffcc' : '#ffffff';
                const prefix = isSelected ? '> ' : '  ';
                this.renderer.drawText(
                    prefix + opt,
                    CONFIG.GAME_WIDTH / 2,
                    280 + (index * 60),
                    20,
                    'center',
                    color
                );
            });

            this.renderer.drawText('Use W/S or Arrow Keys to Navigate, Enter to Toggle', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 60, 14, 'center', '#aaaaaa');

        } else if (this.state === GameState.Paused) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(0,0,0,0.7)');
            this.renderer.drawGlowText('PAUSED', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 30, 42, 'center', '#ffffff', '#00e5ff', 10);
            this.renderer.drawText('Press Space or Escape to Resume', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 20, 16, 'center', '#ffffff');
            this.renderer.drawText('Press Q to Exit to Main Menu', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 55, 14, 'center', '#ff3366');

        } else if (this.state === GameState.GameOver) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(10, 0, 0, 0.95)');
            this.renderer.drawGlowText('GAME OVER', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 20, 54, 'center', '#ff3333', '#ff0000', 20);
            this.renderer.drawText(`FINAL SCORE: ${this.score}`, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 30, 20, 'center', '#ffffff');
            this.renderer.drawText('Press Space to Restart', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 70, 16, 'center', '#aaaaaa');

        } else if (this.state === GameState.LevelComplete) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(0, 10, 20, 0.8)');

            if (this.currentLevel >= CONFIG.MAX_LEVELS - 1) {
                this.renderer.drawGlowText('YOU SAVED THE GALAXY!', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 40, 48, 'center', '#00ffcc', '#00aaaa', 20);
                this.renderer.drawText(`FINAL SCORE: ${this.score}`, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 20, 28, 'center', '#ffffff');
                this.renderer.drawText('Press Space to Play Again', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 70, 20, 'center', '#aaaaaa');
            } else {
                this.renderer.drawGlowText('LEVEL COMPLETE!', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 20, 42, 'center', '#ffcc00', '#aaaa00', 15);
                this.renderer.drawText('Press Space for Next Level', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 40, 24, 'center', '#ffffff');
            }
        } else if (this.state === GameState.EnterInitials) {
            this.renderer.drawRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'rgba(5, 5, 15, 0.95)');
            this.renderer.drawGlowText('NEW HIGH SCORE!', CONFIG.GAME_WIDTH / 2, 180, 36, 'center', '#00ffcc', '#00aaaa', 15);
            this.renderer.drawText(`SCORE: ${this.score}`, CONFIG.GAME_WIDTH / 2, 240, 24, 'center', '#ffffff');

            const spacing = 80;
            const startX = (CONFIG.GAME_WIDTH / 2) - spacing;

            for (let i = 0; i < 3; i++) {
                const isSelected = i === this.currentInitialIndex;
                const color = isSelected ? '#ff00ff' : '#ffffff';
                const yOffset = isSelected ? Math.sin(Date.now() / 150) * 5 : 0;

                this.renderer.drawText(this.initials[i], startX + (i * spacing), 350 + yOffset, 48, 'center', color);

                if (isSelected) {
                    this.renderer.drawRect(startX + (i * spacing) - 20, 370 + yOffset, 40, 4, '#ff00ff');
                } else {
                    this.renderer.drawRect(startX + (i * spacing) - 20, 370, 40, 4, '#555555');
                }
            }

            this.renderer.drawText('W/S to Change | A/D to Move | ENTER to Save', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 60, 14, 'center', '#aaaaaa');
        }

        for (const ft of this.floatingTexts) {
            this.renderer.ctx.save();
            this.renderer.ctx.globalAlpha = Math.max(0, ft.alpha);
            this.renderer.drawText(ft.text, ft.x, ft.y, 14, 'center', ft.color);
            this.renderer.ctx.restore();
        }

        this.renderer.endFrame();
    }
}