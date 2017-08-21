'use strict';
module.exports = Presence;

const debug = require('debug')('admin:Presence');
const ss    = require('socket.io-stream');
const fs    = require('fs');
const fx    = require('mkdir-recursive');
const path  = require('path');

const User              = require('./User');
const flatten_recursive = require('../util/flatten_recursive');

/**
 * Manages websocket communication to the client.
 */
function Presence (socket, admin)
{
	//I hate having to do this, I wish I could just allow you to use `new` or not, but I hate the constraints of bog standard JS classes more
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	debug('Admin presence detected...  ');

	const crud_root = admin.crud_root;
	const crud_map  = map_crud(crud_root, Object.create(null));
	let user = false;

	socket.use((packet, next) =>
	{
		if (!user && packet[0] !== 'login')
		{
			debug('refusing to perform action:', packet[0]);
			return socket.emit('logout', 'Access denied.');
		}
		next();
	});

	/**
	 * Makes a flat map of all the crud objects in the system, so they can be 
	 * queried by id.
	 */
	function map_crud(croot, dest_obj, curr_path=[])
	{
		if (croot !== crud_root)
		{
			curr_path          = [...curr_path, croot.id]
			dest_obj[croot.id] = curr_path;
		}

		Object.values(croot.children).forEach(crud => map_crud(crud, dest_obj, curr_path));
		return dest_obj;
	}

	function crud_from_path (path)
	{
		return path.reduce((carry, current) => carry.children[current], crud_root);
	}

	function crud_from_id(id)
	{
		return crud_from_path(crud_map[id]);
	}

	socket.on('config', path =>
	{

		debug('Sending config.');

		let config = Object.create(null);

		config.name      = admin.name;
		config.host      = 'dev.admin'; //todo: change to dynamic later
		config.port      = 3000;
		config.proto     = 'http';
		config.crud_map  = crud_map;
		config.crud_root = flatten_recursive(crud_root);

		socket.emit('config', config);
	});

	socket.on('item', (crud_id, item_id) =>
	{
		let crud = crud_from_id(crud_id);
		
		socket.emit('crud', {crud_id : crud_id});

		if (item_id === 'new')
			socket.emit('item', crud_id, {id:'new'});
		else
		{
			let q = crud.model.query()
			.findById(item_id);

			crud.joins.forEach(j => q.leftJoinRelation(j).eager(j));

			q.then(item =>
			{
				item.___item_title = item.toString();
				socket.emit('item', crud_id, item);
			})
			.catch(e =>
			{
				socket.emit('message', 'Error', `Could not load item from ${crud.name} with ID ${item_id}.  Error:  ${e.message}`, 'danger');
			});
		}
	});

	socket.on('save', (crud_id, item_id, updates) =>
	{
		console.log(updates);
		let crud = crud_from_id(crud_id);

		if (crud.historyUpdateCB)
			crud.makeHistoryUpdateCB(item_id, updates).then(proceed);
		else
			proceed(updates);

		function proceed (item)
		{
			Object.keys(updates).forEach(k => Array.isArray(updates[k]) ? updates[k] = JSON.stringify(updates[k]) : false);
			console.log(item_id);
			updates.updated_at = new Date(); //todo do this better
			let q = crud.model.query().updateAndFetchById(item_id, updates)

			crud.joins.forEach(j => q.leftJoinRelation(j).eager(j));

			q.then(item =>
			{
				socket.emit('message', item.toString() + ' updated successfully.');
				socket.emit('item', crud_id, item);
			}).catch(err => socket.emit('message', 'Error saving entry', err.message, 'danger'));
		}
	});
	socket.on('list',   (id, query) => 
	{
		debug('got list request for:', id);
		let crud = crud_from_path(crud_map[id]);
		if (crud.type==='CRUDEntry')
			return debug('not doing anything.', crud.name, 'is a `CRUDEntry` type');

		crud.model.query().count().then(count =>
		{
			query.item_total = count[0].count;
			let q = crud.model.query();
			
			crud.joins.forEach(j => q.leftJoinRelation(j).eager(j));

			/*if (crud.id === 'lotpage' || crud.id === 'jasper_journal')
				q.whereRaw('sites \\? ?', 'JasperHighlands.com');*/

			q
			.limit(query.page_items)
			.offset(query.page_items * query.page)
			.orderBy(query.order_by || 'updated_at', query.desc ? 'desc' : 'asc')
			.then(items =>
			{
				socket.emit('list', crud.id, items, query);
			});
		});
	});
	
	socket.on('preview', (crud_id, item_id, field_id, content) =>
	{
		console.log('preview request');
		
		let crud = crud_from_id(crud_id);

		crud.model.query().findById(item_id).then(item => 
		{
			item[field_id] = content;
			socket.emit('preview', field_id, item.renderContent());
		});

	});

	socket.on('login',  (username, password) => 
	{
		debug('Got login request...');

		User.query()
		.where('user_name', '=', username)
		.orWhere('email', '=', username)
		.first()
		.then(_user => 
		{
			if (!_user)
				return socket.emit('logout', 'Login failed.', 'warning');

			user = _user;

			user.validatePassword(password)
			.then(r => 
			{
				if (r !== true)
					return socket.emit('logout', 'Login failed.', 'warning');
				else
				{
					let o =
					{
						user_name  : user.user_name,
						first_name : user.first_name,
						last_name  : user.last_name,
						email      : user.email,
					};
					socket.emit('login', o);
				}
			});				
		});
	});

	socket.on('log', message =>
	{
		console.log(message);
	});

	socket.on('logout', () =>
	{
		user = undefined;
		debug('user logged out');
		socket.emit('logout', 'You have been logged out.');
	});

	socket.on('fkresolve', (crud_id, joins) =>
	{
		console.log('got resolution request:', crud_id);
		//emit fkresolve to provide relation fields from DB (todo use to populate media)
		crud_from_id(crud_id).model.query().leftJoinRelation(joins).eager(joins).then(items => socket.emit('fkresolve-'+crud_id, items));
	});

	socket.on('media', (crud_id, _path, attached_to_id, md5s) =>
	{
		debug('got media request');
		let crud = crud_from_path(crud_map[crud_id]);
		let ml   = crud_from_path(crud_map[crud.media_crud]);
		/*
		let p;
		if (!_path)
			p = ml.model.fileDest('%', attached_to_id);
		else
			p = new Promise(res => res(_path + '%'));

		p.then(__path =>
		{

			if (!_path)
				__path = path.relative(ml.model.real_dir, __path);

			__path = path.posix.normalize(__path.replace(/\\/g, '/'));

			__path = path.posix.join('/', __path);

			console.log(__path);
			*/
			ml.model.query()
			//.where('media_path', 'LIKE', __path)
			//.orWhereRaw('used_on \\? ?', attached_to_id)
			//.orWhereIn('md5', md5s||[])
			.then(media =>
			{
				socket.emit('media', '__path', media);
			});
	//	});

	});

	/** 
	 * Responds to simple queries, used to fill out foreign key fields on the 
	 * front end etc.
	 */
	socket.on('query', (query_id, crud_id, query, fields) =>
	{
		let crud = crud_from_id(crud_id);

		let q = crud.model.query()
		.select(fields);

		crud.joins.forEach(j => q.leftJoinRelation(j).eager(j));
		
		for (let k in query)
			q.where(k, '=', query[k]);

		q.then(result => socket.emit('query', query_id, crud_id, result));

	});

	ss(socket).on('file', (stream, data) =>
	{
		debug('received file:', data.name, 'size:', data.size);

		let crud = crud_from_path(crud_map[data.crud]);
		let ml   = crud_from_path(crud_map[crud.media_crud]);

		ml.model.fileDest(data.name, data.attached_to_id)
		.then(filename =>
		{
			debug('saving file to: ', filename);

			fx.mkdir(path.dirname(filename), (err) =>
			{
				if (err)
					return socket.emit('message', 'Upload Failed', err.message, 'danger');
				
				let writestream = fs.createWriteStream(filename);

				writestream.on('finish', () => 
				{
					ml.model.processUploadedFile(filename)
					.then(mf =>
					{
						let msg =  data.name + ' saved to ' + path.basename(filename);
						debug(msg);
						socket.emit('message', 'Upload Finished', msg, 'success');
						socket.emit('file', mf);
					});
					writestream.end();
				});
				stream.pipe(writestream);
			});
		});

	});

	//socket.on('url',    () => {});

	if (!user)
	{
		debug('Demanding user login...');
		socket.emit('logout', 'Please log in...');
	}
}

