const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const checkCookies = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).redirect('/manager/welcome');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const { userId, email, exp } = decoded;
        const currentTime = Math.floor(Date.now() / 1000);
        if (exp && exp < currentTime) {
            return res.clearCookie('token').redirect('/login?error=Session%20expired');
        }
        const user = await User.findById(userId);
        if (!user || user.email !== email) {
            return res.clearCookie('token').redirect('/manager/login?error=Invalid%20token%20or%20user');
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const { userId, exp } = decoded;
        const now = Math.floor(Date.now() / 1000);
        if (exp < now) {
            return res.status(401).json({ message: "Token expired" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
};


module.exports = { checkCookies, checkInsMongoId };
