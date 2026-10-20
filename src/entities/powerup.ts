// src/entities/powerup.ts
import {PowerupType, Rect} from '../types';
import {CONFIG} from '../config';

export class Powerup implements Rect {
    x: number;
    y: number;
    w: number = CONFIG.POWERUP_SIZE;
    h: number = CONFIG.POWERUP_SIZE;
    type: PowerupType;
    active: boolean = true;

    constructor(x: number, y: number, type: PowerupType) {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    update(dt: number) {
        if (!this.active) return;
        this.y += CONFIG.POWERUP_SPEED * dt;
        if (this.y > CONFIG.GAME_HEIGHT) {
            this.active = false;
        }
    }

    getColor(): string {
        switch (this.type) {
            case PowerupType.Wide:
                return CONFIG.COLORS.POWERUP_WIDE;
            case PowerupType.Multi:
                return CONFIG.COLORS.POWERUP_MULTI;
            case PowerupType.Slow:
                return CONFIG.COLORS.POWERUP_SLOW;
            case PowerupType.ExtraLife:
                return CONFIG.COLORS.POWERUP_LIFE;
        }
    }

    getLetter(): string {
        switch (this.type) {
            case PowerupType.Wide:
                return 'W';
            case PowerupType.Multi:
                return 'M';
            case PowerupType.Slow:
                return 'S';
            case PowerupType.ExtraLife:
                return '♥';
        }
    }
}