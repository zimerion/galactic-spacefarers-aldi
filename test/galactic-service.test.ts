import cds from '@sap/cds'
import { before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Spacefarer } from '#cds-models/GalacticService'

const test = cds.test(import.meta.dirname + '/..')
const { GET, POST, PUT, PATCH, DELETE } = test

type Notification = { NotificationTypeKey: string, Recipients: { RecipientId: string }[], Properties: { Key: string, Value: string }[] }
const notifications: Notification[] = []
let notifier: cds.Service
const flushQueue = () => notifier.flush()

before(async () => {
  notifier = await cds.connect.to('notifications')
  notifier.before('*', req => { notifications.push(req.data) })
})

beforeEach(async () => {
  await test.data.reset()
  notifications.length = 0
})

type Outcome = { status: number, code?: string }
type ErrorBody = { code?: string, message?: string, target?: string }
type HttpError = { status?: number, response?: { status: number, data?: { error?: ErrorBody } } }

const as = (username: string) => ({ auth: { username, password: '' } })
const outcome = (request: Promise<{ status: number }>): Promise<Outcome> => request.then(
  res => ({ status: res.status }),
  (err: HttpError) => ({ status: err.response?.status ?? err.status ?? 0, code: err.response?.data?.error?.code })
)
const status = async (request: Promise<{ status: number }>) => (await outcome(request)).status
const errorOf = (request: Promise<unknown>): Promise<ErrorBody | undefined> =>
  request.then(() => undefined, (err: HttpError) => err.response?.data?.error)
const list = async (username: string): Promise<Spacefarer[]> => (await GET('/galactic/Spacefarers', as(username))).data.value

const NOVA_QUASAR = '04ae85f9-b0f3-48e8-bf63-1136711c9062'
const NAVIGATION_CORPS = '387d3c42-9828-45a3-bf3f-df1607d1bf16'
const LUNA_CSILLAG = '147200a1-4ded-4dee-8a5b-9613b72d2636'
const UNKNOWN_ID = '99999999-0000-4000-8000-000000000001'
const WORMHOLE_PILOT = 'c8786d2d-05c9-49bc-86ea-769378e7955a'
const STAR_CARTOGRAPHER = '231ebbf0-0a0d-4451-a06c-789251d68e4f'
const ORION_KOVACS = '1d8f8e8a-afe8-4da1-a635-dc81758fc659'
const ENTITIES = ['Spacefarers', 'Departments', 'Positions', 'Planets', 'SuitColors']
const VALUE_LISTS = ['Departments', 'Positions', 'Planets', 'SuitColors']

const newSpacefarer = (originPlanet_code: string, email: string) => ({
  firstName: 'Test', lastName: 'Cadet', email, originPlanet_code
})

describe('GalacticService authentication', () => {
  it('rejects unauthenticated requests (anonymous and unknown users) with 401', async () => {
    assert.equal(await status(GET('/galactic/Spacefarers')), 401, 'anonymous')
    assert.equal(await status(GET('/galactic/Spacefarers', as('ghost'))), 401, 'unknown user')
  })

  it('rejects users without a role on every entity', async () => {
    for (const entity of ENTITIES) {
      assert.equal(await status(GET(`/galactic/${entity}`, as('intruder'))), 403, entity)
    }
  })

  it('lets a viewer read the value lists', async () => {
    for (const entity of VALUE_LISTS) {
      assert.equal(await status(GET(`/galactic/${entity}`, as('luna'))), 200, entity)
    }
  })
})

