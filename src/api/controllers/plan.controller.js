const mongoose = require('mongoose')
const Plan = require('../models/plan.model')
const {
    ensureDefaultPlans,
    getDailyUsage,
    getUserPlan,
} = require('../helper/plans')

function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function validatePlan(body = {}, existing = {}) {
    const name = String(body.name ?? existing.name ?? '').trim()
    const slug = existing.slug || slugify(name)
    const price = Number(body.price ?? existing.price)
    const durationDays = Number(body.durationDays ?? existing.durationDays)
    const manyInstance = Number(body.manyInstance ?? existing.manyInstance)
    const dailyMessageLimit = Number(
        body.dailyMessageLimit ?? existing.dailyMessageLimit
    )
    const maxUniqueRecipients = Number(
        body.maxUniqueRecipients ?? existing.maxUniqueRecipients
    )
    const maxRecipientsPerCampaign = Number(
        body.maxRecipientsPerCampaign ?? existing.maxRecipientsPerCampaign
    )
    const features = Array.isArray(body.features)
        ? body.features.map((feature) => String(feature).trim()).filter(Boolean)
        : String(body.features ?? (existing.features || []).join('\n'))
              .split(/\r?\n/)
              .map((feature) => feature.trim())
              .filter(Boolean)
    if (!name || name.length > 80 || !slug) {
        return {
            error: 'Plan name is required and must be under 80 characters.',
        }
    }
    if (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(durationDays) ||
        durationDays < 1 ||
        !Number.isInteger(manyInstance) ||
        manyInstance < 1 ||
        !Number.isInteger(dailyMessageLimit) ||
        dailyMessageLimit < 0 ||
        !Number.isInteger(maxUniqueRecipients) ||
        maxUniqueRecipients < -1 ||
        !Number.isInteger(maxRecipientsPerCampaign) ||
        maxRecipientsPerCampaign < 1 ||
        features.length > 20 ||
        features.some((feature) => feature.length > 180)
    ) {
        return {
            error: 'Plan limits, price, duration or features are invalid.',
        }
    }
    return {
        data: {
            slug,
            name,
            price,
            durationDays,
            manyInstance,
            dailyMessageLimit,
            maxUniqueRecipients,
            maxRecipientsPerCampaign,
            features,
            public:
                body.public === undefined
                    ? existing.public !== false
                    : body.public === true,
            active:
                body.active === undefined
                    ? existing.active !== false
                    : body.active === true,
            featured:
                body.featured === undefined
                    ? existing.featured === true
                    : body.featured === true,
            displayOrder: Number.isInteger(Number(body.displayOrder))
                ? Number(body.displayOrder)
                : Number(existing.displayOrder || 0),
        },
    }
}

exports.publicPlans = async (req, res) => {
    try {
        await ensureDefaultPlans()
        const plans = await Plan.find({ public: true, active: true })
            .sort({ displayOrder: 1, price: 1 })
            .lean()
        return res.json({ error: false, data: plans })
    } catch (error) {
        console.error('Failed to load public plans:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to load plans.',
        })
    }
}

exports.list = async (req, res) => {
    try {
        await ensureDefaultPlans()
        const plans = await Plan.find().sort({ displayOrder: 1 }).lean()
        return res.json({ error: false, data: plans })
    } catch (error) {
        console.error('Failed to list plans:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to load plans.' })
    }
}

exports.create = async (req, res) => {
    try {
        const validated = validatePlan(req.body)
        if (validated.error) {
            return res
                .status(400)
                .json({ error: true, message: validated.error })
        }
        const plan = await Plan.create(validated.data)
        return res.status(201).json({ error: false, data: plan })
    } catch (error) {
        if (error.code === 11000) {
            return res
                .status(409)
                .json({
                    error: true,
                    message: 'A plan with this name already exists.',
                })
        }
        console.error('Failed to create plan:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to create plan.' })
    }
}

exports.update = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Plan not found.' })
        }
        const existing = await Plan.findById(req.params.id)
        if (!existing) {
            return res
                .status(404)
                .json({ error: true, message: 'Plan not found.' })
        }
        const validated = validatePlan(req.body, existing)
        if (validated.error) {
            return res
                .status(400)
                .json({ error: true, message: validated.error })
        }
        Object.assign(existing, validated.data)
        await existing.save()
        return res.json({ error: false, data: existing })
    } catch (error) {
        if (error.code === 11000) {
            return res
                .status(409)
                .json({
                    error: true,
                    message: 'A plan with this name already exists.',
                })
        }
        console.error('Failed to update plan:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to update plan.' })
    }
}

exports.summary = async (req, res) => {
    try {
        const [plan, usage] = await Promise.all([
            getUserPlan(req.user),
            getDailyUsage(req.user._id),
        ])
        return res.json({
            error: false,
            data: {
                name: plan.name,
                status: req.user.planStatus,
                startDate: req.user.startDate,
                endDate: req.user.endDate,
                dailyMessageLimit: plan.dailyMessageLimit,
                dailyMessagesSent: usage.sent,
                dailyMessagesRemaining: plan.dailyMessageLimit
                    ? Math.max(
                          0,
                          plan.dailyMessageLimit - usage.sent - usage.reserved
                      )
                    : null,
                dailyMessagesReserved: usage.reserved,
                maxUniqueRecipients: plan.maxUniqueRecipients,
                uniqueRecipientsUsed: (req.user.planRecipientNumbers || [])
                    .length,
                maxRecipientsPerCampaign: plan.maxRecipientsPerCampaign,
                manyInstance: req.user.manyInstance,
            },
        })
    } catch (error) {
        console.error('Failed to load plan summary:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to load plan details.' })
    }
}

exports.welcome = async (req, res) => {
    try {
        await ensureDefaultPlans()
        const plans = await Plan.find({ public: true, active: true })
            .sort({ displayOrder: 1, price: 1 })
            .lean()
        return res.status(200).render('welcome', { plans })
    } catch (error) {
        console.error('Failed to render public plans:', error.message)
        return res.status(500).send('Unable to load plans. Please try again.')
    }
}

exports.adminPage = async (req, res) => {
    if (!req.user?.role?.includes('admin')) {
        return res.status(403).send('Admin access required.')
    }
    try {
        await ensureDefaultPlans()
        return res.render('admin/plans', { user: req.user })
    } catch (error) {
        console.error('Failed to render plan editor:', error.message)
        return res.status(500).send('Unable to load the plan editor.')
    }
}

exports.validatePlan = validatePlan
