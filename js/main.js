/* Author: Sebastian Trueg <trueg@openlinksw.com>

*/

/**
 * Register methods to actions, events, and so on.
 */
$(document).ready(function() {
    console.log("Ready");

    $('#testOdsButton').button();
    $('#getOdsButton').button();
    $('#odsFeed').rssfeed('https://trueg.wordpress.com/feed/',
      { limit: 5,
        header: false,
        content: false
      }
    );
});
