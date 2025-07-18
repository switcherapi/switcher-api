***

<div align="center">
<b>Switcher API</b><br>
Switching fast. Adapt everywhere.
</div>

<div align="center">

[![Master CI](https://github.com/switcherapi/switcher-api/actions/workflows/master.yml/badge.svg?branch=master)](https://github.com/switcherapi/switcher-api/actions/workflows/master.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-api)
[![Known Vulnerabilities](https://snyk.io/test/github/switcherapi/switcher-api/badge.svg)](https://snyk.io/test/github/switcherapi/switcher-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Hub](https://img.shields.io/docker/pulls/trackerforce/switcher-api.svg)](https://hub.docker.com/r/trackerforce/switcher-api)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

</div>

***

![Switcher API: Cloud-based Feature Flag API](https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_grey.png)

# About  

**Switcher API** is a *Feature Manager* that allows you to control your application features using feature flags, also known as feature toggles, feature switches, or feature flippers. It is a cloud-based solution that provides a simple and efficient way to manage your features, enabling you to release new features to your users with confidence.

Main features:
- Easy to setup and seamless integration with your application using our lightweight Client SDKs.
- Distributed Switchers can be used across multiple applications allowing you to control features in a centralized fashion.
- Multi-environment support. Create and manage features across different environments.
- Add extra layer of verification with custom conditions using Strategies.
- Delegate Switcher criteria decision to specialized application with Switcher Relay.
- Support to multiple teams and granular access control.
- Integrate with Slack usign Switcher Slack App to enable approval workflows.
- Integrate with your CI/CD pipeline to automate feature releases and centralize feature management with Switcher GitOps.
- Detailed metrics and logs to help you to track and monitor your features.

* * *

### Local setup
1. npm ci
2. Add .env-cmdrc file into the project directory (use '.env-cmdrc-template')
3. Replace values such as secret keys and URLs

### Running Switcher API from Docker Composer manifest file

This option leverages Switcher API and Switcher Management with minimum settings required.

1. Modify the configuration file "config/.env.dev":

- JWT_SECRET: With your secure private key
- SWITCHERAPI_URL: The Switcher API URL that Switcher Management will use internally
- SM_IP: IP/DNS used by Switcher Management internal redirects

2. Run:

```
docker-compose --env-file ./config/.env.dev up -d
```

3. Open Switcher Management:

```
http://localhost
```

# Quick start

Open Swagger UI by accessing the URL: http://localhost:3000/api-docs<br>
Or use Postman by importing either the OpenAPI json from http://localhost:3000/swagger.json or Postman Collection from "requests/Switcher API*"

## API configuration

### Signing up
Signing up an account to use Switcher API with an email/password or linking it to a GitHub or Bitbucket account.

- **Singing up via email** - Admin: /admin/signup [POST]
- **Singing up via GitHub** - Admin: /admin/github/auth?code= [POST]
- **Singing up via Bitbucket** - Admin: /admin/bitbucket/auth?code= [POST]

### Domain
Domains are responsible for centralizing all settings and configurations.<br>
It is equivalent to an organization that can manage multiple projects, users, and environments.

- **New domain** - Domain: /domain/create [POST]

### Component
Components are applications that are using Switcher API.<br>
Each component has its own access token and needs to be linked to Switchers.

- **Create a component** - Component: /component/create [POST]
- **Generating a new API Key** - Component: /component/generateApiKey [GET]

### Group
Groups are used to organize Switchers that share the same feature scope.

- **New Group** - GroupConfig: /groupconfig/create [POST]

### Switcher
Switchers are the main entities to control features.

- **New Switcher** - Config: /config/create [POST]

### Strategy
Customize the behavior of the Switcher by including strategy rules to your Switchers.

- **New Strategy** - ConfigStrategy: /configstrategy/create [POST]
