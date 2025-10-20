// services/SessionService.js
const repo = require("../repositories/SessionRepository");

class SessionService {
    saveSession({name, url}) {
        const entry = {
            name,
            url
        };
        return repo.insert(entry);
    }
    findAll() {
        return repo.findAll()
    }
    findById(id) {
        return repo.findById(id)
    }
}

module.exports = new SessionService();
