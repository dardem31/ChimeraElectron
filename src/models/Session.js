class Session {
    constructor({
                    id,
                    name,
                    create_time,
                    url,
                    filePath
                }) {
        this.id = id;
        this.createTime = create_time;
        this.name = name;
        this.url = url;
        this.firstPageUrl = filePath;
    }
}

module.exports = Session;
