const Message = require('../models/message.model')

async function saveToQueue(req, messageData) {
    const message = new Message({
        ...messageData,
        tokenId: req.query.key,
        status: 'pending',
    })
    await message.save()
    return message
}

exports.Text = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        message: req.body.message,
        options: req.body.options,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Image = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        file: req.file,
        mimetype: req.mimetype,
        type: 'image',
        caption: req.body?.caption,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.sendurlfile = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        url: req.body.url,
        type: 'url',
        caption: req.body?.caption,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.sendbase64file = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        base64: req.body.base64,
        type: 'base64',
        caption: req.body?.caption,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.imageFile = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        userType: req.body.userType,
        file: req.file,
        type: 'image',
        caption: req.body?.caption,
        replyFrom: req.body?.replyFrom,
        delay: req.body?.delay,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.audioFile = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        userType: req.body.userType,
        file: req.file,
        type: 'audio',
        caption: req.body?.caption,
        replyFrom: req.body?.replyFrom,
        delay: req.body?.delay,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Video = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        userType: req.body.userType,
        file: req.file,
        type: 'video',
        caption: req.body?.caption,
        replyFrom: req.body?.replyFrom,
        delay: req.body?.delay,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Audio = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        file: req.file,
        mimetype: req.mimetype,
        type: 'audio',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Document = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        userType: req.body.userType,
        file: req.file,
        type: 'document',
        caption: req.body?.caption,
        replyFrom: req.body?.replyFrom,
        delay: req.body?.delay,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Mediaurl = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        url: req.body.url,
        type: req.body.type,
        mimetype: req.body.mimetype,
        caption: req.body.caption,
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Button = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        btndata: req.body.btndata,
        type: 'button',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Contact = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        vcard: req.body.vcard,
        type: 'contact',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.List = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        type: req.body.type,
        options: req.body.options,
        groupOptions: req.body.groupOptions,
        msgdata: req.body.msgdata,
        type: 'list',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.SetStatus = async (req, res) => {
    const presenceList = [
        'unavailable',
        'available',
        'composing',
        'recording',
        'paused',
    ]
    if (presenceList.indexOf(req.body.status) === -1) {
        return res.status(400).json({
            error: true,
            message:
                'status parameter must be one of ' + presenceList.join(', '),
        })
    }

    const message = await saveToQueue(req, {
        statusType: req.body.status,
        id: req.body.id,
        type: req.body.type,
        delay: req.body?.delay,
        type: 'setstatus',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.MediaButton = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        btndata: req.body.btndata,
        type: 'mediabutton',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.Read = async (req, res) => {
    const message = await saveToQueue(req, {
        msg: req.body.msg,
        type: 'read',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.React = async (req, res) => {
    const message = await saveToQueue(req, {
        id: req.body.id,
        key: req.body.key,
        emoji: req.body.emoji,
        type: 'react',
    })
    return res.status(201).json({
        error: false,
        data: message,
        message: 'Message added to queue',
    })
}

exports.QueueStatus = async (req, res) => {
    const tokenId = req.query.key
    const sent = await Message.countDocuments({
        tokenId: tokenId,
        status: 'sent',
    })
    const pending = await Message.countDocuments({
        tokenId: tokenId,
        status: 'pending',
    })
    const failed = await Message.countDocuments({
        tokenId: tokenId,
        status: 'failed',
    })
    return res.status(200).json({
        error: false,
        data: {
            sent,
            pending,
            failed,
            total: sent + pending + failed,
        },
    })
}
