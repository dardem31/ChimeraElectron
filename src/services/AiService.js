// services/NetLogService.js

class AiService {
    async sendEditRequest(selectedElement, userCommand) {
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
                const text = await response.text();
                console.error("Ошибка backend:", text);
                return { type: "ERROR", message: text };
            }

            const json = await response.json();
            return json;
        } catch (e) {
            console.error("Ошибка при отправке запроса:", e);
            return { type: "ERROR", message: e.message };
        }
    }
}

module.exports = new AiService();
