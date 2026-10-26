exports.create = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.createNewGroup(req.body.name, req.body.users);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.addNewParticipant = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.addNewParticipant(req.body.id, req.body.users);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.removeuser = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.removeuser(req.body.id, req.body.users);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.makeAdmin = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.makeAdmin(req.body.id, req.body.users);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.demoteAdmin = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.demoteAdmin(req.body.id, req.body.users);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.listAll = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupFetchAllParticipating();
        return res.status(200).json({ error: false, data: data || {} });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.leaveGroup = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.leaveGroup(req.body.id);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.join = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.joinURL(req.body.url);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.getInviteCodeGroup = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.getInviteCodeGroup(req.body.id);
        return res.status(200).json({ error: false, data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.getInstanceInviteCodeGroup = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.getInstanceInviteCodeGroup(req.body.id);
        return res.status(200).json({ error: false, link: 'https://chat.whatsapp.com/' + data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.getAllGroups = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        let data = await instance.groupFetchAllParticipating();
        return res.status(200).json({
            error: false,
            message: 'Groups found',
            data: data || {},
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message });
    }
};

exports.groupParticipantsUpdate = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupParticipantsUpdate(req.body.id, req.body.users, req.body.action);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.groupSettingUpdate = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupSettingUpdate(req.body.id, req.body.action);
        return res.status(200).json({ error: false, data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.groupUpdateSubject = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupUpdateSubject(req.body.id, req.body.subject);
        return res.status(200).json({ error: false, data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.groupUpdateDescription = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupUpdateDescription(req.body.id, req.body.description);
        return res.status(200).json({ error: false, data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.groupInviteInfo = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupGetInviteInfo(req.body.url);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.groupidinfo = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupidinfo(req.body.id);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

exports.groupJoin = async (req, res) => {
    try {
        const instance = WhatsAppInstances[req.query.key];
        if (!instance) return res.status(404).json({ error: true, message: 'Instance not found' });
        const data = await instance.groupAcceptInvite(req.body.code);
        return res.status(200).json({ error: false, data: data });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
};

// ===============================================
// FEATURE C: 1-Click Group Contacts Extractor
// ===============================================
exports.getAllGroupsWithParticipants = async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) {
            return res.status(200).json({ error: true, message: 'Instance key is missing. Please select an instance.' });
        }
        const instance = WhatsAppInstances[key];
        if (!instance) {
            return res.status(200).json({ 
                error: true, 
                message: `Instance '${key}' online nahi hai. Kripya pehle Settings me jakar isse QR code ya Phone Code se connect karein.` 
            });
        }
        if (!instance.instance?.sock) {
            return res.status(200).json({ 
                error: true, 
                message: 'WhatsApp phone connected nahi hai. Kripya pehle device link karein.' 
            });
        }
        let groups = await instance.groupFetchAllParticipating();
        if (!groups && instance.instance?.sock) {
            groups = await instance.instance.sock.groupFetchAllParticipating();
        }
        if (!groups) {
            return res.status(200).json({ error: false, data: [] });
        }
        const groupList = Object.values(groups).map(g => ({
            id: g.id,
            subject: g.subject || 'Unnamed Group',
            owner: g.owner || '',
            creation: g.creation || 0,
            desc: g.desc ? g.desc.toString() : '',
            participantsCount: Array.isArray(g.participants) ? g.participants.length : 0,
            participants: (g.participants || []).map(p => ({
                id: p.id,
                number: p.id ? p.id.split('@')[0] : '',
                isAdmin: !!(p.admin || p.isAdmin)
            }))
        }));
        return res.status(200).json({ error: false, data: groupList });
    } catch (e) {
        return res.status(200).json({ error: true, message: e.message || 'Error fetching groups' });
    }
};

exports.getOwnedGroups = async (req, res) => {
    const { tokenId } = req.query;
    const ownsInstance = req.user.insdetails?.some(instance => instance.Token_Id === tokenId);
    if (!tokenId || !ownsInstance) {
        return res.status(403).json({ error: true, message: 'Select one of your own WhatsApp instances.' });
    }

    const instance = global.WhatsAppInstances?.[tokenId];
    if (instance?.instance?.online !== true || !instance.instance.sock) {
        return res.status(409).json({ error: true, message: 'Selected WhatsApp instance is offline.' });
    }

    try {
        const groups = await instance.groupFetchAllParticipating();
        return res.json({ error: false, message: 'Groups found', data: groups || {} });
    } catch (error) {
        console.error('Could not load WhatsApp groups:', error.message);
        return res.status(502).json({ error: true, message: 'Could not load groups from this WhatsApp instance.' });
    }
};
