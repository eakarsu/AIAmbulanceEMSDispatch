'use strict';

const pool = require('../db').pool;
const auth = require('../middleware/auth');
const config = require('../config/dispatchWorkflow');

module.exports = require('./governedWorkflow')({ db: pool, auth, config });
