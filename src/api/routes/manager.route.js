const express = require('express')
const controller = require('../controllers/manager.controller')
const groupController = require('../controllers/group.controller')
const scheduledMessageController = require('../controllers/scheduledMessage.controller')
const messageTemplateController = require('../controllers/messageTemplate.controller')
const templateScheduledMessageController = require('../controllers/templateScheduledMessage.controller')
const numberCheckerController = require('../controllers/numberChecker.controller')
const planController = require('../controllers/plan.controller')
const { checkCookies, checkInsMongoId, checkAdmin, } = require('../middlewares/checkCookies')

const router = express.Router()

router.get('/getallgroupswithmembers', checkCookies, groupController.getAllGroupsWithParticipants)

// Admin User Data
router.route('/users').get(checkAdmin, controller.users) // get All users
router.route('/users/:id').put(checkAdmin, controller.updateUser) // put for update
router.route('/users/:id').delete(checkAdmin, controller.deleteUser) // delete for delete
router.get('/plans', checkCookies, planController.adminPage)
router.get('/plans/data', checkAdmin, planController.list)
router.post('/plans', checkAdmin, planController.create)
router.put('/plans/:id', checkAdmin, planController.update)
router.get('/plan-summary', checkCookies, planController.summary)

router.route('/addNewUsers').post(checkAdmin, controller.addNewUsers) // add new users
router.route('/users/instances').post(checkInsMongoId, controller.addNewInstance) // create new instance user wise
router.route('/users/instancesList').get(checkInsMongoId, controller.instanceList) // get all instances by user
router.route('/users/deleteInstance').post(checkInsMongoId, controller.deleteInstanceId) // delete instance by user
router.route('/dashboard').get(checkCookies, controller.redirectByRole)
router.get('/register', (req, res) => {
    res.render('register', { query: req.query })
})
// Serve Home Login Page
router.get('/welcome', (req, res) => {
    return planController.welcome(req, res)
})
router.get('/login', (req, res) => {
    res.render('login', { query: req.query })
})
router.get('/logout', (req, res) => {
    res.clearCookie('token')
    return res.redirect('/manager/login?success=Logged%20out%20successfully')
})

/**pages */
router.get('/helps', checkCookies, (req, res) => {
    const { user } = req
    return res.status(200).render('user/helps', {
        message: 'User Helps!',
        user,
        page: 'user/helps',
    })
})
/**pages */
router.get('/reports', checkCookies, (req, res) => {
    const { user } = req
    res.render('user/reports', {
        message: 'reports',
        user,
        page: 'user/reports',
    })
})

router.get('/schedule', checkCookies, (req, res) => {
    return res.render('user/schedule', {
        user: req.user,
        page: 'user/schedule',
    })
})
router.get('/templateschedule', checkCookies, (req, res) => {
    return res.render('user/templateschedule', {
        user: req.user,
        page: 'user/templateschedule',
    })
})
router.get('/message-templates', checkCookies, messageTemplateController.list)
router.post('/message-templates', checkCookies, messageTemplateController.create)
router.put('/message-templates/:id', checkCookies, messageTemplateController.update)
router.delete('/message-templates/:id', checkCookies, messageTemplateController.remove)
router.get('/template-scheduled-messages', checkCookies, templateScheduledMessageController.list)
router.post('/template-scheduled-messages', checkCookies, templateScheduledMessageController.create)
router.get('/template-scheduled-messages/:id', checkCookies, templateScheduledMessageController.details)
router.put('/template-scheduled-messages/:id', checkCookies, templateScheduledMessageController.update)
router.delete('/template-scheduled-messages/:id', checkCookies, templateScheduledMessageController.remove)
router.get('/groups', checkCookies, (req, res) => {
    return res.render('user/groups', {
        user: req.user, page: 'user/groups',
    })
})
router.get('/groups/data', checkCookies, groupController.getOwnedGroups)
router.get('/number-checker', checkCookies, (req, res) => {
    return res.render('user/number-checker', {
        user: req.user,
        page: 'user/number-checker',
    })
})
router.post('/number-checker', checkCookies, numberCheckerController.checkNumbers)
router.get('/scheduled-messages', checkCookies, scheduledMessageController.list)
router.post('/scheduled-messages', checkCookies, scheduledMessageController.create)
router.get('/scheduled-messages/:id', checkCookies, scheduledMessageController.details)
router.put('/scheduled-messages/:id', checkCookies, scheduledMessageController.update)
router.post('/scheduled-messages/:id/cancel', checkCookies, scheduledMessageController.cancel)
router.delete('/scheduled-messages/:id', checkCookies, scheduledMessageController.remove)

/**pages */
router.get('/settings', checkCookies, (req, res) => {
    const { user } = req
    res.render('user/settings', {
        message: 'settings',
        user,
        page: 'user/settings',
    })
})

// login and register
router.route('/login').post(controller.login)
router.route('/register').post(controller.register)

// Send message in database
router.route('/messages/text').post(controller.createMessages)
router.route('/messages/media').post(controller.createMessagesMedia)
// Route to get messages by Token_Id
router.route('/messages/:tokenId').get(controller.getMessagesByInstance)
// Delete single message
router.route('/messages/delete/:tokenId/:messageId').delete(controller.deleteMessage)
// Delete all messages by token
router.route('/messages/deleteAll/:tokenId').delete(controller.deleteAllMessages)
// route create delay fro message sendiong data
router.route('/set_delay').post(checkCookies, controller.instanceSendToDelay)

router.get('/userDtailesData', checkCookies, controller.userDtailesData)

module.exports = router
