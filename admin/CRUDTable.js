'use strict';
module.exports = CRUDTable;

const CRUDEntry       = require('./CRUDEntry');
const define_property = require('../util/define_property');
const _fields         = require('./fields');
/**
 * Sets up REST endpoints to get information about a data table.
 *
 * params: all params from CRUDEntry plus:
 *     {pkfield}         The primary key, or unique value used to identify instances with the model object.
 *     {model}           An Objection.js-style model that can get instances and lists of this item.
 *     {fields}          A list of fields, or params thereof, to display for this item. 
 *     {filters}(o)      A list of filter objects.
 *     {joins}(o)        A list of join expressions to use with this item.
 *     {historyCB}(o)    A callback that saves history information.  Defaults to something that writes to the a field on the item (if it exists).
 */
function CRUDTable (params, socket)
{
///class init
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const self    = Object.create(CRUDEntry(params, socket));
	const type    = 'CRUDTable';
	const fields  = Object.create(null);
	const filters = Object.create(null);

	const pkfield         = params.pkfield || 'id'; //id as the pkfield is a pretty safe bet.
	const model           = params.model;
	const joins           = params.joins || [];
	const historyCB       = params.historyCB;
	const media_crud      = params.media_crud;
	const default_columns = params.default_columns;

///functions
	function addField(f)
	{
		if (!_fields.Field.PROTOTYPE.isPrototypeOf(f))
		{
			if (!f.type)
				throw Error('If not passing an instantiated `admin/Field` object, `type` param is required.');
			f = _fields[f.type](f, self.socket);
		}

		fields[f.id] = f;
	}

	function addFilter(f)
	{
		
	}

	function getHideableColumns ()
	{
		return Object.values(fields).filter(field => field.hideable);
	}

	/** 
	 * Gets a list of column IDs.
	 * 
	 * {array<string>} array of column IDs the user prefers to see, and in what order.
	 */
	function getColumns(preferred_cols=[])
	{
		let cols = Object.values(fields).filter(field =>
		{
			if (!field.show_column)
				return false;
			if (!field.hideable)
				return true;
			//if (preferred_cols.length && preferred_cols.indexOf(field.id) < 0)
			//	return false;
			return true;
		});
		//TODO add column reorder logic here.
		return cols;
	}

	function getPK(item)
	{
		return item[pkfield];
	}

/// logic
	if (params.fields)
		Object.values(params.fields).forEach(addField);
	if (params.filters)
		Object.values(params.fields).forEach(addFilter);


///publishing
	let dp  = define_property.DefReadOnly(self);

	dp('type',               () => type);
	dp('fields',             () => fields);
	dp('filters',            () => filters);
	dp('pkfield',            () => pkfield);
	dp('joins',              () => joins);
	dp('media_crud',         () => media_crud);
	dp('model',              () => model);
	dp('addField',           () => addField);
	dp('addFilter',          () => addFilter);
	dp('getColumns',         () => getColumns);
	dp('getHideableColumns', () => getHideableColumns);

	return self;
}

