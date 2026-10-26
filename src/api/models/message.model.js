const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    tokenId: { type: String, required: true },
    id: { type: String, required: true },
    typeId: { type: String, required: true },
    message: { type: String },
    type: { type: String },
    url: { type: String },
    base64: { type: String },
    base64string: { type: String },
    filename: { type: String },
    mimetype: { type: String },
    file: { type: mongoose.Schema.Types.Mixed },
    btndata: { type: mongoose.Schema.Types.Mixed },
    vcard: { type: String },
    msgdata: { type: mongoose.Schema.Types.Mixed },
    statusType: { type: String },
    emoji: { type: String },
    key: { type: String },
    msg: { type: String },
    options: {
        caption: { type: String },
        delay: { type: Number, default: 0 },
        replyFrom: { type: String, default: '' },
    },
    groupOptions: {
        markUser: { type: String, default: '' },
    },
    status:{ type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    failureReason: { type: String, default: '' },
    sentAt: { type: Date },
    scheduleId: { type: mongoose.Schema.Types.ObjectId },
    scheduleRecipientIndex: { type: Number },
    planUsageDay: { type: Date },
    
    createdAt: { type: Date, default: Date.now },
});

messageSchema.index(
    { scheduleId: 1, scheduleRecipientIndex: 1 },
    { unique: true, sparse: true }
)

module.exports = mongoose.model('Message', messageSchema);
