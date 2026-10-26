const { URL } = require('url')
const mongoose = require('mongoose')
const ScheduledMessage = require('../models/scheduledMessage.model')
const Message = require('../models/message.model')
const { isPlanExpired } = require('../helper/planAccess')
const {
    getUserPlan,
    normalizePlanRecipient,
    releaseUnusedPlanRecipients,
    reservePlanRecipients,
    validateCampaignLimits,
} = require('../helper/plans')

const MAX_RECIPIENTS = 500
const mediaTypes = new Set(['image', 'video', 'audio', 'document'])

function getRecipientNumber(value) {
    if (!/^\+?[\d\s()-]+$/.test(String(value || ''))) return null
    const number = String(value || '').replace(/\D/g, '')
    return number.length >= 7 && number.length <= 15 ? number : null
}

function getCounts(recipients = []) {
    return recipients.reduce(
        (counts, recipient) => {
            counts[recipient.status] = (counts[recipient.status] || 0) + 1
            return counts
        },
        { pending: 0, sent: 0, failed: 0, cancelled: 0 }
    )
}

function validateCampaignInput(body = {}, user) {
    const { tokenId, numbers, type, message, url, caption, scheduledAt } = body
    if (
        !tokenId ||
        !Array.isArray(user.insdetails) ||
        !user.insdetails.some((instance) => instance.Token_Id === tokenId)
    ) {
        return { error: 'Select one of your own instances.' }
    }
    if (isPlanExpired(user)) return { error: 'Your plan has expired.' }
    if (!['text', ...mediaTypes].includes(type))
        return { error: 'Select a valid message type.' }

    const recipients = String(numbers || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    if (!recipients.length || recipients.length > MAX_RECIPIENTS) {
        return {
            error: `Enter between 1 and ${MAX_RECIPIENTS} comma-separated mobile numbers.`,
        }
    }
    const normalizedRecipients = recipients.map(getRecipientNumber)
    if (normalizedRecipients.some((number) => !number)) {
        return { error: 'One or more mobile numbers are invalid.' }
    }
    const date = new Date(scheduledAt)
    if (
        !scheduledAt ||
        !Number.isFinite(date.getTime()) ||
        date.getTime() <= Date.now()
    ) {
        return { error: 'Choose a future date and time.' }
    }
    if (type === 'text' && !String(message || '').trim()) {
        return { error: 'Text message is required.' }
    }
    if (type !== 'text') {
        try {
            const mediaUrl = new URL(String(url || ''))
            if (!['http:', 'https:'].includes(mediaUrl.protocol))
                throw new Error('Invalid protocol')
        } catch {
            return { error: 'Enter a valid http or https media URL.' }
        }
    }

    return {
        data: {
            tokenId,
            recipients: [...new Set(normalizedRecipients)].map((number) => ({
                number,
            })),
            type,
            message: type === 'text' ? String(message).trim() : '',
            url: type === 'text' ? '' : String(url).trim(),
            caption: type === 'text' ? '' : String(caption || ''),
            scheduledAt: date,
        },
    }
}

exports.create = async (req, res) => {
    let reservedNumbers = []
    try {
        const validated = validateCampaignInput(req.body, req.user)
        if (validated.error) {
            const status =
                validated.error === 'Your plan has expired.'
                    ? 403
                    : validated.error === 'Select one of your own instances.'
                    ? 403
                    : 400
            return res
                .status(status)
                .json({ error: true, message: validated.error })
        }
        const plan = await getUserPlan(req.user)
        const limitError = validateCampaignLimits(
            plan,
            validated.data.recipients.length
        )
        if (limitError) {
            return res.status(400).json({ error: true, message: limitError })
        }
        const contactReservation = await reservePlanRecipients(
            req.user._id,
            validated.data.recipients.map(({ number }) =>
                normalizePlanRecipient(number)
            ),
            plan.maxUniqueRecipients
        )
        if (!contactReservation.allowed) {
            return res.status(400).json({
                error: true,
                message: contactReservation.message,
            })
        }
        reservedNumbers = contactReservation.added

        const campaign = await ScheduledMessage.create({
            ownerId: req.user._id,
            ...validated.data,
        })
        return res.status(201).json({ error: false, data: campaign })
    } catch (error) {
        if (reservedNumbers.length) {
            try {
                await releaseUnusedPlanRecipients(req.user._id, reservedNumbers)
            } catch (releaseError) {
                console.error(
                    'Failed to release contacts after schedule creation failed:',
                    releaseError.message
                )
            }
        }
        console.error('Failed to create scheduled message:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to schedule this message.' })
    }
}

