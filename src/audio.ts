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

    playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (isMuted || !ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    },

    playBossCharge(duration: number) {
        if (isMuted || !ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Ramp frequency up to simulate charging energy
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + duration);

        // Quick fade out at the peak of the charge
        gain.gain.setValueAtTime(0.2, ctx.currentTime + duration);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration + 0.1);
        osc.stop(ctx.currentTime + duration + 0.1);
    },

    playShieldBreak() {
        if (isMuted || !ctx) return;

        const duration = 0.5;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate white noise buffer
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Apply a lowpass filter that drops rapidly to simulate an explosion/shatter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
    },

    playGravityPulse() {
        if (isMuted || !ctx) return;

        const duration = 1.0;
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const mainGain = ctx.createGain();

        // Deep bass tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, ctx.currentTime);

        // Low-Frequency Oscillator (LFO) to create the "wobble/pulse" effect
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(10, ctx.currentTime); // 10 Hz wobble

        // Modulate the main gain using the LFO
        lfo.connect(lfoGain);
        lfoGain.connect(mainGain.gain);
        lfoGain.gain.value = 0.6;

        osc.connect(mainGain);
        mainGain.connect(ctx.destination);

        mainGain.gain.setValueAtTime(0.3, ctx.currentTime);
        mainGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

        osc.start();
        lfo.start();
        osc.stop(ctx.currentTime + duration);
        lfo.stop(ctx.currentTime + duration);
    }
};