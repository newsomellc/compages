'use strict';
module.exports = Admin;

///3p includes
const express  = require('express');
const Router   = express.Router;
const passport = require('passport');
const Socket   = require('socket.io');

///local includes.
const User            = require('./User');
const Setting         = require('./Setting');
const Presence        = require('./Presence');
const CRUDEntry       = require('./CRUDEntry');
const CRUDTable       = require('./CRUDTable');
const CRUDTree        = require('./CRUDTree');
const App             = require('./App');
const define_property = require('../util/define_property');

/**
 * Sets up the admin area, links up logins etc.
 * params
 *     {id}(o)           unique ID.  Not yet used..
 *     {name}(o)         name of this site to display in header.
 *     {host}(o)         the host where this site is (by default derives from req object)
 *     {slug}(o)         The base path where this app is mounted (default: /)
 *     {mode}(o)         The mode this site serves in.  Serves no purpose right now.
 *     {static_host}(o)  The host to look up for static files.
 *     {cruds}(o)        A list of require_local paths to apps you want in this admin.
 */

function Admin (params, config)
{
///class init
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const app      = App(config);
	const router   = Router({strict: true});
	let io;
	const crud_root = CRUDEntry(
	{
		name        : 'Root Data Manager',
		name_plural : 'Root Data Manager',
		id          : 'crud_root',
		type        : 'entry',
	});

	//const static_host = config.static_host || '';

///properties
	const name        = params.name;
	const host        = params.host;
	const slug        = params.slug;
	const mode        = params.mode;
	const static_host = params.static_host;
	const cruds       = params.cruds;

///functions
	/**
	 * The main routing function.
	 */
	function adminApp (req, res, next)
	{
		if (!req.ctx)
			req.ctx = Object.create(null);

		req.ctx.name    = name;
		req.ctx.reverse = () => '/';
		User.query().findById(1).then(user =>
		{
			req.user = user;
			app(req, res, next);
		});
	}

	/**
	 * Invoked on an error in the admin page.
	 */
	function adminError (err, req, res, next)
	{
		res.status(err.status = err.status || 500);
		req.ctx.error = err;
		req.ctx.message = err.message.split('\n').pop() || err.message;
		res.render('error', req.ctx);
	}

	/**
	 * Adds a crud source to the root data item, and then returns the CRUD source so you can do whatever else with it.
	 */
	function crud (cls)
	{
		if (cls.app)
			app.use(cls.app);
		crud_root.add(cls.crud);
		return crud_root;
	}

///logic
	//The route for the base admin page
	app.get('/', (req, res) =>
	{
		req.ctx.env = config.env;
		//TODO: figure out the path here and turn it into a context object to pass to the SPA
		res.render('index', req.ctx);
	});	


///publishing
	let dp = define_property.DefReadOnly(adminApp);
	dp('crud',      () => crud      );
	dp('name',      () => name      );
	dp('crud_root', () => crud_root );
	dp('app',       () => app       );

	adminApp.setServer = server => 
	{
		io = Socket(server);
		io.on('connection', socket => Presence(socket, adminApp));
		app.use((req, res, next) => next(Error('Not found: ' + req.path, 404)));
		app.use(adminError);
	};

	return adminApp;
}

///constants
Admin.crud = 
{
	type        : 'CRUDEntry',
	id          : 'admin',
	name        : 'Admin',
	name_plural : 'Admin',
	children :
	{
		users    : User.crud,
		//settings : Setting.crud,
	},
};

