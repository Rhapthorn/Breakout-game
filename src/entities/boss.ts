// src/entities/boss.ts
import {IState, StateMachine} from '../engine/FSM';
import {CONFIG} from "../config.ts";

export class BossProjectile {
    constructor(public x: number, public y: number, public vx: number, public vy: number, public radius: number = 5) {
    }

    update(dt: number): void {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class ShieldMinion {
    constructor(public x: number, public y: number, public angle: number, public orbitRadius: number) {
    }

    update(bossX: number, bossY: number, dt: number): void {
        this.angle += 2 * dt;
        this.x = bossX + 60 + Math.cos(this.angle) * this.orbitRadius;
        this.y = bossY + 30 + Math.sin(this.angle) * this.orbitRadius;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
    }
}

export class GravityOrb {
    constructor(public x: number, public y: number, public vy: number, public radius: number = 20) {
    }

    update(dt: number): void {
        this.y += this.vy * dt;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'rgba(128, 0, 128, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class OrbitalStrike {
    public timer: number = 0;
    public active: boolean = false;
    public isFinished: boolean = false;

    constructor(public x: number, public width: number = 60) {
    }

    update(dt: number): void {
        this.timer += dt;
        if (this.timer > 1.5 && this.timer <= 2.0) {
            this.active = true;
        } else if (this.timer > 2.0) {
            this.active = false;
            this.isFinished = true;
        }
    }

    draw(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
        if (this.isFinished) return;
        if (!this.active) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(this.x - this.width / 2, 0, this.width, canvasHeight);
        } else {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.fillRect(this.x - this.width / 2, 0, this.width, canvasHeight);
        }
    }
}

export class Boss {
    public x: number;
    public y: number;
    public w: number = 120; // Maintained as 'w' for Game.ts compatibility
    public h: number = 60;  // Maintained as 'h' for Game.ts compatibility
    public hp: number = 1000;
    public maxHp: number = 1000;
    public active: boolean = true;
    public isInvulnerable: boolean = false;
    public targetX: number = 400;
    public canvasHeight: number = 600;
    public currentPhase: number = 1;
    public hazardTimer: number = 0; // Compatibility placeholder for existing game code

    public projectiles: BossProjectile[] = [];
    public shields: ShieldMinion[] = [];
    public gravityOrbs: GravityOrb[] = [];
    public orbitalStrikes: OrbitalStrike[] = [];

    public stateMachine: StateMachine<Boss>;

    constructor(_levelIndex?: number) {
        this.x = 340; // Center of 800 width
        this.y = 80;
        this.stateMachine = new StateMachine<Boss>(this);
        this.stateMachine.changeState(new PhaseOneIdleState());
    }

    public hit(): void {
        this.takeDamage(50);
    }

    public resetHazardTimer(): void {
        this.hazardTimer = 3.0;
    }

    public takeDamage(amount: number): void {
        if (this.isInvulnerable) return;

        this.hp = Math.max(0, this.hp - amount);

        if (this.hp <= 0 && this.currentPhase !== 3) {
            this.currentPhase = 3;
            this.active = false;
            this.stateMachine.changeState(new DefeatedState());
        } else if (this.hp <= this.maxHp * 0.5 && this.currentPhase === 1) {
            this.currentPhase = 2;
            this.stateMachine.changeState(new IFrameTransitionState());
        }
    }

    public update(dt: number): void {
        if (!this.active) return;

        if (this.hazardTimer > 0) {
            this.hazardTimer -= dt;
        }

        this.stateMachine.update(dt);

        this.projectiles.forEach(p => p.update(dt));
        this.shields.forEach(s => s.update(this.x, this.y, dt));
        this.gravityOrbs.forEach(g => g.update(dt));
        this.orbitalStrikes.forEach(o => o.update(dt));

        this.projectiles = this.projectiles.filter(p => p.y < this.canvasHeight + 50 && p.x > -50 && p.x < 850);
        this.gravityOrbs = this.gravityOrbs.filter(g => g.y < this.canvasHeight + 50);
        this.orbitalStrikes = this.orbitalStrikes.filter(o => !o.isFinished);
    }
}

class PhaseOneIdleState implements IState<Boss> {
    private timer: number = 0;
    private direction: number = 1; // 1 for right, -1 for left
    private nextAttack: 'burst' | 'shield' = 'burst';

    enter(boss: Boss): void {
        boss.isInvulnerable = false;
        this.timer = 0;
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;

        // Smooth velocity-based movement instead of resetting sine wave math
        const speed = 120; // Pixels per second
        boss.x += speed * this.direction * dt;

        // Bounce smoothly off the screen edges
        const leftBound = 50;
        const rightBound = CONFIG.GAME_WIDTH - boss.w - 50;

        if (boss.x <= leftBound) {
            boss.x = leftBound;
            this.direction = 1; // Change direction to right
        } else if (boss.x >= rightBound) {
            boss.x = rightBound;
            this.direction = -1; // Change direction to left
        }

        // Transition to attack after 3.5 seconds
        // Transition to attack after 3.5 seconds
        if (this.timer >= 3.5) {
            if (this.nextAttack === 'burst') {
                boss.stateMachine.changeState(new RadialBurstState());
            } else {
                boss.stateMachine.changeState(new ShieldSpawnState());
            }
        }
    }

    exit(_boss: Boss): void {
    }
}

class RadialBurstState implements IState<Boss> {
    private timer: number = 0;
    private hasFired: boolean = false;

    enter(_boss: Boss): void {
        this.timer = 0;
        this.hasFired = false;
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;

        if (this.timer > 0.5 && !this.hasFired) {
            this.hasFired = true;
            const projectilesCount = 12;
            const speed = 150;
            for (let i = 0; i < projectilesCount; i++) {
                const angle = (i / projectilesCount) * Math.PI * 2;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                boss.projectiles.push(new BossProjectile(boss.x + boss.w / 2, boss.y + boss.h / 2, vx, vy));
            }
        }

        if (this.timer >= 1.5) {
            const idle = new PhaseOneIdleState();
            idle['nextAttack'] = 'shield';
            boss.stateMachine.changeState(idle);
        }
    }

    exit(_boss: Boss): void {
    }
}

class ShieldSpawnState implements IState<Boss> {
    private timer: number = 0;

    enter(boss: Boss): void {
        this.timer = 0;
        boss.shields = [];
        const shieldCount = 4;
        for (let i = 0; i < shieldCount; i++) {
            const angle = (i / shieldCount) * Math.PI * 2;
            boss.shields.push(new ShieldMinion(boss.x, boss.y, angle, 100));
        }
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;
        if (this.timer >= 1.0) {
            const idle = new PhaseOneIdleState();
            idle['nextAttack'] = 'burst';
            boss.stateMachine.changeState(idle);
        }
    }

    exit(_boss: Boss): void {
    }
}

class IFrameTransitionState implements IState<Boss> {
    private timer: number = 0;

    enter(boss: Boss): void {
        boss.isInvulnerable = true;
        boss.projectiles = [];
        boss.shields = [];
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;
        if (this.timer >= 2.0) {
            boss.stateMachine.changeState(new PhaseTwoIdleState());
        }
    }

    exit(boss: Boss): void {
        boss.isInvulnerable = false;
    }
}

class PhaseTwoIdleState implements IState<Boss> {
    private timer: number = 0;
    private nextAttack: 'strike' | 'orb' = 'strike';

    enter(_boss: Boss): void {
        this.timer = 0;
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;
        boss.x += (boss.targetX - (boss.x + boss.w / 2)) * 2 * dt;

        if (this.timer >= 1.5) {
            if (this.nextAttack === 'strike') {
                boss.stateMachine.changeState(new OrbitalStrikeState());
            } else {
                boss.stateMachine.changeState(new GravityOrbState());
            }
        }
    }

    exit(_boss: Boss): void {
    }
}

class OrbitalStrikeState implements IState<Boss> {
    private timer: number = 0;
    private hasFired: boolean = false;

    enter(_boss: Boss): void {
        this.timer = 0;
        this.hasFired = false;
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;

        if (this.timer > 0.2 && !this.hasFired) {
            this.hasFired = true;
            boss.orbitalStrikes.push(new OrbitalStrike(boss.targetX));
        }

        if (this.timer >= 2.5) {
            const idle = new PhaseTwoIdleState();
            idle['nextAttack'] = 'orb';
            boss.stateMachine.changeState(idle);
        }
    }

    exit(_boss: Boss): void {
    }
}

class GravityOrbState implements IState<Boss> {
    private timer: number = 0;
    private hasFired: boolean = false;

    enter(_boss: Boss): void {
        this.timer = 0;
        this.hasFired = false;
    }

    update(boss: Boss, dt: number): void {
        this.timer += dt;

        if (this.timer > 0.5 && !this.hasFired) {
            this.hasFired = true;
            boss.gravityOrbs.push(new GravityOrb(boss.x + boss.w / 2, boss.y + boss.h / 2, 80));
        }

        if (this.timer >= 1.5) {
            const idle = new PhaseTwoIdleState();
            idle['nextAttack'] = 'strike';
            boss.stateMachine.changeState(idle);
        }
    }

    exit(_boss: Boss): void {
    }
}

class DefeatedState implements IState<Boss> {
    enter(boss: Boss): void {
        boss.isInvulnerable = true;
        boss.projectiles = [];
        boss.shields = [];
        boss.gravityOrbs = [];
        boss.orbitalStrikes = [];
    }

    update(_boss: Boss, _dt: number): void {
    }

    exit(_boss: Boss): void {
    }
}