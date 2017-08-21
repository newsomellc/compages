'use strict';



/** 
 * This class-ish is responsible for data.  It can let an object subscribe to any data that comes through, or allow them to request certain data,
 * which can be delivered via subscription, or promise.
 * 
 * it is an event dispatcher.  Use 'on' to subscribe, 'off' to unsub.
 */


function Majordomo(socket, crud_root)
{
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const self = {};
	const subs = {};

	function onReceiveData(crud_path, id)
	{

	}

	function sendQuery(crud_path, id, fields)
	{

	}

	
}
