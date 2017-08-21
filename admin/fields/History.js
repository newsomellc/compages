/**
 * field/Tags - allows the assignment of multiple tags to an item.
 */
 'use strict';
module.exports = History;

const Field = require('./Field');

function History (params)
{
	if (!(this instanceof History))
		return new History(params);
	const self = this;

	Field.call(self, params);
}

const FORM_RENDER_TPL = `div=value`;

History.prototype = Object.assign(Object.create(Field.prototype),
{
	type        : 'History',
	show_column : false,
	hideable    : false,
	form_tpl    : FORM_RENDER_TPL,
	virtual     : true,
});
