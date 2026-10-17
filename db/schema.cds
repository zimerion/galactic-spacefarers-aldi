namespace galactic;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

entity Planets : CodeList {
  key code : String(20) @title: '{i18n>Planet}';
}

entity SuitColors : CodeList {
  key code : String(20) @title: '{i18n>SpacesuitColor}';
      hex  : String(7)  @title: '{i18n>Hex}' @assert.format: '^#[0-9A-Fa-f]{6}$';
}

@cds.odata.valuelist
@assert.unique: { name: [name] }
entity Departments : cuid, managed {
  name        : String(100) @mandatory @title: '{i18n>Department}';
  description : String(500)            @title: '{i18n>Description}';
  positions   : Composition of many Positions on positions.department = $self;
}

@cds.odata.valuelist
entity Positions : cuid, managed {
  name               : String(100) @mandatory @title: '{i18n>Position}';
  department         : Association to Departments @assert.target @title: '{i18n>Department}';
  @assert.range: [1, 10]
  minNavigationSkill : Integer default 1 @title: '{i18n>MinNavigationSkill}';
}

@assert.unique: { email: [email] }
entity Spacefarers : cuid, managed {
  firstName               : String(60)  @mandatory @title: '{i18n>FirstName}';
  lastName                : String(60)  @mandatory @title: '{i18n>LastName}';
  email                   : String(255) @mandatory @title: '{i18n>Email}' @assert.format: '^[^@\s]+@[^@\s]+\.[^@\s]+$';

  @assert.range: [0, _]
  stardustCollection      : Integer default 0 @title: '{i18n>StardustCollection}';

  @assert.range: [1, 10]
  wormholeNavigationSkill : Integer default 1 @title: '{i18n>WormholeNavigationSkill}';

  originPlanet            : Association to Planets     @mandatory @assert.target @title: '{i18n>OriginPlanet}';
  spacesuitColor          : Association to SuitColors  @assert.target @title: '{i18n>SpacesuitColor}';
  position                : Association to Positions   @assert.target @title: '{i18n>Position}';
  departmentName          : String(100) @title: '{i18n>Department}' = position.department.name;
}
