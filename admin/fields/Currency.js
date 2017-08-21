/**
 * field/Currency - 
 */
'use strict';
module.exports = Currency;

const pug = require('pug');

const Numeric = require('./Numeric');

function Currency(params)
{
	if (!(this instanceof Currency))
		return new Currency(params);
	const self = this;
	Numeric.call(self, params);
}

Currency.prototype = Object.assign(Object.create(Numeric.prototype),
{
	type         : 'Currency',
	currency     : 'USD',
	symbol       : '$',
	classes      : ['currency', 'form-control'],
	cellRenderCb : pug.compile(`input(name=field.id id=field.id type='text' class=field.getClasses() value=value)`),
	//columnRenderCb : () => {},
	//formRenderCb   : () => {}, 
});
