using galactic from '../db/schema';

@requires: ['Viewer', 'Commander']
service GalacticService @(path: '/galactic') {

  @restrict: [
    { grant: 'READ', to: 'Viewer',    where: (originPlanet.code = $user.planet) },
    { grant: '*',    to: 'Commander', where: (originPlanet.code = $user.planet) }
  ]
  entity Spacefarers as projection on galactic.Spacefarers;

  @readonly entity Departments as projection on galactic.Departments;
  @readonly entity Positions   as projection on galactic.Positions;
}
