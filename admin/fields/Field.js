/**
 * A field is the same concept as a django widget-- except that it also handles the column display.  I can do more with less because I don't ALSO have to
 * support a "Form" class being used to generate forms anywhere else but in the admin area.
 *
 * Django, man, just let us have our HTML.  If we're smart enough to wade into a morass of overengineered
 * OO BS, we're smart enough to just write our own HTML.
 */
 'use strict';
module.exports = Field;

const pug = require('pug');
const debug = require('debug')('admin:field');

function Field (params, socket)
{
	if (!(this instanceof Field))
		return new Field(params, socket);
	const self = this;
	
	for (let k in params)
		self[k] = params[k];

	if (!self.id)
		throw Error('Params object must define an "id"');

	if (!self.name)
	{
		self.name = self.id.charAt(0).toUpperCase() + self.id.slice(1);
		self.name = self.name.replace('_', ' ');
	}

	if (socket)
		self.socket = socket;
}

const CELL_RENDER_TPL = `=value`;

const COL_RENDER_TPL = 
`
if (field.sortable)
	span.sortable(admin-order_by=field.id)=field.name
else
	=field.name
`;

const FORM_RENDER_TPL = `input(name=field.id class=field.getClasses() id=field.id type='text' value=value disabled=field.cbReadOnly(req) required=field.required)`;

const PROTOTYPE = 
{
	type        : 'Field',
	id          : null,      //The unique ID of this model as an identifier string.
	sortable    : true,      //Whether this column can be sorted by.
	name        : undefined, //A human readable name for this field.  aults to the capitalized ID.
	default_val : '',        //The default value for this item.  Null or zero.
	help_text   : undefined, //help text to be rendered beside this field in the form
	show_column : true,      //Whether to show this field as a list column
	hideable    : true,      //Whether this field is hideable in the list column
	required    : false,     //whether this field is required
	set         : 'default', //which field set this field is a part of
	read_only   : false,     //whether this field is read only
	classes     : ['form-control'], //css classes, as array
	virtual     : false,
	cell_tpl     : CELL_RENDER_TPL,
	col_tpl      : COL_RENDER_TPL,
	form_tpl     : FORM_RENDER_TPL,
	socket       : null, //sometimes, you just need a socket...

	//Whether we allow this to be edited.  Might be a callback to which the request gets passed.  Useful for evaluating permissions.
	cbReadOnly   : function (req) { return this.read_only; },

	/**
	 * A callback to get the displayed value of a field.  Useful for pre-processing
	 * data.  Can be overridden.
	 */
	cbGetValue   : function (item, req) { return item && item[this.id]; },

	__columnRenderCb : undefined,
	__cellRenderCb   : undefined,
	__formRenderCb   : undefined,

	//Renderer method, used from inside of pug
	render : function(mode, item, req)
	{
		if (!this.__columnRenderCb)
			this.__columnRenderCb = pug.compile(this.col_tpl);

		if (!this.__cellRenderCb)
			this.__cellRenderCb = pug.compile(this.cell_tpl);

		if (!this.__formRenderCb)
			this.__formRenderCb = pug.compile(this.form_tpl);

		debug(this.id);
		switch (mode)
		{
			case 'column' : return this.__columnRenderCb(this.getLocals(item, req));
			case 'cell'   : return this.__cellRenderCb(this.getLocals(item, req));
			case 'form'   : return this.__formRenderCb(this.getLocals(item, req));
		}
	},
	//Makes the 'locals' object for pug to use given an instance
	getLocals : function (item, req)
	{
		let locals =
		{
			item  : item,
			field : this,
			value : this.cbGetValue(item, req) || undefined,
			req   : req,
		};
		return locals;
	},

	getClasses : function ()
	{
		if (!this.classes)
			return '';
		else
			return this.classes.join(' ');
	},

	/** 
	 * Processes postdata after an update, converting it to the form the 
	 * database expects.
	 */
	processPostData : function (post_data)
	{
		return post_data[this.id];
	},

	/** 
	 * Gets the value of the field on the client side.
	 */
	val : function ()
	{
		return $('#' + this.id).val();
	},

	onAfterRender : function ()
	{
		console.log('after render');
		//do nothing.
	},
};


Field.prototype = PROTOTYPE;
Field.PROTOTYPE = PROTOTYPE;
