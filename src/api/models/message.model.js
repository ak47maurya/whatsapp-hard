const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    tokenId: { type: String, required: true }, // instance id
    id: { type: String, required: true }, // this is mobile number
    typeId: { type: String, required: true }, 
    message: { type: String },
    type: { type: String },
    url: { type: String },
    options: {
        caption: { type: String },
        delay: { type: Number, default: 0 },
        replyFrom: { type: String, default: '' },
    },
    groupOptions: {
        markUser: { type: String, default: '' },
    },
    status:{ type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
