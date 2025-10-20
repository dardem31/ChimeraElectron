// services/NetLogService.js
const repo = require("../repositories/NetLogRepository");

class NetLogService {
    logRequest({ method, url, status, contentType, filePath, response, sessionId }) {
        const entry = {
            timestamp: new Date().toISOString(),
            method,
            url,
            status,
            contentType,
            filePath,
            response,
            sessionId
        };
        return repo.insert(entry);
    }
    getAllSessionLogs(sessionId) {
        return repo.getAllSessionLogs(sessionId);
    }
}

module.exports = new NetLogService();
