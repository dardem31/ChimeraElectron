const https = require('https');
const http = require('http');
const net = require('net');
const forge = require('node-forge');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execSync} = require('child_process');
const {URL} = require("url");
const netLogService = require("../services/NetLogService");
const sessionService = require("../services/SessionService");

const SNAPSHOT_ROOT = path.join(__dirname, "../../snapshots");
let SESSION_ID = null;
let SESSION_PATH = null;
let REPLAY_SESSION_NET_LOG = [];

function openSession(name, url) {
    console.log(`Start recording session ${name} - ${url}`)
    let session = sessionService.saveSession({name, url});
    console.log('Saved session: ', session)
    SESSION_ID = session.id
    SESSION_PATH = path.join(SNAPSHOT_ROOT, SESSION_ID.toString())
}

function closeSession() {
    console.log(`Finishing recording session ${SESSION_ID}`)
    SESSION_PATH = null;
}

function replaySession(session) {
    REPLAY_SESSION_NET_LOG = netLogService.getAllSessionLogs(session.id);
    console.log(REPLAY_SESSION_NET_LOG)
}

function ensureSafeName(name) {
    return name.replace(/[^a-z0-9\-_\.]/gi, "_");
}

function extFromContentType(contentType) {
    if (!contentType) return "";
    const t = contentType.toLowerCase();
    if (t.includes("html")) return ".html";
    if (t.includes("css")) return ".css";
    if (t.includes("javascript")) return ".js";
    if (t.includes("json")) return ".json";
    if (t.includes("svg")) return ".svg";
    if (t.startsWith("image/")) {
        const subtype = t.split("/")[1].split(";")[0];
        return "." + (subtype || "bin");
    }
    if (t.startsWith("font/")) return ".woff";
    return ".bin";
}

// Возвращает абсолютный путь к сохранённому файлу
function saveStaticFile(hostname, pathname, body, contentType) {
    // Нормализуем путь/имя
    let filePath = path.join(SESSION_PATH, hostname, pathname);

    if (filePath.endsWith(path.sep)) {
        filePath = path.join(filePath, "index");
    }

    if (!path.extname(filePath)) {
        filePath += extFromContentType(contentType);
    }

    // Убеждаемся, что директория существует
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, body);
    console.log("[Snapshot] Saved:", filePath);
    return filePath;
}

// Универсальный хелпер: сохраняет тело в отдельный файл (под папкой SESSION_PATH/<hostname>/_responses/)
// Возвращает путь к файлу.
function saveBodyToFile(hostname, prefix, body, contentType) {
    const dir = path.join(SESSION_PATH, hostname, "_responses");
    fs.mkdirSync(dir, {recursive: true});

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safePrefix = ensureSafeName(prefix || "resp");
    const ext = extFromContentType(contentType) || ".bin";
    const fileName = `${timestamp}_${safePrefix}${ext}`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, body);
    console.log("[Saved Response] ->", filePath);
    return filePath;
}

function isStaticContent(contentType) {
    if (!contentType) return false;
    return [
        "text/html",
        "text/css",
        "application/javascript",
        "application/json",
        "image/",
        "font/",
        "svg"
    ].some(type => contentType.startsWith(type) || contentType.includes(type));
}

function isTextContentType(contentType) {
    if (!contentType) return false;
    const t = contentType.toLowerCase();
    return t.includes("text/") || t.includes("json") || t.includes("xml") || t.includes("javascript") || t.includes("html") || t.includes("css");
}

function methodHasBody(method) {
    if (!method) return false;
    const m = method.toUpperCase();
    return ["POST", "PUT", "PATCH", "DELETE"].includes(m);
}

function safeBodyToLog(buffer, contentType, maxChars = 10000) {
    if (!buffer) return null;
    if (isTextContentType(contentType)) {
        let str;
        try {
            str = buffer.toString("utf8");
        } catch (e) {
            str = buffer.toString("binary");
        }
        let truncated = false;
        if (str.length > maxChars) {
            str = str.slice(0, maxChars);
            truncated = true;
        }
        return {body: str, bodyEncoding: "utf8", truncated};
    } else {
        // binary -> base64
        const b64 = buffer.toString("base64");
        const truncated = b64.length > maxChars;
        return {body: truncated ? b64.slice(0, maxChars) : b64, bodyEncoding: "base64", truncated};
    }
}

function generateCA() {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    // Устанавливаем атрибуты CA
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

    // Subject и Issuer должны совпадать для корневого сертификата
    const attrs = [
        {name: 'commonName', value: 'Electron MITM Proxy CA'},
        {name: 'countryName', value: 'US'},
        {shortName: 'OU', value: 'MITM Proxy'}
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs); // Корневой сертификат сам себе issuer

    // Критически важные расширения для CA
    cert.setExtensions([
        {
            name: 'basicConstraints',
            cA: true,
            critical: true
        },
        {
            name: 'keyUsage',
            critical: true,
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
        }
    ]);

    // Подписываем сертификат собственным ключом
    cert.sign(keys.privateKey, forge.md.sha256.create());
    return {
        caKey: forge.pki.privateKeyToPem(keys.privateKey),
        caCert: forge.pki.certificateToPem(cert)
    };
}

