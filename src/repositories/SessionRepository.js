// repositories/SessionRepository.js
const Session = require("../models/Session");
const db = require("../db");

class SessionRepository {
    constructor() {
        this.insertStmt = db.prepare(`
            INSERT INTO session(name, url)
            VALUES (@name, @url)
        `);
        this.findAllStmt = db.prepare("SELECT * FROM session ORDER BY id DESC");
        this.findByIdStmt = db.prepare(`SELECT s.*, nl.filePath FROM session s 
           INNER JOIN net_log nl ON nl.session_id = s.id
           WHERE s.id = ? AND nl.filePath is not NULL
           ORDER BY nl.id
           LIMIT 1`);
    }

    insert(sessionData) {
        const result = this.insertStmt.run(sessionData);
        return new Session({id: result.lastInsertRowid, ...sessionData});
    }

    findAll() {
        const rows = this.findAllStmt.all();
        return rows.map(row => new Session(row));
    }

    findById(id) {
        const row = this.findByIdStmt.get(id);
        console.log('Root HTML: ', row)
        if (!row) {
            return null;
        }
        return new Session(row);
    }
}

module.exports = new SessionRepository();