exports.update = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Scheduled message not found.' })
        }
        const validated = validateCampaignInput(req.body, req.user)
        if (validated.error) {
            const status =
                validated.error === 'Your plan has expired.'
                    ? 403
                    : validated.error === 'Select one of your own instances.'
                    ? 403
                    : 400
            return res
                .status(status)
                .json({ error: true, message: validated.error })
        }
        const plan = await getUserPlan(req.user)
        const limitError = validateCampaignLimits(
            plan,
            validated.data.recipients.length
        )
        if (limitError) {
            return res.status(400).json({ error: true, message: limitError })
        }
        const existingCampaign = await ScheduledMessage.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
            status: 'scheduled',
            scheduledAt: { $gt: new Date() },
        }).lean()
        if (!existingCampaign) {
            return res.status(409).json({
                error: true,
                message:
                    'Only future messages that have not started sending can be edited.',
            })
        }
        const contactReservation = await reservePlanRecipients(
            req.user._id,
            validated.data.recipients.map(({ number }) =>
                normalizePlanRecipient(number)
            ),
            plan.maxUniqueRecipients
        )
        if (!contactReservation.allowed) {
            return res.status(400).json({
                error: true,
                message: contactReservation.message,
            })
        }
        const campaign = await ScheduledMessage.findOneAndUpdate(
            {
                _id: req.params.id,
                ownerId: req.user._id,
                status: 'scheduled',
                scheduledAt: { $gt: new Date() },
            },
            { $set: validated.data },
            { new: true, runValidators: true }
        )
        if (!campaign) {
            await releaseUnusedPlanRecipients(
                req.user._id,
                contactReservation.added
            )
            return res.status(409).json({
                error: true,
                message:
                    'Only future messages that have not started sending can be edited.',
            })
        }
        const updatedNumbers = new Set(
            validated.data.recipients.map(({ number }) => number)
        )
        await releaseUnusedPlanRecipients(
            req.user._id,
            existingCampaign.recipients
                .map(({ number }) => number)
                .filter((number) => !updatedNumbers.has(number)),
            campaign._id
        )
        return res.json({
            error: false,
            message: 'Scheduled message updated.',
            data: campaign,
        })
    } catch (error) {
        console.error('Failed to update scheduled message:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to update scheduled message.',
        })
    }
}

exports.list = async (req, res) => {
    try {
        const recipients = { $ifNull: ['$recipients', []] }
        const countStatus = (status) => ({
            $size: {
                $filter: {
                    input: recipients,
                    as: 'recipient',
                    cond: { $eq: ['$$recipient.status', status] },
                },
            },
        })
        const campaigns = await ScheduledMessage.aggregate([
            { $match: { ownerId: req.user._id } },
            { $sort: { scheduledAt: -1 } },
            { $limit: 100 },
            {
                $project: {
                    tokenId: 1,
                    type: 1,
                    scheduledAt: 1,
                    status: 1,
                    counts: {
                        total: { $size: recipients },
                        pending: countStatus('pending'),
                        sent: countStatus('sent'),
                        failed: countStatus('failed'),
                        cancelled: countStatus('cancelled'),
                    },
                },
            },
        ])
        return res.json({ error: false, data: campaigns })
    } catch (error) {
        console.error('Failed to list scheduled messages:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to load scheduled messages.',
        })
    }
}

exports.details = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Scheduled message not found.' })
        }
        const campaign = await ScheduledMessage.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
        }).lean()
        if (!campaign) {
            return res
                .status(404)
                .json({ error: true, message: 'Scheduled message not found.' })
        }
        return res.json({
            error: false,
            data: { ...campaign, counts: getCounts(campaign.recipients) },
        })
    } catch (error) {
        console.error(
            'Failed to load scheduled message details:',
            error.message
        )
        return res
            .status(500)
            .json({ error: true, message: 'Unable to load message analytics.' })
    }
}

