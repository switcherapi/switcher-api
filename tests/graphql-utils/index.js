const createInput = input => {
    if (typeof input[1] === 'boolean' || typeof input[1] === 'number') {
        return `${input[0]}: ${input[1]}`;
    }

    return `${input[0]}: "${input[1]}"`;
};

const isActivated = (element) => element ? 'true' : 'false';

export const configurationQuery = (
    where, domain = true, group = true, config = true, strategy = true, env = false) => {
    const query = `${where.map(createInput)}`;
    return { 
        query: `
            {
                configuration(${query}) {
                    ${domain ? 'domain { name description activated statusByEnv { env value } }' : ''}
                    ${group ? 'group { name description activated statusByEnv { env value } }' : ''}
                    ${config ? 'config { key description activated statusByEnv { env value } }' : ''}
                    ${strategy ? 'strategies { strategy activated operation values statusByEnv { env value } }' : ''}
                    ${env ? 'environments' : ''}
                }
            }  
    `};
};

export const domainQuery = (where, group, config, strategy) => { 
    const query = `${where.map(createInput)}`;
    const elementQuery = (element) => 
        element != undefined ? `(activated: ${isActivated(element)})` : '';

    return { 
        query: `
            {
                domain(${query}) { 
                    name version description activated statusByEnv { env value }
                    group${elementQuery(group)} { 
                        name description activated statusByEnv { env value }
                        config${elementQuery(config)} { 
                            key description activated statusByEnv { env value }
                            strategies${elementQuery(strategy)} { 
                                strategy activated operation values statusByEnv { env value }
                            }
                            components
                        }
                    }
                }
            }
    `};
};

export const permissionsQuery = (domainId, parentId, actions, router, environment) => {
    return { 
        query: `
            {
                permission(
                    domain: "${domainId}",
                    parent: "${parentId}",
                    actions: [${actions}],
                    router: "${router}",
                    environment: "${environment}"
                ) {
                    id,
                    name,
                    permissions { 
                        action 
                        result 
                    }
                }
            }  
    `};
};

export const expected100 = `
    {
        "data": {
            "configuration": {
                "domain": {
                    "name":"Domain",
                    "description":
                    "Test Domain",
                    "activated":true
                }, "group": [{
                    "name":"Group Test",
                    "description":"Test Group",
                    "activated":true
                }], "config":[{
                    "key":"TEST_CONFIG_KEY",
                    "description":"Test config 1",
                    "activated":true
                }, {
                    "key":"TEST_CONFIG_KEY_PRD_QA",
                    "description":"Test config 2 - Off in PRD and ON in QA",
                    "activated":false
                }], "strategies": null
            }
        }
    }`;

export const expected101 = `
    {
        "data": {
            "configuration": {
                "domain": {
                    "name":"Domain",
                    "description":
                    "Test Domain",
                    "activated":true
                },"group": [{
                    "name":"Group Test",
                    "description":"Test Group",
                    "activated":true
                }],"config": [{
                    "key":"TEST_CONFIG_KEY",
                    "description":"Test config 1",
                    "activated":true
                }],"strategies": [{
                    "strategy":"VALUE_VALIDATION",
                    "activated":true,
                    "operation":"EXIST",
                    "values":["USER_1","USER_2","USER_3"]
                }, {
                    "strategy":"NETWORK_VALIDATION",
                    "activated":true,
                    "operation":"EXIST",
                    "values":["10.0.0.0/24"]
                }, {
                    "strategy":"TIME_VALIDATION",
                    "activated":false,
                    "operation":"BETWEEN",
                    "values":["13:00","14:00"]
                }, {
                    "strategy":"DATE_VALIDATION",
                    "activated":false,
                    "operation":"GREATER",
                    "values":["2019-12-01T13:00"]
                }
            ]
        }
    }
}`;

export const expected102 = `
{
    "data":{
        "domain": {
            "name":"Domain",
            "description":"Test Domain",
            "activated":true,
            "group":[{
                "name":"Group Test",
                "description":"Test Group",
                "activated":true,
                "config":[{
                    "key":"TEST_CONFIG_KEY",
                    "description":"Test config 1",
                    "activated":true,
                    "strategies":[{
                        "strategy":"VALUE_VALIDATION",
                        "activated":true,
                        "operation":"EXIST",
                        "values":[
                            "USER_1",
                            "USER_2",
                            "USER_3"
                        ]
                    }, {
                        "strategy":"NETWORK_VALIDATION",
                        "activated":true,
                        "operation":"EXIST",
                        "values":[
                            "10.0.0.0/24"
                        ]
                    }]
                }]
            }]
        }
    }
}`;

export const expected103 = `
{
    "data": {
    "domain": {
        "name":"Domain",
        "description":"Test Domain",
        "activated":true,
        "group":[
            {
            "name":"Group Test",
            "description":"Test Group",
            "activated":true,
            "config":[{
                "key":"TEST_CONFIG_KEY",
                "description":"Test config 1",
                "activated":true,
                "strategies":[{
                    "strategy":"TIME_VALIDATION",
                    "activated":false,
                    "operation":"BETWEEN",
                    "values":[
                        "13:00",
                        "14:00"
                    ]} , {
                    "strategy":"DATE_VALIDATION",
                    "activated":false,
                    "operation":"GREATER",
                    "values":[
                        "2019-12-01T13:00"
                    ]}
                ]}
            ]}
        ]}
    }
}`;

