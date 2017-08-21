/**
 * field/BooleanField - A checkbox field..
 */
 'use strict';
module.exports = BooleanField;

const pug = require('pug');

const Field = require('./Field');

function BooleanField (params)
{
	if (!(this instanceof BooleanField))
		return new BooleanField(params);
	const self = this;
	Field.call(self, params);
}

const FORM_RENDER_TPL =`
span.checkbox
	input(type='checkbox' class=field.getClasses() value=this.value_checked id=field.id name=field.id checked=value)
	label(for=field.id) &nbsp
`;



BooleanField.prototype =  Object.assign(Object.create(Field.prototype), 
{
	type          : 'BooleanField',
	classes       : ['switch'],
	value_checked : 1, //the value the field takes if checked.
	form_tpl      : FORM_RENDER_TPL,
	val           : function ()
	{
		return $('#' + this.id).is(':checked') ? this.value_checked : false;
	},
});
