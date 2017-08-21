/**
 * field/CodeTextArea - a text area oriented towards code. 
 */
 'use strict';
module.exports = CodeTextArea;

const pug = require('pug');

const TextArea = require('./TextArea');

function CodeTextArea (params)
{
	if (!(this instanceof CodeTextArea))
		return new CodeTextArea(params);
	const self = this;
	TextArea.call(self, params);
}

const FORM_TPL = `
.row
	.col-6
		.codefield(id=field.id style='height:40rem; width:100%;')
			!=value
	.col-6
		.codefield-preview(id=field.id+'_acepreview' style='height:40rem; overflow:scroll; width:100%;')
			span todo preview
`;

CodeTextArea.prototype = Object.assign(Object.create(TextArea.prototype), 
{
	type        : 'CodeTextArea',
	show_column : false,
	language    : 'jade',
	form_tpl    : FORM_TPL,
	editor      : undefined, //keeps a reference to our editor 
	onAfterRender : function ()
	{
		let editor = this.editor = ace.edit(this.id);
		editor.setTheme('ace/theme/monokai');
		editor.getSession().setMode('ace/mode/jade');
		editor.getSession().setUseWrapMode(true);
		editor.getSession().setUseSoftTabs(false);
		this.renderPreview();
		$('#' + this.id).on('input', e => this.renderPreview(e));

	},
	val : function ()
	{
		if (this.editor)
			return this.editor.getSession().getValue();
		else
			return $('#' + this.id).val();
	},
	renderPreview : function ()
	{
		try
		{
			$('#' + this.id + '_acepreview').html(pug.compile(this.editor.getSession().getValue())({}));
		}
		catch (e)
		{
			$('#' + this.id + '_acepreview').html(pug.compile(`pre(style='background-color: #633; color: #fff; height:100%') error: #{stack}`)(e)); 
		}
	},
});
