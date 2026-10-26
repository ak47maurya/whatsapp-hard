const assert = require('assert')
const {
    validateTemplate,
} = require('../src/api/controllers/messageTemplate.controller')
const {
    validateRecipients,
} = require('../src/api/controllers/templateScheduledMessage.controller')

describe('template scheduler', () => {
    it('validates JSON recipients and renders template values on the server', () => {
        assert.deepStrictEqual(
            validateRecipients(
                [
                    {
                        number: '+91 98765 43210',
                        variables: { name: 'Asha', order_id: 'ORD-42' },
                    },
                ],
                {
                    type: 'text',
                    body: 'Hello {{name}}, order {{order_id}} is ready.',
                    variables: ['name', 'order_id'],
                }
            ),
            {
                data: [
                    {
                        number: '919876543210',
                        variables: { name: 'Asha', order_id: 'ORD-42' },
                        message: 'Hello Asha, order ORD-42 is ready.',
                        status: 'pending',
                    },
                ],
            }
        )
    })

    it('extracts placeholders and rejects unsupported placeholder syntax', () => {
        assert.deepStrictEqual(
            validateTemplate({
                name: 'Order update',
                body: 'Hi {{name}}, order {{order_id}}.',
            }).data.variables,
            ['name', 'order_id']
        )
        assert.match(
            validateTemplate({ name: 'Invalid', body: 'Hi {{customer-name}}.' })
                .error,
            /format \{\{name\}\}/
        )
    })

    it('validates image and document templates with URL and caption variables', () => {
        const image = validateTemplate({
            name: 'Order photo',
            type: 'image',
            url: 'https://example.com/order.jpg',
            caption: 'Hi {{name}}, order {{order_id}} is ready.',
        })
        assert.deepStrictEqual(image.data.variables, ['name', 'order_id'])
        assert.strictEqual(image.data.type, 'image')
        assert.match(
            validateTemplate({
                name: 'Missing file',
                type: 'document',
                caption: 'Your invoice',
            }).error,
            /valid http or https media URL/
        )
    })

    it('renders media captions from validated JSON recipients', () => {
        assert.deepStrictEqual(
            validateRecipients(
                [{ number: '919876543210', variables: { name: 'Asha' } }],
                {
                    type: 'image',
                    caption: 'Hello {{name}}',
                    variables: ['name'],
                }
            ).data[0],
            {
                number: '919876543210',
                variables: { name: 'Asha' },
                message: 'Hello Asha',
                status: 'pending',
            }
        )
    })

    it('rejects incomplete, duplicate, and extra JSON recipient values', () => {
        const template = {
            type: 'text',
            body: 'Hi {{name}}.',
            variables: ['name'],
        }
        assert.match(
            validateRecipients(
                [{ number: '919876543210', variables: {} }],
                template
            ).error,
            /"name" cannot be blank/
        )
        assert.match(
            validateRecipients(
                [
                    { number: '919876543210', variables: { name: 'Asha' } },
                    { number: '919876543210', variables: { name: 'Ravi' } },
                ],
                template
            ).error,
            /duplicate mobile number/
        )
        assert.match(
            validateRecipients(
                [
                    {
                        number: '919876543210',
                        variables: { name: 'Asha', extra: 'value' },
                    },
                ],
                template
            ).error,
            /only the variables required/
        )
        assert.match(
            validateRecipients(
                [
                    {
                        number: '919876543210',
                        variables: { name: { value: 'Asha' } },
                    },
                ],
                template
            ).error,
            /must be plain text or a number/
        )
    })
})
