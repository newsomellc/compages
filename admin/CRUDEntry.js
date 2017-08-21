'use strict';
module.exports = CRUDEntry;

const CRUDTable       = require('./CRUDTable');
const CRUDTree        = require('./CRUDTree');
const define_property = require('../util/define_property');
const ENUMS           = require('./ENUMS');

/**
 * Sets up a heading in the admin.  A heading can contain CRUDs.  This isn't REALLY a crud,
 * but it's used in almost every context a CRUD is on the front end, so I treat it as one.
 *
 * params
 *     {id}              A unique text ID for this heading. This is used for the URL slug.
 *     {name}(o)         A name to display in menus etc...  Defaults to the ID with the first letter capitalized.
 *     {children}(o)     A list of data sources to use as a descendant of this.
 *     {page}            A template or something else to display when this item is clicked in the menu.  Defaults to nothing.
 *     {permissions}(o)  An object with string properties 'view', 'change', 'add', 'delete' etc.  Adds them to the user settings menu too if they aren't already.
 *     {permissionCB)(o) A function that will determine if a user can access this datasource.  Allows advanced permissions.
 *     {path}(o)       A reference to the path object of this data source.
 */
function CRUDEntry (params, socket)
{
///class init
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');

	const self     = Object.create(PROTOTYPE);
	const type     = 'CRUDEntry';
	const children = Object.create(null);
	const actions  = Object.create(null);

///properties
	const id             = params.id;
	const name           = params.name || id[0].toUpperCase() + id.slice(1);
	const name_plural    = params.name_plural || name+'s';
	const permissions    = params.permissions || ENUMS.DEFAULT_PERMISSIONS
		.reduce((ag, th) => { ag[th] = self.id + '-' + th; return ag;}, Object.create(null));
	const permissionCB   = params.permissionCB;
	
	let   path           = [params.id]; //Always assume you're root when first created.

///functions
	/**
	 * Add a CRUD inside of this.
	 */
	function add (c)
	{
		if (!c.type)
			throw Error('If not passing an instantiated `CRUDSource` object, `type` param is required.');

		if (!PROTOTYPE.isPrototypeOf(c))
			switch (c.type)
			{
				case 'CRUDEntry':
					c = CRUDEntry(c, socket);
					break;
				case 'CRUDTable':
					c = CRUDTable(c, socket);
					break;
				case 'CRUDTree':
					c = CRUDTree(c, socket);
					break;
				default:
					throw Error('Unknown type: ' + c.type);
			}
		c.path = [...path, c.id];
		children[c.id] = c;
		return c;
	}

	if (!typeof params.id === 'string')
		throw Error('Expected param `id` to be a string, got: ' + typeof params.children);

///publishing
	let dp  = define_property.DefReadOnly(self);
	let dpw = define_property.DefGetSet(self);
	dp('id',          () => id);
	dp('type',        () => type);
	dp('name',        () => name);
	dp('name_plural', () => name_plural);
	dp('add',         () => add);
	dp('children',    () => children);
	dp('actions',     () => actions);
	dp('socket',      () => socket);
	dpw('path',       () => path, p => path=p);

///logic
	if (params.children)
		Object.values(params.children).forEach(add);
	//else
		//throw Error('Expected param `children` to be an array, got: ' + typeof params.children);

	return self;
}

///constants
/** 
 * Lets us do things like obj.isPrototypeOf().
 */
const PROTOTYPE = Object.create(CRUDEntry);
