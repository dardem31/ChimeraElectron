const aiService = require('../services/AiService');

class AiController {
    async promptEditPage(event, promptDetails, sessionId) {
        try {
            console.log(`Info: `, promptDetails)
            return {
                success: true,
                result: await aiService.sendEditRequest(promptDetails.selectedElement, promptDetails.userCommand, sessionId)
            };
        } catch (error) {
            console.error('Failed to get session: ', error)
            return {success: false, error: error.message};
        }
    }
}
module.exports = new AiController()