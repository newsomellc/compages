/**
 * A convenient Relationize control to resolve and make editable foreign key relationships.
 */
 'use strict';
module.exports = ForeignKey;

const pug = require('pug');

const Relation = require('./Relation');

function ForeignKey(params, socket)
{
	if (!(this instanceof ForeignKey))
		return new ForeignKey(params, socket);
	const self = this;

	if (self.multiple)
		throw Error(`Field ${self.id}: ForeignKey can't be "multiple". Use an M2M manager (may not exist yet).`);

	Relation.call(self, params, socket);

}

ForeignKey.prototype = Object.assign(Object.create(Relation.prototype),
{
	type       : 'ForeignKey',
	pk         : 'id',
	name_field : 'name', //The external foreign key's field name.
});