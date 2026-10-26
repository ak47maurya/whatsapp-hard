const mongoose = require('mongoose')

const recipientSchema = new mongoose.Schema({
    number: { type: String, required: true },
    variables: { type: mongoose.Schema.Types.Mixed, default: undefined },
    message: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'cancelled'],
        default: 'pending',
    },
    failureReason: { type: String, default: '' },
    messageId: { type: mongoose.Schema.Types.ObjectId },
    sentAt: { type: Date },
}, { _id: false })

const scheduledMessageSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenId: { type: String, required: true },
    recipients: { type: [recipientSchema], required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, index: true },
    templateName: { type: String, default: '' },
    templateBody: { type: String, default: '' },
    message: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'document'], required: true },
    url: { type: String, default: '' },
    caption: { type: String, default: '' },
    scheduledAt: { type: Date, required: true, index: true },
    status: {
        type: String,
        enum: ['scheduled', 'processing', 'completed', 'partial', 'failed', 'cancelled'],
        default: 'scheduled',
        index: true,
    },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema)
