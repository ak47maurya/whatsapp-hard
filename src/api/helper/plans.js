const mongoose = require('mongoose')
const Plan = require('../models/plan.model')
const PlanUsage = require('../models/planUsage.model')
const Message = require('../models/message.model')
const ScheduledMessage = require('../models/scheduledMessage.model')
const User = require('../models/user.model')

let defaultPlansPromise

const DEFAULT_PLANS = [
    {
        slug: 'trial',
        name: '2-Day Free Trial',
        price: 0,
        durationDays: 2,
        manyInstance: 1,
        dailyMessageLimit: 100,
        maxUniqueRecipients: 10,
        maxRecipientsPerCampaign: 10,
        features: [
            '1 WhatsApp instance',
            '100 messages per day',
            '10 unique contacts during the trial',
            'Test dashboard and API features',
        ],
        public: false,
        active: true,
        displayOrder: 0,
    },
    {
        slug: 'basic',
        name: 'Basic Plan',
        price: 1999,
        durationDays: 30,
        manyInstance: 2,
        dailyMessageLimit: 0,
        maxUniqueRecipients: -1,
        maxRecipientsPerCampaign: 500,
        features: [
            'Start Smart.',
            '2 Devices',
            'API Access • Media & Group Support',
            'Perfect for individuals & startups.',
        ],
        public: true,
        active: true,
        displayOrder: 1,
    },
    {
        slug: 'starter',
        name: 'Starter Plan',
        price: 3799,
        durationDays: 30,
        manyInstance: 4,
        dailyMessageLimit: 0,
        maxUniqueRecipients: -1,
        maxRecipientsPerCampaign: 500,
        features: [
            'Grow Fast.',
            '4 Devices • Faster Delivery',
            '2x Availability Checks • All Basic Features',
            'Best for small teams scaling up.',
        ],
        public: true,
        active: true,
        featured: true,
        displayOrder: 2,
    },
    {
        slug: 'business',
        name: 'Business Plan',
        price: 5399,
        durationDays: 30,
        manyInstance: 6,
        dailyMessageLimit: 0,
        maxUniqueRecipients: -1,
        maxRecipientsPerCampaign: 500,
        features: [
            'Scale with Control.',
            '6 Devices • Advanced Group Tools',
            'Priority Support • All Starter Features',
            'Ideal for growing companies & agencies.',
        ],
        public: true,
        active: true,
        displayOrder: 3,
    },
    {
        slug: 'ultimate',
        name: 'Ultimate Plan',
        price: 6999,
        durationDays: 30,
        manyInstance: 8,
        dailyMessageLimit: 0,
        maxUniqueRecipients: -1,
        maxRecipientsPerCampaign: 500,
        features: [
            'Full Power.',
            '8 Devices • Real-time Reports',
            'Top Priority Support • All Business Features',
            'Built for high-volume operations.',
        ],
        public: true,
        active: true,
        displayOrder: 4,
    },
]

function getUtcDay(value = new Date()) {
    const date = new Date(value)
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    )
}

async function ensureDefaultPlans() {
    if (!defaultPlansPromise) {
        defaultPlansPromise = (async () => {
            for (const plan of DEFAULT_PLANS) {
                await Plan.updateOne(
                    { slug: plan.slug },
                    { $setOnInsert: plan },
                    { upsert: true }
                )
            }
        })()
    }
    try {
        await defaultPlansPromise
    } catch (error) {
        defaultPlansPromise = null
        throw error
    }
}

function getLegacyPlanSlug(user) {
    const normalizedType = String(user?.planType || '')
        .trim()
        .toLowerCase()
    return String(user?.planStatus || '').toLowerCase() === 'trial'
        ? 'trial'
        : normalizedType.includes('trial') ||
          normalizedType.includes('trail') ||
          normalizedType.includes('2 day')
        ? 'trial'
        : normalizedType.includes('ultimate')
        ? 'ultimate'
        : normalizedType.includes('business')
        ? 'business'
        : normalizedType.includes('starter')
        ? 'starter'
        : normalizedType.includes('basic')
        ? 'basic'
        : null
}

function getUserPlanSlug(user) {
    return (
        getLegacyPlanSlug(user) ||
        String(user?.planType || '')
            .trim()
            .toLowerCase() ||
        'custom'
    )
}