function generateCertForDomain(domain, caKey, caCert) {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    // Базовые настройки
    cert.publicKey = keys.publicKey;
    cert.serialNumber = Math.floor(Math.random() * 100000).toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    // Subject для домена
    cert.setSubject([
        {name: 'commonName', value: domain},
        {name: 'countryName', value: 'US'}
    ]);

    // Issuer берем из CA
    const caCertObj = forge.pki.certificateFromPem(caCert);
    cert.setIssuer(caCertObj.subject.attributes);

    // SAN (Subject Alternative Name) - обязательно для современных браузеров
    cert.setExtensions([
        {
            name: 'subjectAltName',
            altNames: [{
                type: 2, // DNS
                value: domain
            }]
        },
        {
            name: 'keyUsage',
            digitalSignature: true,
            keyEncipherment: true
        }
    ]);

    // Подписываем CA-ключом
    const caPrivateKey = forge.pki.privateKeyFromPem(caKey);
    cert.sign(caPrivateKey, forge.md.sha256.create());

    return {
        key: forge.pki.privateKeyToPem(keys.privateKey),
        cert: forge.pki.certificateToPem(cert)
    };
}

async function createProxyServer(port) {
    const {caKey, caCert} = generateCA();
    const caCertPath = path.join(os.tmpdir(), 'mitm-ca.crt');
    fs.writeFileSync(caCertPath, caCert);
    try {
        if (process.platform === 'win32') {
            execSync(`certutil -addstore -f root "${caCertPath}"`);
        } else if (process.platform === 'darwin') {
            execSync(`security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${caCertPath}"`);
        } else {
            // Linux (требует sudo)
            const dest = '/usr/local/share/ca-certificates/mitm-ca.crt';
            execSync(`sudo cp "${caCertPath}" "${dest}" && sudo update-ca-certificates`);
        }
        console.log('CA certificate installed successfully');
    } catch (e) {
        console.error('Failed to install CA certificate:', e.message);
    }


    const SNI_CACHE = new Map();

    const server = http.createServer((clientReq, clientRes) => {
        // Обработка HTTP трафика (необязательно)
        clientRes.end('HTTP traffic passed through');
    });

    server.on('connect', (req, clientSocket, head) => {
        console.log('Connected')
        const [hostname, port] = req.url.split(':');
        console.log(`HTTPS CONNECT to ${hostname}:${port || 443}`);

        const serverSocket = net.connect(port || 443, hostname, () => {
            if (!SNI_CACHE.has(hostname)) {
                const {cert, key} = generateCertForDomain(hostname, caKey, caCert);
                SNI_CACHE.set(hostname, {cert, key});
            }

            const {cert, key} = SNI_CACHE.get(hostname);
            const fakeServer = https.createServer({cert, key}, (proxyReq, proxyRes) => {
                // 1. Собираем заголовки оригинального запроса
                const options = {
                    hostname: hostname,
                    port: port || 443,
                    path: proxyReq.url,
                    method: proxyReq.method,
                    headers: {...proxyReq.headers}
                };

                // 2. Удаляем проблемные заголовки
                delete options.headers["accept-encoding"];
                delete options.headers["content-length"];

                // 3. Создаём запрос к реальному серверу
                const realReq = https.request(options, (realRes) => {
                    const resChunks = [];

                    realRes.on("data", (chunk) => {
                        resChunks.push(chunk);
                    });
                    let handled = false;

                    const handleResponse = function () {
                        if (handled) return;
                        handled = true;
                        const resBody = Buffer.concat(resChunks);

                        const requestUrl = (() => {
                            try {
                                return new URL("https://" + hostname + proxyReq.url).toString();
                            } catch (e) {
                                return `https://${hostname}${proxyReq.url}`;
                            }
                        })();
                        console.log('Going to process request: ', requestUrl)

                        if (SESSION_PATH != null) {
                            const contentType = realRes.headers["content-type"] || "";
                            // --- фильтр: логируем только XHR/fetch ---
                            const isXHR =
                                contentType.includes("json") ||
                                contentType.includes("text/plain") ||
                                proxyReq.headers["x-requested-with"] === "XMLHttpRequest" ||
                                proxyReq.headers["sec-fetch-dest"] === "empty" ||
                                contentType.includes("application/xml");

                            if (isXHR) {
                                // ⚡ сохраняем только в БД, response как текст
                                const resLog = safeBodyToLog(resBody, contentType, 20000); // ограничим до 20KB
                                netLogService.logRequest({
                                    method: proxyReq.method,
                                    url: requestUrl,
                                    status: realRes.statusCode,
                                    contentType,
                                    filePath: null,
                                    response: resLog.body,
                                    sessionId: SESSION_ID
                                });
                            } else {
                                try {
                                    const urlObj = new URL("https://" + hostname + proxyReq.url);
                                    const savedPath = saveStaticFile(
                                        urlObj.hostname,
                                        urlObj.pathname,
                                        resBody,
                                        contentType
                                    );

                                    netLogService.logRequest({
                                        method: proxyReq.method,
                                        url: requestUrl,
                                        status: realRes.statusCode,
                                        contentType,
                                        filePath: savedPath,
                                        response: null,
                                        sessionId: SESSION_ID
                                    });
                                } catch (e) {
                                    console.error("Save failed:", e.message);
                                }
                            }
                        }

                        if (REPLAY_SESSION_NET_LOG != null) {
                            let netLog = REPLAY_SESSION_NET_LOG.find(netLog => netLog.url === requestUrl);
                            if (netLog != null) {
                                console.log('Going to restore response from db: ', netLog)
                                sendNetLogResponse(netLog, proxyRes)
                            } else {
                                // Отдаём клиенту
                                proxyRes.writeHead(realRes.statusCode, realRes.headers);
                                proxyRes.end(resBody);
                            }
                        } else {
                            // Отдаём клиенту
                            proxyRes.writeHead(realRes.statusCode, realRes.headers);
                            proxyRes.end(resBody);
                        }
                    }

                    realRes.on("end", handleResponse);
                    realRes.on("close", handleResponse);
                    realRes.on("error", (err) => {
                        console.error("Real response error:", err);
                        proxyRes.writeHead(502);
                        proxyRes.end("Bad Gateway");
                    });
                });

                // 4. Пробрасываем тело запроса (POST/PUT и т.п.)
                proxyReq.pipe(realReq);

                // 5. Обработка ошибок
                realReq.on("error", (err) => {
                    console.error("Real request error:", err);
                    proxyRes.writeHead(500);
                    proxyRes.end("Internal Proxy Error");
                });
            });


            fakeServer.listen(0, () => {
                const {port: fakePort} = fakeServer.address();
                clientSocket.write('HTTP/1.1 200 OK\r\n\r\n');

                const proxySocket = net.connect(fakePort, '127.0.0.1');
                proxySocket.write(head);

                // 9. Проброс трафика между клиентом и сервером
                clientSocket.pipe(proxySocket).pipe(clientSocket);
            });
        });

        serverSocket.on('error', (err) => {
            console.error('Target connection error:', err);
            clientSocket.end();
        });

        clientSocket.on('error', (err) => {
            console.error('Client connection error:', err);
        });
    });

    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`MITM Proxy running on port ${port}`);
            resolve(server);
        });
    });
}

