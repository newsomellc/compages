'use strict';
module.exports = UploadControl;

const ss = require('socket.io-stream');

const dropzone        = require('../dropzone.pug');
const progress        = require('../progress.pug');
const define_property = require('../../../util/define_property');

/**
 * Handles file uploads.  Adds a `#droptarget` div overlay that only responds to drag events with
 * files, and emits file upload events.  Carries the admin_id and/or the admin link path of the 
 * media library it links to.
 */
function UploadControl (socket)
{
	if (new.target) throw Error(this.constructor.name + ' cannot be called with `new` keyword.');
	const self = {};
	if (!socket)
		throw Error('UploadControl needs a socket reference to work.');

	let enabled          = false;
	let media_id         = null;
	let media_name       = null;
	let attached_to_id   = null;
	let attached_to_name = null;
	let queue            = [];

	function saveFileToLibrary(file)
	{
		let ctx =
		{
			crud           : media_id,
			size           : file.size,
			completed      : 0,
			name           : file.name,
			attached_to_id : attached_to_id,
		};

		let stream = ss.createStream();

		queue.push(ctx);

		ss(socket).emit('file', stream, ctx);
		ss.createBlobReadStream(file)
		.on('data', chunk =>
		{
			ctx.completed += chunk.length;
			updateProgress();
		})
		.on('end', () => console.log('done'))
		.pipe(stream);
	}

	//TODO find some way to throttle this back.
	function updateProgress()
	{
		queue.forEach((ctx, idx) => ctx.idx = idx);
		if (!queue.length)
			return $('#progress').hide();
		else
			$('#progress').show().html(progress({queue: queue}));

		$('#progress .dismiss').click(function (e) 
		{
			queue = queue.slice($(e.target).attr('queue_id'));
			updateProgress();
		});
		$('#progress .dismiss-all').click(e=>
		{
			queue = [];
			updateProgress();
		});
	}

	function attachToPage ()
	{
		let last_target;

		$(window).on('dragenter', e =>
		{
			if (!enabled)
				return true;

			$('#dropzone').html(dropzone(
			{
				media_id         : media_id,
				media_name       : media_name,
				attached_to_id   : attached_to_id,
				attached_to_name : attached_to_name,
			}));


			$('#dropzone').css('visibility', 'visible');
			last_target = e.target;
		});
		$(window).on('dragleave', e =>
		{
			if (!enabled)
				return true;

			if (e.target === last_target)
				$('#dropzone').css('visibility', 'hidden');

		});

		$('#dropzone').bind('dragover', e =>
		{
			console.log('here');
			if (!enabled)
				return true;

			e.originalEvent.dataTransfer.dropEffect = 'copy';
			return false;
		});

		$('#dropzone').bind('drop', e =>
		{
			if (!enabled)
				return true;

			e.preventDefault();
			let files = e.originalEvent.dataTransfer.files;
			
			let fE = Array.prototype.forEach;
			fE.call(files, file => saveFileToLibrary(file));

			$('#dropzone').css('visibility', 'hidden');

			return false;

		});
	}

	let dpw = define_property.DefGetSet(self);
	
	dpw('enabled',        () => enabled,        v => 
	{
		enabled = v;
		console.log ('uploader ' + (enabled?'enabled':'disabled'));
	});
	dpw('media_id',       () => media_id,       v => 
	{
		media_id = v;
		//console.log ('got media:', media_id);      
	});
	dpw('attached_to_id', () => attached_to_id, v => 
	{
		attached_to_id = v;
		//console.log('attaching media to:', attached_to_id);
	});
	dpw('media_name',       () => media_name, v => media_name = v);
	dpw('attached_to_name', () => attached_to_name, v => attached_to_name = v);

	attachToPage();
	
	return self;
}