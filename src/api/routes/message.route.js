const express = require('express')
const controller = require('../controllers/message.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')
const multer = require('multer')
const { MAX_MEDIA_UPLOAD_SIZE } = require('../helper/uploadedMedia')
const { protectRoutes } = require('../../config/config')
const tokenCheck = require('../middlewares/tokenCheck')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({
    storage,
    limits: { fileSize: MAX_MEDIA_UPLOAD_SIZE },
}).single('file')

function handleMediaUpload(req, res, next) {
    upload(req, res, error => {
        if (error) {
            return res.status(400).json({
                error: true,
                message: error.code === 'LIMIT_FILE_SIZE'
                    ? 'Media files must be 8 MB or smaller.'
                    : 'Unable to read the uploaded media file.',
            })
        }
        return next()
    })
}

if (protectRoutes) {
    router.use(tokenCheck)
}

router.route('/text').post(keyVerify, loginVerify, controller.Text)
router.route('/image').post(keyVerify, loginVerify, handleMediaUpload, controller.Image)
router.route('/sendurlfile').post(keyVerify, loginVerify, controller.sendurlfile)
router.route('/sendbase64file').post(keyVerify, loginVerify, controller.sendbase64file)
router.route('/imagefile').post(keyVerify, loginVerify, handleMediaUpload, controller.imageFile)
router.route('/audiofile').post(keyVerify, loginVerify, handleMediaUpload, controller.audioFile)
router.route('/video').post(keyVerify, loginVerify, handleMediaUpload, controller.Video)
router.route('/audio').post(keyVerify, loginVerify, handleMediaUpload, controller.Audio)
router.route('/doc').post(keyVerify, loginVerify, handleMediaUpload, controller.Document)
router.route('/mediaurl').post(keyVerify, loginVerify, controller.Mediaurl)
router.route('/button').post(keyVerify, loginVerify, controller.Button)
router.route('/contact').post(keyVerify, loginVerify, controller.Contact)
router.route('/list').post(keyVerify, loginVerify, controller.List)
router.route('/setstatus').post(keyVerify, loginVerify, controller.SetStatus)
router.route('/mediabutton').post(keyVerify, loginVerify, controller.MediaButton)
router.route('/read').post(keyVerify, loginVerify, controller.Read)
router.route('/react').post(keyVerify, loginVerify, controller.React)

router.route('/queuestatus').get(keyVerify, loginVerify, controller.QueueStatus)

module.exports = router
