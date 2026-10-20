// src/entities/ball.ts
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
    speedMult: number = 1;
    history: Position[] = [];

    spawn(x: number, y: number, vx: number, vy: number) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.active = true;
        this.stuckToPaddle = false;
        this.history = [];
    }

    reset() {
        this.active = true;
        this.stuckToPaddle = true;
        this.speedMult = 1;
        this.history = [];
    }

    launch(paddleX: number, paddleW: number) {
        if (!this.stuckToPaddle) return;
        this.stuckToPaddle = false;
        this.x = paddleX + paddleW / 2;
        this.y = CONFIG.GAME_HEIGHT - 40 - this.r - 1;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = -CONFIG.BALL_BASE_SPEED;
    }

    update(paddleX: number, paddleW: number) {
        if (!this.active) return;

        if (this.stuckToPaddle) {
            this.x = paddleX + paddleW / 2;
            this.y = CONFIG.GAME_HEIGHT - 40 - this.r - 1;
            return;
        }

        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const targetSpeed = Math.min(CONFIG.BALL_BASE_SPEED * this.speedMult, CONFIG.BALL_MAX_SPEED);

        if (Math.abs(currentSpeed - targetSpeed) > 1 && currentSpeed > 0) {
            const ratio = targetSpeed / currentSpeed;
            this.vx *= ratio;
            this.vy *= ratio;
        }
    }
}