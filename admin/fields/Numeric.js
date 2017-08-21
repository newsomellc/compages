/**
 * field/Numeric - Works exactly the same as a text field, but validates that the input is a Numeric.
 * Table cells are aligned to the right.
 */
 'use strict';
module.exports = Numeric;

const Field = require('./Field');

function Numeric (params)
{
	if (!(this instanceof Numeric))
		return new Numeric(params);
	const self = this;
	Field.call(self, params);
}

Numeric.prototype =  Object.assign(Object.create(Field.prototype), 
{
	type       : 'Numeric',
	places     : 0,
	max_length : 5,
});
