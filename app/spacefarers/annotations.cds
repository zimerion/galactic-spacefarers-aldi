using GalacticService as service from '../../srv/galactic-service';

annotate service.Spacefarers with @(
  UI.HeaderInfo          : {
    TypeName       : '{i18n>Spacefarer}',
    TypeNamePlural : '{i18n>Spacefarers}',
    Title          : { Value: lastName },
    Description    : { Value: firstName }
  },
  UI.SelectionFields     : [
    stardustStatus,
    spacesuitColor_code,
    position_ID,
    departmentName
  ],
  UI.LineItem            : [
    { Value: firstName, @UI.Importance: #High },
    { Value: lastName, @UI.Importance: #High },
    { Value: stardustCollection },
    { Value: stardustStatus, Criticality: stardustCriticality, @UI.Importance: #High },
    { Value: spacesuitColor_code, @UI.Importance: #High },
    { Value: wormholeNavigationSkill },
    { Value: position_ID },
    { Value: departmentName },
    { Value: email }
  ],
  UI.PresentationVariant : {
    Visualizations : ['@UI.LineItem'],
    SortOrder      : [{ Property: lastName }]
  }
);

annotate service.Spacefarers with {
  stardustStatus      @Common.Text: stardustLevel.name  @Common.TextArrangement: #TextOnly
                      @Common.ValueListWithFixedValues
                      @Common.ValueList: {
                        CollectionPath : 'StardustStatuses',
                        Parameters     : [
                          { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: stardustStatus, ValueListProperty: 'code' },
                          { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
                        ]
                      };
  stardustCriticality @UI.Hidden;
  spacesuitColor      @Common.Text: spacesuitColor.name @Common.TextArrangement: #TextOnly @Common.ValueListWithFixedValues;
  originPlanet        @Common.Text: originPlanet.name   @Common.TextArrangement: #TextOnly;
  position            @Common.Text: position.name       @Common.TextArrangement: #TextOnly;
};

annotate service.Spacefarers with {
  stardustStatus      @Core.Computed;
  stardustCriticality @Core.Computed;
  departmentName      @Core.Computed;
};

annotate service.StardustStatuses with { code @Common.Text: name @Common.TextArrangement: #TextOnly };
annotate service.SuitColors       with { code @Common.Text: name @Common.TextArrangement: #TextOnly };

annotate service.Positions   with @UI.Identification: [{ Value: name }];
annotate service.Departments with @UI.Identification: [{ Value: name }];
