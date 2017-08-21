/**
 * field/Select - for rendering select input controls
 */
 'use strict';
module.exports = Select;

const Field = require('./Field');

function Select (params, socket)
{
	if (!(this instanceof Select))
		return new Select(params, socket);
	const self = this;

	Field.call(self, params, socket);

	if (!self.options)
		self.options = [];

	if (!(self.options instanceof Array))
		throw Error('options must be an array.')
		
	if (!self.options.reduce((carry, option) => !(option instanceof Array && option.length === 2 || typeof option === 'string') || carry, true))
		throw Error('All options must be strings, or arrays of length 2');
}

const CELL_RENDER_TPL = `
if (field.multiple && Array.isArray(value))
	=value.join(',')
else
	=field.optionName(value)
`;

const FORM_RENDER_TPL = `
select(id=field.id name=field.id+(field.multiple?'[]':'') class=field.getClasses() multiple=field.multiple placeholder='Select '+field.name+'...')
	if (field.nullable)
		option
	each option in field.getOptions(req, item, value)
		if (option instanceof Array)
			option(value=option[0] selected=field.isSelected(option[0], value))=option[1]
		else
			option(value=option selected=field.isSelected(option, value))=option

`;

Select.prototype = Object.assign(Object.create(Field.prototype),
{
	type     : 'Select',
	multiple : false,     //whether this is a multi-select.
	options  : undefined, //list of options for this class
	nullable : true,      //Whether to include a blank "null" option.

	/**
	 * Gets an option name from the value.
	 */
	optionName : function (val)
	{
		let opt = this.options.filter(o => o[0] === val)[0];
		if (opt instanceof Array)
			return opt[1];
		else
			return opt;
	},

	/**
	 * Used inside of the renderer to render whether a particular option should
	 * be selected during field rendering.
	 */
	isSelected : function (option, value)
	{
		if (!value)
			return false;

		if (this.multiple)
			if (!Array.isArray(value))
			{
				value = JSON.parse(value);
				if (!Array.isArray(value))
					throw Error(`Field ${this.id}: multi-select needs value to be array.`);
			}
			else
				return value.indexOf(option) > -1;
		else
			return value == option;
	},

	//columnRenderCb : () => {},
	cell_tpl : CELL_RENDER_TPL,
	form_tpl : FORM_RENDER_TPL,
	processPostData : function (post_data)
	{
		if (this.multiple)
			if (!post_data[this.id])
				return '[]';
			else
				return JSON.stringify(post_data[this.id]);
		return post_data[this.id];
	},

	/**
	 * A callback to set the available options based on the request and/or item.
	 * this is just a stub, so it just returns `options`.  It can be overridden 
	 * to filter the options before displaying them.
	 * req - included because you may want to set this up by user permissions etc
	 * item - included because you may want to set options by some metadata on the item
	 * value - included because it's possible there may be values that wouldn't normally be available except when "grandfathered" in by already being set on the item.
	 * It's also good to set this when your options are very volatile, and you need
	 * to keep them dynamically updated in some other class.
	 */
	getOptions : function (req, item, value)
	{
		return this.options;
	},

	getOrphans : function (req, item, value)
	{
		console.log(this.id, value);
		let v = item[this.id];
		if (this.multiple && !Array.isArray(v))
			return [];
		if (!this.multiple && v)
			if (this.options.filter(_v => v == _v[0]).length < -1)
				return [];
			else
				return [[v, 'unknown:' + v]];
		if (!v)
			return [];

		console.log(v.filter(_v => this.options.indexOf(_v) > -1).map(_v => [_v, 'unknown: ' + _v]));

		return v.filter(_v => this.options.indexOf(_v) > -1).map(_v => [_v, 'unknown: ' + _v]);
	},

	onAfterRender : function ()
	{
		$('#' + this.id).selectize();
	}

});
