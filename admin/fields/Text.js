/**
 * field/Text is just a paper-thin wrapper around Field.  Fields are texty by 
 * default-- this is just here so we have something official.
 */
 'use strict';
module.exports = Text;

const Field = require('./Field');

function Text (params)
{
	if (!(this instanceof Text))
		return new Text(params);
	const self = this;
	Field.call(self, params);
}

Text.prototype = Object.assign(Object.create(Field.prototype), 
{
	type : 'Text',
});
