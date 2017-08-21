/**
 * field/ReadOnly is just a paper-thin wrapper around Field.  Fields are ReadOnlyy by 
 * default-- this is just here so we have something official.
 */
 'use strict';
module.exports = ReadOnly;

const Field = require('./Field');

function ReadOnly (params)
{
	if (!(this instanceof ReadOnly))
		return new ReadOnly(params);
	const self = this;

	Field.call(self, params);
}

ReadOnly.prototype = Object.assign(Object.create(Field.prototype),
{
	type : 'ReadOnly',
});
