/* Author: Sebastian Trueg <trueg@openlinksw.com>
*/

ODS.setOdsHost('localhost:8890', 'localhost:4433');

/// The ODS session
var s_odsSession = null;


var noop = function() {
  /* do nothing */
};


ODS.setDefaultErrorHandler(function(x) {
  hideSpinner();
  ODS.genericErrorHandler(x);
});


function showSpinner(msg) {
  if(!msg)
    msg = "Please wait...";

  // Create the backdrop
  var bd = $('<div>');
  bd.css({
    "background-color": "#000000",
    bottom: 0,
    left: 0,
    position: "fixed",
    right: 0,
    top: 0,
    "z-index": 2000,
    opacity: 0.8
  });

  // Create the element holding the spinner
  bd.append("<div>");
  var c = $(bd.children()[0]);
  c.css({
    top: "30%",
    height: "80px",
    "text-align": "center",
    color: "white",
    position: "relative"
  });

  // Create the info message
  c.append('<p id="__theSpinner__"></p><p style="font-size:2em; font-weight:bold;">' + msg + '</p>');

  // insert it all
  $("body").append(bd);

    // create the spinner
  $("#__theSpinner__").css({
    height: "60px"
  }).spin();

  $(document).data("__spinner__", bd);
}

function hideSpinner() {
  var $doc = $(document);
  if($doc.data("__spinner__")) {
    $doc.data("__spinner__").remove();
    $doc.data("__spinner__", null);
  }
}


/**
 * Reloads the current page resetting any parameters
 */
function resetAndReload() {
  console.log("resetAndReload");
  window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname;
}


/**
 * Extract query parameters from a URL
 */
var getParameterByName = function(url, name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
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
$(document).ready(function() {
  $('.navigation-wrapper').affix({
    offset: {
      top: 107
    }
  });

/*    $('#odsFeed').rssfeed('https://trueg.wordpress.com/feed/',
      { limit: 5,
        header: false,
        content: false
      },
      function() {
        $('.rssDate').timeago();
      }
    );*/
});
