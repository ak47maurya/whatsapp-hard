const express = require('express')
const controller = require('../controllers/manager.controller')
const { checkCookies, checkInsMongoId } = require('../middlewares/checkCookies')

const router = express.Router()

// Admin User Data
router.route('/users').get(controller.users)  // get All users
router.route('/users/:id').put(controller.updateUser)  // put for update
router.route('/users/:id').delete(controller.deleteUser)  // delete for delete

router.route('/addNewUsers').post(controller.addNewUsers) // add new users
router.route('/users/instances').post(checkInsMongoId, controller.addNewInstance); // create new instance user wise
router.route('/users/instancesList').get(checkInsMongoId, controller.instanceList);// get all instances by user
router.route('/users/deleteInstance').post(checkInsMongoId, controller.deleteInstanceId); // delete instance by user
router.route('/dashboard').get(checkCookies, controller.redirectByRole);
router.get('/register', (req, res) => {
  res.render('register', { query: req.query });
});
// Serve Home Login Page
router.get('/welcome', (req, res) => {
  res.status(200).render('welcome')
})
router.get('/login', (req, res) => {
  res.render('login', { query: req.query });
});
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.redirect('/manager/login?success=Logged%20out%20successfully');
});


/**pages */
router.get('/helps', checkCookies, (req, res) => {
  const { user } = req;
  return res.status(200).render('user/helps', {
    message: 'User Helps!',
    user,
    page: 'user/helps',
  });

});
/**pages */
router.get('/reports', checkCookies, (req, res) => {
  const { user } = req;
  res.render('user/reports', {
    message: "reports",
    user,
    page: 'user/reports'
  });
});

/**pages */
router.get('/settings', checkCookies, (req, res) => {
  const { user } = req;
  res.render('user/settings', {
    message: "settings",
    user,
    page: 'user/settings'
  });
});

// login and register
router.route('/login').post(controller.login)
router.route('/register').post(controller.register)


// Send message in database
router.route('/messages/text').post(controller.createMessages);
router.route('/messages/media').post(controller.createMessagesMedia);
// Route to get messages by Token_Id
router.route('/messages/:tokenId').get(controller.getMessagesByInstance);
// Delete single message
router.route('/messages/delete/:tokenId/:messageId').delete(controller.deleteMessage);
// Delete all messages by token
router.route('/messages/deleteAll/:tokenId').delete(controller.deleteAllMessages);
// route create delay fro message sendiong data
router.route('/set_delay').post(checkCookies, controller.instanceSendToDelay)

router.get('/userDtailesData', checkCookies, controller.userDtailesData);

module.exports = router