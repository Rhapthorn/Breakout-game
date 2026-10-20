// src/entities/brick.ts
import {Rect} from '../types';
import {CONFIG} from '../config';

export class Brick implements Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    hp: number;
    maxHp: number;
    isIndestructible: boolean;
    active: boolean = true;

    constructor(x: number, y: number, w: number, h: number, hp: number, isIndestructible: boolean) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.hp = hp;
        this.maxHp = hp;
        this.isIndestructible = isIndestructible;
    }

    hit(): boolean {
        if (this.isIndestructible) return false;
        this.hp--;
        if (this.hp <= 0) {
            this.active = false;
            return true;
        }
        return false;
    }

    getColor(): string {
        if (this.isIndestructible) return CONFIG.COLORS.BRICK_IND;
        if (this.hp === 3) return CONFIG.COLORS.BRICK_3;
        if (this.hp === 2) return CONFIG.COLORS.BRICK_2;
        return CONFIG.COLORS.BRICK_1;
    }
}