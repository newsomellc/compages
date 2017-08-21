'use strict';
module.exports = App;

///3p includes
const express       = require('express');
const body_parser   = require('body-parser');
const browserify    = require('browserify-middleware');
const cookie_parser = require('cookie-parser');
const debug         = require('debug')('admin');
const Debug         = require('debug');
const Router        = express.Router;
const morgan        = require('morgan');
const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const path          = require('path');
const sass          = require('node-sass-middleware');
const session       = require('express-session');

const User = require('./User');

/**
 * Sets up the app for the admin area.  Just to get this out of there.
 */
function App (config)
{
	const app = express();
	const real_pages_dir = path.join(__dirname, 'pages');

	app.set('view engine', 'pug');
	app.set('views', real_pages_dir);

	//app.use(morgan('dev'));

	app.use(body_parser.json());
	app.use(body_parser.urlencoded({ extended: true }));
	/*app.use(session(
	{
		cookie            : { maxAge: 60000, },
		secret            : 'notreallysecret',
		resave            : true,
		saveUninitialized : true
	}));*/

	passport.serializeUser((user, next) =>
	{
		next(null, user.id);
	});
	passport.deserializeUser((user_id, next) =>
	{
		User.query().findById(user_id).then(user => next(null, user));
	});


	app.use(passport.initialize());
	app.use(passport.session());
	app.use(cookie_parser());
	if (config.env === 'development')
	{
		app.use('/', sass(
		{
			src            : real_pages_dir,
			indentedSyntax : true,
			response       : true,
		}));
		app.use('/', browserify(real_pages_dir,
		{
			transform:
			[
				['babelify', {presets: ['es2015',]} ],
				['pugify', {pretty : false } ],
			],
		}));
		app.use('/', express.static(real_pages_dir));
	}
	//passport.use(new LocalStrategy(User.localAuth));


	return app;
}

