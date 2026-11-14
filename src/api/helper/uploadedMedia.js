const MAX_MEDIA_UPLOAD_SIZE = 8 * 1024 * 1024

function getUploadedMedia(file, type, body = {}) {
    if (!Buffer.isBuffer(file?.buffer) || file.buffer.length === 0) {
        const error = new Error('Choose a media file to upload.')
        error.status = 400
        throw error
    }
    if (file.buffer.length > MAX_MEDIA_UPLOAD_SIZE) {
        const error = new Error('Media files must be 8 MB or smaller.')
        error.status = 400
        throw error
    }

    const bodyOptions =
        body.options && typeof body.options === 'object' ? body.options : {}

    return {
        base64: file.buffer.toString('base64'),
        filename: file.originalname || 'file',
        mimetype: file.mimetype || '',
        type,
        options: {
            caption: body.caption ?? bodyOptions.caption ?? '',
            delay: body.delay ?? bodyOptions.delay ?? 0,
            replyFrom: body.replyFrom ?? bodyOptions.replyFrom ?? '',
        },
    }
}

module.exports = { getUploadedMedia, MAX_MEDIA_UPLOAD_SIZE }
