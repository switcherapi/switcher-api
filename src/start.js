require('@babel/register') ({
    presets: ['@babel/preset-env']
});
require('babel-polyfill');

// Import the rest of our application.
module.exports = require('./index.js');