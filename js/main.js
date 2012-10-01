/* Author: Sebastian Trueg <trueg@openlinksw.com>
*/

/// The ODS session
var s_odsSession = null;


/**
 * Generic callback for AJAX calls and the like
 */
var errorCallback = function() {
  // TODO: inform the user
};


var noop = function() {
  /* do nothing */
};


/**
 * Reloads the current page resetting any parameters
 */
function resetAndReload() {
  console.log("resetAndReload");
  window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname;
};


/**
 * Extract query parameters from a URL
 */
var getParameterByName = function(url, name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url.substring(url.indexOf('?')));
    if(results == null)
        return "";
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
};


/**
 * Register methods to actions, events, and so on.
 */
ODS.ready(function() {
    console.log("Ready");

    $('#odsFeed').rssfeed('https://trueg.wordpress.com/feed/',
      { limit: 5,
        header: false,
        content: false
      },
      function() {
        $('.rssDate').timeago();
      }
    );
});