async function getUserPlan(user) {
    await ensureDefaultPlans()
    if (user?.role?.includes('admin')) {
        return {
            _id: null,
            slug: 'admin',
            name: 'Admin',
            price: 0,
            durationDays: 0,
            manyInstance: Number.MAX_SAFE_INTEGER,
            dailyMessageLimit: 0,
            maxUniqueRecipients: -1,
            maxRecipientsPerCampaign: Number.MAX_SAFE_INTEGER,
            features: [],
        }
    }
    if (user?.planId && mongoose.Types.ObjectId.isValid(user.planId)) {
        const assigned = await Plan.findById(user.planId).lean()
        if (assigned) return assigned
    }

    const slug = getUserPlanSlug(user)
    if (slug) {
        const legacyPlan = await Plan.findOne({ slug }).lean()
        if (legacyPlan) return legacyPlan
    }

    return {
        _id: null,
        slug,
        name: user?.planType || 'Custom Plan',
        price: 0,
        durationDays: 0,
        manyInstance: user?.manyInstance || 1,
        dailyMessageLimit: 0,
        maxUniqueRecipients: -1,
        maxRecipientsPerCampaign: 500,
        features: [],
    }
}

async function getDailyUsage(ownerId, day = getUtcDay()) {
    const usage = await PlanUsage.findOne({ ownerId, day }).lean()
    return {
        sent: usage?.sentMessageIds?.length || 0,
        reserved: usage?.reservedMessageIds?.length || 0,
        day,
    }
}

async function reserveDailyMessage(ownerId, messageId, limit) {
    if (!limit) return { allowed: true, day: getUtcDay(), unlimited: true }

    const day = getUtcDay()
    const dayUsage = { ownerId, day }
    try {
        await PlanUsage.updateOne(
            dayUsage,
            { $setOnInsert: { sentMessageIds: [], reservedMessageIds: [] } },
            { upsert: true }
        )
    } catch (error) {
        if (error.code !== 11000) throw error
    }

    const alreadyReserved = await PlanUsage.exists({
        ...dayUsage,
        reservedMessageIds: messageId,
    })
    if (alreadyReserved) return { allowed: true, day }

    const reservation = await PlanUsage.findOneAndUpdate(
        {
            ...dayUsage,
            sentMessageIds: { $ne: messageId },
            reservedMessageIds: { $ne: messageId },
            $expr: {
                $lt: [
                    {
                        $add: [
                            { $size: '$sentMessageIds' },
                            { $size: '$reservedMessageIds' },
                        ],
                    },
                    limit,
                ],
            },
        },
        { $addToSet: { reservedMessageIds: messageId } },
        { new: true }
    ).lean()

    if (reservation) return { allowed: true, day }

    const current = await PlanUsage.exists({
        ...dayUsage,
        $or: [{ sentMessageIds: messageId }, { reservedMessageIds: messageId }],
    })
    return current
        ? { allowed: true, day }
        : {
              allowed: false,
              day,
              message: `Daily message limit reached (${limit} messages).`,
          }
}

async function settleDailyMessage(ownerId, messageId, day, sent) {
    if (!day) return
    const filter = { ownerId, day }
    if (sent) {
        await PlanUsage.updateOne(filter, {
            $pull: { reservedMessageIds: messageId },
            $addToSet: { sentMessageIds: messageId },
        })
    } else {
        await PlanUsage.updateOne(filter, {
            $pull: { reservedMessageIds: messageId },
        })
    }
}

function normalizePlanRecipient(value) {
    const recipient = String(value || '').trim()
    if (/@g\.us$/i.test(recipient)) return recipient.toLowerCase()
    if (recipient.includes('@'))
        return recipient.split('@')[0].replace(/\D/g, '')
    const digits = recipient.replace(/\D/g, '')
    return digits || recipient
}

