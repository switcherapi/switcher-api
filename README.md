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

### Auth Providers

Switcher API supports multiple auth providers such as email/password-based authentication, SAML 2.0 for Single Sign-On (SSO), or GitHub/Bitbucket OAuth.

#### GitHub OAuth App setup

1. Open your GitHub account or organization settings
2. Go to Developer settings > OAuth Apps
3. Click on "New OAuth App"
4. Fill in the application details:
   - Application name: Switcher API
   - Homepage URL: https://switcher-management-url (or your deployed URL)
   - Authorization callback URL: https://switcher-management-url/login?platform=github
5. Click on "Register application"
6. Copy the Client ID and Client Secret
7. Update your .env-cmdrc file or ConfigMap/Secret in Kubernetes with the following variables:
   - GIT_OAUTH_CLIENT_ID=your_client_id
   - GIT_OAUTH_CLIENT_SECRET=your_client_secret
8. Update Switcher Management GITHUB_CLIENTID environment variable with your_client_id

#### Bitbucket OAuth App setup

1. Open your Bitbucket account or workspace settings
2. Go to Apps and features > OAuth consumers
3. Fill in the application details:
   - Name: Switcher API
   - Callback URL: https://switcher-management-url/login?platform=bitbucket
4. Add permissions -> Account: Read
5. Click on "Save"
6. Copy the Key and Secret
7. Update your .env-cmdrc file or ConfigMap/Secret in Kubernetes with the following variables:
   - BIT_OAUTH_CLIENT_ID=your_client_id
   - BIT_OAUTH_CLIENT_SECRET=your_client_secret
8. Update Switcher Management BITBUCKET_CLIENTID environment variable with your_client_id

#### SSO with SAML 2.0 setup

1. Obtain the following information from your Identity Provider (IdP):
   - Entry Point URL
   - X.509 Certificate
   - (Optional) Private Key

2. Update your .env-cmdrc file or ConfigMap/Secret in Kubernetes with the following variables:
   - SAML_ENTRY_POINT=your_idp_entry_point_url
   - SAML_ISSUER=your_issuer
   - SAML_CALLBACK_ENDPOINT_URL=service_provider_callback_endpoint_url
   - SAML_REDIRECT_ENDPOINT_URL=web_app_redirect_endpoint_url
   - SAML_CERT=your_x509_certificate_base64_encoded
   - SAML_PRIVATE_KEY=your_private_key_base64_encoded (if applicable)
   - SAML_IDENTIFIER_FORMAT=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
   - SAML_ACCEPTED_CLOCK_SKEW_MS=5000
   - SESSION_SECRET=SESSION_SECRET

3. Enable SAML authentication in Switcher Management by setting the environment variable SAML_ENABLE=true

* `service_provider` refers to Switcher API
* `web_app` refers to Switcher Management

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
Components are applications that will use Switcher API.<br>
Each component has its own access API key to interact with Switcher API.

- **Create a component** - Component: /component/create [POST]
- **Generating a new API Key** - Component: /component/generateApiKey [GET]

### Group
Groups are used to organize Switchers that share the same feature scope.

- **New Group** - GroupConfig: /groupconfig/create [POST]

### Switcher
Switchers are the entry point to control features in your application.<br>

- **New Switcher** - Config: /config/create [POST]

### Strategy
Customize the Switcher behavior by including strategy rules to your Switchers.

- **New Strategy** - ConfigStrategy: /configstrategy/create [POST]
