const Message = require('../models/message.model')
const ScheduledMessage = require('../models/scheduledMessage.model')
const User = require('../models/user.model')
const mongoose = require('mongoose')
const { isPlanExpired } = require('../helper/planAccess')
const { syncCampaign } = require('../controllers/scheduledMessage.controller')
const { processInstanceMessages } = require('./user')

let processorRunning = false

async function queueCampaign(campaign) {
    const owner = await User.findById(campaign.ownerId)
    if (!owner || isPlanExpired(owner)) {
        await ScheduledMessage.updateOne(
            { _id: campaign._id, status: 'processing' },
            {
                $set: {
                    status: 'failed',
                    'recipients.$[].status': 'failed',
                    'recipients.$[].failureReason': 'Plan expired or account unavailable',
                },
            }
        )
        return
    }

    const instance = global.WhatsAppInstances?.[campaign.tokenId]
    if (instance?.instance?.online !== true) return

    const existingMessages = await Message.find(
        { scheduleId: campaign._id },
        { scheduleRecipientIndex: 1 }
    ).lean()
    const queuedIndexes = new Set(existingMessages.map(message => message.scheduleRecipientIndex))
    const operations = []

    for (let index = 0; index < campaign.recipients.length; index += 1) {
        if (queuedIndexes.has(index)) continue
        const recipient = campaign.recipients[index]
        operations.push({
            updateOne: {
                filter: {
                    scheduleId: campaign._id,
                    scheduleRecipientIndex: index,
                },
                update: {
                    $setOnInsert: {
                        tokenId: campaign.tokenId,
                        id: recipient.number,
                        typeId: 'user',
                        ...(campaign.type === 'text'
                            ? { message: recipient.message || campaign.message }
                            : {
                                type: campaign.type,
                                url: campaign.url,
                                options: {
                                    caption: recipient.message || campaign.caption,
                                    delay: 0,
                                    replyFrom: '',
                                },
                            }),
                        scheduleId: campaign._id,
                        scheduleRecipientIndex: index,
                        status: 'pending',
                        createdAt: new Date(),
                    },
                },
                upsert: true,
            },
        })
    }
    if (operations.length) {
        await Message.bulkWrite(operations, { ordered: false })
        processInstanceMessages(campaign.tokenId).catch(error => {
            console.error('Failed to start scheduled message batch:', error.message)
        })
    }
}

async function processScheduledMessages() {
    if (processorRunning || mongoose.connection.readyState !== 1) return
    processorRunning = true
    try {
        const dueCampaigns = await ScheduledMessage.find({
            status: 'scheduled',
            scheduledAt: { $lte: new Date() },
        }).sort({ scheduledAt: 1 }).limit(20)

        for (const campaign of dueCampaigns) {
            const owner = await User.findById(campaign.ownerId)
            if (!owner || isPlanExpired(owner)) {
                await ScheduledMessage.updateOne(
                    { _id: campaign._id, status: 'scheduled' },
                    {
                        $set: {
                            status: 'failed',
                            'recipients.$[].status': 'failed',
                            'recipients.$[].failureReason': 'Plan expired or account unavailable',
                        },
                    }
                )
                continue
            }
            if (global.WhatsAppInstances?.[campaign.tokenId]?.instance?.online !== true) continue

            const claimed = await ScheduledMessage.findOneAndUpdate(
                { _id: campaign._id, status: 'scheduled' },
                { $set: { status: 'processing' } },
                { new: true }
            ).lean()
            if (!claimed) continue
        }

        const processing = await ScheduledMessage.find({ status: 'processing' }).limit(50)
        for (const campaign of processing) {
            await queueCampaign(campaign)
            await syncCampaign(campaign)
        }
    } catch (error) {
        console.error('Scheduled message processor error:', error.message)
    } finally {
        processorRunning = false
    }
}

setInterval(processScheduledMessages, 10000).unref()

module.exports = { processScheduledMessages }
