/**
 * Scores a password by strength, returning hints to how to make it fit
 * if it currently doesn't.
 * returns : a structure with bit array for complexity flags, and an overall score.
 */
'use strict';

module.exports = (password) => 
{
	let scoreboard = 
	{
		length1 : password.length >= 8,
		length2 : password.length >= 12,
		length3 : password.length >= 16,
		length4 : password.length >= 20,
		length5 : password.length >= 24,
		lower   : password.match(/[a-z]/) !== null,
		caps    : password.match(/[A-Z]/) !== null,
		number  : password.match(/[0-9]/) !== null,
		special : password.match(/[\n	!@#$%^&*()<>?:"{}\[\]\\;',./`~_+\-=]/) !== null,
		unicode : password.match(/[^A-Za-z0-9 \n 	!@#$%^&*()<>?:"{}\[\]\\;',./`~_+\-=]/) !== null,
		space   : password.indexOf(' ') > -1,

	};
	let ret = 
	{
		score      : Object.keys(scoreboard).reduce((accum, k) => accum += scoreboard[k], 0),
		scoreboard : scoreboard,
	};
	return ret;
};

module.exports.recommendations = scoreboard =>
{
	let rec = {};
	for (let k in Object.keys(messages))
		if (!scoreboard[k])
			if (k.substr(0, -1) === length)
				rec['length'] = messages[k];
			else
				rec[k] = messages[k];
	return rec;
};

let messages = 
{
	length1 : 'Password is way too short.',
	length2 : 'Try using a longer password.',
	length3 : 'Password length is OK, but more won\'t hurt.',
	length4 : 'Password length is OK, but more won\'t hurt.',
	length5 : 'Password length is OK, but more won\'t hurt.',
	lower   : 'Try adding a lowercase letter.',
	caps    : 'Try adding a capital letter.',
	number  : 'Try adding a number.',
	special : 'Try adding a special character or punctuation.',
	unicode : 'Unicode characters are allowed.',
	space   : 'Spaces are allowed.',
};