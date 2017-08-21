/**
 * A database model for BlogPosts
 */
'use strict';
module.exports = Blog;
const Enum    = require('enum');
const path    = require('path');
const Model   = require('objection').Model;
const pug     = require('pug');
const express = require('express');

const MediaLibrary    = require('./MediaLibrary');
const define_property = require('./util/define_property');

function Blog (params)
{
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');

	const id             = params.id;
	const name           = params.name || id[0].toUpperCase() + id.slice(1);
	const name_plural    = params.name_plural || name + 's';
	const slug           = params.slug || path.join('/', id);
	const category       = params.category || 'Blogs';
	const template       = params.template;
	const tableName      = params.tableName || name.replace(/ /g,'') + 'Post';
	const mediaTableName = params.mediaTableName || name.replace(/ /g,'') + 'Media';
	const pattern        = params.pattern;
	const ctxCallback    = params.ctxCallback;
	const shortcodes     = Object.assign(params.shortcodes || {}, DEFAULT_SHORTCODES);
	const media_host     = params.media_host;
	const queryCB        = params.queryCB || (q => q);


	class BlogPost extends Model
	{
		constructor (params)
		{
			super();
			const self = this;

			let _cover_image;

			let dp = define_property.DefGetSet(self);

			dp('_cover_image', () => 
			{
				if (!_cover_image)
					_cover_image = BlogMediaFile.getErrorFile();
				return _cover_image;
			}, new_ci => _cover_image = new_ci);
			/**
			 * Renders the blog post's content.  We may choose something else eventually.
			 * Functions assigned to the CTX variable become "shortcodes".
			 */
			function renderContent(ctx)
			{
				//For this and only this rendering, we're going to make a shallow copy.
				//We don't want shortcodes getting into the main site ctx.
				ctx = Object.assign({}, ctx, shortcodes);
				ctx.ctx = ctx.x = ctx;
				return pug.compile(self.body_copy)(ctx);
			}

			function toString()
			{
				return self.title;
			}

			function getUrl(ctx)
			{
				return `/journal/${self.slug}.html`;
			}

			self.renderContent = renderContent;
			self.toString      = toString;
			self.getUrl        = getUrl;
		}
	}

	let BlogMediaLibrary, BlogMediaFile;

	BlogMediaLibrary = BlogMediaFile = MediaLibrary(
	{
		id          : id + '_media',
		name        : name + ' Media',
		name_plural : name + ' Media',
		dir         : slug,
		host        : media_host,
		tableName   : mediaTableName,
		fileDestCB  : (real_dir, filename, blog_id) =>
			new Promise((res, rej) =>
			{
				const path = require('path');

				if (blog_id === 'new')
					res(path.join(real_dir, 'TEMP', filename));

				BlogPost.query()
				.findById(blog_id)
				.then(post =>
				{
					let d = post.created_at;
					res(path.join(real_dir, d.getFullYear()+'', d.getMonth()+'', filename));
				})
				.catch(rej);
			}),
	});
	
	const app = express.Router();

	app.use(pattern[0], blogApp);
	app.use(BlogMediaLibrary.app);

	/**
	 * Main routing function.  This is what you USE in express to mount the blog.
	 */
	function blogApp (req, res, next)
	{
		if (!req.ctx)
			req.ctx = {};
		
		let q = BlogPost.query()
			.leftJoinRelation('_cover_image').eager('_cover_image');

		queryCB(q);

		if (!pattern[1].map((k, i) => req.params[k] = req.params[i]).reduce((c,v) => v || c))
			return q
			.then(posts =>
			{
				req.ctx.posts = posts;
				next();
			});

		pattern[1].forEach((k, i) => req.params[k] = req.params[i]);
		pattern[1].forEach(k => q.where(k, '=', req.params[k]));

		return q
		.first()
		.then(post =>
		{
			if (!post)
				return next();
			req.ctx.post   = post;

			//now to get the post's images...
			BlogMediaLibrary.query()
			.whereIn('md5', post.images)
			.then(images =>
			{
				req.ctx.images = images;
				res.render(template, req.ctx);
			});
		});
	}

	/**
	 * Adds variables specific to the blog to the request context.  I may write
	 * it to return a promise, if it needs to pull from a database.
	 */
	function postContext(ctx, post, next)
	{
		if (ctxCallback)
			ctxCallback(ctx);

		ctx.post = post;

		return ctx;
	}

	const f = require('./admin/fields');
	BlogPost.crud = 
	{
		id          : id,
		type        : 'CRUDTable',
		name        : name,
		name_plural : name_plural,
		model       : BlogPost,
		media_crud  : BlogMediaLibrary.crud.id,
		fields :
		{
			title: f.Text(
			{
				id   : 'title',
				name : 'Title',
			}),
			cover_image: f.MediaFile(
			{
				id            : 'cover_image',
				name          : 'Cover Image',
			}),
			lead_text: f.TextArea(
			{
				id   : 'lead_text',
				name : 'Lead Text',
				set  : 'Content',
			}),
			body_copy: f.CodeTextArea(
			{
				id   : 'body_copy',
				name : 'Content',
				set  : 'Content',
			}),
			author: f.ForeignKey(
			{
				id         : 'author',
				name       : 'Author',
				name_field : 'first_name',
				set        : 'meta',
				crud_id    : require('./admin/User').crud.id,
			}),
			slug: f.Text(
			{
				id   : 'slug',
				name : 'Slug',
			}),
			history: f.History(
			{
				id   : 'history',
				name : 'History',
			}),
			tags: f.Tags(
			{
				id   : 'tags',
				name : 'Tags',
			}),
			sites: f.Select(
			{
				id       : 'sites',
				name     : 'Show on which sites?',
				multiple : true,
				options  : 
				[
					'JasperHighlands.com',
					'TNLand.com'
				],
			}),
			created_at: f.DateTimeField(
			{
				id        : 'created_at',
				name      : 'Created on',
				read_only : true,
			}),
			updated_at: f.DateTimeField(
			{
				id        : 'updated_at',
				name      : 'Last Updated',
				read_only : true,
			}),
		},
		children :
		{
			[BlogMediaLibrary.crud.id] : BlogMediaLibrary.crud,
		},
	};

	BlogPost.tableName = tableName;
	BlogPost.idColumn  = 'id';

	BlogPost.app              = app;
	BlogPost.postContext      = postContext;
	BlogPost.pattern          = pattern;
	BlogPost.BlogMediaLibrary = BlogMediaLibrary;
	BlogPost.relationMappings = 
	{
		_cover_image :
		{
			relation   : Model.BelongsToOneRelation,
			modelClass : BlogMediaFile,
			join :
			{
				from : tableName+'.cover_image',
				to   : mediaTableName+'.md5',
			}
		}
	};
	BlogPost.getSchema = function ()
	{
		
	};

	return BlogPost;
}

const DEFAULT_SHORTCODES = 
{
	img : function (md5, variant='original', float='')
	{
		let ctx =
		{
			image   : this.images.filter(image => image.md5 === md5)[0],
			variant : variant,
			float   : float,
		}
		if (!ctx.image)
			return 'no-image';

		return SC_IMG_TPL(ctx);
	},
	fig : function (md5, variant='original', float='', caption='')
	{
		let ctx =
		{
			image   : this.images.filter(image => image.md5 === md5)[0],
			variant : variant,
			float   : float,
			caption : caption,
		}
		if (!ctx.image)
			return 'no-image';

		return SC_FIG_TPL(ctx);
	},

};
const SC_IMG_TPL = pug.compile(`img(class=float?'pull-'+float:'' src=image.getUrl(variant) alt=image.file.base_name)`);


const SC_FIG_TPL = pug.compile(
`
figure(class=float?'pull-'+float:'')
	img(src=image.getUrl(variant) alt=caption)
	caption=caption
`);
