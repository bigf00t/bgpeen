To run site locally:
- npm start
- browse to http://localhost:3000/

To run function locally against prod database:
- $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\radbl\Documents\dev\bgpeen\bgpeen-1fc16-c819bb592209.json" ; $env:NODE_OPTIONS="--max-old-space-size=8192" ; node .\functions\local_update.js --function manualPlaysUpdate --id 295947 --maxPages 10
- In /functions 
  - ./node_modules/.bin/env-cmd node local_update.js --function manualPlaysUpdate --id 295947 --maxPages 10
  - ./node_modules/.bin/env-cmd node local_update.js --function runAutomaticGameUpdates --maxPages 10 --prod

To run emulators:
- firebase emulators:start --only functions,firestore --import=./data

To save local data state:
- firebase emulators:export ./data --only firestore

To test emulated functions in postman:
- POST to http://localhost:5001/bgpeen-1fc16/us-central1/getGames

To deploy. If getting "Error: There was an error deploying functions"
- $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\radbl\Documents\dev\bgpeen\bgpeen-1fc16-c819bb592209.json"
- firebase login --reauth

To deploy site:
- npm run-script build
- firebase deploy --only hosting

To deploy functions:
- firebase deploy --only functions

To test production functions in postman:
- POST to https://us-central1-bgpeen-1fc16.cloudfunctions.net/getGames

Troubleshooting:
- If emulator won't close
  - netstat -ano | findstr :5002
  - taskkill /F /PID <PID>

----------------------------------------------------------------------------------------------------

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify