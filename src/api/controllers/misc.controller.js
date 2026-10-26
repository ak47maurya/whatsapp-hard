exports.onWhatsapp = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.verifyId(req.body.id);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.downProfile = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.DownloadProfile(req.body.id, req?.body?.group);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.getUserStatus(req.body.id);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.contacts = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.contacts(req.query.key);
        return res.status(200).json({ data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.mystatus = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.mystatus(req.body.status);
        return res.status(200).json({ data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.chats = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.chats(req.body.id);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.blockUnblock(req.body.id, req.body.block_status);
        if (req.body.block_status === 'block') {
            return res.status(200).json({ error: false, message: 'Contact Blocked' });
        } else {
            return res.status(200).json({ error: false, message: 'Contact Unblocked' });
        }
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.updateProfilePicture = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.updateProfilePicture(req.body.id, req.body.url, req.body.type);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.updateProfilePictureManager = async (instanceKey, id, url, type) => {
    try {
        const data = await WhatsAppInstances[instanceKey].updateProfilePicture(id, url, type);
        return data;
    } catch (error) {
        return { error: true, data: error };
    }
};

exports.getUserOrGroupById = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        if (typeof instance.getUserOrGroupById === 'function') {
            const data = await instance.getUserOrGroupById(req.body.id);
            return res.status(200).json({ error: false, data: data });
        } else {
            return res.status(200).json({ error: false, message: 'Feature not supported by instance', data: null });
        }
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};
