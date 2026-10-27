// src/ball.ts
import {CONFIG} from '../config';

export interface Position {
    x: number;
    y: number;
}

export class Ball {
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
    r: number = CONFIG.BALL_RADIUS;
    active: boolean = false;
    stuckToPaddle: boolean = true;
    stuckOffset: number = 0;
    speedMulti: number = 1;
    history: Position[] = [];

    spawn(x: number, y: number, vx: number, vy: number) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.active = true;
        this.stuckToPaddle = false;
        this.stuckOffset = 0;
        this.history = [];
    }

    reset() {
        this.active = true;
        this.stuckToPaddle = true;
        this.stuckOffset = 0;
        this.speedMulti = 1;
        this.history = [];
    }

    launch(paddleX: number, paddleW: number) {
        if (!this.stuckToPaddle) return;
        this.stuckToPaddle = false;
        this.x = paddleX + paddleW / 2 + this.stuckOffset;
        this.y = CONFIG.GAME_HEIGHT - 40 - this.r - 1;

        // Calculate bounce angle based on the explicit hit offset
        const normalizedHit = this.stuckOffset / (paddleW / 2);
        const angle = normalizedHit * (Math.PI / 3);

        const baseSpeed = CONFIG.BALL_BASE_SPEED * this.speedMulti;
        this.vx = Math.sin(angle) * baseSpeed;
        this.vy = -Math.cos(angle) * baseSpeed;

        // Anti-stall: if launched perfectly straight up, inject a tiny bit of horizontal velocity
        if (Math.abs(this.vx) < 5) {
            this.vx = (Math.random() - 0.5) * 50;
        }

        this.stuckOffset = 0;
    }

    update(paddleX: number, paddleW: number) {
        if (!this.active) return;

        if (this.stuckToPaddle) {
            this.x = paddleX + paddleW / 2 + this.stuckOffset;
            this.y = CONFIG.GAME_HEIGHT - 40 - this.r - 1;
            return;
        }

        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const targetSpeed = Math.min(CONFIG.BALL_BASE_SPEED * this.speedMulti, CONFIG.BALL_MAX_SPEED);

        if (Math.abs(currentSpeed - targetSpeed) > 1 && currentSpeed > 0) {
            const ratio = targetSpeed / currentSpeed;
            this.vx *= ratio;
            this.vy *= ratio;
        }
    }
}