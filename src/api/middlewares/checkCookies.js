const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { enforcePlanExpiry } = require('../helper/planAccess');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Please configure it in your .env file.');
}

const JWT_SECRET = process.env.JWT_SECRET;

const checkCookies = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).redirect('/manager/welcome');
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const { userId, email, exp } = decoded;
        const currentTime = Math.floor(Date.now() / 1000);
        if (exp && exp < currentTime) {
            return res.clearCookie('token').redirect('/login?error=Session%20expired');
        }
        const user = await User.findById(userId);
        if (!user || user.email !== email) {
            return res.clearCookie('token').redirect('/manager/login?error=Invalid%20token%20or%20user');
        }
        try {
            await enforcePlanExpiry(user);
        } catch (error) {
            console.error('Plan expiry enforcement failed:', error.message);
            return res.status(503).send('Unable to verify plan access. Please retry.');
        }
        req.user = user; // Attach user to the request
        next();
    } catch (error) {
        console.error('Cookie Validation Error:', error.message);
        return res.clearCookie('token').redirect('/manager/login?error=Invalid%20or%20expired%20token');
    }
};

const checkInsMongoId = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Authentication token missing" });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const { userId, exp } = decoded;
        const now = Math.floor(Date.now() / 1000);
        if (exp < now) {
            return res.status(401).json({ message: "Token expired" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        try {
            await enforcePlanExpiry(user);
        } catch (error) {
            console.error('Plan expiry enforcement failed:', error.message);
            return res.status(503).json({ message: 'Unable to verify plan access' });
        }
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
};


const config = require('../../config/config');

const checkAdmin = async (req, res, next) => {
    try {
        const adminQueryToken = req.query.admintoken || req.headers['x-admin-token'];
        if (adminQueryToken && adminQueryToken === config.adminToken) {
            return next();
        }

        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Authentication token missing" });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const { userId, exp } = decoded;
        const now = Math.floor(Date.now() / 1000);
        if (exp < now) {
            return res.status(401).json({ message: "Token expired" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!user.role || !user.role.includes('admin')) {
            return res.status(403).json({ message: "Access denied. Admin role required." });
        }
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = { checkCookies, checkInsMongoId, checkAdmin };
