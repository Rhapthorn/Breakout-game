// src/entities/paddle.ts
import {CONFIG} from '../config';
import {Input} from '../input';
import {Rect} from '../types';

export class Paddle implements Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number = 0;
    targetWidth: number;

    constructor() {
        this.w = CONFIG.PADDLE_WIDTH;
        this.targetWidth = this.w;
        this.h = CONFIG.PADDLE_HEIGHT;
        this.x = CONFIG.GAME_WIDTH / 2 - this.w / 2;
        this.y = CONFIG.GAME_HEIGHT - 40;
    }

    reset() {
        this.w = CONFIG.PADDLE_WIDTH;
        this.targetWidth = this.w;
        this.x = CONFIG.GAME_WIDTH / 2 - this.w / 2;
        this.vx = 0;
    }

    setWidthMultiplier(mult: number) {
        this.targetWidth = CONFIG.PADDLE_WIDTH * mult;
    }

    update(dt: number) {
        // Smooth width transition for powerup
        if (this.w !== this.targetWidth) {
            this.w += (this.targetWidth - this.w) * 10 * dt;
            if (Math.abs(this.w - this.targetWidth) < 1) this.w = this.targetWidth;
        }

        let dir = 0;
        if (Input.isDown('ArrowLeft') || Input.isDown('KeyA')) dir -= 1;
        if (Input.isDown('ArrowRight') || Input.isDown('KeyD')) dir += 1;

        if (dir !== 0) {
            this.vx += dir * CONFIG.PADDLE_ACCEL * dt;
        } else if (Input.mouseDeltaX !== 0) {
            // Mouse override if moved
            this.x += Input.mouseDeltaX;
            this.vx = 0;
        }

        this.vx *= CONFIG.PADDLE_FRICTION;

        if (this.vx > CONFIG.PADDLE_MAX_SPEED) this.vx = CONFIG.PADDLE_MAX_SPEED;
        if (this.vx < -CONFIG.PADDLE_MAX_SPEED) this.vx = -CONFIG.PADDLE_MAX_SPEED;

        this.x += this.vx * dt;

        // Clamp to screen
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        } else if (this.x + this.w > CONFIG.GAME_WIDTH) {
            this.x = CONFIG.GAME_WIDTH - this.w;
            this.vx = 0;
        }
    }
}