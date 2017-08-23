#!/usr/bin/env node
const path     = require('path');
const chalk    = require('chalk');
const minimist = require('minimist');

/**
 * Print out message that a command isn't implemented.
 */
function stub () 
{
	console.error('this command is not implemented yet.');
}

/**
 * Create a project with the name of the CWD
 */
function init (switches, name, dest='.')
{
	if (!name)
		return error('init', 'Project name is required.');
	//check if dir exists
	//if NX, mkdir
	//if exists, check if empty
	//if dir now exists and is empty:
	//run function addsite
	console.log(`project ${name} created in path ${path}`);
}

/**
 * Add a site to the project.
 */
function addsite (switches, name, dest)
{
	//if name not given, ask for name
	//ask for template engine (default: pug)
	//ask for CSS engine (default: SCSS)
	//ask for JS engine (default: serve as static.  Define a pipeline later.)
	//write out compages.json
	//write out gulpfile (if requested)
	//write out knexfile (if requested and part of the app)

}

/**
 * Removes a site from the project.
 */
function removesite (switches, name)
{
	//are you sure?
	//removes it from compages.json (but leaves the files where they are)

}

/**
 * Runs the project via Express
 */
function run (switches, site)
{
	const Site   = require('./Site');
	const Runner = require('./Runner');

	//iterate over the sites, find one that matches site
	//throw error if it isn't found
	//
}

/**
 * Builds the project via Gulp
 */
function build (switches, site, dest)
{
	const Site   = require('./Site');
	const Runner = require('./Runner');

}

/**
 * Manages the admin backend page. TODO: consider spinning off into separate package: compages-admin?.
 */
function admin (switches, subcommand, ...params)
{
	let subcommands = 
	{
		enable       : '',
		disable      : '',
		makeknexfile : '',
		dbconfig     : '',
		addtable     : '',
	};
	let subhelptext =  
	{
		enable       : '',
		disable      : '',
		makeknexfile : '',
		dbconfig     : '',
		addtable     : '',
	};
	let subusage =  
	{
		enable       : '',
		disable      : '',
		makeknexfile : '',
		dbconfig     : '',
		addtable     : '',
	};
	let subusage_details =  
	{
		enable       : '',
		disable      : '',
		makeknexfile : '',
		dbconfig     : '',
		addtable     : '',
	};
}

/**
 * Shows detailed help for each item (beyond just the usage statement)
 */
function help (switches, command)
{
	if (!command)
	{
		return show_usage();
	}
	if (!helptext[command])
		return error('help', 'No help text for command: ' + command);
	console.log();
	console.log(' ', chalk.green.bold(command + ':'), chalk.yellow.bold(usage[command]));
	console.log();
	console.log(helptext[command]);
}

/**
 * Enable or disable a plugin.  The plugin must be installed in npm.
 * 
 * Plugins are ONLY for things like admin-- that need their own CLI commands or gulp phases etc.
 *
 * i.e. A blog is just special instructions to build pages. Doesn't need a plugin.
 * AWS deploy needs its own gulp phase, may even need to be able to store its own config. It's a plugin.
 *
 */
function plugin (switches, command, name)
{
	if (!command || !name)
		return show_usage('plugin');

	try 
	{
		plugin = require(name);
	}
	catch (ex)
	{
		error('plugin', `Plugin ${name} is not installed. Run ${chalk.bold.yellow('npm install ' + name)} and try again.`);
	}
}


/**
 * Print out an error.
 */
function error(command, message)
{
	console.error(chalk.red(message));
	process.exit(1);
}

/**
 * Just shows the usage for a command.
 */
