// repositories/NetLogRepository.js
const NetLog = require("../models/NetLog");
const db = require("../db");

class NetLogRepository {
    constructor() {
        this.insertStmt = db.prepare(`
            INSERT INTO net_log (timestamp, method, url, status, contentType, filePath, response, session_id)
            VALUES (@timestamp, @method, @url, @status, @contentType, @filePath, @response, @sessionId)
        `);
        this.findBySessionIdStmt = db.prepare("SELECT * FROM net_log WHERE session_id = ?");

    }

    insert(logData) {
        const result = this.insertStmt.run(logData);
        return new NetLog({id: result.lastInsertRowid, ...logData});
    }
    getAllSessionLogs(sessionId) {
        const rows = this.findBySessionIdStmt.all(sessionId);
        return rows.map(row => new NetLog(row));
    }
}

module.exports = new NetLogRepository();

