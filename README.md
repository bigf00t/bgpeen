## Setup

- Install nvm for windows
- Use nvm to install and use Node 20: `nvm install 20`
- Install dependencies: `npm install --legacy-peer-deps`
- Install function dependencies: `cd ./functions && npm install`
- Install firebase CLI: `npm install -g firebase-tools`

## Running locally

- `npm start` — starts the Vite dev server
- Browse to http://localhost:5173/

## Running functions locally

- `./local_update.ps1 -function manualPlaysUpdate -maxpages 10 -id 13 -historic`
- `./local_update.ps1 -function automaticGamesUpdate -maxgames 1 -maxpages 10`
- `./local_update.ps1 -function manualGamesUpdate -id 13`

WARNING: .env can mess with function deployment

## Emulators

Start emulators (with saved data):
```
firebase emulators:start --only "firestore,storage" --import=firebase-export
```

Save local data state:
```
firebase emulators:export firebase-export --only "firestore,storage"
```

## Deploying

If you get "Error: There was an error deploying functions":
- `firebase login --reauth`

Deploy site:
```
npm run build
firebase deploy --only hosting
```

Deploy functions:
```
firebase deploy --only functions
```

## Troubleshooting

**Emulator won't close:**
```
netstat -ano | findstr :5002
taskkill /F /PID <PID>
```

## Available Scripts

### `npm start`
Runs the app in development mode via Vite. Open http://localhost:5173/ in the browser. The page hot-reloads on edits.

### `npm run build`
Builds the app for production to the `build/` folder. Bundles React in production mode and optimizes for best performance.

### `npm run preview`
Serves the production build locally for testing before deploying.
