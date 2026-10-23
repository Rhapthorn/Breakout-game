// src/renderer.ts
import {CONFIG} from './config';

export class Renderer {
    ctx: CanvasRenderingContext2D;
    private shakeTimer = 0;

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext('2d', {alpha: false})!;
        this.resize();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = CONFIG.GAME_WIDTH * dpr;
        this.canvas.height = CONFIG.GAME_HEIGHT * dpr;
        this.canvas.style.width = `${CONFIG.GAME_WIDTH}px`;
        this.canvas.style.height = `${CONFIG.GAME_HEIGHT}px`;
        this.ctx.scale(dpr, dpr);
    }

    triggerShake(duration: number) {
        this.shakeTimer = duration;
    }

    resetShake() {
        this.shakeTimer = 0;
    }

    beginFrame(dt: number) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt * 1000;
            if (this.shakeTimer < 0) this.shakeTimer = 0;
        }

        this.ctx.save();
        if (this.shakeTimer > 0) {
            const mag = (this.shakeTimer / 100) * 5;
            const dx = (Math.random() - 0.5) * mag;
            const dy = (Math.random() - 0.5) * mag;
            this.ctx.translate(dx, dy);
        }

        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    }

    endFrame() {
        this.ctx.restore();
    }

    drawRect(x: number, y: number, w: number, h: number, color: string, radius: number = 0) {
        this.ctx.fillStyle = color;
        if (radius > 0) {
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, w, h, radius);
            this.ctx.fill();
        } else {
            this.ctx.fillRect(x, y, w, h);
        }
    }

    drawCircle(x: number, y: number, r: number, color: string, alpha: number = 1) {
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
    }

    drawText(text: string, x: number, y: number, size: number, align: CanvasTextAlign = 'left') {
        this.ctx.fillStyle = CONFIG.COLORS.TEXT;
        this.ctx.font = `bold ${size}px sans-serif`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);
    }
}