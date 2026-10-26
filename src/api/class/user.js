const User = require('../models/user.model')
const Message = require('../models/message.model')
const cron = require('node-cron')
const axios = require('axios')
const { enforcePlanExpiry, isPlanExpired } = require('../helper/planAccess')
const {
    getUserPlan,
    getUtcDay,
    normalizePlanRecipient,
    releaseUnusedPlanRecipients,
    reserveDailyMessage,
    reservePlanRecipients,
    settleDailyMessage,
} = require('../helper/plans')

class MessageService {
    static async createMessage(messageData) {
        try {
            if (Array.isArray(messageData)) {
                await Message.insertMany(messageData)
                return 'Multiple messages created successfully'
            } else {
                const message = new Message(messageData)
                await message.save()
                return 'messages created successfully'
            }
        } catch (error) {
            throw error
        }
    }

    static async getMessageList(tokenId) {
        try {
            const messageList = await Message.find({ tokenId })
            if (!messageList || messageList.length === 0) {
                return []
            }
            return messageList
        } catch (error) {
            throw error
        }
    }

    static async deleteMessage(tokenId, messageId) {
        try {
            const queuedMessage = await Message.findOne({
                tokenId,
                _id: messageId,
                status: 'pending',
            }).lean()
            const owner = queuedMessage
                ? await User.findOne({
                      'insdetails.Token_Id': tokenId,
                  }).select('_id')
                : null
            if (owner && queuedMessage?.planUsageDay) {
                    await settleDailyMessage(
                        owner._id,
                        queuedMessage._id,
                        queuedMessage.planUsageDay,
                        false
                    )
            }
            await Message.findOneAndDelete({ _id: messageId, tokenId: tokenId })
            if (owner && queuedMessage) {
                await releaseUnusedPlanRecipients(owner._id, [
                    normalizePlanRecipient(queuedMessage.id),
                ])
            }
            return 'Message deleted successfully'
        } catch (error) {
            throw error
        }
    }

    static async deleteAllMessages(tokenId) {
        try {
            const [owner, queuedMessages] = await Promise.all([
                User.findOne({ 'insdetails.Token_Id': tokenId }).select('_id'),
                Message.find({ tokenId, status: 'pending' }, '_id planUsageDay id').lean(),
            ])
            if (owner) {
                for (const message of queuedMessages) {
                    if (message.planUsageDay) {
                        await settleDailyMessage(
                            owner._id,
                            message._id,
                            message.planUsageDay,
                            false
                        )
                    }
                }
            }
            await Message.deleteMany({ tokenId: tokenId })
            if (owner) {
                await releaseUnusedPlanRecipients(
                    owner._id,
                    queuedMessages.map(({ id }) =>
                        normalizePlanRecipient(id)
                    )
                )
            }
            return 'All messages deleted successfully'
        } catch (error) {
            throw error
        }
    }
}

class UserService {
    // Create a new user
    static async registerUser(userData) {
        try {
            // Check if email already exists
            const existingUser = await User.findOne({ email: userData.email })
            if (existingUser) {
                throw new Error('User already exists')
            }
            const user = new User(userData)
            await user.save()
            return user
        } catch (error) {
            throw error
        }
    }

    //  Get user find by email
    static async getUserByEmail(email) {
        return await User.findOne({ email })
    }

    // Get all users
    static async getAllUsers() {
        try {
            const users = await User.find()
            return users
        } catch (error) {
            throw error
        }
    }

