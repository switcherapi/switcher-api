# Requirements  
- MongoDB
- Postman (optional for request examples)

# About  
Switcher API is an online Feature Flag API used to toggle features over different applications at the same time.

Main features:
- It is a remote API. No fixed or immutable configuration files.
- You no longer only toggle code, but business features. You can set up your eco-system to share switchers between applications.
- Cross environment. You are still working on your feature but want to keep the production environment safe from whatever change you make.
- Parallel strategies for the same switcher. Your test environment does not have the same variable as production. You can set up different strategies.
- It keeps track of every configuration change.
- Produce relevant metrics.
- High-security flow using OAuth 2.0 flow and different levels of credentials for administrators.
- Client URIs exposed in REST and GraphQL.
- Generate a snapshot from your domain/environment to use with the offline mode of your Switcher Client.  (https://github.com/petruki/switcher-client-master)

# Configuration
1) npm install
2) Add .env-cmdrc file into the project directory.
3) Fill it according to the description below.

{
    "dev": {
        "PORT": "3000",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/switcher-api-dev",
        "JWT_SECRET": "PUT_HERE_YOUR_SUPER_SECRET_JWT_CODE",
        "JWT_CLIENT_TOKEN_EXP_TIME": "5m",
        "MAX_EXIST_STRATEGYOPERATION": 100,
        "HISTORY_ACTIVATED": true,
        "METRICS_ACTIVATED": true
    },
    "prod": {
        "PORT": "3000",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/switcher-api-prd",
        "JWT_SECRET": "PUT_HERE_YOUR_SUPER_SECRET_JWT_CODE",
        "JWT_CLIENT_TOKEN_EXP_TIME": "5m",
        "MAX_EXIST_STRATEGYOPERATION": 100,
        "HISTORY_ACTIVATED": false,
        "METRICS_ACTIVATED": true
    },
    "test": {
        "PORT": "3000",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/switcher-api-test",
        "JWT_SECRET": "PUT_HERE_YOUR_SUPER_SECRET_JWT_CODE",
        "JWT_CLIENT_TOKEN_EXP_TIME": "5m",
        "MAX_EXIST_STRATEGYOPERATION": 100,
        "HISTORY_ACTIVATED": true,
        "METRICS_ACTIVATED": true
    }
}

# Testing using JEST
Different suites were created to test them separately if you want.

- Example: test only Admin routers:
    npm run test-admin

```js