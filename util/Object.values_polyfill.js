/** 
 * A polyfill that adds the values function to the Object uh... superclass?
 * Because not all browsers have it apparently.
 *
 * Object.values just gets the values of an object, irrespective of the keys,
 * as an array.
 */
Object.values = function (o) 
{
	let arr = [];
	for (let k in o)
		if (o[k])
			arr.push(o[k]);
	return arr;
}