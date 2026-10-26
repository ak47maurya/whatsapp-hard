const mongoose = require('mongoose')
const ScheduledMessage = require('../models/scheduledMessage.model')
const Message = require('../models/message.model')
const MessageTemplate = require('../models/messageTemplate.model')
const { isPlanExpired } = require('../helper/planAccess')
const {
    getUserPlan,
    normalizePlanRecipient,
    releaseUnusedPlanRecipients,
    reservePlanRecipients,
    validateCampaignLimits,
} = require('../helper/plans')

const MAX_RECIPIENTS = 500

function getRecipientNumber(value) {
    if (!/^\+?[\d\s()-]+$/.test(String(value || ''))) return null
    const number = String(value || '').replace(/\D/g, '')
    return number.length >= 7 && number.length <= 15 ? number : null
}

function renderMessage(templateBody, variables) {
    return templateBody.replace(
        /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g,
        (_, name) => String(variables[name] ?? '')
    )
}

function renderTemplateMessage(template, variables) {
    const source = template.type === 'text' ? template.body : template.caption
    const message = renderMessage(source, variables)
    const maxLength = template.type === 'text' ? 4000 : 1000
    return message.length > maxLength
        ? {
              error: `Rendered message or caption exceeds ${maxLength} characters.`,
          }
        : { data: message }
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

function validateRecipients(input, template) {
    if (
        !Array.isArray(input) ||
        !input.length ||
        input.length > MAX_RECIPIENTS
    ) {
        return {
            error: `Provide between 1 and ${MAX_RECIPIENTS} recipient rows.`,
        }
    }
    const recipients = []
    const seenNumbers = new Set()
    for (const [index, row] of input.entries()) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return {
                error: `Row ${
                    index + 1
                }: recipient data must be a JSON object.`,
            }
        }
        const number = getRecipientNumber(row.number)
        if (!number)
            return {
                error: `Row ${
                    index + 1
                }: enter a valid mobile number with country code.`,
            }
        if (seenNumbers.has(number))
            return { error: `Row ${index + 1}: duplicate mobile number.` }
        seenNumbers.add(number)

        if (
            !row.variables ||
            typeof row.variables !== 'object' ||
            Array.isArray(row.variables)
        ) {
            return {
                error: `Row ${
                    index + 1
                }: template variables must be a JSON object.`,
            }
        }
        const suppliedVariables = Object.keys(row.variables)
        const missingVariable = template.variables.find(
            (variable) => !suppliedVariables.includes(variable)
        )
        if (missingVariable)
            return {
                error: `Row ${
                    index + 1
                }: "${missingVariable}" cannot be blank.`,
            }
        if (
            suppliedVariables.some(
                (variable) => !template.variables.includes(variable)
            )
        ) {
            return {
                error: `Row ${
                    index + 1
                }: provide only the variables required by the selected template.`,
            }
        }

        const variables = {}
        for (const variable of template.variables) {
            const rawValue = row.variables[variable]
            if (
                typeof rawValue !== 'string' &&
                !(typeof rawValue === 'number' && Number.isFinite(rawValue))
            ) {
                return {
                    error: `Row ${
                        index + 1
                    }: "${variable}" must be plain text or a number.`,
                }
            }
            const value = String(rawValue).trim()
            if (!value)
                return {
                    error: `Row ${index + 1}: "${variable}" cannot be blank.`,
                }
            variables[variable] = value
        }
        const rendered = renderTemplateMessage(template, variables)
        if (rendered.error) {
            return { error: `Row ${index + 1}: ${rendered.error}` }
        }
        const message = rendered.data
        recipients.push({ number, variables, message, status: 'pending' })
    }
    return { data: recipients }
}

function getTemplateId(value) {
    return mongoose.Types.ObjectId.isValid(value)
        ? new mongoose.Types.ObjectId(value)
        : null
}

async function ownedTemplate(templateId, user) {
    if (!templateId) return null
    return MessageTemplate.findOne({
        _id: templateId,
        ownerId: user._id,
    }).lean()
}

