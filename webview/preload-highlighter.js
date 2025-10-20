const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
    console.log("[chimera] webview preload loaded");

    // подключаем основной highlighter
    const script = document.createElement("script");
    script.src = "highlighter.js"; // если он лежит рядом
    script.onload = () => console.log("[chimera] highlighter injected");
    document.body.appendChild(script);

    // слушаем клики от highlighter.js
    window.addEventListener("chimera-element-selected", (e) => {
        const html = e.detail;
        ipcRenderer.sendToHost("chimera-element-selected", html);
    });
});
