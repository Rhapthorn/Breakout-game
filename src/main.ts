// src/main.ts
import {CONFIG} from './config';
import {Game} from './game';
import {Input} from './input';
import {GameState} from './types';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
Input.init(canvas);

const game = new Game(canvas);

let lastTime = performance.now();
let accumulator = 0;

function loop(time: number) {
    const frameTime = time - lastTime;
    lastTime = time;

    // Cap frame time to prevent spiral of death on long pauses
    accumulator += Math.min(frameTime, 250);

    while (accumulator >= CONFIG.TICK_RATE) {
        game.update(CONFIG.TICK_RATE / 1000); // dt in seconds
        accumulator -= CONFIG.TICK_RATE;
    }

    game.render();
    requestAnimationFrame(loop);
}

window.addEventListener('blur', () => {
    if (game.state === GameState.Playing) {
        game.state = GameState.Paused;
    }
});

requestAnimationFrame(loop);