    // Get a user by ID
    static async getUserById(userId) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }
            return user
        } catch (error) {
            throw error
        }
    }

    // Update a user
    static async updateUser(userId, updatedData) {
        try {
            const user = await User.findByIdAndUpdate(userId, updatedData, {
                new: true,
            })
            if (!user) {
                throw new Error('User not found')
            }
            return user
        } catch (error) {
            throw error
        }
    }

    /** Instance Creation */
    // Add an instance to the user's insdetails array
    static async addInstance(userId, instanceData) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }
            user.insdetails.push(instanceData)
            await user.save()
            return user
        } catch (error) {
            throw error
        }
    }
    // Instance wise message sending cron delay set
    static async addInstanceDealy(
        userId,
        Token_Id,
        toDelay,
        minDelay,
        maxDelay
    ) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }
            // Find the instance in `insdetails` with the matching `Token_Id`
            const instance = user.insdetails.find(
                (ins) => ins.Token_Id === Token_Id
            )
            if (!instance) {
                throw new Error('Token_Id not found in insdetails')
            }
            if (toDelay) instance.toDelay = toDelay
            if (minDelay !== undefined) instance.minDelay = minDelay
            if (maxDelay !== undefined) instance.maxDelay = maxDelay
            // Save the updated user document
            await user.save()
            return user
        } catch (error) {
            console.error('Error adding instance delay:', error)
            throw error
        }
    }

    static async updateInstanceDelay(userId, Token_Id, minDelay, maxDelay) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }
            const instance = user.insdetails.find(
                (ins) => ins.Token_Id === Token_Id
            )
            if (!instance) {
                throw new Error('Token_Id not found in insdetails')
            }
            if (minDelay !== undefined) instance.minDelay = minDelay
            if (maxDelay !== undefined) instance.maxDelay = maxDelay
            await user.save()
            return user
        } catch (error) {
            console.error('Error updating instance delay:', error)
            throw error
        }
    }

    // Get Instance List by user
    static async getInstanceList(userId) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }
            return user.insdetails
        } catch (error) {
            throw error
        }
    }

    // Delete a user
    static async deleteUser(userId) {
        try {
            const user = await User.findByIdAndDelete(userId)
            if (!user) {
                throw new Error('User not found')
            }
            return user
        } catch (error) {
            throw error
        }
    }

    // Delete an instance from the user's insdetails array

    static async deleteInstanceId(userId, instanceId) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { $pull: { insdetails: { Token_Id: instanceId } } }, // Remove the instance from the array
                { new: true } // Return updated document
            )

            if (!user) {
                throw new Error('User not found')
            }
            // Check if instance exists before trying to delete it
            if (WhatsAppInstances[instanceId]) {
                await WhatsAppInstances[instanceId].deleteInstance(instanceId)
                delete WhatsAppInstances[instanceId]
            }
            return user
        } catch (error) {
            throw error
        }
    }

    /** Check User Wise Instance Details */
    static async checkinsDetails(userId) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }
            const instanceData = user.insdetails // count this data and
            const manyins = user.manyInstance // this number is restricetion
            return user.insdetails
        } catch (error) {
            throw error
        }
    }
}

const extractMessageFields = (msg) => {
    var { options, groupOptions, id, message, typeId, type, url, base64 } = msg._doc
    return { options, groupOptions, id, typeId, message, type, url, base64 }
}

