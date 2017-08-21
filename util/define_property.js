/**
 * Gives you shortcuts for when you need to massively define a bunch of properties
 * on an object.
 * 
 */

module.exports = 
{
	DefGetSet : o => (name, get, set) =>
	{
		Object.defineProperty(o, name, { enumerable : true, get : get, set : set, });
	},
	DefReadOnly : o => (name, get, set) =>
	{
		Object.defineProperty(o, name, { enumerable : true, get : get, });
	},
	DefReadOnlyNoEnum : o => (name, get, set) =>
	{
		Object.defineProperty(o, name, { enumerable : false, get : get, });
	},
	SafeInherit : (to, fro) => function (name)
	{
		Object.defineProperty(to, name, { get : (...args) => fro[name](...args) });
	},
};
