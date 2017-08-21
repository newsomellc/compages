/**
 * Settings-- stores settings for the app.
 * Haven't figured out exactly everything we're going to do with this, but it 
 * should come in handy.
 * It (sort of) emulates a key->value store.
 */
'use strict';
const assert  = require('assert');
const express = require('express');
const Model   = require('objection').Model;

const f = require('./fields');

class Setting extends Model {}

Setting.tableName = 'Setting';
Setting.idColumn  = 'key';

Setting.crud =
{
	id          : 'settings',
	type        : 'CRUDTable',
	name        : 'Setting',
	name_plural : 'Settings',
	model       : Setting,
	fields :
	[
		f.Text(
		{
			id        : 'name',
			name      : 'Setting Name',
			help_text : 'The name for this setting',
			set       : 'Settings',
		}),
		f.Text(
		{
			id        : 'value',
			name      : 'Value',
			help_text : 'Setting value',
			set       : 'Settings',
		}),
	],
};

module.exports = Setting;
