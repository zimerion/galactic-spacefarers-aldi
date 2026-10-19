import cds from '@sap/cds'
import { Spacefarers } from '#cds-models/GalacticService'

const planetsOf = (user: cds.User): string[] => [user.attr.planet ?? []].flat()

const isUniqueViolation = (err: unknown): err is Error =>
  err instanceof Error && /UNIQUE constraint failed|unique constraint violated|duplicate key value/i.test(err.message)

export default class GalacticService extends cds.ApplicationService {
  override init() {
    // @restrict doesn't filter navigation targets
    this.before('READ', '*', async req => {
      const [root, ...path] = req.query.SELECT?.from?.ref ?? []
      if (!path.length || (typeof root === 'string' ? root : root.id) !== Spacefarers.name) return
      const parent: { ID: string } | undefined = await SELECT.one.from({ ref: [root] }).columns('ID')
        .where({ originPlanet_code: { in: planetsOf(req.user) } })
      if (!parent) return req.reject(404)
    })

    // @restrict's where clause isn't checked against incoming data
    this.before(['CREATE', 'UPDATE'], Spacefarers, req => {
      const { originPlanet_code: planet, email } = req.data
      if (planet !== undefined) {
        const planets = planetsOf(req.user)
        if (!planet || !planets.includes(planet)) {
          return req.reject({ status: 403, message: 'FOREIGN_PLANET', args: [planets.join(', ')], target: 'originPlanet_code' })
        }
      }
      if (email) req.data.email = email.toLowerCase()
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

    return super.init()
  }
}
