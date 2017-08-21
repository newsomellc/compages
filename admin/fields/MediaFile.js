/**
 * fields/MediaFile - A Select control whose values are populated from the 
 * possible values from another DB table.
 * 
 * May not refer to another model, but to a specific "MediaFile table".
 * 
 * Use ForeignKey field to refer to actual Foreign keys.
 */
 'use strict';
module.exports = MediaFile;

const pug = require('pug');

const Select = require('./Select');

function MediaFile(params)
{
	if (!(this instanceof MediaFile))
		return new MediaFile(params);
	const self = this;

	//if (params.options)
	//	throw Error(`Field ${self.id}: "options" param not valid on MediaFile field-- pass a model to populate the options.`);
	//since this is async, these fields need to be set before we call Select constructor.
	//The select constructor builds out the options.  TODO: rethink this.  Add method to set options rather than forcing it to happen in constructor?

	['name_field', 'nameCb', 'name', 'joins', 'order_by'].forEach(f => 
	{
		if(params.hasOwnProperty(f))
			self[f] = params[f];
	});

	/*let qs = self.model.query()
		.select();

	this.joins.forEach(join => qs.joinMediaFile(join).eager(join));
	this.order_by.forEach(ob => qs.orderByRaw(ob));

	qs
		.then(q =>
		{
			params.options = q.map(r => self.nameCb(r));
		});*/
	Select.call(self, params);

}

const COL_TPL = `=value`;

const FORM_TPL = `
select(id=field.id name=field.id+(field.multiple?'[]':'') class=field.getClasses() multiple=field.multiple placeholder='Select '+field.name+'...')
	if (!field.multiple)
		option(selected=true)=value
	else if (Array.isArray(value))
		each md5 in value
			option(selected=true)=md5
`;

const SELECTIZE_ITEM_TPL = 
`
if (urls)
	.selectize_floater(style='display:inline-block;')
		img(src=urls.variants.icon srcset=urls.variants.icon_set)
		div=file.file_name
else
	span=md5
`;

const render_selectize_item = pug.compile(SELECTIZE_ITEM_TPL);

MediaFile.prototype = Object.assign(Object.create(Select.prototype),
{
	type        : 'MediaFile',
	pk          : 'md5',
	name_field  : 'media_path',
	col_tpl     : COL_TPL,
	form_tpl    : FORM_TPL,
	needs_media : true,
	onAfterRender : function (e)
	{
		let items = e.media;
		$('#' + this.id).selectize(
		{
			options    : items,
			items      : Array.isArray(this.val()) ? this.val() : [this.val()],
			valueField : 'md5',
			searchField: ['media_path'],
			render     :
			{
				item   : (d,e) => 
				{
					return render_selectize_item(d);
				},
				option : (d,e) => 
				{
					return render_selectize_item(d);
				},
			},	
		});
	},
});
