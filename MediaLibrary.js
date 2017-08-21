'use strict';
/**
 * A Media Library class.
 * 
 * When you call the function this module exports, it gives you a "MediaFile" 
 * class.
 * It's a `Class` for a MediaFile, but the class itself is a `MediaLibrary`
 * (I know this is confusing, it'll be changing soon)
 *
 * This class will be in the final product, but in a very different form. For 
 * example, I'm getting rid of ALL resizing, variant-tracking etc.  That's much
 * more easily done as a Site-level middleware that applies to all images-- no 
 * matter if they're from a media library or a static site.
 * 
 * Also this class should probably not handle any middleware or routing 
 * functions on its own. It's just a backing store for images etc that don't 
 * get committed to the repo.
 */
module.exports = MediaLibrary;

const path       = require('path').posix;
const p          = (/^win/.test(process.platform)) ? require('path').win32 : require('path').posix;
const fs         = require('fs');
const fx         = require('mkdir-recursive');
const md5file    = require('md5-file/promise');
const Model      = require('objection').Model;
const readdirp   = require('readdirp');
const es         = require('event-stream');
const express    = require('express');
const sharp      = require('sharp');

const define_property = require('./util/define_property');

let media_base_dir, volatile, media_file_ext, media_variants;

MediaLibrary.configure = config =>
{
	let rawdb = require('knex')(config.db);
	require('objection').Model.knex(rawdb);
	media_base_dir  = config.dirs.media;
	volatile        = config.dirs.volatile;
	media_file_ext  = config.file_extensions;
	media_variants  = config.file_variants;
};

