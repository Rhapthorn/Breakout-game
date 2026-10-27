// main.cjs
const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs');

// Path to local JSON storage file
const dataFilePath = path.join(app.getPath('userData'), 'game_data.json');

function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = fs.readFileSync(dataFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
    return {scores: [], bossStats: {}};
}

function saveData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Failed to save data:', e);
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        useContentSize: true,
        resizable: false,
        maximizable: false,
        autoHideMenuBar: true,
        title: "Galactic Breakout",
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            partition: 'persist:galactic_breakout'
        }
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

}

// --- IPC HANDLERS ---
ipcMain.handle('db-get-leaderboard', async () => {
    const data = loadData();
    return data.scores.sort((a, b) => b.score - a.score).slice(0, 10);
});

ipcMain.handle('db-save-score', async (event, payload) => {
    const data = loadData();
    const newEntry = {
        id: Date.now(),
        playerName: payload.playerName || 'Pilot',
        score: payload.score,
        levelReached: payload.levelReached,
        createdAt: new Date().toISOString()
    };
    data.scores.push(newEntry);
    saveData(data);
    return newEntry;
});

ipcMain.handle('db-increment-boss', async (event, bossLevel) => {
    const data = loadData();
    data.bossStats[bossLevel] = (data.bossStats[bossLevel] || 0) + 1;
    saveData(data);
    return {bossLevel, killCount: data.bossStats[bossLevel]};
});

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});