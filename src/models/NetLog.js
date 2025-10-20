class NetLog {
    constructor({
                    id,
                    timestamp,
                    method,
                    url,
                    status,
                    contentType,
                    response,
                    filePath,
                    session_id
                }) {
        this.id = id;
        this.timestamp = timestamp;
        this.method = method;
        this.url = url;
        this.status = status;
        this.contentType = contentType;
        this.filePath = filePath;
        this.response = response;
        this.sessionId = session_id;
    }
}

module.exports = NetLog;
