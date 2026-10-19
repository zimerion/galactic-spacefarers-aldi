using GalacticService as service from '../../srv/galactic-service';

annotate service.Spacefarers with @(
  Common.SemanticKey     : [email],
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
    { Value: email, @UI.Importance: #High },
    { Value: stardustCollection },
    { Value: stardustStatus, Criticality: stardustCriticality, @UI.Importance: #High },
    { Value: spacesuitColor_code, @UI.Importance: #High },
    { Value: wormholeNavigationSkill },
    { Value: position_ID },
    { Value: departmentName }
  ],
  UI.CreateHidden        : { $edmJson: { $Not: { $Path: '/GalacticService.EntityContainer/Configuration/isCommander' } } },
  UI.UpdateHidden        : { $edmJson: { $Not: { $Path: '/GalacticService.EntityContainer/Configuration/isCommander' } } },
  UI.DeleteHidden        : { $edmJson: { $Not: { $Path: '/GalacticService.EntityContainer/Configuration/isCommander' } } },
  UI.PresentationVariant : {
    Visualizations : ['@UI.LineItem'],
    SortOrder      : [{ Property: lastName }]
  },
  UI.DataPoint #StardustStatus : { Value: stardustStatus, Title: '{i18n>StardustStatus}', Criticality: stardustCriticality },
  UI.DataPoint #StardustCollection : { Value: stardustCollection, Title: '{i18n>StardustCollection}' },
  UI.HeaderFacets        : [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#StardustStatus' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#StardustCollection' }
  ],
  UI.Facets              : [
    { $Type: 'UI.ReferenceFacet', ID: 'CosmicDetails',   Label: '{i18n>CosmicDetails}',   Target: '@UI.FieldGroup#CosmicDetails' },
    { $Type: 'UI.ReferenceFacet', ID: 'PersonalDetails', Label: '{i18n>PersonalDetails}', Target: '@UI.FieldGroup#PersonalDetails' },
    { $Type: 'UI.ReferenceFacet', ID: 'Assignment',      Label: '{i18n>Assignment}',      Target: '@UI.FieldGroup#Assignment' }
  ],
  UI.FieldGroup #CosmicDetails : { Data: [
    { Value: stardustCollection },
    { Value: stardustStatus, Criticality: stardustCriticality },
    { Value: spacesuitColor_code },
    { Value: wormholeNavigationSkill }
  ] },
  UI.FieldGroup #PersonalDetails : { Data: [
    { Value: firstName },
    { Value: lastName },
    { Value: email },
    { Value: originPlanet_code }
  ] },
  UI.FieldGroup #Assignment : { Data: [
    { Value: position_ID },
    { Value: departmentName }
  ] },
  Common.SideEffects #StardustCollection : {
    SourceProperties : [stardustCollection],
    TargetProperties : ['stardustStatus', 'stardustCriticality'],
    TargetEntities   : [stardustLevel]
  },
  Common.SideEffects #Position : {
    SourceProperties : [position_ID],
    TargetProperties : ['wormholeNavigationSkill', 'departmentName'],
    TargetEntities   : [position]
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
  originPlanet        @Common.Text: originPlanet.name   @Common.TextArrangement: #TextOnly @Common.ValueListWithFixedValues;
  position            @Common.Text: position.name       @Common.TextArrangement: #TextOnly @Common.ValueListWithFixedValues;
};

annotate service.Spacefarers with {
  stardustStatus      @Core.Computed;
  stardustCriticality @Core.Computed;
  departmentName      @Core.Computed;
};

annotate service.StardustStatuses with { code @Common.Text: name @Common.TextArrangement: #TextOnly };
annotate service.SuitColors       with { code @Common.Text: name @Common.TextArrangement: #TextOnly };
annotate service.Planets          with { code @Common.Text: name @Common.TextArrangement: #TextOnly };
annotate service.Positions        with { ID   @Common.Text: name @Common.TextArrangement: #TextOnly };

annotate service.Positions   with @UI.Identification: [{ Value: name }];
annotate service.Departments with @UI.Identification: [{ Value: name }];
