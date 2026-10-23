const {app, BrowserWindow} = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        useContentSize: true, // Locks inner canvas to 800x600
        resizable: false,
        maximizable: false,
        autoHideMenuBar: true,
        title: "Breakout",
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

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});