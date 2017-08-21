
exports.up = (knex, Promise) => knex.schema
	.raw('CREATE SCHEMA admin;')
	.raw('SET search_path=admin,public;')
	.withSchema('admin')
	.createTable('User', function (table)
	{
		table.increments('id').primary();
		table.string('first_name').notNull();
		table.string('last_name').notNull();
		table.string('email').notNull();
		table.string('user_name').unique().notNull();
		table.string('pass_hash');
		table.boolean('superuser').defaultsTo(false).notNull();
		table.jsonb('permissions').defaultsTo('[]').notNull();
		table.boolean('in_trash').defaultsTo(false).notNull();
		table.timestamps(false, true);
	})
	.createTable('Setting', function (table)
	{
		table.string('key').primary();
		table.jsonb('value').defaultsTo('[]').notNull();
		table.boolean('in_trash').defaultsTo(false);
	});

exports.down = (knex, Promise) => knex.schema.raw('DROP SCHEMA IF EXISTS admin CASCADE;');
