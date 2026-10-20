// src/audio.ts
let ctx: AudioContext | null = null;
let isMuted = false;

export const AudioSys = {
    init() {
        if (!ctx) {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    },
    toggleMute() {
        isMuted = !isMuted;
    },
    getMuted(): boolean {
        return isMuted;
    },
    playTone(freq: number, type: OscillatorType, duration: number) {
        if (isMuted || !ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    }
};