/**
 * field/Text is just a paper-thin wrapper around Field.  Fields are texty by 
 * default-- this is just here so we have something official.
 */
 'use strict';
module.exports = TextArea;

const pug = require('pug');

const Field = require('./Field');

function TextArea (params)
{
	if (!(this instanceof TextArea))
		return new TextArea(params);
	const self = this;
	Field.call(self, params);
}

const form_tpl = `
textarea(id=field.id name=field.id class=field.getClasses())
	=value
`;

TextArea.prototype = Object.assign(Object.create(Field.prototype), 
{
	type         : 'TextArea',
	show_column  : false,
	hideable     : false,
	formRenderCb : pug.compile(form_tpl),
});
