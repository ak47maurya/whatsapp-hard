const fs = require('fs').promises
const path = require('path')
const User = require('../models/user.model')

const processedExpiredUsers = new Set()
const expiringUsers = new Map()

function isPlanExpired(user, now = Date.now()) {
    if (user?.role?.includes('admin')) {
        return false
    }

    if (String(user?.planStatus || '').trim().toLowerCase() === 'expired') {
        return true
    }

    if (!user?.endDate) {
        return false
    }

    const endDate = new Date(user.endDate).getTime()
    return Number.isFinite(endDate) && endDate <= now
}

async function removeStoredSession(key) {
    const sessionsPath = path.join(process.cwd(), 'db', 'sessions.json')
    let sessions = []

    try {
        sessions = JSON.parse(await fs.readFile(sessionsPath, 'utf8'))
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error
        }
    }

    const remainingSessions = sessions.filter(session => session.key !== key)
    if (remainingSessions.length !== sessions.length) {
        await fs.writeFile(sessionsPath, JSON.stringify(remainingSessions, null, 2), 'utf8')
    }

    if (/^[\w-]+$/.test(key)) {
        await fs.rm(path.join(process.cwd(), 'db', key), { recursive: true, force: true })
    }
}

async function disconnectUserInstances(user) {
    const keys = (user.insdetails || [])
        .map(instance => instance.Token_Id)
        .filter(Boolean)

    for (const key of keys) {
        const instance = global.WhatsAppInstances?.[key]
        if (instance) {
            instance.instance.deleted = true
            await instance.deleteInstance(key)
            delete global.WhatsAppInstances[key]
        } else {
            await removeStoredSession(key)
        }
    }
}

async function enforcePlanExpiry(user) {
    if (!isPlanExpired(user)) {
        processedExpiredUsers.delete(String(user._id))
        return false
    }

    const userId = String(user._id)
    if (processedExpiredUsers.has(userId)) {
        return true
    }

    if (expiringUsers.has(userId)) {
        return expiringUsers.get(userId)
    }

    const enforcement = (async () => {
        if (user.planStatus !== 'Expired') {
            user.planStatus = 'Expired'
            await user.save()
        }

        await disconnectUserInstances(user)
        processedExpiredUsers.add(userId)
        return true
    })()
    expiringUsers.set(userId, enforcement)

    try {
        return await enforcement
    } finally {
        expiringUsers.delete(userId)
    }
}

async function getInstanceOwner(key) {
    return User.findOne({ 'insdetails.Token_Id': key })
}

module.exports = {
    enforcePlanExpiry,
    getInstanceOwner,
    isPlanExpired,
}
