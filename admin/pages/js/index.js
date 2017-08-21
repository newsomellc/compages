'use strict';
/**
 * Client-side script for other pages.
 */
global.jQuery    = require('jquery');
global.Tether    = require('tether');
require('bootstrap');
const selectize = require('selectize');
global.ace = require('brace');
require('brace/mode/javascript');
require('brace/mode/jade');
require('brace/snippets/jade');
require('brace/theme/monokai');

require('../../../util/Object.values_polyfill');

global.$ = jQuery;

const Presence = require('./Presence');


Presence();
