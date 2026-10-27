// src/storage.ts

export interface SaveData {
    level: number;
    score: number;
    lives: number;
}

// Use window.require to safely load Node modules in Electron without breaking Vite build
const getElectronModules = () => {
    try {
        if (typeof window !== 'undefined' && (window as any).require) {
            const fs = (window as any).require('fs');
            const path = (window as any).require('path');
            const os = (window as any).require('os');
            return {fs, path, os};
        }
    } catch (e) {
        console.error('Node require failed:', e);
    }
    return {fs: null, path: null, os: null};
};

const {fs, path, os} = getElectronModules();

const getStorageDir = (): string => {
    if (!fs || !path || !os) return '.';
    try {
        const dir = path.join(os.homedir(), '.galactic_breakout');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }
        return dir;
    } catch (e) {
        return '.';
    }
};

const getSavePath = (filename: string): string => {
    const dir = getStorageDir();
    if (path) {
        return path.join(dir, filename);
    }
    return filename;
};

export const Storage = {
    getHighScore: (): number => {
        try {
            const hiFile = getSavePath('highscore.json');
            if (fs && fs.existsSync(hiFile)) {
                const data = fs.readFileSync(hiFile, 'utf-8');
                const parsed = JSON.parse(data);
                return parsed.score || 0;
            }
        } catch (e) {
            console.error('Error loading high score:', e);
        }
        return 0;
    },

    setHighScore: (score: number) => {
        try {
            const hiFile = getSavePath('highscore.json');
            if (fs) {
                fs.writeFileSync(hiFile, JSON.stringify({score}), 'utf-8');
            }
        } catch (e) {
            console.error('Error saving high score:', e);
        }
    },

    saveProgress: (level: number, score: number, lives: number) => {
        try {
            const saveFile = getSavePath('save.json');
            if (fs) {
                const data: SaveData = {level, score, lives};
                fs.writeFileSync(saveFile, JSON.stringify(data), 'utf-8');
            }
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    },

    loadProgress: (): SaveData | null => {
        try {
            const saveFile = getSavePath('save.json');
            if (fs && fs.existsSync(saveFile)) {
                const data = fs.readFileSync(saveFile, 'utf-8');
                return JSON.parse(data) as SaveData;
            }
        } catch (e) {
            console.error('Error loading progress:', e);
        }
        return null;
    },

    clearProgress: () => {
        try {
            const saveFile = getSavePath('save.json');
            if (fs && fs.existsSync(saveFile)) {
                fs.unlinkSync(saveFile);
            }
        } catch (e) {
            console.error('Error clearing progress:', e);
        }
    }
};