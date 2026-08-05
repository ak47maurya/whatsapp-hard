const mongoose = require('mongoose')

const instanceDetailsSchema = new mongoose.Schema({
    Token_Id: { type: String, required: true },
    toDelay: { type: String },
    minDelay: { type: Number, default: 10 },
    maxDelay: { type: Number, default: 20 },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
})

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: [String], default: ['user'] },
    manyInstance: { type: Number, default: 1 },
    insdetails: [instanceDetailsSchema],
    startDate: { type: Date },
    endDate: { type: Date },
    planStatus: { type: String, default: 'active' },
    planType: { type: String, default: 'trail' },
})

const User = mongoose.model('User', userSchema)

module.exports = User
