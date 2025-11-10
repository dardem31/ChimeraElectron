const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Use project folder in dev, userData in packaged app
let DB_PATH;

if (app.isPackaged) {
    // When packaged, use writable folder
    const dbDir = path.join(app.getPath("userData"), "data");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    DB_PATH = path.join(dbDir, "app2.db");
} else {
    // In dev, use project folder
    const dbDir = path.join(__dirname, "data");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    DB_PATH = path.join(dbDir, "app2.db");
}

// Initialize database
const db = new Database(DB_PATH);

// Create tables
db.exec(`
    create table net_log
    (
        id          INTEGER
            primary key autoincrement,
        timestamp   TEXT,
        method      TEXT,
        url         TEXT,
        status      INTEGER,
        contentType TEXT,
        filePath    TEXT,
        response    TEXT,
        session_id  INT
            constraint net_log_session_id__fk
                references session
                on delete cascade
    );

    create index ix_net_log_session_id
        on net_log (session_id);

    create table session
    (
        id          INTEGER
            primary key autoincrement,
        name        VARCHAR(255),
        create_time TIMESTAMP default CURRENT_TIMESTAMP,
        url         VARCHAR(1024)
    );

`);

module.exports = db;
