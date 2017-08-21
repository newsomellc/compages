'use strict';
module.exports = SocketHandle;

/**
 * This class is passed to handlers for CRUD classes
 * so that they don't need a static reference to 
 * any of our presence classes in order to make use 
 * of the websocket.
 *
 * It is instantiated upon socket connection.
 */
function SocketHandle (params)
{
	const self = Object.create(null);
	/** 
	 * Displays a bootstrap modal prompt to the user, asking them to enter information.
	 *     {string} prompt - explanatory text to display.
	 *     {cb}     function - pass the result to this.
	 */
	function promptText (prompt, cb)
	{
	}
	/**
	 * Displays a prompt as a dropdown menu.
	 */
	function promptSelect (prompt, options, cb)
	{
	}
	/**
	 * Displays a modal alert.
	 *    {string} message - message to show
	 *    {mclass} a css class to apply to the modal dialog.
	 */
	function message (message, mclass)
	{
	}

	/**
	 * Register a long-running process.  Displays a loading bar on the user's screen.  Returns two 
	 * callbacks-- one for progress updates, the other when done.
	 *     {string} some text to display with this indicator
	 *     {pclass} a CSS class to apply to the indicator.
	 */
	function showProgress (text)
	{
		let o = 
		{
			update : () => {},
			done   : () => {},
		}
		return o;
	}
	/**
	 * If there is a file awaiting download, this will give you a stream of it.
	 * The action involved with this should have already gotten the other info
	 * (filename etc) since it's handled special.
	 */
	function streamFile ()
	{
	}


	return self;
}
