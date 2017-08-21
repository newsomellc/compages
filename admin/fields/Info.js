/**
 * field/Info - just displays some data, without updating it.
 */
 'use strict';
module.exports = Info;

const Field = require('./Field');

function Info (params)
{
	if (!(this instanceof Info))
		return new Info(params);
	const self = this;
	Field.call(self, params);

	if (!self.virtual)
		throw Error('Info must be virtual-- otherwise you will end up blanking out fields during submit.');
}

const FORM_RENDER_TPL = `
.col-12=value
`;

Info.prototype = Object.assign(Object.create(Field.prototype), 
{
	type         : 'Info',
	virtual      : true,
	form_tpl     : FORM_RENDER_TPL,
	read_only    : true,
});