export const expected104 = `
{
    "data":
    {
        "domain":
            {
                "name":"Domain",
                "description":"Test Domain",
                "activated":true,
                "group":[]
            }
    }
}`;

export const expected105 = (key) => `
{
    "data":{
        "domain": {
            "name":"Domain",
            "description":"Test Domain",
            "activated":true,
            "group":[{
                "name":"Group Test",
                "description":"Test Group",
                "activated":true,
                "config":[{
                    "key":"${key}",
                    "description":"Test config 2 - Off in PRD and ON in QA",
                    "activated":false,
                    "strategies":[]}
                ]
            }]
        }
    }
}`;

export const expected106 = `
    {"data":
    {"domain":{
        "name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}],
        "group":[{"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","statusByEnv":[{"env":"default","value":true}],
            "strategies":[
                {"strategy":"VALUE_VALIDATION","statusByEnv":[{"env":"default","value":true}],"operation":"EXIST","values":["USER_1","USER_2","USER_3"]},
                {"strategy":"NETWORK_VALIDATION","statusByEnv":[{"env":"default","value":true}],"operation":"EXIST","values":["10.0.0.0/24"]},
                {"strategy":"TIME_VALIDATION","statusByEnv":[{"env":"default","value":false}],"operation":"BETWEEN","values":["13:00","14:00"]},
                {"strategy":"DATE_VALIDATION","statusByEnv":[{"env":"default","value":false}],"operation":"GREATER","values":["2019-12-01T13:00"]}]},
            {"key":"TEST_CONFIG_KEY_PRD_QA","description":"Test config 2 - Off in PRD and ON in QA","statusByEnv":[{"env":"default","value":false},{"env":"QA","value":true}],
            "strategies":[]}]}]}}}`;

export const expected107 = `
    {"data":
    {"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}],
    "group":[
        {"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","statusByEnv":[{"env":"default","value":true}],"strategies":null},
            {"key":"TEST_CONFIG_KEY_PRD_QA","description":"Test config 2 - Off in PRD and ON in QA","statusByEnv":[{"env":"default","value":false},{"env":"QA","value":true}],"strategies":null}]}]}}}
    `;

export const expected1071 = `
    {"data":
    {"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}],
    "group":[
        {"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}],
        "config":[
            {"key":"TEST_CONFIG_KEY_PRD_QA","description":"Test config 2 - Off in PRD and ON in QA","statusByEnv":[{"env":"default","value":false},{"env":"QA","value":true}],"strategies":null}]}]}}}
    `;

export const expected1072 = `
    {"data":
    {"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}],
    "group":[
        {"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}]}
    ]}}}
    `;

export const expected1073 = `
    {"data":
    {"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}]}}}
    `;


export const expected108 = `
    {"data":
    {"configuration":
    {"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}]},
    "group":[
        {"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}]}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","statusByEnv":[{"env":"default","value":true}]}],
                "strategies":[
                    {"strategy":"VALUE_VALIDATION","operation":"EXIST","values":["USER_1","USER_2","USER_3"],"statusByEnv":[{"env":"default","value":true}]},
                    {"strategy":"NETWORK_VALIDATION","operation":"EXIST","values":["10.0.0.0/24"],"statusByEnv":[{"env":"default","value":true}]},
                    {"strategy":"TIME_VALIDATION","operation":"BETWEEN","values":["13:00","14:00"],"statusByEnv":[{"env":"default","value":false}]},
                    {"strategy":"DATE_VALIDATION","operation":"GREATER","values":["2019-12-01T13:00"],"statusByEnv":[{"env":"default","value":false}]}]}}}`;

export const expected109 = `
    {"data":
    {"configuration":{"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}]},
    "group":[
        {"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}]}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","statusByEnv":[{"env":"default","value":true}]}
        ],
        "strategies":null}}}`;

export const expected110 = `
    {"data":
    {"configuration":{"domain":{"name":"Domain","description":"Test Domain","activated":true,"statusByEnv":[{"env":"default","value":true}]},
    "group":[
        {"name":"Group Test","description":"Test Group","activated":true,"statusByEnv":[{"env":"default","value":true}]}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","activated":true,"statusByEnv":[{"env":"default","value":true}]},
            {"key":"TEST_CONFIG_KEY_PRD_QA","description":"Test config 2 - Off in PRD and ON in QA","activated":false,"statusByEnv":[{"env":"default","value":false},{"env":"QA","value":true}]}
        ],
        "strategies":null}}}`;

export const expected111 = `
    {"data":{"configuration":{"environments":["default","QA"]}}}`;

export const expected112 = `
    {"data":{"configuration":{"domain":{"name":"Domain","description":"Test Domain","activated":true,"statusByEnv":[{"env":"default","value":true}]},
    "group":null,"config":null,"strategies":null}}}`;