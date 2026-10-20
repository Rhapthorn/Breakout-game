// src/particles.ts
import {Renderer} from './renderer';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    active: boolean;
}

export class ParticleSystem {
    private pool: Particle[];

    constructor(size: number = 200) {
        this.pool = Array.from({length: size}, () => ({
            x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', active: false
        }));
    }

    emit(x: number, y: number, color: string, count: number) {
        let spawned = 0;
        for (const p of this.pool) {
            if (!p.active) {
                p.x = x;
                p.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 150 + 50;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = p.maxLife = Math.random() * 0.4 + 0.2;
                p.color = color;
                p.active = true;
                spawned++;
                if (spawned >= count) break;
            }
        }
    }

    update(dt: number) {
        for (const p of this.pool) {
            if (p.active) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                if (p.life <= 0) p.active = false;
            }
        }
    }

    draw(renderer: Renderer) {
        for (const p of this.pool) {
            if (p.active) {
                const size = (p.life / p.maxLife) * 4;
                renderer.drawRect(p.x - size / 2, p.y - size / 2, size, size, p.color);
            }
        }
    }
}