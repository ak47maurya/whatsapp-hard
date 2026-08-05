const config = require('../../config/config')

function adminToken(req, res, next) {
    const adminToken = req.query.admintoken;
	
    const token = adminToken;
	

    if (!token) {
        return res.status(403).send({
            error: true,
            message: 'Admintoken Now For keys Via Gate ',
        })
    }

    if (config.adminToken !== token) {
        return res
            .status(403)
            .send({ error: true, message: 'Invalid Admin Token' })
    }
    next()
}

module.exports = adminToken
