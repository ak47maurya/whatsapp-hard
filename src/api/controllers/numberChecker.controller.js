const MAX_NUMBERS = 500
const CHECK_CONCURRENCY = 5

function normalizeNumber(value) {
    if (!/^\+?[\d\s()-]+$/.test(value)) return null
    const number = value.replace(/\D/g, '')
    return number.length >= 7 && number.length <= 15 ? number : null
}

exports.checkNumbers = async (req, res) => {
    const { tokenId, numbers } = req.body
    const ownedInstance = req.user.insdetails?.some(instance => instance.Token_Id === tokenId)
    if (!tokenId || !ownedInstance) {
        return res.status(403).json({ error: true, message: 'Select one of your own WhatsApp instances.' })
    }

    const instance = global.WhatsAppInstances?.[tokenId]
    if (instance?.instance?.online !== true || !instance.instance.sock) {
        return res.status(409).json({ error: true, message: 'Selected WhatsApp instance is offline.' })
    }

    const inputNumbers = String(numbers || '').split(/[,\n]+/).map(value => value.trim()).filter(Boolean)
    if (!inputNumbers.length || inputNumbers.length > MAX_NUMBERS) {
        return res.status(400).json({
            error: true,
            message: `Enter between 1 and ${MAX_NUMBERS} comma-separated numbers.`,
        })
    }

    const normalized = inputNumbers.map(normalizeNumber)
    if (normalized.some(number => !number)) {
        return res.status(400).json({ error: true, message: 'One or more mobile numbers are invalid.' })
    }
    const uniqueNumbers = [...new Set(normalized)]
    const available = []
    const unavailable = []

    try {
        for (let index = 0; index < uniqueNumbers.length; index += CHECK_CONCURRENCY) {
            if (instance.instance?.online !== true || !instance.instance.sock) {
                return res.status(409).json({ error: true, message: 'WhatsApp instance went offline during the check. Please retry.' });
            }
            const batch = uniqueNumbers.slice(index, index + CHECK_CONCURRENCY)
            const results = await Promise.all(batch.map(async number => {
                const [result] = await instance.instance.sock.onWhatsApp(number)
                return { number, jid: result?.exists ? result.jid : null }
            }))
            results.forEach(result => {
                if (result.jid) available.push(result)
                else unavailable.push(result)
            })
        }
    } catch (error) {
        console.error('WhatsApp number check failed:', error.message)
        return res.status(502).json({ error: true, message: 'Could not complete the WhatsApp number check.' })
    }

    return res.json({
        error: false,
        data: {
            total: uniqueNumbers.length,
            available,
            unavailable,
        },
    })
}
