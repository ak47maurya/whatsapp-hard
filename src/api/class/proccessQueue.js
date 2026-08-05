const Message = require('../models/message.model.js')
const User = require('../models/user.model.js')
const { WhatsAppInstances } = require('./whatsappInstances.js')

const MIN_DELAY = 10
const MAX_DELAY = 20
const CHECK_INTERVAL = 5000

function getRandomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY
}

async function sendMessage(message) {
    try {
        console.log(`Sending message to ${message.id}: ${message.message}`)
        const tokenId = message.tokenId
        const delay = message.options?.delay || 0
        let data

        if (message.url) {
            data = await WhatsAppInstances[tokenId].sendMediaFile(
                message,
                'url'
            )
        } else if (message.file && message.type) {
            data = await WhatsAppInstances[tokenId].sendMediaFile(
                message,
                message.type
            )
        } else {
            data = await WhatsAppInstances[tokenId].sendTextMessage(message)
        }

        console.log(`Message sent: ${data}`)
        await new Promise((resolve) => setTimeout(resolve, delay * 1000))
        await Message.updateOne({ _id: message._id }, { status: 'sent' })
    } catch (error) {
        console.error(`Failed to send message: ${error}`)
        await Message.updateOne({ _id: message._id }, { status: 'failed' })
    }
}

async function processNextMessage(instanceId) {
    const message = await Message.findOne({
        tokenId: instanceId,
        status: 'pending',
    })
        .sort({ createdAt: 1 })
        .limit(1)

    if (!message) {
        console.log(`No pending messages for instance: ${instanceId}`)
        return false
    }

    await sendMessage(message)
    return true
}

async function processInstance(instanceId) {
    const hasMore = await processNextMessage(instanceId)
    if (hasMore) {
        const delaySeconds = getRandomDelay()
        console.log(`Waiting ${delaySeconds} seconds before next message...`)
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000))
        await processInstance(instanceId)
    }
}

async function startProcessing() {
    console.log('Checking for pending messages...')
    const instances = await Message.distinct('tokenId', { status: 'pending' })

    for (const instanceId of instances) {
        const pendingCount = await Message.countDocuments({
            tokenId: instanceId,
            status: 'pending',
        })
        console.log(`Instance ${instanceId}: ${pendingCount} pending messages`)
        processInstance(instanceId)
    }
}

setInterval(startProcessing, CHECK_INTERVAL)

console.log('Message queue processor started')
