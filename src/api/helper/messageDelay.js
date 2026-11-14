const DEFAULT_MIN_DELAY_SECONDS = 15
const DEFAULT_MAX_DELAY_SECONDS = 20
const MAX_DELAY_SECONDS = 3600

function getInstanceDelayRange(user, tokenId) {
    const settings = user?.insdetails?.find(
        (instance) => instance.Token_Id === tokenId
    )
    const minDelay = Number(settings?.minDelay)
    const maxDelay = Number(settings?.maxDelay)

    if (
        !Number.isInteger(minDelay) ||
        !Number.isInteger(maxDelay) ||
        minDelay < 1 ||
        maxDelay < minDelay ||
        maxDelay > MAX_DELAY_SECONDS
    ) {
        return {
            minDelay: DEFAULT_MIN_DELAY_SECONDS,
            maxDelay: DEFAULT_MAX_DELAY_SECONDS,
        }
    }

    return { minDelay, maxDelay }
}

function getRandomMessageDelay(minDelay, maxDelay) {
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
}

module.exports = {
    DEFAULT_MIN_DELAY_SECONDS,
    DEFAULT_MAX_DELAY_SECONDS,
    MAX_DELAY_SECONDS,
    getInstanceDelayRange,
    getRandomMessageDelay,
}
