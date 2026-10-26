const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const {
    DEFAULT_PLANS,
    getLegacyPlanSlug,
    normalizePlanRecipient,
    getUserPlanSlug,
    validateCampaignLimits,
} = require('../src/api/helper/plans')
const { validatePlan } = require('../src/api/controllers/plan.controller')

describe('plan limits', () => {
    it('defines a two-day trial with daily and total-recipient caps', () => {
        const trial = DEFAULT_PLANS.find((plan) => plan.slug === 'trial')
        assert.strictEqual(trial.durationDays, 2)
        assert.strictEqual(trial.dailyMessageLimit, 100)
        assert.strictEqual(trial.maxUniqueRecipients, 10)
        assert.strictEqual(trial.maxRecipientsPerCampaign, 10)
        assert.strictEqual(trial.public, false)
    })

    it('enforces campaign size against both plan limits', () => {
        const trial = DEFAULT_PLANS.find((plan) => plan.slug === 'trial')
        assert.strictEqual(validateCampaignLimits(trial, 10), null)
        assert.match(
            validateCampaignLimits(trial, 11),
            /10 recipients per campaign/
        )

        const customPlan = {
            ...trial,
            maxRecipientsPerCampaign: 200,
            dailyMessageLimit: 100,
        }
        assert.match(
            validateCampaignLimits(customPlan, 101),
            /daily limit of 100/
        )
    })

    it('normalizes phone-number JIDs consistently', () => {
        assert.strictEqual(
            normalizePlanRecipient('+1 (415) 555-0123'),
            '14155550123'
        )
        assert.strictEqual(
            normalizePlanRecipient('14155550123@s.whatsapp.net'),
            '14155550123'
        )
        assert.strictEqual(
            normalizePlanRecipient('120363025123456789@g.us'),
            '120363025123456789@g.us'
        )
    })

    it('maps legacy trial spelling to the capped trial plan', () => {
        assert.strictEqual(getLegacyPlanSlug({ planType: 'trail' }), 'trial')
        assert.strictEqual(
            getLegacyPlanSlug({ planType: '2 Day', planStatus: 'Active' }),
            'trial'
        )
    })

    it('provides a fallback slug for custom plans', () => {
        assert.strictEqual(
            getUserPlanSlug({ planType: 'My Custom Plan' }),
            'my custom plan'
        )
        assert.strictEqual(getUserPlanSlug({}), 'custom')
    })

    it('validates editable plans and supports unlimited-contact sentinel', () => {
        const result = validatePlan({
            name: 'Agency plan',
            price: 4900,
            durationDays: 30,
            manyInstance: 5,
            dailyMessageLimit: 250,
            maxUniqueRecipients: -1,
            maxRecipientsPerCampaign: 500,
            features: 'API access\nPriority support',
            public: true,
            active: true,
        })
        assert.deepStrictEqual(result.data.features, [
            'API access',
            'Priority support',
        ])
        assert.strictEqual(result.data.maxUniqueRecipients, -1)
        assert.ok(validatePlan({ name: 'Invalid', durationDays: 0 }).error)
    })

    it('compiles plan-related EJS views', () => {
        const views = [
            'src/api/views/welcome.ejs',
            'src/api/views/admin/plans.ejs',
            'src/api/views/admin/dashboard.ejs',
            'src/api/views/user/home.ejs',
        ]
        for (const view of views) {
            ejs.compile(fs.readFileSync(view, 'utf8'), {
                filename: path.resolve(view),
            })
        }
    })
})
