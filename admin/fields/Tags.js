/**
 * field/Tags - allows the assignment of multiple tags to an item.
 */
 'use strict';
module.exports = Tags;

const Select = require('./Select');

function Tags (params)
{
	if (!(this instanceof Tags))
		return new Tags(params);
	const self = this;

	Select.call(self, params);
}

const CELL_RENDER_TPL = `=value&&Array.isArray(value)?value.join(', '):''`;
const FORM_RENDER_TPL = `
select.tags-field(id=field.id name=field.id+'[]' multiple=field.multiple class=field.getClasses())
	if (value)
		if (Array.isArray(value))
			each tag in value
				option(name=tag selected='1')=tag
		else if(typeof value === 'string')
			each tag in JSON.parse(value)
				option(name=tag selected='1')=tag
`;

Tags.prototype = Object.assign(Object.create(Select.prototype),
{
	type     : 'Tags',
	multiple : true,
	cell_tpl : CELL_RENDER_TPL,
	form_tpl : FORM_RENDER_TPL,
	onAfterRender : function ()
	{
		$('#' + this.id).selectize(
		{
			create           : true,
			//plugins          : ['remove-button'],
			allowEnptyOption : true,
		});
	},
	val : function ()
	{
		return JSON.stringify(Select.prototype.val.call(this));
	}
});
