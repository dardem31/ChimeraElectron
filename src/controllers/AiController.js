const aiService = require('../services/AiService');

class AiController {
    async promptEditPage(event, promptDetails) {
        try {
            console.log(`Info: `, promptDetails)
            return {success: true, result: await aiService.sendEditRequest(promptDetails.selectedElement, promptDetails.userCommand)};
        } catch (error) {
            console.error('Failed to get session: ', error)
            return {success: false, error: error.message};
        }
    }
}
module.exports = new AiController()