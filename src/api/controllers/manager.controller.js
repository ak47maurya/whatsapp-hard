const mongoose = require('mongoose');
const { UserService, MessageService } = require('../class/user');
const bcrypt = require('bcrypt');
const config = require('../../config/config');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { enforcePlanExpiry } = require('../helper/planAccess');
const Plan = require('../models/plan.model');
const { ensureDefaultPlans, getDailyUsage, getUserPlan } = require('../helper/plans');

const MONGODB_RETRY_DELAY = 5000;
let mongoConnectionPending = false;
let mongoRetryTimer;

const connectDB = async () => {
    if (!config.mongoose.enabled) {
        console.log('MongoDB Connection Disabled');
        return;
    }
    if (mongoConnectionPending || mongoose.connection.readyState === 1) {
        return;
    }

    mongoConnectionPending = true;
    try {
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        if (!mongoRetryTimer) {
            mongoRetryTimer = setTimeout(() => {
                mongoRetryTimer = null;
                connectDB();
            }, MONGODB_RETRY_DELAY);
            mongoRetryTimer.unref();
        }
    } finally {
        mongoConnectionPending = false;
    }
};

if (config.mongoose.enabled) {
    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected; waiting for the connection to recover');
    });
    mongoose.connection.on('connected', () => {
        console.log('MongoDB Connected Successfully');
    });
    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB connection recovered');
    });
    mongoose.connection.on('error', (error) => {
        console.error('MongoDB Connection Error:', error.message);
    });
}

connectDB()

// new user Resiter
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }
        const existingUser = await UserService.getUserByEmail(email);
        if (existingUser) {
            return res.format({
                html: () => res.redirect('login?error=User%20already%20exists'),
                json: () => res.status(400).json({ error: 'User already exists.' }),
            });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await ensureDefaultPlans();
        const trialPlan = await Plan.findOne({ slug: 'trial', active: true });
        if (!trialPlan) throw new Error('Default trial plan is unavailable.');
        const startDate = new Date();
        const endDate = new Date(
            startDate.getTime() +
                trialPlan.durationDays * 24 * 60 * 60 * 1000
        );

        // User data object
        const userData = {
            username,
            email,
            password: hashedPassword,
            role: ['user'],
            planId: trialPlan._id,
            manyInstance: trialPlan.manyInstance,
            startDate,
            endDate,
            planStatus: "Trial",
            planType: trialPlan.name,
        };
        const newUser = await UserService.registerUser(userData);
        res.format({
            html: () => res.redirect('login?success=User%20registered%20successfully'),
            json: () => res.status(201).json({
                message: 'User registered successfully.',
                user: { id: newUser._id, username: newUser.username, email: newUser.email },
            }),
        });
    } catch (error) {
        res.format({
            html: () => res.redirect('login?error=Server%20error,%20please%20try%20again'),
            json: () => res.status(500).json({ error: 'Server error, please try again later.' }),
        });
    }
}


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.redirect('login?error=Email%20and%20password%20are%20required.');
        }
        const user = await UserService.getUserByEmail(email);
        if (!user) {
            return res.redirect('login?error=Invalid%20credentials');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.redirect('login?error=Invalid%20credentials');
        }
        await enforcePlanExpiry(user);
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role,
                accExpairy: user.endDate,
                planStatus: user.planStatus,
                planType: user.planType,
                insDetails: user.insdetails
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.cookie('token', token, {
            httpOnly: true, // Prevent client-side access to cookies
            maxAge: 3600000, // Cookie expiration: 1 hour
        });

        return res.redirect('/manager/dashboard')
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Redirected page user or admin role wise
exports.redirectByRole = async (req, res) => {
    const { user } = req;
    if (user) {
        if (user.role.includes('admin')) {
            // Redirect to Admin Dashboard
            return res.status(200).render('admin/dashboard', {
                message: 'Welcome Admin!',
                user,
            });
        } else {
            const plan = await getUserPlan(user);
            const dailyUsage = await getDailyUsage(user._id);
            // Redirect to User Home Page
            return res.status(200).render('user/home', {
                message: 'Welcome User!',
                user,
                plan,
                dailyUsage,
                page: 'user/home'
            });
        }
    } else {
        res.render('welcome');
    }
};
// get All Users Data
exports.users = async (req, res) => {
    try {
        const user = await UserService.getAllUsers(req.body);
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// add new User
exports.addNewUsers = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            role,
            planId,
            startDate,
            endDate,
            planStatus,
        } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }
        const selectedPlan = planId && mongoose.Types.ObjectId.isValid(planId)
            ? await Plan.findOne({ _id: planId, active: true })
            : await Plan.findOne({ slug: 'trial', active: true });
        if (!selectedPlan) {
            return res.status(400).json({ error: 'Select an active plan.' });
        }
        const existingUser = await UserService.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.' })
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const startsAt = startDate ? new Date(startDate) : new Date();
        const endsAt = endDate
            ? new Date(endDate)
            : new Date(startsAt.getTime() + selectedPlan.durationDays * 86400000);
        if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
            return res.status(400).json({ error: 'Enter a valid plan start and end date.' });
        }
        const userData = {
            username,
            email,
            password: hashedPassword,
            role: role || ['user'],
            planId: selectedPlan._id,
            manyInstance: selectedPlan.manyInstance,
            planRecipientNumbers: [],
            planSentRecipientNumbers: [],
            startDate: startsAt,
            endDate: endsAt,
            planStatus: planStatus || 'Trial',
            planType: selectedPlan.name,
        };
        const newUser = await UserService.registerUser(userData);
        res.status(201).json({ success: 'User Successfully Registered.', id: newUser._id })
    } catch (error) {
        return res.status(400).json({ error: 'api error. ' + error });
    }
}


