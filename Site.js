/**
 * The basis for a no-CMS CMS.
 * 
 * Scans for content pages in a specified directory.  Then it either sets up 
 * routes, or returns params so Gulp can generate the pages as static files.
 *
 * It enumerates the pages, and passes them as a list to your pug templates,
 * along with whatever other settings or memory issues we want.
 * 
 * This is NOT a CMS  system.  Page Deliverer has no impact on what pages you 
 * actually serve. It's not possible to add a new page via the admin area, nor
 * will it ever be.  That's not the point of this.
 * 
 * The point is to recreate the page authoring experience of the late 90s, where
 * all you had was a file structure and a dream, and you threw whatever files 
 * you had where you wanted them to go.
 *
 */
const express    = require('express');
const Router     = require('express').Router;
const Enum       = require('enum');
const path       = require('path');
const sass       = require('node-sass-middleware');
const browserify = require('browserify-middleware');
const readdirp   = require('readdirp')
const es         = require('event-stream');
const debug      = require('debug')('nocms:Site');

const define_property = require('./util/define_property');


function Site (params)
{
	if (new.target) throw Error(this.constructor.name + ' called with `new` keyword.');
	
	const name        = params.name;
	const site_dir    = params.site_dir || err('`site_dir` (representing a path to the site pages) is a required parameter.');
	const mode        = params.mode || MODE.serve;
	const slug        = params.slug || '/';
	const host        = params.host || '';
	const port        = params.port || (params.port === 80 ? false : params.port);
	const static_host = params.static_host || params.host;
	const api_host    = params.api_host || params.host;
	const view_engine = params.view_engine || 'pug';
	const ctxCallback = params.ctxCallback || undefined; //TODO define a default one of these.
	const env         = params.env;

	let app;
	let router;
	let pages;

	if (mode.has(MODE.serve | MODE.fallback))
	{
		app = express();

		app.set('views', site_dir);
		app.set('view engine', view_engine);
	
		if (mode.has(MODE.serve))
		{
			app.use('/', sass(
			{
				src            : path.join(site_dir),
				indentedSyntax : true,
				sourceMap      : false,
				response       : true,
			}));
			app.use('/', browserify(site_dir, 
			{
				transform:
				[
					['babelify', {presets: ['es2015',]} ],
					['pugify', {pretty : false } ],
				],
			}));
		}

		if (mode.has(MODE.fallback))
			app.use(handleError);

		app.use(express.static(site_dir));
	}

	if (mode.has(MODE.serve))
		scanSourceDir();
	
	/**
	 * Site middleware function.  All requrests pass thru here, so we set 
	 * useful methods and data to be used further down the chain, even in 
	 * sub-apps.
	 */
	function siteApp (req, res, next)
	{
		if (!req.ctx)
			req.ctx = {};
		req.ctx.ctx = req.ctx; //So CTX can be passed to dynamic sub templates.
		
		Object.assign(req.ctx, pageContext(req.path));

		return app(req, res, next);
	}

	/**
	 * Error handler for this app, to display consistent errors for anything 
	 * that goes wrong.
	 */
	function siteError(err, req, res, next)
	{
		req.ctx.error   = err;
		req.ctx.message = err.message;
		res.status = err.status || 500;
		res.render('templates/_error', req.ctx);
	}


	function pageContext(path)
	{
		let port_patch = port ? (':' + port) : '';
		let ctx = 
		{
			env       : env,
			site_name : name,
			api_host  : api_host + port_patch,
			address   : (p) => `//${host}${port_patch}${p}`,
			static    : (p) => `//${static_host}${port_patch}${p}`,
			path      : path,
		};
		if (ctxCallback)
			ctxCallback(ctx);

		return ctx;
	}

	function scanSourceDir ()
	{
		pages = [];
		let p = (/^win/.test(process.platform)) ? path.win32 : path.posix;

		router = Router({strict: true});
		readdirp({ root: site_dir, fileFilter: '**/[^_.]*' + view_engine  })
			.on('data', entry =>
			{
				let basename  = p.basename(entry.name, '.'+view_engine);
				let fullPath  = entry.fullPath;
				let parentDir = entry.parentDir;
				if (basename === 'index')
					basename = '';

				let slug = path.join('/', parentDir, '/', basename) + (basename ? '.html' : '');

				if (p === path.win32)
					slug = slug.replace(/\\/g, '/');

				debug('found page: ' + slug);
				
				pages.push({title:slug, slug:slug});

				router.get(slug, (req, res) => res.render(fullPath, req.ctx));

			})
			.on('end', () =>
			{
				router.all('*', (req, res, next) => 
				{
					let err = Error('Page Not Found');
					err.status = 404;
					next(err);
				})
				app.use(router);
				app.use(siteError);
			});
	}

	function use (...args)
	{
		if (!mode.has(MODE.serve | MODE.fallback))
			return;
		app.use(...args);
	}

	//let i = define_property.SafeInherit(siteApp, app);
	/**
	 * This `buildable` property is important.  It's how I signal to gulp that 
	 * this module has assets that can be build.
	 */
	define_property.DefReadOnly(siteApp)('buildable', ()=>true);

	siteApp.use         = use;
	siteApp.pageContext = pageContext;

	return siteApp;
}

const MODE = new Enum(['serve', 'build', 'fallback']);

function err(msg)
{
	throw Error(msg);
}

Site.MODE = MODE;

module.exports = Site;
