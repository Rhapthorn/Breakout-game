// main.cjs
const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');


// Initialize the SQLite driver adapter pointing to your dev.db file
const adapter = new PrismaBetterSqlite3({
    url: 'file:' + path.join(__dirname, 'dev.db')
});

// Pass the adapter into PrismaClient for Prisma 7
const prisma = new PrismaClient({ adapter });

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        useContentSize: true, // Locks inner canvas to 800x600
        resizable: false,
        maximizable: false,
        autoHideMenuBar: true,
        title: "Galactic Breakout",
        icon: path.join(__dirname, 'icon.ico'), // Explicitly sets the window/taskbar icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    // Hides the default Windows file menu completely
    mainWindow.setMenu(null);

    // Loads your built Vite app
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

// --- IPC DATABASE HANDLERS ---
ipcMain.handle('db-get-leaderboard', async () => {
    try {
        return await prisma.scoreEntry.findMany({
            orderBy: { score: 'desc' },
            take: 10
        });
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return [];
    }
});

ipcMain.handle('db-save-score', async (event, data) => {
    try {
        return await prisma.scoreEntry.create({
            data: {
                playerName: data.playerName || 'Player 1',
                score: data.score,
                levelReached: data.levelReached
            }
        });
    } catch (error) {
        console.error('Failed to save score:', error);
        return null;
    }
});

ipcMain.handle('db-increment-boss', async (event, bossLevel) => {
    try {
        return await prisma.bossStat.upsert({
            where: { bossLevel: bossLevel },
            update: { killCount: { increment: 1 } },
            create: { bossLevel: bossLevel, killCount: 1 }
        });
    } catch (error) {
        console.error('Failed to update boss stat:', error);
        return null;
    }
});

app.whenReady().then(async () => {
    // Ensure database connection is established
    try {
        await prisma.$connect();
        console.log('Database connected successfully via Prisma.');
    } catch (e) {
        console.error('Database connection error:', e);
    }

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', async function () {
    await prisma.$disconnect();
    if (process.platform !== 'darwin') app.quit();
});