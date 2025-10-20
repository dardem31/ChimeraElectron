const fs = require('fs');
const path = require('path');
const {contextBridge, ipcRenderer} = require("electron");

const highlighterCode = fs.readFileSync(
    path.join(__dirname, 'webview', 'highlighter.js'),
    'utf8'
);

contextBridge.exposeInMainWorld("electronAPI", {
    sessionManagement: {
        openSession: (name, url) => ipcRenderer.invoke('session:open', name, url),
        closeSession: () => ipcRenderer.invoke('session:close'),
        listSessions: () => ipcRenderer.invoke('session:list'),
        replaySession: (sessionId) => ipcRenderer.invoke('session:replay', sessionId)
    },
    getHighlighterCode: () => highlighterCode,
    forwardHtmlSelection: (html) => ipcRenderer.invoke('prompt:content', html)
});