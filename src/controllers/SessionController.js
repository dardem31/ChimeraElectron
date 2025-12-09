const {
    openSession,
    closeSession,
    replaySession,
    stopReplayingSession
} = require('../cert_utils/proxy-server');
const sessionService = require("../services/SessionService");
const sessionActionsService = require("../services/SessionActionService")

class SessionController {
    startSession(event, name, url) {
        try {
            openSession(name, url);
            return {success: true};
        } catch (error) {
            console.error('Failed to open session: ', error)
            return {success: false, error: error.message};
        }
    }

    closeSession(event) {
        try {
            closeSession();
            return {success: true};
        } catch (error) {
            console.error('Failed to close session: ', error)
            return {success: false, error: error.message};
        }
    }

    listSessions(event) {
        try {
            let sessionList = sessionService.findAll();
            console.log(sessionList)
            return {success: true, sessionList: sessionList};
        } catch (error) {
            console.error('Failed to get sessions: ', error)
            return {success: false, error: error.message};
        }
    }

    replaySession(event, sessionId) {
        try {
            let session = sessionService.findById(sessionId);
            session.sessionActions = sessionActionsService.getAllSessionActions(sessionId);
            console.log(session)
            replaySession(session)
            return {success: true, session: session};
        } catch (error) {
            console.error('Failed to get session: ', error)
            return {success: false, error: error.message};
        }
    }

    stopReplayingSession(event, sessionId) {
        try {
            let session = sessionService.findById(sessionId);
            console.log(session)
            stopReplayingSession(session)
            return {success: true, session: session};
        } catch (error) {
            console.error('Failed to get session: ', error)
            return {success: false, error: error.message};
        }
    }
}

module.exports = new SessionController();