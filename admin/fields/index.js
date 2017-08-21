/**
 * A shortcut module-- lets you load all the fields from this directory easily
 * with only a single require statement.
 * 
 * Like what's done in Python but trust me far less annoying (no race conditions
 * on import).
 */
module.exports =
{
	BooleanField  : require('./BooleanField'),
	CodeTextArea  : require('./CodeTextArea'),
	Currency      : require('./Currency'),
	DateTimeField : require('./DateTimeField'),
	Field         : require('./Field'),
	ForeignKey    : require('./ForeignKey'),
	History       : require('./History'),
	Info          : require('./Info'),
	MediaFile     : require('./MediaFile'),
	Notes         : require('./Notes'),
	Numeric       : require('./Numeric'),
	Password      : require('./Password'),
	ReadOnly      : require('./ReadOnly'),
	Relation      : require('./Relation'),
	Select        : require('./Select'),
	Tags          : require('./Tags'),
	Text          : require('./Text'),
	TextArea      : require('./TextArea'),
};