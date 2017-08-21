/**
 * The media tables have to all be separate, but identical, so I spun this into
 * a separate function.
 */
function make_media_table(table) 
{
	table.string('md5').primary().notNull();
	table.string('media_path').unique();
	table.text('caption').defaultsTo('').notNull();
	table.jsonb('tags').defaultsTo('[]').notNull();
	table.jsonb('used_on').defaultsTo('[]').notNull();
	table.jsonb('duplicates').defaultsTo('[]').notNull();
	table.jsonb('history').defaultsTo('[]').notNull();
	table.boolean('orphaned').defaultsTo(false).notNull();
	table.boolean('in_trash').defaultsTo(false).notNull();
	table.timestamps(false, true);
}

function make_blog_table(table)
{
	table.increments('id').primary();
	table.integer('author').unsigned().references('id').inTable('admin.User').notNull();
	table.string('title');
	table.text('lead_text');
	table.text('body_copy');
	table.text('cover_image');
	table.jsonb('images').defaultsTo('[]').notNull();
	table.string('slug');
	table.jsonb('sites').defaultsTo('[]').notNull();
	table.jsonb('tags').defaultsTo('[]').notNull();
	table.jsonb('history').defaultsTo('[]').notNull();
	table.jsonb('notes').defaultsTo('[]').notNull();
	table.boolean('in_trash').defaultsTo(false).notNull();
	table.timestamps(false, true);
}

module.exports.up = (knex, Promise) => knex.schema
	.raw('CREATE SCHEMA nocms;')
	.raw('SET search_path=nocms,public;')
	.withSchema('nocms');

module.exports.down = (knex, Promise) => knex.schema.raw('DROP SCHEMA IF EXISTS nocms CASCADE;');

module.exports.make_media_table = make_media_table;
module.exports.make_blog_table  = make_blog_table;