describe('GalacticService planet isolation', () => {
  it('shows each user only the spacefarers of their own planet', async () => {
    for (const [user, planet, count] of [['nova', 'MILSANI', 2], ['luna', 'MOSERROTH', 2], ['tandil', 'TANDIL', 0]] as const) {
      const spacefarers = await list(user)
      assert.equal(spacefarers.length, count, user)
      assert.ok(spacefarers.every(s => s.originPlanet_code === planet), user)
    }
  })

  it('hides a spacefarer of another planet, by key and through its associations', async () => {
    for (const path of ['', '/originPlanet', '/spacesuitColor', '/position', '/position/department']) {
      assert.equal(await status(GET(`/galactic/Spacefarers(${LUNA_CSILLAG})${path}`, as('nova'))), 404, path || 'by key')
    }
  })

  it('still resolves the associations of an own spacefarer', async () => {
    const { data } = await GET(`/galactic/Spacefarers(${NOVA_QUASAR})/originPlanet`, as('nova'))
    assert.equal(data.code, 'MILSANI')
  })

  it('still allows navigation between value lists', async () => {
    const { data } = await GET(`/galactic/Departments(${NAVIGATION_CORPS})/positions`, as('luna'))
    assert.equal(data.value.length, 2)
  })

  it('does not let a commander update or delete a spacefarer of another planet', async () => {
    assert.equal(await status(PATCH(`/galactic/Spacefarers(${LUNA_CSILLAG})`, { stardustCollection: 1 }, as('nova'))), 403)
    assert.equal(await status(DELETE(`/galactic/Spacefarers(${LUNA_CSILLAG})`, as('nova'))), 403)
    const { data } = await GET(`/galactic/Spacefarers(${LUNA_CSILLAG})`, as('luna'))
    assert.equal(data.stardustCollection, 4999)
  })

  it('does not let a commander create a spacefarer on another planet', async () => {
    const attempts = {
      'POST': () => POST('/galactic/Spacefarers', newSpacefarer('MOSERROTH', 'spy1@galaxy.test'), as('nova')),
      'deep POST': () => POST('/galactic/Spacefarers', { firstName: 'Test', lastName: 'Cadet', email: 'spy2@galaxy.test', originPlanet: { code: 'MOSERROTH' } }, as('nova')),
      'PUT upsert': () => PUT(`/galactic/Spacefarers(${UNKNOWN_ID})`, newSpacefarer('MOSERROTH', 'spy3@galaxy.test'), as('nova')),
    }
    for (const [name, attempt] of Object.entries(attempts)) {
      assert.deepEqual(await outcome(attempt()), { status: 403, code: 'FOREIGN_PLANET' }, name)
    }
  })

  it('does not let a commander move a spacefarer to another planet', async () => {
    const error = await errorOf(PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { originPlanet_code: 'MOSERROTH' }, as('nova')))
    assert.deepEqual(error && { code: error.code, message: error.message, target: error.target }, {
      code: 'FOREIGN_PLANET',
      message: 'Spacefarers can only belong to your own planet (MILSANI).',
      target: 'originPlanet_code',
    })
    const { data } = await GET(`/galactic/Spacefarers(${NOVA_QUASAR})`, as('nova'))
    assert.equal(data.originPlanet_code, 'MILSANI')
  })

  it('does not let a commander remove the planet of a spacefarer', async () => {
    const attempts = {
      'POST': () => POST('/galactic/Spacefarers', { ...newSpacefarer('MILSANI', 'ghost@galaxy.test'), originPlanet_code: undefined, originPlanet: null }, as('nova')),
      'PATCH': () => PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { originPlanet: null }, as('nova')),
    }
    for (const [name, attempt] of Object.entries(attempts)) {
      assert.deepEqual(await outcome(attempt()), { status: 403, code: 'FOREIGN_PLANET' }, name)
    }
    assert.equal((await list('nova')).length, 2)
  })

  it('accepts the planet attribute as a single value, not only as a list', async () => {
    const error = await errorOf(POST('/galactic/Spacefarers', newSpacefarer('MOSERROTH', 'spy4@galaxy.test'), as('tandil')))
    assert.equal(error?.message, 'Spacefarers can only belong to your own planet (TANDIL).')
    assert.equal(await status(POST('/galactic/Spacefarers', newSpacefarer('TANDIL', 'local@galaxy.test'), as('tandil'))), 201)
    assert.deepEqual((await list('tandil')).map(s => s.email), ['local@galaxy.test'])
  })
})