function validateScheduleFields(body, user) {
    const { tokenId, scheduledAt } = body
    if (
        !tokenId ||
        !Array.isArray(user.insdetails) ||
        !user.insdetails.some((instance) => instance.Token_Id === tokenId)
    ) {
        return { error: 'Select one of your own instances.' }
    }
    const date = new Date(scheduledAt)
    if (
        !scheduledAt ||
        !Number.isFinite(date.getTime()) ||
        date.getTime() <= Date.now()
    ) {
        return { error: 'Choose a future date and time.' }
    }
    return { data: { tokenId, scheduledAt: date } }
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
            {
                $match: {
                    ownerId: req.user._id,
                    templateId: { $exists: true },
                },
            },
            { $sort: { scheduledAt: -1 } },
            { $limit: 100 },
            {
                $project: {
                    tokenId: 1,
                    templateName: 1,
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
        console.error('Failed to list template schedules:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to load template schedules.',
        })
    }
}

exports.details = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Template schedule not found.' })
        }
        const campaign = await ScheduledMessage.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
            templateId: { $exists: true },
        }).lean()
        if (!campaign)
            return res
                .status(404)
                .json({ error: true, message: 'Template schedule not found.' })
        return res.json({
            error: false,
            data: { ...campaign, counts: getCounts(campaign.recipients) },
        })
    } catch (error) {
        console.error('Failed to load template schedule:', error.message)
        return res
            .status(500)
            .json({ error: true, message: 'Unable to load template schedule.' })
    }
}

exports.create = async (req, res) => {
    let reservedNumbers = []
    try {
        if (isPlanExpired(req.user))
            return res
                .status(403)
                .json({ error: true, message: 'Your plan has expired.' })
        const validated = validateScheduleFields(req.body, req.user)
        if (validated.error)
            return res
                .status(400)
                .json({ error: true, message: validated.error })

        const template = await ownedTemplate(
            getTemplateId(req.body.templateId),
            req.user
        )
        if (!template)
            return res.status(400).json({
                error: true,
                message: 'Select one of your saved templates.',
            })
        const recipientValidation = validateRecipients(
            req.body.recipients,
            template
        )
        if (recipientValidation.error) {
            return res
                .status(400)
                .json({ error: true, message: recipientValidation.error })
        }
        const plan = await getUserPlan(req.user)
        const limitError = validateCampaignLimits(
            plan,
            recipientValidation.data.length
        )
        if (limitError) {
            return res.status(400).json({ error: true, message: limitError })
        }
        const contactReservation = await reservePlanRecipients(
            req.user._id,
            recipientValidation.data.map(({ number }) =>
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
            recipients: recipientValidation.data,
            type: template.type,
            message: template.body,
            url: template.url,
            caption: template.caption,
            templateId: template._id,
            templateName: template.name,
            templateBody: template.body,
        })
        return res.status(201).json({ error: false, data: campaign })
    } catch (error) {
        if (reservedNumbers.length) {
            try {
                await releaseUnusedPlanRecipients(req.user._id, reservedNumbers)
            } catch (releaseError) {
                console.error(
                    'Failed to release contacts after template schedule creation failed:',
                    releaseError.message
                )
            }
        }
        console.error('Failed to create template schedule:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to schedule template messages.',
        })
    }
}

