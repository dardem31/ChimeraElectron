// db.js
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "data", "app.db");

// убеждаемся, что папка есть
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// создаём таблицы при старте
db.exec(`
CREATE TABLE IF NOT EXISTS net_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  method TEXT,
  url TEXT,
  status INTEGER,
  contentType TEXT,
  filePath TEXT,
  response TEXT
);
`);

module.exports = db;
