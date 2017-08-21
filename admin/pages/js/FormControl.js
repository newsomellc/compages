'use strict';
module.exports = FormControl;

const ss = require('socket.io-stream');

const dropzone        = require('../dropzone.pug');
const progress        = require('../progress.pug');
const define_property = require('../../../util/define_property');
const ItemForm        = require('../ItemForm.pug');
const media_thumb     = require('../media_thumb.pug');

/**
 * Handles forms.  Is notified when fields change, builds a list of what
 * needs to be saved, and prompts the user to save or not on close, 
 * and emits the update event that actually enters new info into the 
 * database.
 */
function FormControl (socket)
{
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const self = {};
	if (!socket)
		throw Error('FormControl needs a socket reference to work.');

	let crud    = undefined;
	let item    = undefined;
	let queries = [];
	let changes = [];
	let media   = [];

	/** 
	 * Called when the modal is about to be exited for any reason.
	 * If there are unsaved changes, it aborts the exit event and 
	 * confirms it's what you want to do before proceeding.
	 */
	function onClickDismiss (e)
	{
		if (changes.length)
		{
			console.log('here');
			$('#item-message').html('<div class="alert alert-danger">You are closing with unsaved changes. Click again to confirm.</div>');
			$('#modal').off('hide.bs.modal', onClickDismiss);
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		}
		item = null;
		$('#messages-body').append($('#messages'));
		$('#modal').off('hide.bs.modal', onClickDismiss);
	}

	/** 
	 * Called when a field changes.  It's added to the list of IDs that need to 
	 * be collected when calling save to do an update.
	 */
	function onFieldChanged (fid)
	{
		return (e) =>
		{
			changes.push(fid.slice(1));
			$('[data-crud-action="save"]').removeClass('disabled');
		}
	}

	/** 
	 * Handles the save event, emiting an update request to the server.
	 */
	function onClickSave (e)
	{
		console.log('saving');
		let packet = changes.reduce((packet, fid) => 
		{
			packet[fid] = crud.fields[fid].val();
			return packet;
		}, Object.create(null)); 
		changes = [];
		socket.emit('save', crud.id, item.getPK(), packet);
		//$('[data-crud-action="save"]').addClass('disabled');
		$('#modal').modal('hide');
	}

	/** 
	 * Bound to the action buttons, they emit the action events for whatever
	 * crud/item/etc they're related to.
	 */
	function onClickAction (e)
	{

	}

	/**
	 * Called whenever an item GET comes through the socket.
	 */
	function onGetItem(crud_id, _item)
	{
		item = _item;
		console.log('getting extra stuff for item form');
		changes = [];
		let md5s = [];
		Object.values(crud.fields).forEach(field =>
		{
			if (field.type === 'MediaFile' && field.val())
				md5s = [...md5s, ...field.val()];
			let placeholder = `[crud="${crud.id}"][crud-pk="${item.getPK()}"][crud-field="${field.id}"]`;
			$(placeholder).html(field.render('form', item));
			let fid = '#' + field.id;
			$(fid).on('input', onFieldChanged(fid));
			$(fid).on('change', onFieldChanged(fid));

			if (!field.needs_media)
				field.onAfterRender();
		});

		$('#modal').on('hide.bs.modal', onClickDismiss);
		$('[data-crud-action="save"]').on('click', onClickSave);
		
		if (crud.media_crud)
			socket.emit('media', crud.id, null, item.getPK(), md5s);

	}
	/** 
	 * Called on every new list action.  All this one does is unset the item var
	 * so you don't end up with erroneous uploads.
	 */
	function onGetList()
	{
		item = null;
	}

	/** 
	 * Some fields need extra information to be loaded after the form has been 
	 * rendered.  This allows them to receive that information, and re-render
	 * themselves.
	 */
	function onGetQuery(query_id, crud_id, result)
	{
		if (queries.indexOf(query_id) < 0)
			return;
		queries.splice(queries.indexOf(query_id));

		crud.fields[query_id].options = result.map(r => Object.values(r));

		console.log($('#placeholder_' + query_id));
		$('#placeholder_' + query_id).html(crud.fields[query_id].render('form', item));
		$('#' + query_id).on('change', onFieldChanged('#' + query_id));
		$('#' + query_id).selectize();

	}

	/** 
	 * This is called whenever the current CRUD changes.  Allows this class to
	 * have access to the crud.
	 */
	function onGetCrud(passer)
	{
		crud = passer.crud;
	}

	/** 
	 * This is called when the media request comes back with stuff.
	 * It might change, but for now this will work.
	 */
	function onGetMedia(path, _media)
	{
		if (media)
		{
			media = _media;
			Object.values(crud.fields).filter(f => f.needs_media).forEach(f => f.onAfterRender({media : media}));
		}
	}

	/**
	 * If the current CRUD has files, this is called when an update from the 
	 * other side comes through.
	 */
	function onGetFile(mf)
	{
		media.push(mf);
		renderMediaThumb(mf);
	}

	/** 
	 * Messages can be received here.  If the item modal is active, they'll be
	 * copied here. Messages still always go to the main message queue above
	 * the mainpane.
	 */
	function onGetMessage(item)
	{

	}

	function renderMediaThumb(_media)
	{
	}

	socket.on('crud', onGetCrud);
	socket.on('list', onGetList);
	socket.on('item', onGetItem);
	socket.on('file', onGetFile);
	socket.on('query', onGetQuery);
	socket.on('media', onGetMedia);

	//let dpw = define_property.DefGetSet(self);
	return self;

}