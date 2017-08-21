/**
 * field/Notes - Displays notes from a JSON field.
 */
 'use strict';
module.exports = Notes;

const ReadOnly = require('./ReadOnly');

function Notes (params)
{
	if (!(this instanceof Notes))
		return new Notes(params);
	const self = this;

	ReadOnly.call(self, params);
}

const CELL_RENDER_TPL = '';
const FORM_RENDER_TPL = `div=value`;//for now.

Notes.prototype = Object.assign(Object.create(ReadOnly.prototype), 
{
	type        : 'Notes',
	show_column : false,
	form_tpl    : FORM_RENDER_TPL,
	cell_tpl    : CELL_RENDER_TPL,
	virtual     : true,
});
