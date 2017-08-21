/**
 * fields/Relation - A Select control whose values are populated from the 
 * possible values from another DB table.
 * 
 * May not refer to another model, but to a specific "relation table".
 * 
 * Use ForeignKey field to refer to actual Foreign keys.
 */
 'use strict';
module.exports = Relation;

const pug = require('pug');

const Select = require('./Select');

function Relation(params, socket)
{
	if (!(this instanceof Relation))
		return new Relation(params, socket);
	const self = this;

	if (!params.crud_id)
		throw Error('"crud_id" field is required on relation fields.');
	else
		self.crud_id = params.crud_id;

	//if (params.options)
	//	throw Error(`Field ${self.id}: "options" param not valid on relation field-- pass a model to populate the options.`);
	//since this is async, these fields need to be set before we call Select constructor.
	//The select constructor builds out the options.  TODO: rethink this.  Add method to set options rather than forcing it to happen in constructor?

	['name_field', 'nameCb', 'name', 'joins', 'order_by'].forEach(f => 
	{
		if(params.hasOwnProperty(f))
			self[f] = params[f];
	});

	/*let qs = self.model.query()
		.select();

	this.joins.forEach(join => qs.joinRelation(join).eager(join));
	this.order_by.forEach(ob => qs.orderByRaw(ob));

	qs
		.then(q =>
		{
			params.options = q.map(r => self.nameCb(r));
		});*/
	
	if (socket)
	{
		socket.on('fkresolve-'+self.crud_id, (items) =>
		{
			console.log('got resolve', items);
			self.options = items.map(r => self.nameCb(r));
		});
		socket.emit('fkresolve', self.crud_id, self.joins);
	}
	Select.call(self, params, socket);

}

Relation.prototype = Object.assign(Object.create(Select.prototype),
{
	type       : 'Relation',
	pk         : 'name',    //The external foreign key's id.
	name_field : undefined, //The external foreign key's field name.
	joins      : '',        //To determine the field's name, we have to resolve joins.
	order_by   : [],        //Things to order this by.

	/**
	 * A callback that determines the name of your options.
	 */
	nameCb : function (ent)
	{
		let s;
		if (!this.name_field)
			s = ent.toString();
		else
			s = ent[this.name_field || this.pk];
		return [ent[this.pk], s];
	},
});
