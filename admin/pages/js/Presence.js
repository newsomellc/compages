'use strict';
module.exports = Presence;

const Socket        = require('socket.io-client');
const Message       = require('../Message.pug');
const LoginForm     = require('../LoginForm.pug');
const Header        = require('../header.pug');
const hydrate       = require('../../../util/hydrate');
const CRUDEntry     = require('../../CRUDEntry');
const CRUDTable     = require('../../CRUDTable');
const CRUDTree      = require('../../CRUDTree');
const UploadControl = require('./UploadControl');
const FormControl   = require('./FormControl');

/**
 * Represents the user's presence in the admin area (client side)
 * to make things smooth, here's a definition of all terms:
 * 		crud : an item that appears on the menu.  CRUD means Create, Read, Update, Delete, which is what this app does.
 *      item : an object that comes from whatever data source the crud got it from.
 *      reverse : a function that gets the URL for an item, crud, etc... in the system.
 */
const $ = jQuery;

function Presence ()
{
	//I hate having to do this, I wish I could just allow you to use `new` or not, but I hate the constraints of bog standard JS classes more
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const self = {};
	const socket   = Socket();

	let name          = undefined;
	let host          = undefined;
	let port          = undefined;
	let proto         = undefined;
	let user          = undefined;
	let crud_root     = undefined;
	let crud_map      = undefined;
	let current_items = undefined;
	let current_item  = undefined;
	let current_crud  = undefined;
	let current_path  = undefined;
	let current_page  = 0;
	let current_query = undefined;
	let login_showing = false;
	
	/**
	 * Handles login after user clicks submit.
	 */
	function handle_login (e)
	{
		login_showing = false;
		$('#modal').modal('hide');
		console.log('logging in');
		socket.emit('login', $('#username').val(), $('#password').val());
		return false;
	}

	/**
	 * Handles logging out after the user requests it.
	 */
	function handle_logout (e)
	{
		e.preventDefault();
		console.log('logging out');
		socket.emit('logout');
		return false;
	}

	function handle_nav_click (e)
	{
		e.preventDefault();
		let id = $(e.target).attr('admin_id');
		
		current_path = crud_map[id]
		current_crud = crud_from_path(current_path);

		if (user.queries && user.queries[current_crud.id])
			current_query = user.queries[current_crud.id];
		else
			current_query = DEFAULT_QUERY;

		socket.emit('list', id, current_query);
		$(e.target).dropdown('toggle');

		return false;
	}

	function handle_item_list_click (crud)
	{
		return function (e)
		{
			socket.emit('item', crud.id, $(this).attr('item_id'));
			return false;
		}
	}

	function crud_from_path (path)
	{
		return path.reduce((carry, current) => carry.children[current], crud_root);
	}

	/**
	 * Shows a modal message
	 */
	function show_message(title, message, mclass)
	{
		$('#messages').append(Message(
			{
				title   : title,
				message : message,
				mclass  : mclass || 'info',
			})
		);
	}

	/**
	 * Shows the login form.
	 */
	function show_login (msg, mclass)
	{
		if (user || login_showing)
			return;

		login_showing = true;

		modal(LoginForm(
		{
			message : msg || 'Please log in to access this system...',
			classes : ['modal-login', mclass || ''],
		}));
		$('#login-btn').click(handle_login);
		$('#login-btn-dismiss').click((e) => login_showing = false);
	}

	/**
	 * Gets the context for use in rendering HTML elements.
	 */
	function get_context (ctx={})
	{
		let o =
		{
			name           : name,
			user           : user,
			reverse        : reverse,
			crud_root      : crud_root,
			current_path   : current_path,
			crud           : current_crud,
			page           : current_page,
			query          : current_query,
			items          : current_items,
			item           : current_item,
			crud_from_path : crud_from_path,
			crud_from_id   : crud_from_id,
		};
		return Object.assign(Object.create(null), o, ctx);

	}

	function crud_from_id(id)
	{
		return crud_from_path(crud_map[id]);
	}

	function build_header()
	{
		$('#header').html(Header(get_context()));
		$('.login-request').on('click', show_login);
		$('.logout-request').on('click', handle_logout);
		$('[admin_id]').on('click', handle_nav_click);
	}
	
	let last_orderby;

	function build_mainpane(renderer=TEMPLATES.default, _ctx={})
	{
		let ctx = get_context();
		if (_ctx)
			Object.assign(ctx, _ctx);
		let inner_html = renderer(ctx);
		$('#mainpane').html(inner_html);
		$('#mainpane [admin_id]').on('click', handle_nav_click);
		$('#mainpane [item_id]').on('click', handle_item_list_click(current_crud));
		$('#mainpane [admin-page]').on('click', function (e) 
		{
			current_query.page = $(this).attr('admin-page');
			socket.emit('list', current_crud.id, current_query);
		});
		$('#mainpane [admin-order_by]').on('click', function ()
		{
			current_query.order_by = $(this).attr('admin-order_by');
			if (current_query.order_by === last_orderby)
				current_query.desc = !current_query.desc;
			else
				current_query.desc = false;
			last_orderby = current_query.order_by;
			socket.emit('list', current_crud.id, current_query);
		});
		$('#mainpane [admin-new]').on('click', function () 
		{
			alert('new clicked');
		});

	}

	function build_item_form(renderer=TEMPLATES.form, _ctx={})
	{
		let ctx = get_context();
		if (_ctx)
			Object.assign(ctx, _ctx);

		ctx.classes = ['item'];
		let inner_html = renderer(ctx);
		modal(inner_html);

		$('#messages-item').append($('#messages'));
	}

	/**
	 * gets the full link to something based on its path variable, and the individual item ID if present.
	 * 
	 * Args are flexible.  You can leave out whatever arg you want, but what you do include must be in this order
	 * 	   {CRUD}   the crud to reverse for.
	 *     {Item}   the item to reverse for.
	 *     {string} a string representing the action the URL you're getting should perform
	 *     {Object} a map of the GET params to include in this URL.
	 */
	function reverse(...args)
	{
		let path, id, action, params;

		if (Array.isArray(args[0]))
			path = args.shift();

		if(CRUDEntry.isPrototypeOf(args[0]))
			path = args.shift().path;

		if (Item.isPrototypeOf(args[0]))
		{
			let item = args.shift();
			let crud = item.getCrud();
			path   = crud.path;
			id     = item.getPK();
		}

		if (typeof args[0] === 'string')
			action = args.shift();
	
		if (typeof args[0] === 'object')
			params = args.shift();
		else if (action)
			params = Object.create(null);

		let url = '';

		if (proto)
			url += proto + '://';
		if (host)
			url += host;
		if (port)
			url += ':' + port;

		url += '/';

		if (path)
			url += path.join('/');
		if (id)
			url +=  '/' + id;

		if (action || params)
			url += '?'

		if (action)
			params.action = action;
		
		if (params)
		{
				function reduce_qs (carry, key)
				{
					if (typeof params[key] === 'string')
						carry.push([key, params[key]])
					else if (Array.isArray(params[key]))
						carry =
						[
							...carry,
							...params[key]
							.reduce(reduce_qs)
							.map(kp => 
							{
								kp[0] = `${key}[kp[0]]`;
								return kp
							})
						];
					else
						throw Error('params used in reverse must be either a string or array (recursively)');
					return carry;
				}

				url += 
					Object.keys(params)
					.reduce(reduce_qs, [])
					.map(kp=> kp.join('='))
					.join('&');
		}

		return url;
	}

	/**
	 * It looks complicated, but the point of this is to let me contain all the
	 * modal management stuff in a little closure here.  Think of it as an
	 * anonymous sub-class.  It's better than scattering these things in the 
	 * presence's namespace.
	 */
	let modal =
	(function ()
	{
		let modal_queue = [];
		let modal_shown = false;

		let m_fn = (html) =>
		{

			if (!modal_shown)
			{
				$('#modal').html(html)
				.modal('show');
				modal_shown = true;
			}
			else
				modal_queue.push(html);
		};

		$('#modal').on('hidden.bs.modal', () => //augh why couldn'tt bootstrap just handle this...
		{
			modal_shown = false;
			if (modal_queue.length)
				m_fn(modal_queue.pop());
		});
		return m_fn;
	})();

	socket.on('connect', () => console.log('connected'));

	socket.on('message', show_message);

	socket.on('login', (_user) =>
	{
		console.log('Login success. Requesting config.');
		user = _user;
		socket.emit('config');
	});

	socket.on('logout', (message, mclass) =>
	{
		user      = false;
		crud_root = false;
		
		build_header();
		build_mainpane();
		console.log('showing login form');
		show_login(message || 'You have been logged out.', mclass);
		$('.login-request').on('click', show_login);
	});

	socket.on('config', config =>
	{
		console.log('Got config.');
		name      = config.name;
		host      = config.host;
		port      = config.port;
		proto     = config.proto;
		crud_root = CRUDEntry(config.crud_root, socket);
		crud_map  = config.crud_map;

		//Applies a handy function to determine if a thing is a crud in other parts of the app.

		build_header();
		build_mainpane();
	});

	socket.on('crud', (passer) =>
	{
		passer.crud = crud_from_id(passer.crud_id);
	});

	socket.on('item', (crud_id, item) =>
	{
		Object.setPrototypeOf(item, Item);
		item.setCrud(crud_from_id(crud_id));
		current_item = item;

		uploader.attached_to_id = current_item.getPK();
		uploader.attached_to_name = current_item.___item_title;


		build_item_form();
		console.log('item_form built');
	});

	socket.on('disconnect', () => show_message('Disconnected.', 'trying to reconnect...', 'warning'));

	socket.on('list', (id, items, query, message) =>
	{
		if (current_crud.media_crud)
		{
			uploader.media_id = current_crud.media_crud;
			uploader.media_name = crud_from_path(crud_map[uploader.media_id]).name;
		}

		current_query     = query;
		current_path      = crud_map[id];
		let crud          = current_crud = crud_from_path(current_path);
		
		if (crud.media_crud)
			uploader.enabled = true;
		else
			uploader.enabled = false;

		items.forEach(item => 
		{
			Object.setPrototypeOf(item, Item);
			item.setCrud(crud);
		});

		current_items = items;

		if (message)
			show_message(message);


		build_mainpane(TEMPLATES[crud.type], get_context());
	});

	$(window).on('unload', () => socket.close());

	
	const uploader = UploadControl(socket);
	FormControl(socket);

	return self;
}

/**
 * Same as CRUD, but for items.
 */
const Item = 
{
	isCrud  : () => false,
	isItem  : () => true,
	setCrud : function (crud)
	{
		Object.defineProperty(this, '___crud', { get : () => crud, enumerable: false })
	},
	getCrud : function ()
	{
		return this.___crud;
	},
	getPKField : function ()
	{
		return this.___crud.pkfield
	},
	getPK : function ()
	{
		let pk = this.getPKField();
		return this[pk];
	},
};

const TEMPLATES = 
{
	default   : require('../CRUDEntry.pug'),
	CRUDEntry : require('../CRUDEntry.pug'),
	CRUDTable : require('../CRUDTable.pug'),
	CRUDTree  : require('../CRUDTree.pug'),
	form      : require('../ItemForm.pug'),
};

const DEFAULT_QUERY =
{
	page_items : 50,
	page       : 0,
	item_total : 2,
	search     : '',
	columns    : [],
	path       : [],
	desc       : false,
};
