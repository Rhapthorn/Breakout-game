// src/storage.ts
export const Storage = {
    getHighScore(): number {
        return parseInt(localStorage.getItem('breakout_highscore') || '0', 10);
    },
    setHighScore(score: number): void {
        localStorage.setItem('breakout_highscore', score.toString());
    }
};