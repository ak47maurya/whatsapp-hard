const User = require('../models/user.model')
const { enforcePlanExpiry } = require('../helper/planAccess')

async function keyVerification(req, res, next) {
    try {
        const key = req.query['key']?.toString()
        if (!key) {
            return res
                .status(403)
                .send({ error: true, message: 'no key query was present' })
        }
        const owner = await User.findOne({ 'insdetails.Token_Id': key })
        if (owner && await enforcePlanExpiry(owner)) {
            return res.status(403).send({
                error: true,
                message: 'Plan expired. Renew your plan to use this instance.',
            })
        }

        const instance = WhatsAppInstances[key]
        if (!instance) {
            return res
                .status(403)
                .send({ error: true, message: 'invalid key supplied' })
        }

        req.planOwner = owner
        return next()
    } catch (error) {
        console.error('Instance plan validation failed:', error.message)
        return res.status(500).send({
            error: true,
            message: 'Unable to verify this instance plan.',
        })
    }
}

module.exports = keyVerification
