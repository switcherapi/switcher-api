![Build Status](https://travis-ci.com/petruki/switcher-api.svg?branch=master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcher-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcher-api)
[![Coverage Status](https://coveralls.io/repos/github/petruki/switcher-api/badge.svg?branch=master)](https://coveralls.io/github/petruki/switcher-api?branch=master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Requirements  
- MongoDB
- Postman (optional for request examples)

# About  
**Switcher API** is an online *Feature Flag* API used to toggle features over different applications simultaneously.

Main features:
- It is a remote toggle API. No fixed or immutable configuration files.
- You no longer only toggle code, but business features. You can set up your eco-system to share switchers between applications.
- Cross environment. You are still working on your feature but want to keep the production environment safe from whatever change you make.
- Parallel strategies for the same switcher. Your test environment does not have the same variable as production. You can set up different strategies for the same switcher for two different environments.
- Create teams with different roles of access.
- It keeps track of every configuration change.
- Produce relevant metrics.
- High-security flow using *OAuth 2.0* flow and different levels of credentials for administrators.
- Client URIs exposed in **REST** and **GraphQL**.
- Generate a snapshot from your domain/environment to use with the offline mode of your Switcher Client.  
 - **NodeJs lib**: (https://github.com/petruki/switcher-client-master)
 - **Java lib**: (https://github.com/petruki/switcher-client)

# Configuration
1) npm install
2) Add .env-cmdrc file into the project directory.
3) Fill it according to the description below.

```
{
    "dev": {
        "PORT": "3000",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/switcher-api-dev",
        "JWT_SECRET": "PUT_HERE_YOUR_SUPER_SECRET_JWT_CODE",
        "JWT_ADMIN_TOKEN_RENEW_INTERVAL": "5m",
        "JWT_CLIENT_TOKEN_EXP_TIME": "5m",
        "MAX_EXIST_STRATEGYOPERATION": 100,
        "HISTORY_ACTIVATED": true,
        "METRICS_ACTIVATED": true
    },
    "prod": {
        "PORT": "3000",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/switcher-api-prd",
        "JWT_SECRET": "PUT_HERE_YOUR_SUPER_SECRET_JWT_CODE",
        "JWT_ADMIN_TOKEN_RENEW_INTERVAL": "5m",
        "JWT_CLIENT_TOKEN_EXP_TIME": "5m",
        "MAX_EXIST_STRATEGYOPERATION": 100,
        "HISTORY_ACTIVATED": false,
        "METRICS_ACTIVATED": true
    },
    "test": {
        "PORT": "3000",
        "MONGODB_URI": "mongodb://127.0.0.1:27017/switcher-api-test",
        "JWT_SECRET": "PUT_HERE_YOUR_SUPER_SECRET_JWT_CODE",
        "JWT_ADMIN_TOKEN_RENEW_INTERVAL": "5m",
        "JWT_CLIENT_TOKEN_EXP_TIME": "5m",
        "MAX_EXIST_STRATEGYOPERATION": 100,
        "HISTORY_ACTIVATED": true,
        "METRICS_ACTIVATED": true
    }
}
```

# Testing using JEST
Different suites were created to test them separately.

- Example: test only Admin routers:
```
npm run test-admin
```

# Hands-on testing
Find attached into this repository some request samples (./requests). You just need to import to Postman.

{{url}} = endpoint from where you are running the API.

All calls use **Bearer Token**. Remember to copy the jwt combination after signing up. It generates a expirable token and a refresh token.

Once token expires, a new one can be generate using: **{{url}}/admin/refresh/me**

**1) Create a master admin user.**
- {{url}}/admin/signup [POST]
```json
{
	"name": "Master User",
	"email": "mail@gmail.com",
	"password": "12312312312"
}
```
*copy from the response the generated token to use in conjunction with the next steps.*

**2) Create your domain.**
- {{url}}/domain/create [POST]
```json
{
    "name": "MyCompany Solutions",
    "description": "Your company/business description here"
}
```
*copy from the response the domain _id for the next step.*

*copy from the response your API Key for executing your configuration later on. You can generate it again if you lost it.*

**3) Create a component.**
- {{url}}/component/create [POST]
```json
{
	"name": "MyApp 2.0",
	"description": "My application description",
	"domain": "5df166239194d613400a52e7"
}
```

**4) Create a switcher group.**
- {{url}}/groupconfig/create [POST]
```json
{
	"name": "Project New Feature",
	"description": "This project will rocket investments found",
	"domain": "5df166239194d613400a52e7"
}
```
*copy from the response the group _id for the next step.*

**5) Create a switcher configuration. This is the one you will use on your application.**
- {{url}}/config/create
```json
{
	"key": "NEW_FEATURE",
	"description": "Call my new page",
	"group": "5df166429194d613400a52ea"
}
```
*copy from the response the config _id for the next optional step.*

**6) Optional step - Create a strategy for this configuration.**
- {{url}}/configstrategy/create
```json
{
    "description": "Users allowed to use this new feature",
    "strategy": "VALUE_VALIDATION",
    "values": ["Victoria", "John", "Julia", "Mark", "Roger"],
    "operation": "EXIST",
    "config": "5df1664d9194d613400a52eb",
    "env": "default"
}
```
- Field 'env' is only available to set up on strategy creation since its values might not be the same in production environment.

# Using the configuration
Let's use your configuration. Do you still have the API Key generated when you had created your domain?
- {{url}}/domain/generateApiKey/{{YOUR_DOMAIN_ID_HERE}} [GET]

*copy your new API Key*

**1) Getting your token.**
- {{url}}/criteria/auth [GET]

- Header 
    * Key: switcher-api-key
    * Value: {{YOUR API KEY HERE}}
```json
{
	"domain": "MyCompany Solutions",
	"component": "MyApp 2.0",
	"environment": "default"
}
```
*copy from the response your token.*

**2) Executing your configuration.**

{{url}}/criteria?key=NEW_FEATURE [GET]
```json
{
	"entry": [
		{
			"strategy": "VALUE_VALIDATION",
			"input": "Victoria"
		}]
}
```