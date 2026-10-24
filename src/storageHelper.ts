// src/storageHelper.ts
let ipcRenderer: any = null;

// Safely require Electron's ipcRenderer for Node integration environments
try {
    if (typeof window !== 'undefined' && (window as any).require) {
        const electron = (window as any).require('electron');
        ipcRenderer = electron.ipcRenderer;
    }
} catch (e) {
    console.warn('Electron ipcRenderer not available in this context.');
}

export const StorageHelper = {
    async saveScore(score: number, levelReached: number, playerName: string = 'Pilot') {
        if (!ipcRenderer) return null;
        try {
            return await ipcRenderer.invoke('db-save-score', {
                playerName,
                score,
                levelReached
            });
        } catch (error) {
            console.error('Failed to invoke db-save-score:', error);
            return null;
        }
    },

    async getLeaderboard() {
        if (!ipcRenderer) return [];
        try {
            return await ipcRenderer.invoke('db-get-leaderboard');
        } catch (error) {
            console.error('Failed to invoke db-get-leaderboard:', error);
            return [];
        }
    },

    async incrementBossKill(bossLevel: number) {
        if (!ipcRenderer) return null;
        try {
            return await ipcRenderer.invoke('db-increment-boss', bossLevel);
        } catch (error) {
            console.error('Failed to invoke db-increment-boss:', error);
            return null;
        }
    }
};