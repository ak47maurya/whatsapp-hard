const mongoose = require('mongoose')

const planUsageSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        day: { type: Date, required: true },
        sentMessageIds: {
            type: [{ type: mongoose.Schema.Types.ObjectId }],
            default: [],
        },
        reservedMessageIds: {
            type: [{ type: mongoose.Schema.Types.ObjectId }],
            default: [],
        },
    },
    { timestamps: true }
)

planUsageSchema.index({ ownerId: 1, day: 1 }, { unique: true })

module.exports = mongoose.model('PlanUsage', planUsageSchema)
