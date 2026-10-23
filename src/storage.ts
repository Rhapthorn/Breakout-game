// src/storage.ts

export interface SaveData {
    level: number;
    score: number;
    lives: number;
}

export const Storage = {
    getHighScore: (): number => {
        return parseInt(localStorage.getItem('breakout_hi') || '0', 10);
    },

    setHighScore: (score: number) => {
        localStorage.setItem('breakout_hi', score.toString());
    },

    saveProgress: (level: number, score: number, lives: number) => {
        const data: SaveData = {level, score, lives};
        localStorage.setItem('breakout_progress', JSON.stringify(data));
    },

    loadProgress: (): SaveData | null => {
        const data = localStorage.getItem('breakout_progress');
        if (data) {
            try {
                return JSON.parse(data) as SaveData;
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    clearProgress: () => {
        localStorage.removeItem('breakout_progress');
    }
};