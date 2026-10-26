const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ejs = require('ejs')

const viewsDirectory = path.join(__dirname, '../src/api/views/user')
const partialPath = path.join(viewsDirectory, 'partials/sidebar-navigation.ejs')

describe('user navigation', () => {
    it('compiles all user pages and shared partials', () => {
        const files = [
            path.join(__dirname, '../src/api/views/welcome.ejs'),
            path.join(__dirname, '../src/api/views/admin/plans.ejs'),
            path.join(__dirname, '../src/api/views/admin/dashboard.ejs'),
            ...fs
                .readdirSync(viewsDirectory)
                .filter((file) => file.endsWith('.ejs'))
                .map((file) => path.join(viewsDirectory, file)),
            ...fs
                .readdirSync(path.join(viewsDirectory, 'partials'))
                .filter((file) => file.endsWith('.ejs'))
                .map((file) => path.join(viewsDirectory, 'partials', file)),
        ]

        files.forEach((file) => {
            ejs.compile(fs.readFileSync(file, 'utf8'), {
                filename: file,
            })
        })
    })

    it('renders all links consistently and marks only the current page active', async () => {
        const pages = [
            'dashboard',
            'settings',
            'reports',
            'schedule',
            'templateschedule',
            'groups',
            'number-checker',
            'helps',
        ]
        for (const activePage of pages) {
            const html = await ejs.renderFile(partialPath, { activePage })
            pages.forEach((page) => {
                const href =
                    page === 'dashboard'
                        ? '/manager/dashboard'
                        : `/manager/${page}`
                assert.ok(html.includes(`href="${href}"`))
            })
            assert.strictEqual(
                (html.match(/aria-current="page"/g) || []).length,
                1
            )
            const activeHref =
                activePage === 'dashboard'
                    ? '/manager/dashboard'
                    : `/manager/${activePage}`
            assert.ok(
                html.includes(
                    `class="nav-link active" href="${activeHref}" aria-current="page"`
                )
            )
        }
    })
})
