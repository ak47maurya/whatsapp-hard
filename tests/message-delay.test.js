const assert = require('assert')
const {
    DEFAULT_MIN_DELAY_SECONDS,
    DEFAULT_MAX_DELAY_SECONDS,
    getInstanceDelayRange,
    getRandomMessageDelay,
} = require('../src/api/helper/messageDelay')

describe('instance message delay', () => {
    it('uses the selected range for the matching instance', () => {
        assert.deepStrictEqual(
            getInstanceDelayRange(
                {
                    insdetails: [
                        { Token_Id: 'instance-a', minDelay: 3, maxDelay: 7 },
                        { Token_Id: 'instance-b', minDelay: 8, maxDelay: 12 },
                    ],
                },
                'instance-b'
            ),
            { minDelay: 8, maxDelay: 12 }
        )
    })

    it('falls back to the default range when a saved range is invalid', () => {
        assert.deepStrictEqual(
            getInstanceDelayRange(
                {
                    insdetails: [
                        { Token_Id: 'instance-a', minDelay: 30, maxDelay: 10 },
                    ],
                },
                'instance-a'
            ),
            {
                minDelay: DEFAULT_MIN_DELAY_SECONDS,
                maxDelay: DEFAULT_MAX_DELAY_SECONDS,
            }
        )
    })

    it('selects an inclusive random delay within the configured range', () => {
        const originalRandom = Math.random
        try {
            Math.random = () => 0
            assert.strictEqual(getRandomMessageDelay(4, 9), 4)
            Math.random = () => 0.999999
            assert.strictEqual(getRandomMessageDelay(4, 9), 9)
        } finally {
            Math.random = originalRandom
        }
    })
})
