import cds from '@sap/cds'
import { Configuration, Positions, Spacefarers, type Position } from '#cds-models/GalacticService'

const planetsOf = (user: cds.User): string[] => [user.attr.planet ?? []].flat()

const STARDUST_BONUS_PER_SKILL_LEVEL = 50

const positionOf = async (ID?: string | null) =>
  ID ? SELECT.one.from(Positions, ID).columns('name', 'minNavigationSkill') : undefined

const rejectSkill = (req: cds.Request, position: Position) => req.error({
  status: 400, message: 'SKILL_BELOW_POSITION_MINIMUM', args: [position.name, position.minNavigationSkill], target: 'wormholeNavigationSkill',
})

const isUniqueViolation = (err: unknown): err is Error =>
  err instanceof Error && /UNIQUE constraint failed|unique constraint violated|duplicate key value/i.test(err.message)

export default class GalacticService extends cds.ApplicationService {
  override init() {
    // @restrict doesn't filter navigation targets
    this.before('READ', '*', async req => {
      const [root, ...path] = req.query.SELECT?.from?.ref ?? []
      if (!path.length) return
      const name = typeof root === 'string' ? root : root.id
      const scope = name === Spacefarers.name ? { originPlanet_code: { in: planetsOf(req.user) } }
        : name === Spacefarers.drafts.name ? { 'DraftAdministrativeData.InProcessByUser': req.user.id }
        : undefined
      if (!scope) return
      const parent: { ID: string } | undefined = await SELECT.one.from({ ref: [root] }).columns('ID').where(scope)
      if (!parent) return req.reject(404)
    })

    this.before('NEW', Spacefarers.drafts, req => {
      req.data.originPlanet_code ??= planetsOf(req.user)[0] ?? null
    })

    // @restrict's where clause isn't checked against incoming data
    this.before(['CREATE', 'UPDATE', 'NEW'], [Spacefarers, Spacefarers.drafts], req => {
      const { originPlanet_code: planet, email } = req.data
      if (planet !== undefined) {
        const planets = planetsOf(req.user)
        if (!planet || !planets.includes(planet)) {
          return req.reject({ status: 403, message: 'FOREIGN_PLANET', args: [planets.join(', ')], target: 'originPlanet_code' })
        }
      }
      if (email) req.data.email = email.toLowerCase()
    })

    this.before('CREATE', Spacefarers, async req => {
      if (req.errors) return
      const position = await positionOf(req.data.position_ID)
      const skill = req.data.wormholeNavigationSkill = Number(req.data.wormholeNavigationSkill ?? position?.minNavigationSkill ?? 1)
      if (position && skill < (position.minNavigationSkill ?? 1)) return rejectSkill(req, position)
      req.data.stardustCollection = Number(req.data.stardustCollection ?? 0) + skill * STARDUST_BONUS_PER_SKILL_LEVEL
    })

    this.before('UPDATE', Spacefarers, async req => {
      const { position_ID, wormholeNavigationSkill } = req.data
      if (req.errors || (position_ID === undefined && wormholeNavigationSkill === undefined)) return
      const current = await SELECT.one.from(req.subject).columns('position_ID', 'wormholeNavigationSkill')
      const position = await positionOf(position_ID === undefined ? current?.position_ID : position_ID)
      const skill = Number(wormholeNavigationSkill ?? current?.wormholeNavigationSkill)
      if (position && skill < (position.minNavigationSkill ?? 1)) return rejectSkill(req, position)
    })

    this.before('UPDATE', Spacefarers.drafts, async req => {
      if (req.data.wormholeNavigationSkill !== undefined) return
      const position = await positionOf(req.data.position_ID)
      if (!position) return
      const current = await SELECT.one.from(req.subject).columns('wormholeNavigationSkill')
      const minimum = position.minNavigationSkill ?? 1
      if ((current?.wormholeNavigationSkill ?? 1) < minimum) req.data.wormholeNavigationSkill = minimum
    })

    this.on(['CREATE', 'UPDATE'], Spacefarers, async (req, next) => {
      try {
        return await next()
      } catch (err) {
        if (!isUniqueViolation(err)) throw err
        return /email/i.test(err.message)
          ? req.reject({ status: 409, message: 'EMAIL_TAKEN', target: 'email' })
          : req.reject({ status: 409, message: 'SPACEFARER_EXISTS' })
      }
    })

    this.on('READ', Configuration, req => req.reply({ ID: 'default', isCommander: req.user.is('Commander') }))

    this.after('CREATE', Spacefarers, async (_, req) => {
      const { firstName, lastName, email } = req.data
      await this.emit('SpacefarerWelcomed', { firstName, lastName, recipients: [email] })
    })

    return super.init()
  }
}