describe('GalacticService uniqueness', () => {
  it('rejects an e-mail address registered on another planet, ignoring case', async () => {
    const result = await outcome(POST('/galactic/Spacefarers', newSpacefarer('TANDIL', 'Luna.CSILLAG@galaxy.test'), as('tandil')))
    assert.deepEqual(result, { status: 409, code: 'EMAIL_TAKEN' })
  })

  it('stores e-mail addresses in lower case', async () => {
    const { data } = await POST('/galactic/Spacefarers', newSpacefarer('TANDIL', 'New.Cadet@Galaxy.test'), as('tandil'))
    assert.equal(data.email, 'new.cadet@galaxy.test')
  })

  it('rejects an ID that already exists on another planet with 409', async () => {
    const result = await outcome(POST('/galactic/Spacefarers', { ID: LUNA_CSILLAG, ...newSpacefarer('TANDIL', 'clone@galaxy.test') }, as('tandil')))
    assert.deepEqual(result, { status: 409, code: 'SPACEFARER_EXISTS' })
  })

  it('accepts the own e-mail address on update and stores it in lower case', async () => {
    const { data } = await PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { email: 'Nova.Quasar@Galaxy.TEST' }, as('nova'))
    assert.equal(data.email, 'nova.quasar@galaxy.test')
  })

  it('rejects changing the e-mail address to a registered one with 409', async () => {
    const error = await errorOf(PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { email: 'luna.csillag@galaxy.test' }, as('nova')))
    assert.deepEqual(error && { code: error.code, target: error.target }, { code: 'EMAIL_TAKEN', target: 'email' })
  })

  it('answers duplicates within one batch changeset with 409 EMAIL_TAKEN instead of a database error', async () => {
    const enlist = (id: string) => ({
      id, atomicityGroup: 'enlist', method: 'POST', url: 'Spacefarers',
      headers: { 'content-type': 'application/json' }, body: newSpacefarer('MILSANI', 'twin@galaxy.test'),
    })
    const { data } = await POST('/galactic/$batch', { requests: [enlist('1'), enlist('2')] }, as('nova'))
    const errors = data.responses.filter((r: { status: number }) => r.status >= 400)
    assert.ok(errors.some((r: { status: number, body?: { error?: ErrorBody } }) => r.status === 409 && r.body?.error?.code === 'EMAIL_TAKEN'), JSON.stringify(data.responses))
    assert.equal((await list('nova')).length, 2)
  })
})

describe('GalacticService CRUD', () => {
  it('lets a commander create, update and delete on their own planet', async () => {
    const { status: created, data } = await POST('/galactic/Spacefarers', newSpacefarer('MILSANI', 'cadet@galaxy.test'), as('nova'))
    assert.equal(created, 201)
    assert.equal(data.originPlanet_code, 'MILSANI')

    const { data: updated } = await PATCH(`/galactic/Spacefarers(${data.ID})`, { stardustCollection: 42 }, as('nova'))
    assert.equal(updated.stardustCollection, 42)

    assert.equal(await status(DELETE(`/galactic/Spacefarers(${data.ID})`, as('nova'))), 204)
    assert.equal(await status(GET(`/galactic/Spacefarers(${data.ID})`, as('nova'))), 404)
  })

  it('does not let a viewer write', async () => {
    assert.equal(await status(POST('/galactic/Spacefarers', newSpacefarer('MOSERROTH', 'viewer@galaxy.test'), as('luna'))), 403)
    assert.equal(await status(PATCH(`/galactic/Spacefarers(${LUNA_CSILLAG})`, { stardustCollection: 1 }, as('luna'))), 403)
    assert.equal(await status(DELETE(`/galactic/Spacefarers(${LUNA_CSILLAG})`, as('luna'))), 403)
  })

  it('exposes departments and positions as read-only', async () => {
    assert.equal(await status(POST('/galactic/Departments', { name: 'Rogue Department' }, as('nova'))), 405)
    assert.equal(await status(POST('/galactic/Positions', { name: 'Rogue Position' }, as('nova'))), 405)
  })
})