function sendNetLogResponse(netLog, proxyRes) {
    console.log('Replaying from DB/local file:', netLog);

    // Case A: response body stored in DB as text
    if (netLog.response) {
        try {
            // Determine content-type: prefer netLog.contentType, otherwise fallback
            const ct = netLog.contentType || 'text/plain; charset=utf-8';
            const body = (typeof netLog.response === 'string') ? Buffer.from(netLog.response, 'utf8') : Buffer.from(netLog.response);

            // Build headers - copy realRes.headers if you have them, otherwise minimal
            const headers = {
                'content-type': ct,
                'content-length': Buffer.byteLength(body)
            };
            // Optionally add cache headers, status etc. Use netLog.status if present
            const status = netLog.status || 200;

            proxyRes.writeHead(status, headers);
            proxyRes.end(body);
            return; // served, exit handler
        } catch (err) {
            console.error('Error serving DB-stored response:', err);
            // fallthrough -> try file or forward
        }
    }

    // Case B: saved file on disk (binary/text)
    if (netLog.filePath) {
        const filePath = netLog.filePath;
        try {
            const stat = fs.statSync(filePath);
            // Decide content-type
            const contentType = netLog.contentType || lookupMimeType(filePath) || 'application/octet-stream';

            // Build headers; if you had realRes.headers you could copy and modify them.
            const headers = {
                'content-type': contentType,
                'content-length': stat.size
            };

            // Remove content-encoding if present, because file is raw bytes
            // (Don't copy upstream content-encoding)
            // Send headers and stream file
            proxyRes.writeHead(netLog.status || 200, headers);

            const readStream = fs.createReadStream(filePath);
            readStream.on('error', (err) => {
                console.error('File stream error:', err);
                // fallback
                try {
                    proxyRes.writeHead(500);
                    proxyRes.end('Error reading saved file');
                } catch (e) {
                }
            });
            readStream.pipe(proxyRes);
            return;
        } catch (err) {
            console.error('Failed to serve saved file:', err);
            // fallthrough -> forward to real server
        }
    }
}
function lookupMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html' || ext === '.htm') return 'text/html; charset=utf-8';
    if (ext === '.js') return 'application/javascript; charset=utf-8';
    if (ext === '.css') return 'text/css; charset=utf-8';
    if (ext === '.json') return 'application/json; charset=utf-8';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.svg') return 'image/svg+xml';
    return 'application/octet-stream';
}

module.exports = {
    createProxyServer,
    openSession,
    closeSession,
    replaySession
};
