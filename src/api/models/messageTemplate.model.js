const mongoose = require('mongoose')

const messageTemplateSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: ['text', 'image', 'document'], default: 'text' },
    body: { type: String, default: '', maxlength: 4000 },
    url: { type: String, default: '' },
    caption: { type: String, default: '', maxlength: 1000 },
    variables: { type: [String], default: [] },
}, { timestamps: true })

messageTemplateSchema.index({ ownerId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema)