describe('GalacticService candidate preparation', () => {
  it('rejects a wormhole navigation skill below the minimum of the position', async () => {
    const candidate = { ...newSpacefarer('MILSANI', 'rookie@galaxy.test'), position_ID: WORMHOLE_PILOT, wormholeNavigationSkill: 3 }
    assert.equal(await status(POST('/galactic/Spacefarers', candidate, as('nova'))), 400)
    const error = await errorOf(POST('/galactic/Spacefarers', candidate, as('nova')))
    assert.deepEqual(error && { code: error.code, message: error.message, target: error.target }, {
      code: 'SKILL_BELOW_POSITION_MINIMUM',
      message: 'A Specialbuy Wormhole Pilot needs a wormhole navigation skill of at least 7.',
      target: 'wormholeNavigationSkill',
    })
  })

  it('starts a candidate without a skill at the minimum of their position', async () => {
    const candidate = { ...newSpacefarer('MILSANI', 'mapper@galaxy.test'), position_ID: STAR_CARTOGRAPHER }
    const { data } = await POST('/galactic/Spacefarers', candidate, as('nova'))
    assert.equal(data.wormholeNavigationSkill, 4)
  })

  it('adds a launch bonus of 50 stardust per skill level on creation', async () => {
    const candidate = { ...newSpacefarer('MILSANI', 'bonus@galaxy.test'), stardustCollection: 100, wormholeNavigationSkill: 5 }
    const { data } = await POST('/galactic/Spacefarers', candidate, as('nova'))
    assert.equal(data.stardustCollection, 350)
  })

  it('adds numbers sent as strings instead of joining them', async () => {
    const candidate = { ...newSpacefarer('MILSANI', 'strings@galaxy.test'), stardustCollection: '100', wormholeNavigationSkill: 2 }
    const { data } = await POST('/galactic/Spacefarers', candidate, as('nova'))
    assert.equal(data.stardustCollection, 200)
  })

  it('does not add the launch bonus on updates', async () => {
    const { data } = await PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { stardustCollection: 42, wormholeNavigationSkill: 8 }, as('nova'))
    assert.equal(data.stardustCollection, 42)
  })

  it('keeps the skill at the minimum of the position on updates', async () => {
    const attempts = {
      'lower skill': () => PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { wormholeNavigationSkill: 1 }, as('nova')),
      'stricter position': () => PATCH(`/galactic/Spacefarers(${ORION_KOVACS})`, { position_ID: WORMHOLE_PILOT }, as('nova')),
    }
    for (const [name, attempt] of Object.entries(attempts)) {
      assert.deepEqual(await outcome(attempt()), { status: 400, code: 'SKILL_BELOW_POSITION_MINIMUM' }, name)
    }
  })
})

describe('GalacticService welcome e-mail', () => {
  it('sends a welcome e-mail to a newly enlisted spacefarer', async () => {
    await POST('/galactic/Spacefarers', newSpacefarer('MILSANI', 'Kira.Comet@galaxy.test'), as('nova'))
    await flushQueue()
    assert.equal(notifications.length, 1)
    const [welcome] = notifications
    assert.match(welcome.NotificationTypeKey, /SpacefarerWelcomed$/)
    assert.deepEqual(welcome.Recipients, [{ RecipientId: 'kira.comet@galaxy.test' }])
    assert.deepEqual(Object.fromEntries(welcome.Properties.map(p => [p.Key, p.Value])), { firstName: 'Test', lastName: 'Cadet' })
  })

  it('does not send a welcome e-mail when enlisting fails', async () => {
    assert.deepEqual(await outcome(POST('/galactic/Spacefarers', newSpacefarer('MOSERROTH', 'spy@galaxy.test'), as('nova'))), { status: 403, code: 'FOREIGN_PLANET' })
    assert.deepEqual(await outcome(POST('/galactic/Spacefarers', newSpacefarer('MILSANI', 'luna.csillag@galaxy.test'), as('nova'))), { status: 409, code: 'EMAIL_TAKEN' })
    await flushQueue()
    assert.equal(notifications.length, 0)
  })

  it('does not send a welcome e-mail on updates', async () => {
    await PATCH(`/galactic/Spacefarers(${NOVA_QUASAR})`, { stardustCollection: 1 }, as('nova'))
    await flushQueue()
    assert.equal(notifications.length, 0)
  })
})
