# Galactic Spacefarer Adventure

My submission for the ALDI SAP BTP Full Stack technical assessment. It's a CAP app with a Fiori Elements List Report and Object Page for the spacefarers.

## Running it

You need Node.js 24 or newer.

```bash
npm ci
npm run watch
```

The app is at <http://localhost:4004/spacefarers/index.html>, the OData service at <http://localhost:4004/galactic>.

Locally the users are mocked. Log in with one of these, the password is empty:

| User | Role | Planet | What they can do |
|---|---|---|---|
| `nova` | Commander | Milsani Way | read and edit Milsani Way's spacefarers |
| `luna` | Viewer | Moser Roth | read Moser Roth's spacefarers |
| `tandil` | Commander | Tandil | edit, but Tandil has no spacefarers yet |
| `intruder` | – | – | nothing, gets 403 |

## Tests

```bash
npm test
```

There are also manual requests for the VS Code REST Client in `test/http/GalacticService.http`.

## The tasks

1. Data model: `db/schema.cds`. Spacefarers, departments, positions, plus code lists for planets, suit colors and stardust statuses. Seed data is in `db/data` and `test/data`.
2. Service: `srv/galactic-service.cds`. There are two roles, Viewer and Commander, and the `planet` attribute of the user decides which spacefarers they see. In production this would come from XSUAA (`xs-security.json`).
3. Event handlers: `srv/galactic-service.ts`. Before a new spacefarer is saved it gets validated, and gets 50 stardust for every wormhole navigation skill level. After that a welcome e-mail goes out through the CAP Notifications plugin. Locally it just shows up in the server console.
4. List Report: `app/spacefarers`, generated with SAP Fiori tools, my annotations are in `app/spacefarers/annotations.cds`. Sorting, filtering and paging work, and the list shows the stardust status and the suit color.
5. Object Page: editing works with drafts. If you change the stardust, the status updates straight away. Viewers don't get the Create, Edit and Delete buttons.

## Good to know

- Drafts are on, so a plain `POST` to `/galactic/Spacefarers` creates a draft. To create or change the active record directly from an API client, send `"IsActiveEntity": true` in the body.
- The database is in-memory SQLite, as the task asked. I didn't set up a deployment.
