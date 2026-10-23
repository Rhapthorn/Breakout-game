// src/entities/boss.ts
import {CONFIG} from '../config';
import {Rect} from '../types';

export class Boss implements Rect {
    x: number;
    y: number;
    w: number = 180;
    h: number = 60;
    hp: number;
    maxHp: number;
    vx: number;
    active: boolean = true;
    hazardTimer: number = 0;
    private levelIndex: number;

    constructor(levelIndex: number) {
        this.levelIndex = levelIndex;
        this.x = CONFIG.GAME_WIDTH / 2 - this.w / 2;
        this.y = 40;

        // Determine Boss Tier based on how many we have faced
        // Level 5 (index 4) -> tier 0
        // Level 10 (index 9) -> tier 1
        const tier = Math.floor(levelIndex / 5);

        // Health scales up by 10 per tier
        this.hp = 30 + (tier * 10);
        this.maxHp = this.hp;

        // Speed scales up by 30 per tier
        this.vx = 200 + (tier * 30);

        this.resetHazardTimer();
    }

    resetHazardTimer() {
        const tier = Math.floor(this.levelIndex / 5);

        // Base delay drops by 0.4s per tier, random variance drops by 0.2s per tier
        // Math.max ensures the boss never drops below a 0.5s machine-gun speed
        const minWait = Math.max(0.5, 2.0 - (tier * 0.4));
        const variance = Math.max(0.5, 1.5 - (tier * 0.2));

        this.hazardTimer = minWait + Math.random() * variance;
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