async function reservePlanRecipients(ownerId, numbers, limit) {
    if (limit < 0) return { allowed: true, added: [] }
    const uniqueNumbers = [...new Set(numbers.map(normalizePlanRecipient))]
    if (uniqueNumbers.some((number) => !/^\d{7,15}$/.test(number))) {
        return {
            allowed: false,
            message:
                'This plan can send only to individual phone-number contacts.',
        }
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const user = await User.findById(ownerId)
            .select('planRecipientNumbers')
            .lean()
        if (!user) return { allowed: false, message: 'Account not found.' }
        const current = user.planRecipientNumbers || []
        const added = uniqueNumbers.filter(
            (number) => !current.includes(number)
        )
        if (current.length + added.length > limit) {
            return {
                allowed: false,
                message: `This plan allows up to ${limit} unique contacts during its term.`,
            }
        }
        if (!added.length) return { allowed: true, added: [] }

        const updated = await User.findOneAndUpdate(
            {
                _id: ownerId,
                $expr: {
                    $lte: [
                        {
                            $size: {
                                $ifNull: ['$planRecipientNumbers', []],
                            },
                        },
                        limit - added.length,
                    ],
                },
            },
            { $addToSet: { planRecipientNumbers: { $each: added } } },
            { new: true }
        )
        if (updated) return { allowed: true, added }
    }

    return {
        allowed: false,
        message: 'Could not reserve recipient quota. Please retry.',
    }
}

async function releaseUnusedPlanRecipients(
    ownerId,
    numbers,
    excludeCampaignId
) {
    const candidates = [...new Set(numbers.map(normalizePlanRecipient))].filter(
        (number) => /^\d{7,15}$/.test(number)
    )
    if (!candidates.length) return []

    const user = await User.findById(ownerId)
        .select(
            'planRecipientNumbers planSentRecipientNumbers insdetails.Token_Id'
        )
        .lean()
    if (!user) throw new Error('Account not found while releasing contacts.')

    const tokenIds = (user.insdetails || [])
        .map((instance) => instance.Token_Id)
        .filter(Boolean)
    const candidateMessageIds = candidates.flatMap((number) => [
        number,
        `+${number}`,
        `${number}@s.whatsapp.net`,
        `${number}@c.us`,
    ])
    const campaignFilter = {
        ownerId,
        status: { $in: ['scheduled', 'processing'] },
        'recipients.number': { $in: candidates },
    }
    if (excludeCampaignId) campaignFilter._id = { $ne: excludeCampaignId }

    const [campaigns, queuedMessages] = await Promise.all([
        ScheduledMessage.find(
            campaignFilter,
            'recipients.number recipients.status'
        ).lean(),
        tokenIds.length
            ? Message.find(
                  {
                      tokenId: { $in: tokenIds },
                      status: { $in: ['pending', 'sent'] },
                      id: { $in: candidateMessageIds },
                  },
                  'id status'
              ).lean()
            : [],
    ])
    const usedNumbers = new Set(user.planSentRecipientNumbers || [])
    for (const campaign of campaigns) {
        for (const recipient of campaign.recipients || []) {
            if (recipient.status === 'pending') {
                usedNumbers.add(normalizePlanRecipient(recipient.number))
            }
        }
    }
    for (const message of queuedMessages) {
        if (message.status === 'pending' || message.status === 'sent') {
            usedNumbers.add(normalizePlanRecipient(message.id))
        }
    }

    const releasable = candidates.filter(
        (number) =>
            (user.planRecipientNumbers || []).includes(number) &&
            !usedNumbers.has(number)
    )
    if (releasable.length) {
        await User.updateOne(
            { _id: ownerId },
            { $pull: { planRecipientNumbers: { $in: releasable } } }
        )
    }
    return releasable
}

function validateCampaignLimits(plan, recipientCount) {
    if (recipientCount > plan.maxRecipientsPerCampaign) {
        return `This plan allows up to ${plan.maxRecipientsPerCampaign} recipients per campaign.`
    }
    if (plan.dailyMessageLimit && recipientCount > plan.dailyMessageLimit) {
        return `This campaign exceeds the daily limit of ${plan.dailyMessageLimit} messages.`
    }
    return null
}

module.exports = {
    DEFAULT_PLANS,
    ensureDefaultPlans,
    getLegacyPlanSlug,
    getDailyUsage,
    getUserPlan,
    getUserPlanSlug,
    getUtcDay,
    normalizePlanRecipient,
    releaseUnusedPlanRecipients,
    reserveDailyMessage,
    reservePlanRecipients,
    settleDailyMessage,
    validateCampaignLimits,
}
