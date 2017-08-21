/**
 * field/Password - For Passwords.
 */
 'use strict';
module.exports = Password;

const Field = require('./Field');

function Password (params)
{
	if (!(this instanceof Password))
		return new Password(params);
	const self = this;

	Field.call(self, params);
}
//TODO: I should probably cause a crash if this gets a value (i.e. leaks a pass_hash) on rendering.
Password.prototype = Object.assign(Object.create(Field.prototype),
{
	type     : 'Password',
	cell_tpl : '|********',
	form_tpl : `input(name=field.id id=field.id class=field.getClasses() type='text' value='********' required=field.required)`,
});
