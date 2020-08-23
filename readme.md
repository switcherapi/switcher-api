[![Build Status](https://travis-ci.com/switcherapi/switcher-api.svg?branch=master)](https://travis-ci.com/github/switcherapi/switcher-api)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-api)
[![Coverage Status](https://coveralls.io/repos/github/switcherapi/switcher-api/badge.svg?branch=master)](https://coveralls.io/github/switcherapi/switcher-api?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/switcherapi/switcher-api/badge.svg)](https://snyk.io/test/github/switcherapi/switcher-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

![Switcher API: Cloud-based Feature Flag API](https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_grey.png)

# About  

**Switcher API** is a *Feature Flag* API with the main focus on decreasing the friction caused by changes while keeping control of what really matters.

Main features:
- Control & track more using little effort by sharing switchers among application components.
- Cross environment. Generate zero impact when manipulating your project features.
- Customizable environment strategies. Setup switchers using variables per environment.
- Create manageable teams to collaborate.
- Keep track of every modification and features usage.
- Detailed metrics.
- Client endpoints exposed in **REST** and **GraphQL**.
- Zero-latency mode also enables your applications to work with zero latency.
 

- **JavaScript lib**: (https://github.com/switcherapi/switcher-client-master)
- **Java lib**: (https://github.com/switcherapi/switcher-client)
- **Switcher Management**: (https://github.com/switcherapi/switcher-management)

* * *

### Local setup
1. npm install
2. Add .env-cmdrc file into the project directory.
3. Fill it according to the description below.

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
    "METRICS_ACTIVATED": true,
    "METRICS_MAX_PAGE": 50,
    "SENDGRID_API_KEY": "[SENDGRID_API_KEY]",
    "SENDGRID_MAIL_FROM": "[SENDGRID_MAIL_FROM]",
    "SENDGRID_CONFIRMATION_TEMPLATE": "[SENDGRID_CONFIRMATION_TEMPLATE]",
    "GIT_OAUTH_CLIENT_ID": "[GITHUB_CLIENT_ID]",
    "GIT_OAUTH_SECRET": "[GITHUB_API_SECRET]",
    "BITBUCKET_OAUTH_CLIENT_ID": "[BITBUCKET_CLIENT_ID]",
    "BITBUCKET_OAUTH_SECRET": "[BITBUCKET_API_SECRET]",
    "GOOGLE_RECAPTCHA_SECRET": "[GOOGLE_RECAPTCHA_SECRET]"
  },
  "prod": {
  },
  "test": {
  }
}
```

# Usage
### API configuration
#### Signing up
Signing up to Switcher API must be made via Switcher Management.
<br />It can be done by using an email address or linking it to a GitHub or BitBucket account.

- **Singing up via email** - /admin/signup [POST]
```json
{
    "name": "[USER NAME]",
    "email": "[EMAIL ADDRESS]",
    "password": "[PASSWORD]",
    "token": "[GOOGLE reCAPTCHA TOKEN]"
}
```

- **Singing up via GitHub** - /admin/github/auth?code= [POST]
  Code must be set by the API service provider.

- **Singing up via BitBucket** - /admin/bitbucket/auth?code= [POST]
  Code must be set by the API service provider.

- **Access confirmation** - /admin/signup/authorization?code=[GENERATED_CODE] [POST]
  Code must be generated via /admin/signup.

#### Domain

- **New domain** - /domain/create [POST]
  Domains is big wrapper which allows you centralize releases, teams, environment, components, and much more.
```json
{
    "name": "[DOMAIN NAME]",
    "description": "[DOMAIN DESCRIPTION]"
}
```

#### Component

- **Create a component** - /component/create [POST]
  Name here all your applications that will be using Switchers. 
  Each application has its API Key.
```json
{
    "name": "[COMPONENT NAME]",
    "description": "[COMPONENT DESCRIPTION]",
    "domain": "[DOMAIN ID]"
}
```

- **Generating a new API Key** - /component/generateApiKeyCOMPONENT_ID [GET]
  This operation cannot be undone.

#### Group

- **New Group** - /groupconfig/create [POST]
```json
{
    "name": "[GROUP NAME]",
    "description": "[GROUP DESCRIPTION]",
    "domain": "[DOMAIN ID]"
}
```

#### Switcher

- **New Switcher** - /config/create [POST]
```json
{
    "key": "[SWITCHER KEY]",
    "description": "[SWITCHER DESCRIPTION]",
    "group": "[GROUP ID]"
}
```

#### Strategy

- **New Strategy** - /configstrategy/create [POST]
```json
{
    "description": "[STRATEGY DESCRIPTION]",
    "strategy": "[STRATEGY TYPE]",
    "values": ["ARRAY OF VALUES"],
    "operation": "[SRATEGY OPERATION]",
    "config": "[CONFIG ID]",
    "env": "default"
}
```

*env can be replaced by the environment your application is currently running.*

  - **Strategy types**
    - VALUE_VALIDATION

      Plain text validation. No format required.

    - NUMERIC_VALIDATION

      Integer or Decimal value validation.

    - NETWORK_VALIDATION

      This validation accept CIDR (e.g. 10.0.0.0/24) or IPv4 (e.g. 10.0.0.1) formats.

    - TIME_VALIDATION

      This validation accept only HH:mm format input.

    - DATE_VALIDATION

      Date validation accept both date and time input (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm) formats.

    - REGEX_VALIDATION

      Regular expression based validation. No format required.

  - **Strategy operations**
    - EXIST / NOT_EXIST
    - EQUAL / NOT_EQUAL
    - GREATER / LOWER / BETWEEN

* * *

### API usage
To use the API, each component must authenticate before executing the API criteria evaluation.

- **Auth** - /criteria/auth [POST]
The header must contain the following:
```
'headers': {
    'switcher-api-key': '[API_KEY]'
}
```
The body must contain the exact registered domain, component, and environment name.
```json
{
   "domain": "[DOMAIN NAME]",
   "component": "[COMPONENT NAME]",
   "environment": "default"
}
```

- **Executing** - /criteria?key=SWITCHER_KEY [POST]
The header must contain the authorization token provided by the criteria/auth endpoint.
```
Bearer Token: [TOKEN]
```

**Optional parameters**

- showReason [true/false]: returns the criteria result.
- showStrategy [true/false]: returns the configured strategy.
- bypassMetric [true'false]: bypass registering the execution result.

**REST - Strategy input**

Multiple input can be provided to the API. In case the registered Switcher does not contain any configured strategy, the input sent is going to be ignored.

```json
{
  "entry": [
    {
      "strategy": "[STRATEGY TYPE]",
      "input": "[VALUE]"
    }]
}
```

**GraphQL - Strategy input** - /graphql [POST]

A GraphQL endpoint can also be used to execute the API. Extra return information can be specified under response block request.

```
{
  criteria(
    key: "[SWITCHER KEY]", 
    bypassMetric: [true/false],
    entry: [
        {
          strategy: "[STRATEGY TYPE]", 
          input: "[VALUE]"
        }
      ]
    ) {
    response {
      result
      reason
    }
  }
}
```

* * *

## Donation
Donations for cookies and pizza are extremely welcomed.
[![Patreon](https://img.shields.io/badge/patreon-donate-yellow.svg)](https://www.patreon.com/switcherapi)

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9FKW64V67RKXW&source=url)