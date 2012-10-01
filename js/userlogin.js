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
    var expire = new Date();
    expire.setDate(expire.getDate() + 7); // one week expiration
    $.cookie("ods_session_id", s_odsSession.sessionId(), {expires: expire, path: '/'});

    $(document).trigger('ods-new-session', s_odsSession);
    loadUserData();
}


/**
 * Try to login via WebID but do not show any error messages.
 */
function attemptWebIDLogin() {
  console.log("Attempting automatic WebID login");
  ODS.createWebIDSession(newSessionCallback, noop);
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
            ODS.createSessionFromId(sessionId, newSessionCallback, attemptWebIDLogin);
        }
        else {
            console.log("No session id stored.");
            attemptWebIDLogin();
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
        if(result["photo"] && result["photo"].length > 0) {
            // build the photo URL which is a DAV path for now. later this could also be a public URL
            usrInfo["photo"] = result.photo.substr(0, 1) == '/' ? ODS.davUrl(result.photo) : result.photo;
        }
        console.log(usrInfo);

        var usrLink = usrInfo.name;
        if(usrInfo.photo) {
          $('#odsUserCardPhoto').attr("src", usrInfo.photo);
          usrLink = '<img class="minigravatar" src="' + usrInfo.photo + '" /> ' + usrLink;
        }
        $('#profileLink a').html(usrLink);
        $('#odsUserCardName').html('<a href="' + result.iri + '">' + usrInfo.name + "</a>");

        $('.odsLoginLink').hide();
        $('#profileLink').show();
        $('#odsUserLogout').show();
        $('#odsUserCard').show();
      }, function() {
      // TODO: inform the user
    });
}


function setupLoginLink() {
    // Login popup
/*    $("#loginLink a").click(function(event) {
      event.preventDefault();

      // show a model login dlg
      $("#loginPopup").modal();
    });*/

    // For now we need to setup the digest authentication manually
    var digestLoginFnc = function() {
      ODS.createSession(document.digestLogin.usr.value, document.digestLogin.pwd.value, newSessionCallback, errorCallback);
      $("#loginPopup").modal("hide");
    };
    $("form#digestLogin > input.odsButton").click(function(event) {
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
            // we extract the method from the id of the element
            // this is required since the "method" var scope spans all functions
            // created here and will always have the last value of the iteration
            var m = this.id.substring(0,this.id.indexOf("Login"));
            console.log("Performing login via " + m);
            // cancel default submit behaviour
            event.preventDefault();

            if(m == "webid") {
              //
              // Sadly it is not possible yet to send a client certificate via AJAX calls.
              // Thus, our only way out is to redirect to the https version of our page
              // and let the auto-login do its work
              //
              //ODS.createWebIDSession(newSessionCallback, errorCallback);
              $("#loginPopup").modal("hide");
              if(window.crypto && window.crypto.logout)
                window.crypto.logout();
              window.location.href = "https://" + ODS.sslHost() + window.location.pathname;
            }
            else {
              // construct our callback url
              var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              // try to login via OpenID
              ODS.createThirdPartyServiceSession(m, callbackUrl);
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

    $(".odsUserLogout").click(function(event) {
        event.preventDefault();

        s_odsSession.logout(function() {
          // remove the cookie
          $.cookie("ods_session_id", null);

          // reset the selected client certificate if possible
          if(window.crypto && window.crypto.logout)
            window.crypto.logout();

          // reload the page to reset everything without any parameters
          resetAndReload();
        });
    });
}


ODS.ready(function() {
   setupLoginLink();

    // Check if we have a sid parameter from a login redirect
    var sid = getParameterByName(window.location.href, 'sid');
    if(sid.length > 0) {
      ODS.createSessionFromId(sid, newSessionCallback, attemptWebIDLogin());
    }
    else {
      checkSession();
    }
});
