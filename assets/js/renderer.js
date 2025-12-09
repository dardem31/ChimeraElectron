const getControlsHeight = () => {
    const controls = document.querySelector("#controls");
    if (controls) {
        return controls.offsetHeight;
    }
    return 0;
};

const calculateLayoutSize = () => {
    const webview = document.querySelector("webview");
    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = document.documentElement.clientHeight;
    const controlsHeight = getControlsHeight();
    const webviewHeight = windowHeight - controlsHeight;

    webview.style.width = windowWidth + "px";
    webview.style.height = webviewHeight + "px";
};

window.addEventListener("DOMContentLoaded", () => {
    calculateLayoutSize();

    // Dynamic resize function (responsive)
    window.onresize = calculateLayoutSize;

    // Home button exists
    if (document.querySelector("#home")) {
        document.querySelector("#home").onclick = () => {
            const home = document.getElementById("webview").getAttribute("data-home"); //getElementById instead querySelector to use live collections: https://javascript.info/searching-elements-dom#live-collections
            document.querySelector("webview").src = home;
        };
    }

    // Print button exits
    if (document.querySelector("#print_button")) {
        document
            .querySelector("#print_button")
            .addEventListener("click", async () => {
                const url = document.querySelector("webview").getAttribute("src");

                // Launch print window
                await window.electron.print(url);
            });
    }
});
webview.addEventListener("ipc-message", async (event) => {
    if (event.channel === "submit-prompt") {

        const detail = event.args[0];
        console.log(window.loadedSessionId)
        console.log("[chimera] Element info received from webview:", detail);
        try {
            // Отправляем на backend через electronAPI (preload)
            const response = await window.electronAPI.forwardHtmlSelection(detail, window.loadedSessionId);
            if (!response.success) {
                throw new Error('Failed to process prompt!')
            }
            const result = response.result;

            console.log("[chimera] Response from AI:", result);

            // Проверяем, что модель вернула JS_ACTION
            if (result?.type === "ERROR") {
                console.error("[chimera] AI returned error:", result.message);
            } else {
                webview.send("highlighter-response-channel", {type: 'prompt-response', payload: result});
            }
        } catch (err) {
            console.error("[chimera] Failed to process AI response:", err);
        }
    }
});