exports.cancel = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Scheduled message not found.' })
        }
        const campaign = await ScheduledMessage.findOneAndUpdate(
            { _id: req.params.id, ownerId: req.user._id, status: 'scheduled' },
            {
                $set: {
                    status: 'cancelled',
                    'recipients.$[].status': 'cancelled',
                    'recipients.$[].failureReason': 'Cancelled before dispatch',
                },
            },
            { new: true }
        )
        if (!campaign) {
            return res.status(409).json({
                error: true,
                message: 'Only scheduled messages can be cancelled.',
            })
        }
        await releaseUnusedPlanRecipients(
            req.user._id,
            (campaign.recipients || []).map(({ number }) => number),
            campaign._id
        )
        return res.json({
            error: false,
            message: 'Scheduled message cancelled.',
        })
    } catch (error) {
        console.error('Failed to cancel scheduled message:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to cancel scheduled message.',
        })
    }
}

exports.remove = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Scheduled message not found.' })
        }
        const campaignId = req.params.id
        const cancelled = await ScheduledMessage.findOneAndUpdate(
            { _id: campaignId, ownerId: req.user._id, status: 'scheduled' },
            {
                $set: {
                    status: 'cancelled',
                    'recipients.$[].status': 'cancelled',
                    'recipients.$[].failureReason': 'Cancelled before deletion',
                },
            },
            { new: true }
        )

        const removable =
            cancelled ||
            (await ScheduledMessage.findOne({
                _id: campaignId,
                ownerId: req.user._id,
                status: {
                    $in: ['completed', 'partial', 'failed', 'cancelled'],
                },
            }))
        if (!removable) {
            return res.status(409).json({
                error: true,
                message:
                    'A message that is currently sending cannot be deleted.',
            })
        }

        await Message.deleteMany({ scheduleId: campaignId })
        await ScheduledMessage.deleteOne({
            _id: campaignId,
            ownerId: req.user._id,
        })
        await releaseUnusedPlanRecipients(
            req.user._id,
            (removable.recipients || []).map(({ number }) => number)
        )
        return res.json({
            error: false,
            message: 'Schedule and its delivery records deleted.',
        })
    } catch (error) {
        console.error('Failed to delete scheduled message:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to delete scheduled message.',
        })
    }
}

exports.syncCampaign = async (campaign) => {
    const queuedMessages = await Message.find(
        { scheduleId: campaign._id },
        '_id scheduleRecipientIndex status failureReason sentAt'
    ).lean()
    const byRecipient = new Map(
        queuedMessages.map((message) => [
            message.scheduleRecipientIndex,
            message,
        ])
    )
    const updates = {}
    let sent = 0
    let failed = 0
    let pending = 0

    for (let index = 0; index < campaign.recipients.length; index += 1) {
        const message = byRecipient.get(index)
        if (!message) {
            pending += 1
            continue
        }
        const status =
            message.status === 'sent' || message.status === 'failed'
                ? message.status
                : 'pending'
        const recipient = campaign.recipients[index]
        if (
            recipient.status !== status ||
            String(recipient.messageId || '') !== String(message._id) ||
            recipient.failureReason !== (message.failureReason || '') ||
            String(recipient.sentAt || '') !== String(message.sentAt || '')
        ) {
            updates[`recipients.${index}.status`] = status
            updates[`recipients.${index}.messageId`] = message._id
            updates[`recipients.${index}.failureReason`] =
                message.failureReason || ''
            updates[`recipients.${index}.sentAt`] = message.sentAt || null
        }
        if (status === 'sent') sent += 1
        else if (status === 'failed') failed += 1
        else pending += 1
    }

    if (!pending) {
        updates.status =
            sent && failed ? 'partial' : sent ? 'completed' : 'failed'
    }
    if (Object.keys(updates).length) {
        await ScheduledMessage.updateOne(
            { _id: campaign._id, status: 'processing' },
            { $set: updates }
        )
    }
}