function show_usage(command)
{
	if (command)
		return console.log('Usage is:', chalk.bold.yellow(usage[command]));
	
	console.log(chalk.bold.cyan(`
  ,ad8888ba,
 d8"'    \`"8b
d8'
88              ,adPPYba,   88,dPYba,,adPYba,   8b,dPPYba,   ,adPPYYba,   ,adPPYb,d8   ,adPPYba,  ,adPPYba,
88             a8"     "8a  88P'   "88"    "8a  88P'    "8a  ""     \`Y8  a8"    \`Y88  a8P_____88  I8[    ""
Y8,            8b       d8  88      88      88  88       d8  ,adPPPPP88  8b       88  8PP"""""""   \`"Y8ba,
 Y8a.    .a8P  "8a,   ,a8"  88      88      88  88b,   ,a8"  88,    ,88  "8a,   ,d88  "8b,   ,aa  aa    ]8I
  \`"Y8888Y"'    \`"YbbdP"'   88      88      88  88\`YbbdP"'   \`"8bbdP"Y8   \`"YbbdP"Y8   \`"Ybbd8"'  \`"YbbdP"'
                                                88                        aa,    ,88
                                                88                         "Y8bbdP"
`));
	console.log('');
	console.log(chalk.bold.green(rpad('', 14, ' '), 'The no-compromise content management system (that\'s not a CMS)'));
	console.log('');
	console.log('Usage is:', chalk.bold.yellow('compages <command>'));
	console.log('');
	console.log(chalk.bold('Where <command> is one of:'));

	console.log(rpad('', 8), chalk.bold.yellow(Object.keys(usage).join(', ')));
	
	console.log();
	console.log('Type', chalk.bold.yellow('compages -h <command>'), 'for detailed help.');
	
	process.exit(0);
}

/**
 * Pad str with chr until its length is equal to len
 */
function rpad (str, len, chr=' ')
{
	if (str.length >= len)
		return str;
	return str + Array(len - str.length).join(chr); //or just do this.
}

/// Dictionaries--to look up actions and info by the command used.
let commands =
{
	'init'       : init,
	'addsite'    : addsite,
	'removesite' : removesite,
	'plugin'     : plugin,
	'admin'      : stub,
	'run'        : run,
	'build'      : stub,
	'help'       : help,
};

/**
 * Short bit of explanatory help text.
 */
let helptext = 
{
	'init'       : `Creates a new Compages project in the given directory.`,
	'addsite'    : `Adds a site to the current project`,
	'removesite' : `Removes a site to the current project`,
	'plugin'     : `Manages plugins that extend Compages functionality`,
	'run'        : `Runs the current project as a webserver`,
	'build'      : `Builds the project using gulp`,
	'admin'      : `Manages the admin system backend`,
	'help'       : `Display detailed help`,
};

/**
 * Basic usage for cli commands.
 */
let usage = 
{
	'init'       : `compages init <-fo> <name> <path>`,
	'addsite'    : `compages addsite <name> <path>`,
	'removesite' : `compages removesite <name>`,
	'plugin'     : `compages plugin <enable|disable> <name>`, 
	'run'        : `compages run <-ep>`,
	'build'      : `compages build <-ec>`,
	'admin'      : `compages admin <sub-command> <params>...`,
	'help'       : `compages help <command>`,
};

/**
 * Contains detailed usage (cli switches, params etc) for each command.
 */
let usage_details = 
{
	'init'       : ``,
	'addsite'    : ``,
	'removesite' : ``,
	'plugin'     : ``, 
	'run'        : ``,
	'build'      : ``,
	'admin'      : ``,
	'help'       : ``,
};

/// actual work starts here.

const cwd  = process.cwd();
const argv = require('minimist')(process.argv.slice(2));

let command = argv._[0];

if (command !== 'init')
	try
	{
		let config = require(path.join(cwd, 'compages.json'));
	}
	catch (ex)
	{
		console.error('`compages.json` not found in current working directory. Run `compages init` to start a new Compages project.');
	}


if (argv.h)
	help(argv, argv.h);
else if (!command)
	show_usage();
else if (!commands[command])
	process.exit(console.error(chalk.red('Unknown command: ' + command)));
else
{
	let switches = minimist(process.argv.slice(process.argv.indexOf(command)+1));
	commands[command](switches, ...argv._.slice(1));
}