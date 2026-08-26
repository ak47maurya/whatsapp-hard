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
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            message: req.body.message,
            options: req.body.options,
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Image = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            file: req.file,
            mimetype: req.file?.mimetype,
            type: 'image',
            caption: req.body?.caption,
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.sendurlfile = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            url: req.body.url,
            type: 'url',
            caption: req.body?.caption,
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.sendbase64file = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            base64: req.body.base64,
            type: 'base64',
            caption: req.body?.caption,
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.imageFile = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
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
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.audioFile = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
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
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Video = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
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
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Audio = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            file: req.file,
            mimetype: req.file?.mimetype,
            type: 'audio',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Document = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
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
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Mediaurl = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
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
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Button = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            btndata: req.body.btndata,
            type: 'button',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Contact = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            vcard: req.body.vcard,
            type: 'contact',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.List = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
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
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.SetStatus = async (req, res) => {
    try {
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
            typeId: req.body.typeId,
            delay: req.body?.delay,
            type: 'setstatus',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.MediaButton = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            btndata: req.body.btndata,
            type: 'mediabutton',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.Read = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            msg: req.body.msg,
            type: 'read',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
}

exports.React = async (req, res) => {
    try {
        const message = await saveToQueue(req, {
            id: req.body.id,
            typeId: req.body.typeId,
            key: req.body.key,
            emoji: req.body.emoji,
            type: 'react',
        })
        return res.status(201).json({
            error: false,
            data: message,
            message: 'Message added to queue',
        })
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message })
    }
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
