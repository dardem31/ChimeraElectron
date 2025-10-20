// Electron
const {app, session, BrowserWindow, ipcMain} = require("electron");
const {createProxyServer} = require('./src/cert_utils/proxy-server');
const sessionController = require('./src/controllers/SessionController')
const path = require("path");

ipcMain.handle('session:open', sessionController.startSession.bind(sessionController))
ipcMain.handle('session:close', sessionController.closeSession.bind(sessionController))
ipcMain.handle('session:list', sessionController.listSessions.bind(sessionController))
ipcMain.handle('session:replay', sessionController.replaySession.bind(sessionController))
ipcMain.handle('prompt:content', sessionController.promptContent.bind(sessionController))

app.whenReady().then(async () => {
    await createProxyServer(8078);
    console.log('Proxy server started on port 8078');
    const proxySession = session.fromPartition('persist:proxy-session')


    await proxySession.setProxy({
        proxyRules: 'http=localhost:8078;https=localhost:8078'
    })
    proxySession.setCertificateVerifyProc(({hostname}, callback) => {
        callback(0);
    });

    let mainWindow = new BrowserWindow({
        backgroundColor: "#fff",
        webPreferences: {
            session: proxySession,
            webSecurity: false,
            allowRunningInsecureContent: true,
            webviewTag: true,
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        },
    });
    mainWindow.loadFile("index.html");
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize()
        mainWindow.show();
    });
});


// Quit when all windows are closed.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true); // Разрешаем "небезопасные" соединения
});
