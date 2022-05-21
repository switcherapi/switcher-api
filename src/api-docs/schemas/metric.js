import { StrategiesType } from '../../models/config-strategy';

const data = {
    type: 'object',
    properties: {
        config: {
            type: 'object',
            properties: {
                key: {
                    type: 'string'
                }
            }
        },
        component: {
            type: 'string'
        },
        entry: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string'
                    },
                    strategy: {
                        type: 'string',
                        enum: Object.values(StrategiesType)
                    },
                    input: {
                        type: 'string'
                    }
                }
            }
        },
        result: {
            type: 'boolean'
        },
        reason: {
            type: 'string'
        },
        group: {
            type: 'string'
        },
        environment: {
            type: 'string'
        },
        date: {
            type: 'string'
        }
    }
};

const dataStatistics = {
    type: 'object',
    properties: {
        date: {
            type: 'string'
        },
        negative: {
            type: 'number'
        },
        positive: {
            type: 'number'
        },
        total: {
            type: 'number'
        }
    }
};

export default {
    MetricsData: {
        type: 'object',
        properties: {
            page: {
                type: 'integer'
            },
            data: {
                type: 'array',
                items: data
            }
        }
    },
    MetricsStatisticsData: {
        type: 'object',
        properties: {
            switchers: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        switcher: {
                            type: 'string'
                        },
                        positive: dataStatistics.properties.positive,
                        negative: dataStatistics.properties.negative,
                        total: dataStatistics.properties.total,
                        dateTimeStatistics: {
                            type: 'array',
                            items: dataStatistics
                        }
                    }
                }
            },
            reasons: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        reason: {
                            type: 'string'
                        },
                        total: dataStatistics.properties.total
                    }
                }
            },
            components: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        component: {
                            type: 'string'
                        },
                        positive: dataStatistics.properties.positive,
                        negative: dataStatistics.properties.negative,
                        total: dataStatistics.properties.total,
                        dateTimeStatistics: {
                            type: 'array',
                            items: dataStatistics
                        }
                    }
                }
            }
        }
    }
};