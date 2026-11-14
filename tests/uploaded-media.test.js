const assert = require('assert')
const {
    getUploadedMedia,
    MAX_MEDIA_UPLOAD_SIZE,
} = require('../src/api/helper/uploadedMedia')

describe('uploaded media queue data', () => {
    it('persists uploaded content as base64 and keeps the caption in options', () => {
        const media = getUploadedMedia(
            {
                buffer: Buffer.from('image-content'),
                originalname: 'photo.png',
                mimetype: 'image/png',
            },
            'image',
            { caption: 'Product photo' }
        )

        assert.strictEqual(
            Buffer.from(media.base64, 'base64').toString(),
            'image-content'
        )
        assert.strictEqual(media.filename, 'photo.png')
        assert.strictEqual(media.mimetype, 'image/png')
        assert.strictEqual(media.type, 'image')
        assert.deepStrictEqual(media.options, {
            caption: 'Product photo',
            delay: 0,
            replyFrom: '',
        })
    })

    it('rejects a missing upload with a client error', () => {
        assert.throws(
            () => getUploadedMedia(undefined, 'image'),
            (error) =>
                error.message === 'Choose a media file to upload.' &&
                error.status === 400
        )
    })

    it('rejects files that exceed the MongoDB-safe upload limit', () => {
        assert.throws(
            () =>
                getUploadedMedia(
                    { buffer: Buffer.alloc(MAX_MEDIA_UPLOAD_SIZE + 1) },
                    'image'
                ),
            (error) =>
                error.message === 'Media files must be 8 MB or smaller.' &&
                error.status === 400
        )
    })
})
