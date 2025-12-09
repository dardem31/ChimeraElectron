const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
    console.log("[chimera] webview preload loaded");

    // подключаем основной highlighter
    const script = document.createElement("script");
    script.src = "highlighter.js"; // если он лежит рядом
    script.onload = () => console.log("[chimera] highlighter injected");
    document.body.appendChild(script);

    // слушаем клики от highlighter.js
    window.addEventListener("submit-prompt", (e) => {
        const html = e.detail;
        ipcRenderer.sendToHost("submit-prompt", html);
    });
    ipcRenderer.on('highlighter-response-channel', (event, payload) => {
        console.log('highlighter-response-channel', payload)
        // Доставляем в highlighter.js
        window.postMessage(payload, "*");
    });
});