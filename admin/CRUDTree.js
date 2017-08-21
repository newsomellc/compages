'use strict';
module.exports = CRUDTree;

const CRUDTable       = require('./CRUDTable');
const define_property = require('../util/define_property');

/**
 * Sets up a tree data table in the admin.
 *
 * params: all params from CRUDTable plus:
 *     {parent_field} The id of the field that tells the tree what an item's path should be.
 *     {root_val}     The identifying value for the root item.  Must be valid for that field type.
 *     {moveCB}       The callback to invoke after moving.  Use this if you need to move files or something.  Otherwise it'll just assume.
 */
function CRUDTree (params, socket)
{
///class init
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const self      = Object.create(CRUDTable(params, socket));
	const type      = 'CRUDTree';

///properties
	const parent_field = params.parent_field;
	const root_val     = params.root_val;
	const moveCB       = params.moveCB;

///functions
	/**
	 * Move an item.
	 * item       : the item being moved.
	 * new_parent : the new parent of this item.
	 * next       : if async, invoked on complete.
	 */
	function move (item, new_parent_id, next)
	{
		if (moveCB)
			return moveCB(item, new_parent_id, next);
		
		item[parent_field] = new_parent_id;
		self.update(item, [parent_field], next);
	}

///publishing
	let dp = define_property.DefReadOnly(self);
	dp('parent_field', () => parent_field );
	dp('root_val',     () => root_val     );
	dp('moveCB',       () => moveCB       );

	return self;
}
