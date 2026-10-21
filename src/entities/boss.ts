// src/entities/boss.ts
import {CONFIG} from '../config';
import {Rect} from '../types';

export class Boss implements Rect {
    x: number;
    y: number;
    w: number = 180;
    h: number = 60;
    hp: number = 30;
    maxHp: number = 30;
    vx: number = 200;
    active: boolean = true;
    hazardTimer: number = 1.0;

    constructor() {
        this.x = CONFIG.GAME_WIDTH / 2 - this.w / 2;
        this.y = 40;
    }

    update(dt: number) {
        if (!this.active) return;

        this.x += this.vx * dt;

        if (this.x < 0) {
            this.x = 0;
            this.vx *= -1;
        } else if (this.x + this.w > CONFIG.GAME_WIDTH) {
            this.x = CONFIG.GAME_WIDTH - this.w;
            this.vx *= -1;
        }

        this.hazardTimer -= dt;
    }

    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.active = false;
        }
    }
}