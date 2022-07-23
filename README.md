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

**Switcher API** is a *Feature Flag* API with the main focus on decreasing the friction caused by changes while keeping control of what really matters.

Main features:
- Control & track more using little effort by sharing switchers among application components.
- Cross environment. Generate zero impact when manipulating your project features.
- Customizable environment strategies. Setup switchers using variables per environment.
- Delegate Switcher analysis to external services with secured Switcher Relay.
- Create manageable teams to collaborate.
- Keep track of every modification and features usage.
- Detailed metrics.
- SDKs support zero-latency mode for performance improvement.
- Exclusive Slack App to control and test changes.
 

- **JavaScript lib**: (https://github.com/switcherapi/switcher-client-master)
- **Java lib**: (https://github.com/switcherapi/switcher-client)
- **Switcher Management**: (https://github.com/switcherapi/switcher-management)
- **Switcher Slack App**: (https://github.com/switcherapi/switcher-slack-app)

* * *

### Local setup
1. npm install
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
- **Access confirmation** - Admin: /admin/signup/authorization?code= [POST]

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

## API usage
In order to use Switcher API, you need to authenticate the component before using it.<br>
See also our SDKs to integrate Switcher API with your application.

- **Auth** - Client API: /criteria/auth [POST]
- **Executing** -  Client API: /criteria?key=SWITCHER_KEY [POST]

* * *

## Donations
Donations for coffee, cookies or pizza are extremely welcomed.<br>
Please, find the sponsor button at the top for more options.

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9FKW64V67RKXW&source=url)
