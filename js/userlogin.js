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

    setupLogoutLink();
    $(document).trigger('ods-new-session', s_odsSession);
    loadUserData();
}


/**
 * Try to login via WebID but do not show any error messages.
 */
function attemptWebIDLogin() {
  console.log("Attempting automatic WebID login");
  ODS.createWebIDSession(newSessionCallback, setupLoginLink);
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
        $('#profileLinkUserName').html(usrInfo.name);
        $('#odsUserCardName').html('<a href="' + result.iri + '">' + usrInfo.name + "</a>");

        $('.odsLoginLink').hide();
        $('#userProfileLinks').show();
        $('#odsUserLogout').show();
        $('#odsUserCard').show();
      }, function() {
      // TODO: inform the user
    });
}


function setupLoginLink() {
    console.log("setupLoginLink");

    // For now we need to setup the digest authentication manually
    var digestLoginFnc = function() {
      ODS.createSession(document.digestLogin.usr.value, document.digestLogin.pwd.value, newSessionCallback, errorCallback);
      $("#loginPopup").modal("hide");
    };
    $("form#digestLogin input.odsButton").click(function(event) {
        event.stopPropagation();
        digestLoginFnc();
    });
    $("form#digestLogin .odsLoginInput").keydown(function(event) {
        event.stopPropagation();
        if(event.keyCode == 13) {
          digestLoginFnc();
        }
    });


    // determine the list of supported services
    ODS.authenticationMethods(function(methods) {
      console.log(methods);
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        if (method == 'digest')
          continue;
        var loginUi = $("#" + method + "Login");
        var autoLoginUi = $("#" + method + "Auto");
        loginUi.show();
        autoLoginUi.show();

        if(method == "browserid")
          continue;

        if(method == "openid") {
            var openIdLoginFnc = function() {
              var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              ODS.createOpenIdSession(document.openidLoginForm.openidUrl.value, callbackUrl, newSessionCallback, errorCallback);
            };
            $("#openidLoginForm .odsLoginInput").keydown(function(event) {
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

          autoLoginUi.click(function(event) {
            event.preventDefault();
            // we extract the method from the id of the element
            // this is required since the "method" var scope spans all functions
            // created here and will always have the last value of the iteration
            var m = this.id.substring(0,this.id.indexOf("Auto"));
            // construct our callback url
            var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            // try to login via OpenID
            ODS.registerOrLoginViaThirdPartyService(m, callbackUrl);
          });
        }
      }
    });

    // determine the list of supported services
    ODS.registrationMethods(function(methods) {
      console.log(methods);
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var registerUi = $("#" + method + "Register");
        registerUi.show();

        if(method == "browserid")
          continue;

        if(method == "openid") {
            var openIdRegFnc = function() {
              var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              ODS.registerViaOpenId(document.openidRegisterForm.openidUrl.value, callbackUrl, newSessionCallback, errorCallback);
            };
            $("#openidRegisterForm .odsLoginInput").keydown(function(event) {
              event.stopPropagation();
              if(event.keyCode == 13) {
                openIdRegFnc();
              }
            });
            $("#openidRegisterBtn").click(function(event) {
              event.preventDefault();
              openIdRegFnc();
            });
        }
        else {
          $("#otherRegistration").show();
          registerUi.click(function(event) {
            // we extract the method from the id of the element
            // this is required since the "method" var scope spans all functions
            // created here and will always have the last value of the iteration
            var m = this.id.substring(0,this.id.indexOf("Register"));
            console.log("Performing registration via " + m);
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
              ODS.registerViaThirdPartyService(m, callbackUrl);
            }
          });
        }
      }
    });
}

function setupLogoutLink() {
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
    // Check if we have a sid parameter from a login redirect
    var sid = getParameterByName(window.location.href, 'sid');
    var err = getParameterByName(window.location.href, 'error_msg');
    if(sid.length > 0) {
      ODS.createSessionFromId(sid, newSessionCallback, checkSession);
    }
    else if(err.length > 0) {
      var $errorDialog = $('#errorDialog');
      $errorDialog.on('hide', function() {
        // we remove the error message from the URL
        resetAndReload();
      });
      // show an error message
      $('#errorDialogMsg').text(err);
      $errorDialog.modal();
    }
    else {
      checkSession();
    }
});