function MediaLibrary (params)
{
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');

	if (!params.id)
		throw Error('MediaLibrary needs an ID');

	if (!params.dir)
		throw Error('MediaLibrary needs a source dir to read from.');

	const id          = params.id;
	const dir         = params.dir;
	const real_dir    = p.join(media_base_dir, dir);
	const host        = params.host || '';
	const name        = params.name || id[0].toUpper() + id.slice(1);
	const name_plural = params.name_plural || params.name;//(params.name ? params.name + 's' :'');
	const table_name  = params.table_name || name.replace(/ /g, '');
	const prescan     = params.prescan || false;
	const fileDestCB  = params.fileDestCB; //A callback used to determine the destination of uploaded files.
	const pattern     = [/(?:(\/.*))?\/(?:(.+?)-)?(?:([0-9])x-)?(.*\.....?)$/, ['file_path', 'variant', 'scale', 'file_name']];

	const extensions  = params.extensions || media_file_ext || DEFAULT_EXTENSIONS;
	const variants    = params.variants   || media_variants || DEFAULT_VARIANTS;

	const app = express.Router();

	app.get(pattern[0], function (req, res, next)
	{
		const http = require('http');
		pattern[1].forEach((k, i) => req.params[k] = req.params[i]);

		let file_path = req.params.file_path;
		let file_name = req.params.file_name;
		let variant   = req.params.variant || 'original';
		let scale     = parseInt(req.params.scale) || 1;

		if (Object.keys(variants).indexOf(variant) < 0)
		{
			file_name = variant + '-' + file_name;
			variant   = 'original';
		}

		MediaFile.query()
		.where('media_path', '=', path.posix.join(file_path || '/', file_name))
		.first()
		.then(mf =>
		{
			if (!mf)
				return next();


			if (!scale && !variant || ! mf.fileNeedsVariants())
				return res.sendFile(mf.file.real_path);

			let img = sharp(mf.file.real_path, variants[variant]);


			for (let k in variants[variant])
			{
				let opts = {};
				switch(k)
				{
					case 'resize':
						img.resize(variants[variant].resize[0] * scale, variants[variant].resize[1] * scale || scale);
						break;
					default:
						img[k](...variants[variant][k]);
						break;
				}
			}
			img.toBuffer((err, data, info) =>
			{
				if (err)
					return next(err);
				res.writeHead(200, {'Content-Type': 'image/'+ info.format });
				res.end(data);
			});
		});
	});

	//Just make the small thumbnail required-- it's needed in the admin backend.
	if (!variants.icon)
		variants.icon = DEFAULT_VARIANTS.icon;

	let list            = [];
	let map             = [];
	let dict_media_path = {};
	let dict_md5        = {};
	let error_file;

	const debug      = require('debug')('nocms:MediaFile:' + params.name);
	const debug_scan = require('debug')('nocms:MediaFile:' + params.name +':scan');

	/**
	 * A file entry for the database.
	 */
	class MediaFile extends Model 
	{
		constructor(file)
		{
			super();
			const self = this;

			/**
			 * Sets this MF's params to an instance of a real file.
			 */
			function setFile(_file)
			{
				self.md5        = _file.md5;
				self.media_path = _file.media_path;
				file = _file;

			}

			function getFileName(variant, scale)
			{
				if (!variant || variant === 'original')
					variant = undefined;
				if (!scale || scale === '1x')
					scale = undefined;
				return (variant?variant+'-':'') + (scale?scale+'-':'') + encodeURIComponent(self.file.base_name) + '.' + self.file.extension
			}

			/**
			 * Gets the URL for a variant of this file.
			 */
			function getUrl (variant, scale)
			{
				return host + path.join(dir, self.file.directory, getFileName(variant, scale));
			};

			/**
			 * Gets a list of different sizes for this item.
			 * If this is an SVG, it only returns the canonical path.
			 */ 
			function getVariantUrlList (variant)
			{
				if (!variant)
					variant = 'original';

				return Object.keys(variants).map(scale => getUrl(variant, scale));
			};

			/**
			 * Gets the string you'd put in the srcset attribute on an img tag.
			 * TODO: expand beyond 1x and 2x... is there a 1.5x?
			 */
			function getSrcSet(variant)
			{
				if (!variant)
					variant = 'original';
				let vobj = variants[variant];
				
				if (fileNeedsVariants() || variant === 'thumbnail')
					return `${getUrl(variant, '1x')} ${vobj.resize[0]}w, ${getUrl(variant, '2x')} ${vobj.resize[0]*2}w,`;
				else
					return getSrcSet('thumbnail');
			}

			/**
			 * Gets some css you can use in an html style attribute (TODO: some way to include this in SASS?)
			 */
			function getBackgroundCSS(variant)
			{
				if (!variant)
					variant = 'original';
				let vobj = variants[variant];

				if (fileNeedsVariants() || variant === 'thumbnail')
				{
					let css =
					`
					background-image:               url("${getUrl(variant, '1x')}");
					background-image: -webkit-image-set("${getUrl(variant, '1x')}" 1x, "${getUrl(variant, '2x')}" 2x);
					background-image:         image-set("${getUrl(variant, '1x')}" 1x, "${getUrl(variant, '2x')}" 2x);
					`;
					return css;
				}
				else
					return getBackgroundCSS('thumbnail');
			}

			/**
			 * Gets all the stuff we need to JSON encode the data herein and render it on the client.
			 */ 
			function getClientPack()
			{
				let o =
				{
					url      : getUrl(),
					srcset   : getSrcSet(),
					variants : Object.keys(variants).reduce((dict, variant) =>
					{
						dict[variant]          = getUrl(variant);
						dict[variant + '_set'] = getSrcSet(variant);
						return dict;
					}, Object.create(null)),
				};
				return o;
			}

			/**
			 * Generates variants for this file.  Optional progress callback (Todo: implement)
			 */
			function generateVariants(progress_callback, selected_variants=[])
			{
				if (fileNeedsVariants())
					for (let variant in variants)
						[1,2].forEach(scale =>
						{
							if (selected_variants.length && selected_variants.indexOf(variant) < 0 || variant === 'original')
								return debug('skipping ' + variant + ' for ' + file.media_path);

							let fn = p.join(volatile, dir, path.dirname(file.media_path), getFileName(variant, scale+'x'));

							fx.mkdir(p.dirname(fn), (err) =>
							{
								debug('output file to: ' + fn);
								//if (err)
									//throw err;

								let img = sharp(file.real_path, variants[variant]);
								for (let k in variants[variant])
								{
									let opts = {};
									switch(k)
									{
										case 'resize':
											img.resize(variants[variant].resize[0] * scale, variants[variant].resize[1] * scale);
											break;
										default:
											img[k](...variants[variant][k]);
											break;
									}
								}
								img.toFile(fn);
							});
						});
					else
						debug('file does not use variants: ' + getFileName());
			}

			/**
			 * Whether this file is an image that needs separate variants.
			 */
			function fileNeedsVariants ()
			{
				return ['jpg', 'jpeg', 'gif', 'png'].indexOf(self.file.extension && self.file.extension.toLowerCase()) > -1;
			}

			/**
			 * Gets a string representation, obviously.
			 */
			function toString()
			{
				return `${self.file.file_name}`;
			};

			let dp = define_property.DefReadOnlyNoEnum(self);

			dp('file', () =>
				{
					if (file)
						return file;
					try
					{
						file = getFromMemory(self.md5);
					}
					catch (e)
					{
						if (self.media_path)
							file = RealFile({real_path : p.join(real_dir, self.media_path), md5 : self.md5});
						else
							file = error_file;
					}
					return file;
				});
			//Defined here, it allows us to get the files via javascript.
			dp('urls', () => getClientPack());

			self.getUrl            = getUrl;
			self.getSrcSet         = getSrcSet;
			self.getVariantUrlList = getVariantUrlList;
			self.getClientPack     = getClientPack;
			self.fileNeedsVariants = fileNeedsVariants;
			self.toString          = toString;
			self.setFile           = setFile;
			self.generateVariants  = generateVariants;
		}
	}

	/**
	 * A sub-class, only ever used inside of this closure, that keeps track of file nodes.
	 */
	function RealFile (params)
	{
		const self = {};

		const md5        = params.md5;
		const real_path  = params.real_path;                             //full path on the file system.
		const media_path = p===path.win32 ? 
		path.join('/', p.relative(real_dir, real_path).replace(/\\/g, '/'))
		: 
		p.join('/', p.relative(real_dir, real_path)); //path relative to the media dir.
		const extension  = p.extname(real_path).slice(1);                //the file extension
		const base_name  = p.basename(real_path, '.'+extension);         //the base filename of the file
		const file_name  = p.basename(real_path);                        //the filename with extension
		const directory  = path.join(p.dirname(media_path),'/');         //a reference to the containing dir object.
		const type       = TYPE_DESC[self.extension]||'unknown';         //a description string of the type
		const modified   = params.modified;                              //Date time in ISO format
		const created    = params.created;                               //Same.
		const in_trash   = directory==='/trash';                         //whether this is in the trash.


		let dp = define_property.DefReadOnly(self);

		dp('md5',        () => md5        );
		dp('real_path',  () => real_path  );
		dp('media_path', () => media_path );
		dp('extension',  () => extension  );
		dp('base_name',  () => base_name  );
		dp('file_name',  () => file_name  );
		dp('directory',  () => directory  );
		dp('type',       () => type       );
		dp('modified',   () => modified   );
		dp('created',    () => created    );
		dp('in_trash',   () => in_trash   );

		//ok this is just showing off...
		list.push(dict_media_path[self.media_path] = dict_md5[self.md5] = self);

		return self;
	}

	/**
	 * Starts a recursive scan at the root media directory and walks down.
	 */
	function scanSourceDir ()
	{
		readdirp({ root: real_dir, fileFilter: extensions.map(ext => '**/[^_.]*.' + ext)})
		.pipe(es.map((file_info, thru) =>
		{
			//get MD5s for files.
			md5file(file_info.fullPath).then(md5 =>
			{
				let rf_params = 
				{
					md5       : md5, 
					real_path : file_info.fullPath,
					created   : file_info.stat.ctime,
					modified  : file_info.stat.mtime,
				};
				let rf = RealFile(rf_params);
				
				if (rf.base_name === 'error')
				{
					debug_scan('using', rf.media_path, ' as error image.');
					error_file = rf;
				}
				thru(null, rf);
			});
		}))
		.pipe(es.map((rf, thru) =>
		{
			//get the item from the database-- if it doesn't exist, create it.
			debug_scan(`Found file: ${rf.media_path} MD5: ${rf.md5}`);

			MediaFile.query().findById(rf.md5).then(mf =>
			{
				if (!mf)
				{
					debug_scan('Media File is not in DB by MD5.  Searching by path.');
					
					return MediaFile.query()
					.where('media_path', '=', rf.media_path)
					.first()
					.then(mf =>
					{
						if (!mf)
						{
							debug_scan('Media File is not in database at all.  Creating entry.');
							mf = Object.assign(new MediaFile(),
							{
								md5        : rf.md5,
								media_path : rf.media_path,
								created_at : rf.created,
								updated_at : rf.modified,
							});
							MediaFile.query().insertAndFetch(mf).then(mf=>thru(null, mf));
						}
						else if (mf.path !== rf.path)
						{
							debug_scan(`Media File has moved from ${mf.media_path} to ${rf.media_path}. Updating.`);
							mf = Object.assign(mf, 
							{
								md5        : mf.md5,
								media_path : mf.media_path,
							});
							MediaFile.query().updateAndFetchById(mf.md5, mf).then(mf=>thru(null, mf));

						}

					});
				}
				else
				{
					debug_scan('Media file already in DB.  Doing nothing.');
					thru(null, mf);
				}

			})
		}))
		.on('data', mf =>
		{

		})
		.on('end', () =>
		{
			debug_scan('done with scanning ' + dir);
		})
		.on('error', err =>
		{

			debug_scan('error', err);
		});

		debug('Starting scan...');

		dict_media_path = {};
		dict_md5        = {};
		list            = [];
		map             = [];
	}

	/**
	 * Just gets the error file.	
	 */
	function getErrorFile ()
	{
		return new MediaFile(error_file);
	}


	/**
	 * Processes a file after it's uploaded, adding it to the media library etc.
	 */
	function processUploadedFile (real_path)
	{
		return new Promise((res, rej) => 
		{
			md5file(real_path).then(md5 =>
			{
				let rf_params = 
				{
					md5       : md5, 
					real_path : real_path,
					created   : new Date(),
					modified  : new Date(),
				};

				let rf = RealFile(rf_params);

				let mf = Object.assign({},
				{
					md5        : md5,
					media_path : rf.media_path,
				});

				let _res = media_file => 
				{
					media_file.generateVariants();
					res(media_file);
				};
				MediaFile.query().insertAndFetch(mf).then(_res).catch(err =>
				{
					MediaFile.query().findById(md5).then(_res).catch(rej);
				});
			});
		});
	}

	//if (prescan)
	//	scanSourceDir();
	/**
	 * config for how this model interacts with the CRUD front-end..
	 */
	let f = require('./admin/fields');


	const crud = 
	{
		type         : 'CRUDTree',
		id           : id,
		name         : name,
		name_plural  : name_plural,
		model        : MediaFile,
		pkfield      : 'md5',
		media_crud   : id,
		actions      :
		[
			{
				id   : 'generate_variants',
				name : 'Generate Variant Sizes',
				CB   : actionGenerateVariants,
				item : true,
				list : true,
				crud : false,
			},
			{
				id   : 'deflate',
				name : 'Deflate Image',
				CB   : handleDeflate,
				item : true,
				list : true,
				crud : false,
			},
			{
				id   : 'trash',
				name : 'Trash',
				CB   : handleTrash,
				item : true,
				list : true,
				crud : false,
			},
			{
				id   : 'empty_trash',
				name : 'Empty Trash',
				CB   : handleEmptyTrash,
				item : false,
				list : false,
				crud : true,
			},
		],
		fields :
		[
			{
				type      : 'Info',
				id        : 'thumbnail',
				name      : 'Preview',
				form_tpl  : PREVIEW_FORM_TPL,
				cell_tpl  : PREVIEW_CELL_TPL,
			},
			{
				type      : 'Text',
				id        : 'caption',
				name      : 'Caption',
			},
			{
				type : 'Tags',
				id   : 'tags',
				name : 'Tags',
			},
			{
				type     : 'Info',
				id       : 'file_name',
				name     : 'File Name',
				form_tpl : '!=item && item.file && item.file.file_name || "unknown"',
				cell_tpl : '!=item && item.file && item.file.file_name || "unknown"',
			},
			{
				type     : 'Info',
				id       : 'directory',
				name     : 'Where',
				form_tpl : '!=item && item.file && item.file.directory || "unknown"',
				cell_tpl : '!=item && item.file && item.file.directory || "unknown"',
			},
		],
	};

	/** 
	 * Creates a new directory
	 */
	function handleMkDir (handle, item)
	{
		//prompt for directory name
		//create the new directory.
		
	}

	/**
	 * Generates a specific size or sizes (if the scale isn't given) for an
	 * image.  Can optionally hold up a request while it's happening(do we want
	 * this?)
	 */
	function actionGenerateVariants(handle, item)
	{
		//prompt for variants, or just do all.
	}
	/**
	 * Generally this happens automatically on upload.
	 */
	function handleDeflate(handle, item)
	{
		let sharp = require('sharp');
	}

	/**
	 * Deflates the original image from the absurd resolution from digital 
	 * cameras, and compresses it to something more manageable.  Only really 
	 * works on JPEGs.
	 * Gives progress callbacks to the user via flash messages.
	 */
	function handleWebSize(handle, item)
	{
		
	}

	/**
	 * Deletes an item. Really just moves it to the trash folder, creating it if it doesn't exist.
	 */
	function handleTrash(handle, item)
	{

	}

	/**
	 * Empties the trash.
	 */
	function handleEmptyTrash(handle, item)
	{

	}

	/** 
	 * When uploading a file, use this function to determine where it goes.
	 * 
	 * {string} filename, self explanatory.
	 * {varies} id, PK id of the item to attach this file to.  May be false.
	 */

	function fileDest(filename, attached_to_id)
	{
		let promise;
		if (fileDestCB)
			promise = fileDestCB(real_dir, filename, attached_to_id);
			//fileDestCB has the option to return false to fall back to default behavior.
			if (promise)
				return promise;
		return new Promise((res, rej) => res(path.join(real_dir, filename)));
	}

	MediaFile.idColumn            = 'md5';
	MediaFile.tableName           = table_name;
	MediaFile.virtualAttributes = ['file', 'urls'];

	MediaFile.scanSourceDir       = scanSourceDir;
	MediaFile.RealFile            = RealFile;
	MediaFile.getErrorFile        = getErrorFile;
	MediaFile.fileDest            = fileDest;
	MediaFile.processUploadedFile = processUploadedFile;

	let dp = define_property.DefReadOnly(MediaFile);
	dp('list',            () => list);
	dp('map',             () => map);
	dp('crud',            () => crud);
	dp('dict_media_path', () => dict_media_path);
	dp('dict_md5',        () => dict_md5);
	dp('error_file',      () => error_file);
	dp('variants',        () => variants);
	dp('dir',             () => dir);
	dp('real_dir',        () => real_dir);
	dp('extensions',      () => extensions);

	if (!prescan)
		MediaFile
		.query()
		.select()
		.where('media_path', 'LIKE', '%error.%')
		.first()
		.then(media_file =>
		{
			if (!media_file)
				//TODO: put a default universal error file in the git repo, so this never becomes a problem.  Maybe init it out in the main superclass, with universally accessible URLs etc.
				return debug('No error placeholder found in database.  This library may cause crashes without it.');

			error_file = media_file.file;
			debug('Using', error_file.real_path, 'as error placeholder');
		});
	else
		scanSourceDir();

	MediaFile.app = app;

	return MediaFile;
};

