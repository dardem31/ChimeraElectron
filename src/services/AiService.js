// services/NetLogService.js
const sessionActionService = require("../services/SessionActionService");

class AiService {
    async sendEditRequest(selectedElement, userCommand, sessionId) {
        const requestPayload = {
            userCommand,
            selectedElement
        };

        try {
            const response = await fetch("http://localhost:8083/api/prompt/editPage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                console.log(response)
                const text = await response.text();
                console.error("Ошибка backend:", text);
                return { type: "ERROR", message: text };
            }

            const json = await response.json();
            sessionActionService.saveAction({
                instruction: JSON.stringify(json),
                selector: selectedElement.selector,
                elementHash: selectedElement.hash,
                url: null,
                sessionId: sessionId
            })
            return json;
        } catch (e) {
            console.error("Ошибка при отправке запроса:", e);
            return { type: "ERROR", message: e.message };
        }
    }
}

module.exports = new AiService();
