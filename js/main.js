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


/**
 * Reloads the current page resetting any parameters
 */
function resetAndReload() {
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
 * Callback function for successful ODS authentication.
 *
 * This function will store the session cookie and reflect the logged in
 * status on the page.
 */
function newSessionCallback(session) {
    console.log("New session created: " + session.sessionId());

    s_odsSession = session;

    // save session id in cookie
    $.cookie("ods_session_id", s_odsSession.sessionId());

    // make sure we have a clean URL
    // TODO: I am sure this is a common issue, so find the "correct" way to do it
    if(window.location.search.length > 0)
      resetAndReload();
    else
      loadUserData();
}


/**
 * Check if the session id saved in the cookie is still valid.
 *
 * If so the logged in state will be reflected in the page.
 */
function checkSession() {
    if(s_odsSession) {
        loadUserData();
    }
    else {
        var sessionId = $.cookie("ods_session_id");
        if(sessionId != null) {
            console.log("Have session id " + sessionId);
            // check if the session is still valid
            ODS.createSessionFromId(sessionId, newSessionCallback, null);
        }
        else {
            console.log("No session id stored.");
        }
    }
}


/**
 * Preconditions: needs a valid s_odsSession object which has been authenticated.
 *
 * Will load user details and display them on the page tp refect the logged in status.
 */
function loadUserData() {
    s_odsSession.userInfo(function(result) {
        console.log("loadUserInfo");
        console.log(result);

        var usrInfo = { name: result["fullName"] != null ? result["fullName"] : result["name"] };

        console.log(usrInfo);

        $('#loginLink').hide();
        $('#profileLink a').text("Logged in as " + usrInfo.name);
        $('#profileLink').show();
      }, function() {
      // TODO: inform the user
    });
}


function setupLoginLink() {
    // Login popup
    $("#loginLink a").qtip({
        position: {
          my: "left center",
          at: "right center"
        },
        content: {
          text: $("#loginPopup")
        },
        hide: {
          fixed: true,
          delay: 1000
        },
        style: {
          classes: 'ui-tooltip-rounded ui-tooltip-light'
        }
      });

    // Facebook login
    $("#facebookLogin").click(function(event) {
        // cancel default submit behaviour
        event.preventDefault();
        // construct our callback url
        var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?login=facebook";
        // try to login via OpenID
        ODS.createFacebookSession(callbackUrl);
    });

    // Twitter login
    $("#twitterLogin").click(function(event) {
        // cancel default submit behaviour
        event.preventDefault();
        // construct our callback url
        var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?login=twitter";
        // try to login via OpenID
        ODS.createTwitterSession(callbackUrl);
    });

    // LinkedIn login
    $("#linkedinLogin").click(function(event) {
        // cancel default submit behaviour
        event.preventDefault();
        // construct our callback url
        var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?login=linkedin";
        // try to login via OpenID
        ODS.createLinkedInSession(callbackUrl);
    });

    // WebID login
    // FIXME: reload on https with ?login=webid
    $("#webIdLogin").click(function(event) {
        // try to login via WebID
        ODS.createWebIDSession(newSessionCallback, errorCallback);
    });

    $("#profileLink a").click(function(event) {
        event.preventDefault();

        s_odsSession.logout(function() {
          // remove the cookie
          $.cookie("ods_session_id", null);

          // reload the page to reset everything without any parameters
          resetAndReload();
        });
    });
};

/**
 * Register methods to actions, events, and so on.
 */
$(document).ready(function() {
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

    setupLoginLink();

    // Check if we are being redirected from a login
    var loginMethod = getParameterByName(window.location.href, 'login');
    if(loginMethod == 'facebook') {
      ODS.createFacebookSession(null, newSessionCallback, errorCallback);
    }
    if(loginMethod == 'twitter') {
      ODS.createTwitterSession(null, newSessionCallback, errorCallback);
    }
    if(loginMethod == 'linkedin') {
      ODS.createLinkedInkSession(null, newSessionCallback, errorCallback);
    }
    else if(loginMethod == 'openid') {
      ODS.createOpenIdSession(null, null, newSessionCallback, errorCallback);
    }
    else {
      checkSession();
    }
});
