/**
 * A User database model.
 */
'use strict';
const assert  = require('assert');
const express = require('express');
const Model   = require('objection').Model;
const bcrypt  = require('bcryptjs');

const f = require('./fields');

const PASSWORD_MIN_SCORE = 5;

class User extends Model 
{
	constructor(params) 
	{
		super();
		const self = this;

		if (params)
			for (let k in params)
				if (k === 'password')
				{
					let p = params[k];
					let s = bcrypt.genSaltSync(10);
					self.pass_hash = bcrypt.hashSync(p, s);
				}
				else
					self[k] = params[k];

		/**
		 * Changes the user's password, validating against any requested rules
		 */
		self.changePassword = (password) =>
		{
			//TODO: validation here.  Langth, complexity score counter--  I will dispense with specific rules.
			//Instead, all passwords must meet a minimum complexity rating.
			return User.hashPassword(password)
				.then(hash =>
				{
					self.pass_hash = hash;
					return User.query().update(self);
				});
		};

		/**
		 * Validates the user password.  THIS RETURNS A PROMISE!  Must chain
		 * from this function with .then(callback)
		 */
		self.validatePassword = (password) => 
		{
			return bcrypt.compare(password, self.pass_hash);
		};
		self.perms = (perms) =>
		{
			if (perms instanceof array)
				return ! perms.reduce((carry, perm) => self.permissions.indexOf(perm) > 0 || carry);
			else 
				return self.permissions.indexOf(perm) > 0;
		};

		self.toString = () => `${self.first_name} ${self.last_name}`;

		self.can = (datasource, permission) =>
		{
			if (self.superuser)
				return true;
			return self.perms[datasource.slug][permission];
		};
	}
}

User.prototype.ratePassword = require('./rate_password');

User.tableName = 'User';
User.idColumn  = 'id';


/**
 * Password generation function, takes the plaintext password, and 
 * spits out a string with the bcrypt'd password + 10 byte salt.
 * This thing returns a promise, so chain onto it with .then(callback)
 */
User.hashPassword = (password, callback) =>
{
	return bcrypt.genSalt(10)
		.then(salt => bcrypt.hash(password, salt));

}
/**
 * Generates a random password.
 */
User.randomPassword = () =>
{
	let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()~';
	let newp  = '';
	while (newp.length < 8)
		newp += chars[Math.round(Math.random() * chars.length)];

}

/**
 * Passport.js compatible callback, handles local authorization for users.
 */
User.localAuth = (login, pass, next) =>
{
	User
		.query()
		.where('user_name', '=', login)
		.orWhere('email', '=', login)
		.first()
		.then(user =>
		{
			if (!user)
				return next(Error('user not found in db:' + login), false);
			
			if (!user.pass_hash)
			{
				//Just set a random password if none has been set yet...  (May do this automatically on creation too.)
				user.changePassword(User.randomPassword());
				debug('Invalid DB password automatically changed to: ' + newp);
				return next(Error('Invalid password automatically changed.'), 'CHANGEPW');
			}
			return user.validatePassword(pass).then(success =>
			{
				if (success)
					return next(null, user);
				else
					return next(Error('Incorrect password.'), false);
			});
		})
		.catch(err => 
		{
			debug(err);
			next(Error('login failed'), false);
		});
};

let action_change_password = 
{
	id       : 'reset_password',
	name     : 'Reset Password',
	classes  : ['btn btn-secondary'],
	location : 'form',
	enableCb : (req, item, after) =>
	{
		return req.user.can('edit', User) && item.id !== 'new';
	},
	postCb : (req, res, after) =>
	{
		User.query()
			.findById(req.params.id)
			.then(user =>
			{
				let pw = User.randomPassword();
				user.changePassword(pw);
				req.flash(`${user.first_name} ${user.last_name}'s New password: ${pw}`);
				res.redirect()
			})
	}
};

User.tableName = 'User';
User.idColumn  = 'id';

User.crud =
{
	id          : 'users',
	type        : 'CRUDTable',
	name        : 'User Account',
	name_plural : 'User Accounts',
	model       : User,
	fields      : 
	{
		first_name : f.Text(
		{	
			id   : 'first_name',
			name : 'first_name',
		}),
		last_name : f.Text(
		{	
			id   : 'last_name',
			name : 'last_name',
		}),
		email : f.Text(
		{	
			id   : 'email',
			name : 'email',
		}),
		user_name : f.Text(
		{	
			id   : 'user_name',
			name : 'user_name',
		}),
		superuser : f.BooleanField(
		{	
			id   : 'superuser',
			name : 'superuser',
		}),
		permissions : f.Text(
		{	
			id   : 'permissions',
			name : 'permissions',
		}),
		created_at: f.DateTimeField(
		{
			id        : 'created_at',
			name      : 'Created on',
			set       : 'Meta',
			read_only : true,
		}),
		updated_at: f.DateTimeField(
		{
			id        : 'updated_at',
			name      : 'Last Updated',
			set       : 'Meta',
			read_only : true,
		}),
	}
	
};

module.exports = User;
