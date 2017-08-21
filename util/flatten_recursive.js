'use strict';
module.exports = flatten_recursive;
/** 
 * Flattens an object to make it able to be sent through the websocket or encoded as JSON.
 */
function flatten_recursive(obj)
{
	if (typeof obj === 'function')
		return undefined;

	if (typeof obj !== 'object')
		return obj;
	
	if (Array.isArray(obj))
		return obj.map(flatten_recursive);
	
	let result = Object.create(null);

	for(var key in obj)
		result[key] = flatten_recursive(obj[key]);

	return result;
}
