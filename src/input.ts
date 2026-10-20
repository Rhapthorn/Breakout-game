// src/input.ts
export const Input = {
    keys: new Set<string>(),
    mouseX: 400,
    mouseDeltaX: 0,
    lastMouseX: 400,

    init(canvas: HTMLCanvasElement) {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width / (window.devicePixelRatio || 1);
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseDeltaX = this.mouseX - this.lastMouseX;
            this.lastMouseX = this.mouseX;
        });
    },

    isDown(code: string): boolean {
        return this.keys.has(code);
    },

    consume(code: string): boolean {
        if (this.keys.has(code)) {
            this.keys.delete(code);
            return true;
        }
        return false;
    },

    resetMouseDelta() {
        this.mouseDeltaX = 0;
    }
};