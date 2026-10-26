const mongoose = require('mongoose')

const planSchema = new mongoose.Schema(
    {
        slug: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        price: { type: Number, required: true, min: 0 },
        durationDays: { type: Number, required: true, min: 1 },
        manyInstance: { type: Number, required: true, min: 1 },
        dailyMessageLimit: { type: Number, default: 0, min: 0 },
        maxUniqueRecipients: { type: Number, default: -1, min: -1 },
        maxRecipientsPerCampaign: { type: Number, default: 500, min: 1 },
        features: { type: [String], default: [] },
        public: { type: Boolean, default: true },
        active: { type: Boolean, default: true },
        featured: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Plan', planSchema)
