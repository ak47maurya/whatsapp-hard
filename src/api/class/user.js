const User = require('../models/user.model')
const Message = require('../models/message.model')
const cron = require('node-cron')
const axios = require('axios')

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
            await Message.findOneAndDelete({ _id: messageId, tokenId: tokenId })
            return 'Message deleted successfully'
        } catch (error) {
            throw error
        }
    }

    static async deleteAllMessages(tokenId) {
        try {
            await Message.deleteMany({ tokenId: tokenId })
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

// Function to send a message
async function sendMessage(message) {
    try {
        const tokenId = message.tokenId
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
        await Message.updateOne({ _id: message._id }, { status: 'sent' })
    } catch (error) {
        await Message.updateOne({ _id: message._id }, { status: 'failed' })
    }
}

// Function to process messages for a specific instance
async function processInstanceMessages(instanceId) {
    // Get message sending limit for this instance from User table
    const user = await User.findOne({ 'insdetails.Token_Id': instanceId })
    const messageLimit = user?.insdetails?.messageQty || 1000 // Default to 1000 if not set
    const batchSize = Math.floor(messageLimit / 60) // Messages per minute
    const messages = await Message.find({
        tokenId: instanceId,
        status: 'pending',
    })
        .limit(batchSize)
        .sort({ createdAt: 1 })
    for (const msg of messages) {
        await sendMessage(msg)
    }
}

// Scheduler to process messages every minute
setInterval(async () => {
    console.log('Running message queue processing...')
    // Get all unique instances with pending messages
    const instances = await Message.distinct('tokenId', { status: 'pending' })
    for (const instanceId of instances) {
        processInstanceMessages(instanceId)
    }
}, 60000) // Runs every 60 seconds (1 minute)

/** Check Account Expired Date */

const checkExpiredAccounts = async () => {
    try {
        const today = new Date()
        // Find users whose endDate is before today and planStatus is not "Expired"
        const expiredUsers = await User.find({
            endDate: { $lt: today },
            planStatus: { $ne: 'Expired' },
        })
        if (expiredUsers.length === 0) {
            console.log('No expired accounts found.')
            return
        }
        for (const user of expiredUsers) {
            user.planStatus = 'Expired'
            await user.save()
        }
    } catch (error) {
        console.error('Error checking expired accounts:', error)
    }
}

// Run the function periodically (e.g., daily)
setInterval(checkExpiredAccounts, 24 * 60 * 60 * 1000) // Runs once every 24 hours
checkExpiredAccounts()

module.exports = { UserService, MessageService }
