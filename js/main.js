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
          my: "left bottom",
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

    // For now we need to setup the digest authentication manually
    var digestLoginFnc = function() {
      $("#loginLink a").qtip('toggle', false);
      ODS.createSession(document.digestLogin.usr.value, document.digestLogin.pwd.value, newSessionCallback, errorCallback);
    };
    $("form#digestLogin > input").click(function(event) {
        event.stopPropagation();
        digestLoginFnc();
    }).keydown(function(event) {
        event.stopPropagation();
        if(event.keyCode == 13) {
          digestLoginFnc();
        }
    });

    // determine the list of supported services
    ODS.authenticationMethods(function(methods) {
      for each (var method in methods) {
        var loginUi = $("#" + method + "Login");
        var registerUi = $("#" + method + "Register");
        loginUi.show();
        registerUi.show();

        if(method == "openid") {
            var openIdLoginFnc = function() {
              var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              ODS.createOpenIdSession(document.openidLogin.openidUrl.value, callbackUrl, newSessionCallback, errorCallback);
            };
            $("#openidLogin input").keydown(function(event) {
              event.stopPropagation();
              if(event.keyCode == 13) {
                openIdLoginFnc();
              }
            });
            $("#openidLoginBtn").click(function(event) {
              event.preventDefault();
              openIdLoginFnc();
            });
        }
        else {
          $("#otherLogins").show();
          $("#otherRegistration").show();
          loginUi.click(function(event) {
            // cancel default submit behaviour
            event.preventDefault();
            if(method == "webid") {
              ODS.createWebIDSession(newSessionCallback, errorCallback);
            }
            else {
              // construct our callback url
              var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              // try to login via OpenID
              ODS.createThirdPartyServiceSession(method, callbackUrl);
            }
          });
        }
      }
    });

    $("#odsNewAccount").click(function(event) {
      event.preventDefault();
      $("#odsLoginTab").hide();
      $("#odsRegisterTab").show();
    });
    $("#odsLogin").click(function(event) {
      event.preventDefault();
      $("#odsRegisterTab").hide();
      $("#odsLoginTab").show();
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

    // Check if we have a sid parameter from a login redirect
    var sid = getParameterByName(window.location.href, 'sid');
    if(sid.length > 0) {
      ODS.createSessionFromId(sid, newSessionCallback, errorCallback);
    }
    else {
      checkSession();
    }
});
