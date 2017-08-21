'use strict';
module.exports = HTTPError;
function HTTPError (message, status)
{
	if (new.target) throw Error(this.constructor.name + ' called with `new` keyword.');
	let self = Error(message);
	self.status = status;
	return self;
}