async function sendMessage(message) {
    let owner
    let usageDay = message.planUsageDay
    let plan
    let recipientNumber
    try {
        owner = await User.findOne({
            'insdetails.Token_Id': message.tokenId,
        })
        if (owner && await enforcePlanExpiry(owner)) {
            if (usageDay) {
                await settleDailyMessage(owner._id, message._id, usageDay, false)
            }
            await Message.updateOne(
                { _id: message._id },
                { status: 'failed', failureReason: 'Plan expired' }
            )
            return
        }

        const tokenId = message.tokenId
        const isDelivery = !['read', 'react', 'setstatus'].includes(message.type) &&
            !message.statusType
        if (owner && isDelivery) {
            plan = await getUserPlan(owner)
            recipientNumber = normalizePlanRecipient(message.id)
            const contactReservation = await reservePlanRecipients(
                owner._id,
                [recipientNumber],
                plan.maxUniqueRecipients
            )
            if (!contactReservation.allowed) {
                if (usageDay) {
                    await settleDailyMessage(owner._id, message._id, usageDay, false)
                }
                await Message.updateOne(
                    { _id: message._id },
                    { status: 'failed', failureReason: contactReservation.message }
                )
                return
            }

            const today = getUtcDay()
            if (plan.dailyMessageLimit) {
                if (usageDay && usageDay.getTime() !== today.getTime()) {
                    await settleDailyMessage(
                        owner._id,
                        message._id,
                        usageDay,
                        false
                    )
                }
                const reservation = await reserveDailyMessage(
                    owner._id,
                    message._id,
                    plan.dailyMessageLimit
                )
                if (!reservation.allowed) {
                    await Message.updateOne(
                        { _id: message._id },
                        { status: 'failed', failureReason: reservation.message }
                    )
                    if (plan.maxUniqueRecipients >= 0) {
                        await releaseUnusedPlanRecipients(owner._id, [
                            recipientNumber,
                        ])
                    }
                    return
                }
                usageDay = reservation.day
                await Message.updateOne(
                    { _id: message._id },
                    { $set: { planUsageDay: usageDay } }
                )
            }
        }
        const delay = message.options?.delay || 0
        const messageFeild = extractMessageFields(message)
        messageFeild.id = message.id
        messageFeild.typeId = message.typeId
        let data
        if (message.url) {
            data = await WhatsAppInstances[tokenId].sendMediaFile(
                messageFeild,
                'url'
            )
        } else if (message.base64) {
            data = await WhatsAppInstances[tokenId].sendMediaFile(
                messageFeild,
                'base64'
            )
        } else if (message.file) {
            data = await WhatsAppInstances[tokenId].sendMediaFile(
                messageFeild,
                'file'
            )
        } else {
            data =
                await WhatsAppInstances[tokenId].sendTextMessage(messageFeild)
        }
        await new Promise((resolve) => setTimeout(resolve, delay * 1000))
        await Message.updateOne(
            { _id: message._id },
            { status: 'sent', failureReason: '', sentAt: new Date() }
        )
        if (owner && plan?.maxUniqueRecipients >= 0 && recipientNumber) {
            try {
                await User.updateOne(
                    { _id: owner._id },
                    { $addToSet: { planSentRecipientNumbers: recipientNumber } }
                )
            } catch (error) {
                console.error(
                    `Message ${message._id} was delivered but its recipient usage could not be recorded:`,
                    error.message
                )
            }
        }
        if (owner && usageDay) {
            try {
                await settleDailyMessage(owner._id, message._id, usageDay, true)
            } catch (error) {
                console.error(
                    `Message ${message._id} was delivered but its plan usage could not be recorded:`,
                    error.message
                )
            }
        }
    } catch (error) {
        const failureReason = error.response
            ? `File request failed with HTTP ${error.response.status}`
            : String(error.message || 'Unknown send error').replace(
                  /https?:\/\/\S+/gi,
                  '[URL]'
              )
        console.error(
            `Failed to send queued message ${message._id}:`,
            failureReason
        )
        await Message.updateOne(
            { _id: message._id },
            { status: 'failed', failureReason }
        )
        if (owner && usageDay) {
            await settleDailyMessage(owner._id, message._id, usageDay, false)
        }
        if (owner && plan?.maxUniqueRecipients >= 0 && recipientNumber) {
            try {
                await releaseUnusedPlanRecipients(owner._id, [recipientNumber])
            } catch (releaseError) {
                console.error(
                    `Failed to release recipient quota for message ${message._id}:`,
                    releaseError.message
                )
            }
        }
    }
}

// Function to process messages for a specific instance
async function processInstanceMessages(instanceId) {
    if (processingInstances.has(instanceId)) return
    if (global.WhatsAppInstances?.[instanceId]?.instance?.online !== true) return
    processingInstances.add(instanceId)
    try {
        const user = await User.findOne({ 'insdetails.Token_Id': instanceId })
        const messageLimit = user?.insdetails?.messageQty || 1000
        const batchSize = Math.floor(messageLimit / 60)
        const messages = await Message.find({
            tokenId: instanceId,
            status: 'pending',
        })
            .limit(batchSize)
            .sort({ createdAt: 1 })
        for (const msg of messages) {
            await sendMessage(msg)
        }
    } finally {
        processingInstances.delete(instanceId)
    }
}

const processingInstances = new Set()

// Scheduler to process messages every minute
setInterval(async () => {
    try {
        const instances = await Message.distinct('tokenId', { status: 'pending' })
        if (instances.length > 0) {
            for (const instanceId of instances) {
                processInstanceMessages(instanceId).catch(error => {
                    console.error(`Failed to process message batch for ${instanceId}:`, error.message)
                })
            }
        }
    } catch (err) {
        // quiet fail on queue check
    }
}, 60000) // Runs every 60 seconds (1 minute)

/** Check Account Expired Date */

const checkExpiredAccounts = async () => {
    try {
        const users = await User.find()
        for (const user of users.filter(user => isPlanExpired(user))) {
            await enforcePlanExpiry(user)
        }
    } catch (error) {
        console.error('Error checking expired accounts:', error)
    }
}

// Reconcile subscription expiry frequently so active sessions are disconnected promptly.
setInterval(checkExpiredAccounts, 60 * 1000)
checkExpiredAccounts()

module.exports = { UserService, MessageService, processInstanceMessages }