exports.update = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Template schedule not found.' })
        }
        if (isPlanExpired(req.user))
            return res
                .status(403)
                .json({ error: true, message: 'Your plan has expired.' })
        const validated = validateScheduleFields(req.body, req.user)
        if (validated.error)
            return res
                .status(400)
                .json({ error: true, message: validated.error })
        const template = await ownedTemplate(
            getTemplateId(req.body.templateId),
            req.user
        )
        if (!template)
            return res.status(400).json({
                error: true,
                message: 'Select one of your saved templates.',
            })

        const campaign = await ScheduledMessage.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
            templateId: { $exists: true },
            status: 'scheduled',
            scheduledAt: { $gt: new Date() },
        })
        if (!campaign) {
            return res.status(409).json({
                error: true,
                message:
                    'Only future template schedules that have not started sending can be edited.',
            })
        }

        const recipients =
            req.body.recipients === undefined
                ? campaign.recipients.map((recipient) => {
                      const variables = recipient.variables || {}
                      if (
                          template.variables.some(
                              (variable) => !variables[variable]
                          )
                      ) {
                          throw new Error(
                              `The saved recipients do not contain every variable for "${template.name}". Re-import the Excel file.`
                          )
                      }
                      const rendered = renderTemplateMessage(
                          template,
                          variables
                      )
                      if (rendered.error) throw new Error(rendered.error)
                      return {
                          number: recipient.number,
                          variables,
                          message: rendered.data,
                          status: 'pending',
                      }
                  })
                : (() => {
                      const validation = validateRecipients(
                          req.body.recipients,
                          template
                      )
                      if (validation.error) throw new Error(validation.error)
                      return validation.data
                  })()

        const plan = await getUserPlan(req.user)
        const limitError = validateCampaignLimits(plan, recipients.length)
        if (limitError) {
            return res.status(400).json({ error: true, message: limitError })
        }
        const contactReservation = await reservePlanRecipients(
            req.user._id,
            recipients.map(({ number }) => normalizePlanRecipient(number)),
            plan.maxUniqueRecipients
        )
        if (!contactReservation.allowed) {
            return res.status(400).json({
                error: true,
                message: contactReservation.message,
            })
        }

        const updated = await ScheduledMessage.findOneAndUpdate(
            {
                _id: campaign._id,
                ownerId: req.user._id,
                templateId: { $exists: true },
                status: 'scheduled',
                scheduledAt: { $gt: new Date() },
            },
            {
                $set: {
                    ...validated.data,
                    recipients,
                    type: template.type,
                    message: template.body,
                    url: template.url,
                    caption: template.caption,
                    templateId: template._id,
                    templateName: template.name,
                    templateBody: template.body,
                },
            },
            { new: true, runValidators: true }
        )
        if (!updated) {
            await releaseUnusedPlanRecipients(
                req.user._id,
                contactReservation.added
            )
            return res.status(409).json({
                error: true,
                message:
                    'Only future template schedules that have not started sending can be edited.',
            })
        }
        const updatedNumbers = new Set(recipients.map(({ number }) => number))
        await releaseUnusedPlanRecipients(
            req.user._id,
            campaign.recipients
                .map(({ number }) => number)
                .filter((number) => !updatedNumbers.has(number)),
            campaign._id
        )
        return res.json({
            error: false,
            message: 'Template schedule updated.',
            data: updated,
        })
    } catch (error) {
        if (
            error.message.startsWith('Row ') ||
            error.message.startsWith('Provide ') ||
            error.message.startsWith('The saved ') ||
            error.message.startsWith('Rendered ')
        ) {
            return res.status(400).json({ error: true, message: error.message })
        }
        console.error('Failed to update template schedule:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to update template schedule.',
        })
    }
}

exports.remove = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res
                .status(404)
                .json({ error: true, message: 'Template schedule not found.' })
        }
        const campaign = await ScheduledMessage.findOneAndDelete({
            _id: req.params.id,
            ownerId: req.user._id,
            templateId: { $exists: true },
            status: { $ne: 'processing' },
        })
        if (!campaign) {
            return res.status(409).json({
                error: true,
                message:
                    'Template schedule is not found or has already started sending.',
            })
        }
        await Message.deleteMany({ scheduleId: campaign._id })
        await releaseUnusedPlanRecipients(
            req.user._id,
            (campaign.recipients || []).map(({ number }) => number)
        )
        return res.json({ error: false, message: 'Template schedule deleted.' })
    } catch (error) {
        console.error('Failed to delete template schedule:', error.message)
        return res.status(500).json({
            error: true,
            message: 'Unable to delete template schedule.',
        })
    }
}

exports.validateRecipients = validateRecipients
exports.renderMessage = renderMessage