const DEFAULT_EXTENSIONS = ['jpg', 'jpeg', 'svg', 'gif', 'png', 'mp4', 'pdf'];

const DEFAULT_VARIANTS = 
{
	/*cover :
	{
		resize    : [1920,800],
		crop      : 'center',
		quality   : 50,
		noProfile : true,
	},*/
	thumbnail :
	{
		resize             : [200,150],
		crop               : [sharp.gravity.center],
		jpeg               : [{progressive : true, quality : 70}],
		withoutEnlargement : [true],
	},
	icon :
	{
		resize             : [75,55],
		crop               : [sharp.gravity.center],
		jpeg               : [{progressive : true, quality : 70}],
		withoutEnlargement : [true],
	},
	presentation :
	{
		resize             : [800,600],
		crop               : [sharp.gravity.center],
		jpeg               : [{progressive : true, quality : 70}],
		withoutEnlargement : [true],
	},
	gallery :
	{
		resize             : [1920,1200],
		crop               : [sharp.gravity.center],
		jpeg               : [{progressive : true, quality : 70}],
		withoutEnlargement : [true],
	},
	original :
	{
		resize : [3000, undefined],
		min    : [],
	}
};

const TYPE_DESC = 
{
	'jpg' : 'JPEG Image',
	'jpeg': 'JPEG Image',
	'gif' : 'CompuServe GIF',
	'png' : 'Portable Network Graphics',
	'svg' : 'Scalable Vector Graphics',
	'pdf' : 'Portable Document Format',
};

//used in the admin interface to render the cell with the media preview.
const PREVIEW_CELL_TPL = `img(src=item.urls.variants.icon srcset=item.urls.variants.icon_set).media-icon`;

const PREVIEW_FORM_TPL = 
`
.row
	.col-12
		a(href=item.urls.url)
			img(src=item.urls.variants.gallery srcset=item.urls.variants.gallery_set).media-preview
	.col-12
		ul
			li
				strong File Name 
				span=item.media_path
			li
				strong Directory 
				span=item.file.directory
			li
				strong Type 
				span=item.file.type
			li
				strong Modified 
				span=item.file.modified
			li
				strong Created
				span=item.file.created
			//- TODO SECURITY Think about this...  do I want to give people insight to my file system? 
			li 
				strong File System Location 
				span=item.file.real_path
`;