// Update User by admin

exports.updateUser = async (req, res) => {
    try {
        const existingUser = await UserService.getUserById(req.params.id);
        const updates = {
            username: req.body.username,
            email: req.body.email,
            role: req.body.role,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            planStatus: req.body.planStatus,
        };
        if (req.body.planId) {
            if (!mongoose.Types.ObjectId.isValid(req.body.planId)) {
                return res.status(400).json({ error: 'Select a valid plan.' });
            }
            const selectedPlan = await Plan.findOne({
                _id: req.body.planId,
                active: true,
            });
            if (!selectedPlan) {
                return res.status(400).json({ error: 'Select an active plan.' });
            }
            updates.planId = selectedPlan._id;
            updates.planType = selectedPlan.name;
            updates.manyInstance = selectedPlan.manyInstance;
            if (String(existingUser.planId || '') !== String(selectedPlan._id)) {
                updates.planRecipientNumbers = [];
                updates.planSentRecipientNumbers = [];
            }
        } else if (req.body.manyInstance !== undefined) {
            updates.manyInstance = Number(req.body.manyInstance);
        }
        const user = await UserService.updateUser(req.params.id, updates);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// Delete a user (DELETE) by admin
exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await UserService.deleteUser(req.params.id);
        res.status(200).json(deletedUser);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};


exports.addNewInstance = async (req, res) => {
    try {
        const instanceData = req.body;
        const { user } = req;
        if (await enforcePlanExpiry(user)) {
            return res.status(403).json({
                error: true,
                message: "Your plan has expired. Renew your plan before creating an instance.",
            });
        }
        if (!instanceData.key) {
            return res.status(400).json({ message: "Key is required" });
        }
        const userKey = { Token_Id: instanceData.key };
        const plan = await getUserPlan(user);
        if (user.insdetails.length >= plan.manyInstance) {
            return res.status(501).json({ message: "Limit reached! Cannot add more instances." });
        } else {
            const updatedUser = await UserService.addInstance(user._id, userKey);
            try {
                const initResponse = await axios.post(
                    `${req.protocol}://${req.get('host')}/instance/init?admintoken=${config.adminToken}`,
                    instanceData
                );
                res.status(200).json({
                    message: "Instance added and initialized successfully",
                    updatedUser,
                    initStatus: initResponse.data,
                });
            } catch (initError) {
                console.error("Error initializing instance:", initError.response?.data || initError.message);
                return res.status(500).json({
                    message: "Instance added, but initialization failed",
                    updatedUser,
                    initError: initError.response?.data || initError.message,
                });
            }

        }
    } catch (error) {
        console.error("Error in addNewInstance:", error);
        res.status(500).json({ error: error.message });
    }
};


exports.deleteInstanceId = async (req, res) => {
    try {
        const instanceData = req.body;
        const { user } = req;
        if (!instanceData.key) {
            return res.status(400).json({ message: "Key is required" });
        }
        const userKey = { Token_Id: instanceData.key };
        const deletedInstace = await UserService.deleteInstanceId(user._id, userKey.Token_Id);
        res.status(200).json({
            message: "Instance deleted successfully",
            deletedInstace,
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.instanceList = async (req, res) => {
    try {
        // Fetch user-specific instances
        const instances = await UserService.getInstanceList(req.user._id);
        // Get instance list from the external service
        const response = await axios.get(
            `${req.protocol}://${req.get('host')}/instance/list?admintoken=${config.adminToken}`
        );
        if (!response.data || !Array.isArray(response.data.data)) {
            return res.status(500).json({
                error: true,
                message: "Invalid response from instance list endpoint",
            });
        }
        const activeList = response.data.data || [];
        const matchedData = instances.map(token => {
            const found = activeList.find(instance => instance.instance_key === token.Token_Id);
            if (found) {
                return found;
            }
            return {
                instance_key: token.Token_Id,
                phone_connected: false,
                webhook: false,
                user: { id: 'Disconnected' }
            };
        });
        return res.status(200).json({
            message: matchedData.length > 0 ? "Matching keys found" : "No matching keys found",
            data: matchedData,
        });
    } catch (e) {
        console.error("Error in instanceList:", e.message);
        return res.status(500).json({
            error: true,
            message: "An error occurred while processing the request",
        });
    }
};



/** Create Message's */
exports.createMessages = async (req, res) => {
    try {
        const messages = req.body;
        const tokenId = messages.tokenId;
        if (!tokenId) {
            return res.status(400).json({
                error: true,
                message: 'Token_Id is required',
            });
        }
        await MessageService.createMessage(messages);
        return res.status(201).json({
            error: false,
            message: 'Message(s) created successfully',
        });
    } catch (error) {
        console.error('Error in createMessages:', error.message);
        return res.status(500).json({
            error: true,
            message: 'An error occurred while creating messages',
        });
    }
}

/** Create media Message's */
exports.createMessagesMedia = async (req, res) => {
    try {
        const messages = req.body;
        const tokenId = messages.tokenId;
        if (!tokenId) {
            return res.status(400).json({
                error: true,
                message: 'Token_Id is required',
            });
        }
        await MessageService.createMessage(messages);
        return res.status(201).json({
            error: false,
            message: 'Message(s) created successfully',
        });
    } catch (error) {
        console.error('Error in createMessages:', error.message);
        return res.status(500).json({
            error: true,
            message: 'An error occurred while creating messages',
        });
    }
}

// get All Message's
exports.getMessagesByInstance = async (req, res) => {
    try {
        const tokenId = req.params.tokenId;
        if (!tokenId) {
            return res.status(400).json({
                error: true,
                message: 'Token_Id is required',
            });
        }

        const messages = await MessageService.getMessageList(tokenId);
        // console.log(messages)

        return res.status(200).json({
            error: false,
            message: 'Messages retrieved successfully',
            data: messages,
        });
    } catch (error) {
        console.error('Error in getMessagesByInstance:', error.message);
        return res.status(500).json({
            error: true,
            message: 'An error occurred while retrieving messages',
        });
    }

}

// Delete single message
exports.deleteMessage = async (req, res) => {
    try {
        const { tokenId, messageId } = req.params;
        if (!tokenId || !messageId) {
            return res.status(400).json({
                error: true,
                message: 'Token_Id and Message_Id are required',
            });
        }

        await MessageService.deleteMessage(tokenId, messageId);
        return res.status(200).json({
            error: false,
            message: 'Message deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteMessage:', error.message);
        return res.status(500).json({
            error: true,
            message: 'An error occurred while deleting message',
        });
    }
}

// Delete all messages by token
exports.deleteAllMessages = async (req, res) => {
    try {
        const tokenId = req.params.tokenId;
        if (!tokenId) {
            return res.status(400).json({
                error: true,
                message: 'Token_Id is required',
            });
        }

        await MessageService.deleteAllMessages(tokenId);
        return res.status(200).json({
            error: false,
            message: 'All messages deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteAllMessages:', error.message);
        return res.status(500).json({
            error: true,
            message: 'An error occurred while deleting messages',
        });
    }
}


exports.instanceSendToDelay = async (req, res) => {
    try {
        const { user } = req;
        const Token_Id = req.body.Token_Id;
        const toDelay = req.body.toDelay;
        if (!Token_Id || !toDelay) {
            return res.status(400).json({
                error: true,
                message: 'Token_Id and toDelay are required',
            });
        }
        const dealyRes = await UserService.addInstanceDealy(user._id, Token_Id, toDelay)
        return res.status(200).json({
            error: false,
            success: 'success',
            message: 'Instance send to delay successfully',
            data: dealyRes
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: 'An error occurred while sending instance to delay',
        });
    }
}


exports.userDtailesData = (req, res) => {
    try {
        const { user } = req;
        return res.status(200).json({
            error: false,
            success: 'success',
            message: 'User data fetched successfully',
            data: user
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: 'An error occurred while sending instance to delay',
        });
    }
};
