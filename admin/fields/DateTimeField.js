/**
 * field/DateTimeField Displays a Date/Time.
 */
 'use strict';
module.exports = DateTimeField;

const pug        = require('pug');
const dateformat = require('dateformat');

const Field = require('./Field');

function DateTimeField (params)
{
	if (!(this instanceof DateTimeField))
		return new DateTimeField(params);
	const self = this;

	Field.call(self, params);
}

const form_tpl =`
input(name=field.id class=field.getClasses() id=field.id type='text' class='date' value=value disabled=field.read_only)
`;
const cell_tpl = `
=value
`;

const cell_tpl_compiled = pug.compile(cell_tpl);

DateTimeField.prototype = Object.assign(Object.create(Field.prototype),
{
	type         : 'DateTimeField',
	show_time    : false, //whether to also show the time
	formRenderCb : pug.compile(form_tpl),
	__cellRenderCb : function(locals)
	{
		locals.value = dateformat(locals.value, 'mmm d, yyyy');
		return cell_tpl_compiled(locals);
	},
});
