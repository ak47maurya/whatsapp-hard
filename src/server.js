const dotenv = require('dotenv')
const mongoose = require('mongoose')
const logger = require('pino')()
dotenv.config()

const app = require('./config/express')
const config = require('./config/config')

const { Session } = require('./api/class/session')
require('./api/class/scheduledMessageProcessor')

let sessionsRestored = false
let restoreInProgress

const restoreStoredSessions = async () => {
    if (!config.restoreSessionsOnStartup || sessionsRestored) {
        return
    }
    if (config.mongoose.enabled && mongoose.connection.readyState !== 1) {
        return
    }
    if (restoreInProgress) {
        return restoreInProgress
    }

    const session = new Session()
    restoreInProgress = session.restoreSessions()
        .then((restoredSessions) => {
            sessionsRestored = true
            logger.info({ count: restoredSessions.length }, 'Sessions restored')
        })
        .catch((error) => {
            logger.error({ err: error }, 'Error restoring sessions')
        })
        .finally(() => {
            restoreInProgress = null
        })

    return restoreInProgress
}

if (config.mongoose.enabled) {
    mongoose.connection.on('connected', restoreStoredSessions)
    mongoose.connection.on('reconnected', restoreStoredSessions)
}

let server


server = app.listen(config.port, '0.0.0.0', async () => {
    logger.info(`Listening on port ${config.port}`)
    if (!config.mongoose.enabled) {
        await restoreStoredSessions()
    } else if (mongoose.connection.readyState === 1) {
        await restoreStoredSessions()
    }
})

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed')
            process.exit(1)
        })
    } else {
        process.exit(1)
    }
}

const unexpectedErrorHandler = (error) => {
    logger.error(error)
    exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
    logger.info('SIGTERM received')
    if (server) {
        server.close()
    }
})

module.exports = server
