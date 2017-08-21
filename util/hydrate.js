/**
 * Hydrates an object based column names, on the separator **YOU** choose!
 * Hydration, as far as I know, means taking an object and making it nest properly.
 * o {object} the object to hydrate.
 * s {string} the separator to use 
 */
module.exports = function hydrate(objects, s='_')
{
	/* First make the key_map */
	function map_out(current, keys, map_seg)
	{
		keys
		.forEach(key =>
		{
			let spl = key.split(s);

			let subkey = spl[0];
			if (spl.length === 1)
				map_seg[subkey] = [...current, subkey].join(s);
			else
			if (spl.length > 1 && !map_seg.hasOwnProperty(spl[0]))
			{
				let new_current = [...current, subkey];
				let new_keys    = keys
					.filter(key => key.indexOf(subkey)===0)
					.map(key => key.replace(subkey+s,''));
				map_seg[subkey] = map_out(new_current, new_keys, {});
			}
		});
		return map_seg;
	}
	let key_map = map_out([], Object.keys(objects[0]), {});
	
	/* Goes through an object, assigning as it goes. */
	function traverse (no, oo) 
	{
		no = Object.assign({}, no);
		Object.keys(no).forEach(k =>
		{
			if (typeof no[k] !== 'string')
				return no[k] = traverse(no[k], oo);
			else
				return no[k] = oo[no[k]];
		});
		return no;
	}
	let ret = objects.map(o => traverse(key_map, o));
	return ret;
}