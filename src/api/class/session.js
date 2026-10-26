/* eslint-disable no-unsafe-optional-chaining */
const { WhatsAppInstance } = require('../class/instance')
const User = require('../models/user.model')
const { enforcePlanExpiry, isPlanExpired } = require('../helper/planAccess')
const logger = require('pino')()
const config = require('../../config/config')
const mongoose = require('mongoose')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fs = require('fs').promises
const path = require('path')

class Session {
    async restoreSessions() {
        const restoredSessions = []
        const filePath = path.join(process.cwd(), 'db', 'sessions.json')
        let allSessions

        try {
            allSessions = JSON.parse(await fs.readFile(filePath, 'utf-8'))
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error
            }
            await fs.mkdir(path.dirname(filePath), { recursive: true })
            await fs.writeFile(filePath, '[]', 'utf-8')
            allSessions = []
        }

        if (!Array.isArray(allSessions)) {
            throw new Error('Invalid sessions.json: expected an array of sessions')
        }

        if (config.mongoose.enabled && mongoose.connection.readyState !== 1) {
            throw new Error('Cannot restore sessions while MongoDB is disconnected')
        }

        const sessionKeys = allSessions.map(session => session.key)
        const owners = config.mongoose.enabled
            ? await User.find({ 'insdetails.Token_Id': { $in: sessionKeys } })
            : []
        const expiredOwners = owners.filter(user => isPlanExpired(user))
        for (const user of expiredOwners) {
            await enforcePlanExpiry(user)
        }
        const expiredKeys = new Set(
            expiredOwners.flatMap(user =>
                (user.insdetails || []).map(instance => instance.Token_Id)
            )
        )

        for (const sessionData of allSessions) {
            const { key, webhook, webhookUrl } = sessionData
            if (!key || expiredKeys.has(key) || WhatsAppInstances[key]) {
                continue
            }

            try {
                const instance = new WhatsAppInstance(key, webhook, webhookUrl)
                await instance.init()
                WhatsAppInstances[key] = instance
                restoredSessions.push(key)
                await sleep(150)
            } catch (error) {
                logger.error({ err: error, key }, 'Error restoring WhatsApp session')
            }
        }

        return restoredSessions
    }
}

exports.Session = Session;
