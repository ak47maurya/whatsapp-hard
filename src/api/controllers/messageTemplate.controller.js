const mongoose = require('mongoose')
const { URL } = require('url')
const MessageTemplate = require('../models/messageTemplate.model')
const ScheduledMessage = require('../models/scheduledMessage.model')
const { isPlanExpired } = require('../helper/planAccess')

function validateTemplate(body = {}) {
    const name = String(body.name || '').trim()
    const type = body.type || 'text'
    const templateBody = String(body.body || '').trim()
    const caption = String(body.caption || '').trim()
    const url = String(body.url || '').trim()
    if (!name || name.length > 100)
        return {
            error: 'Template name is required and must be under 100 characters.',
        }
    if (!['text', 'image', 'document'].includes(type)) {
        return { error: 'Select a valid template type.' }
    }
    if (type === 'text' && (!templateBody || templateBody.length > 4000)) {
        return {
            error: 'Template message is required and must be under 4,000 characters.',
        }
    }
    if (type !== 'text' && caption.length > 1000) {
        return { error: 'Media caption must be under 1,000 characters.' }
    }
    if (type !== 'text') {
        try {
            const mediaUrl = new URL(url)
            if (!['http:', 'https:'].includes(mediaUrl.protocol))
                throw new Error('Invalid protocol')
        } catch {
            return {
                error: 'Image and document templates require a valid http or https media URL.',
            }
        }
    }

    const templateText = type === 'text' ? templateBody : caption
    const variables = [
        ...new Set(
            [
                ...templateText.matchAll(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g),
            ].map(([, variable]) => variable)
        ),
    ]
    const mobileColumnNames = new Set([
        'mobile',
        'mobilenumber',
        'phone',
        'phonenumber',
        'number',
        'contactnumber',
    ])
    if (
        variables.some((variable) =>
            mobileColumnNames.has(variable.toLowerCase())
        )
    ) {
        return {
            error: 'Mobile and phone column names are reserved for recipient numbers.',
        }
    }
    const withoutVariables = templateText.replace(
        /{{\s*[A-Za-z][A-Za-z0-9_]*\s*}}/g,
        ''
    )
    if (withoutVariables.includes('{{') || withoutVariables.includes('}}')) {
        return {
            error: 'Use placeholders in the format {{name}} with letters, numbers, and underscores.',
        }
    }
    return {
        data: {
            name,
            type,
            body: type === 'text' ? templateBody : '',
            url: type === 'text' ? '' : url,
            caption: type === 'text' ? '' : caption,
            variables,
        },
    }
}

function planError(user) {
    return isPlanExpired(user) ? 'Your plan has expired.' : null
}

exports.list = async (req, res) => {
    try {
        const templates = await MessageTemplate.find({ ownerId: req.user._id })
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean()
        return res.json({ error: false, data: templates })
    } catch (error) {
        console.error('Failed to list message templates:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to load message templates.' })
    }
}

exports.create = async (req, res) => {
    try {
        const expired = planError(req.user)
        if (expired)
            return res.status(403).json({ error: true, message: expired })
        const validated = validateTemplate(req.body)
        if (validated.error)
            return res
                .status(400)
                .json({ error: true, message: validated.error })

        const template = await MessageTemplate.create({
            ownerId: req.user._id,
            ...validated.data,
        })
        return res.status(201).json({ error: false, data: template })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: true,
                message: 'A template with this name already exists.',
            })
        }
        console.error('Failed to create message template:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to create message template.',
        })
    }
}

exports.update = async (req, res) => {
    try {
        const expired = planError(req.user)
        if (expired)
            return res.status(403).json({ error: true, message: expired })
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })
        }
        const validated = validateTemplate(req.body)
        if (validated.error)
            return res
                .status(400)
                .json({ error: true, message: validated.error })

        const template = await MessageTemplate.findOneAndUpdate(
            { _id: req.params.id, ownerId: req.user._id },
            { $set: validated.data },
            { new: true, runValidators: true }
        )
        if (!template)
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })
        return res.json({ error: false, data: template })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: true,
                message: 'A template with this name already exists.',
            })
        }
        console.error('Failed to update message template:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to update message template.',
        })
    }
}

exports.remove = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })
        }
        const existing = await MessageTemplate.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
        })
        if (!existing)
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })
        const scheduledCampaigns = await ScheduledMessage.countDocuments({
            ownerId: req.user._id,
            templateId: existing._id,
            status: 'scheduled',
        })
        if (scheduledCampaigns) {
            return res.status(409).json({
                error: true,
                message:
                    'This template is used by a future schedule. Delete or update that schedule first.',
            })
        }
        const template = await MessageTemplate.findOneAndDelete({
            _id: existing._id,
            ownerId: req.user._id,
        })
        if (!template)
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })
        return res.json({ error: false, message: 'Message template deleted.' })
    } catch (error) {
        console.error('Failed to delete message template:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to delete message template.',
        })
    }
}

exports.validateTemplate = validateTemplate
