const mongoose = require('mongoose')
const { URL } = require('url')
const config = require('../../config/config')
const MessageTemplate = require('../models/messageTemplate.model')
const ScheduledMessage = require('../models/scheduledMessage.model')
const { isPlanExpired } = require('../helper/planAccess')

const MAX_MEDIA_BYTES = 8 * 1024 * 1024

function validateTemplate(body = {}) {
    const name = String(body.name || '').trim()
    const type = body.type || 'text'
    const templateBody = String(body.body || '').trim()
    const caption = String(body.caption || '').trim()
    const url = String(body.url || '').trim()
    const source = type === 'text' ? 'url' : body.source || 'url'
    const fileData = String(body.fileData || '')
    const filename = String(body.filename || '').trim()
    const mimetype = String(body.mimetype || '').split(';')[0].trim().toLowerCase()
    if (!name || name.length > 100)
        return {
            error: 'Template name is required and must be under 100 characters.',
        }
    if (!['text', 'image', 'video', 'audio', 'document'].includes(type)) {
        return { error: 'Select a valid template type.' }
    }
    if (!['url', 'upload'].includes(source)) {
        return { error: 'Select a valid media source.' }
    }
    if (type === 'text' && (!templateBody || templateBody.length > 4000)) {
        return {
            error: 'Template message is required and must be under 4,000 characters.',
        }
    }
    if (type !== 'text' && caption.length > 1000) {
        return { error: 'Media caption must be under 1,000 characters.' }
    }
    if (type !== 'text' && source === 'url') {
        try {
            const mediaUrl = new URL(url)
            if (!['http:', 'https:'].includes(mediaUrl.protocol))
                throw new Error('Invalid protocol')
        } catch {
            return {
                error: 'Media templates require a valid http or https media URL.',
            }
        }
    }
    if (type !== 'text' && source === 'upload') {
        if (!fileData || !filename || !mimetype) {
            return { error: 'Upload a media file to use this template.' }
        }
        const bytes = Buffer.byteLength(fileData, 'base64')
        if (bytes > MAX_MEDIA_BYTES) {
            return { error: 'Template media files must be 8 MB or smaller.' }
        }
        const allowedTypes = {
            image: config.imageMimeTypes,
            video: config.videoMimeTypes,
            audio: config.audioMimeTypes,
            document: config.documentMimeTypes,
        }[type] || []
        if (!allowedTypes.includes(mimetype)) {
            return { error: `The uploaded file type is not supported for ${type}.` }
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
            source,
            url: type === 'text' || source === 'upload' ? '' : url,
            fileData: type !== 'text' && source === 'upload' ? fileData : '',
            filename: type !== 'text' && source === 'upload' ? filename : '',
            mimetype: type !== 'text' && source === 'upload' ? mimetype : '',
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
        return res.json({
            error: false,
            data: templates.map(template => {
                const { fileData, ...metadata } = template
                return { ...metadata, hasUpload: Boolean(fileData) }
            }),
        })
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
        const body = { ...req.body }
        if (req.file) {
            body.source = 'upload'
            body.fileData = req.file.buffer.toString('base64')
            body.filename = req.file.originalname
            body.mimetype = req.file.mimetype
        }
        const validated = validateTemplate(body)
        if (validated.error)
            return res
                .status(400)
                .json({ error: true, message: validated.error })

        const template = await MessageTemplate.create({
            ownerId: req.user._id,
            ...validated.data,
        })
        const { fileData, ...metadata } = template.toObject()
        return res.status(201).json({
            error: false,
            data: { ...metadata, hasUpload: Boolean(fileData) },
        })
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
        const existing = await MessageTemplate.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
        })
        if (!existing)
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })

        const body = { ...req.body }
        if (req.file) {
            body.source = 'upload'
            body.fileData = req.file.buffer.toString('base64')
            body.filename = req.file.originalname
            body.mimetype = req.file.mimetype
        } else if (body.source === 'upload' && existing.fileData) {
            body.fileData = existing.fileData
            body.filename = existing.filename
            body.mimetype = existing.mimetype
        }
        const validated = validateTemplate(body)
        if (validated.error)
            return res
                .status(400)
                .json({ error: true, message: validated.error })

        Object.assign(existing, validated.data)
        const template = await existing.save()
        if (!template)
            return res
                .status(404)
                .json({ error: true, message: 'Message template not found.' })
        const { fileData, ...metadata } = template.toObject()
        return res.json({
            error: false,
            data: { ...metadata, hasUpload: Boolean(fileData) },
        })
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
