var s_loginLinkSetupDone = false;

function callbackUrl(needSsl, params) {
  needSsl = needSsl || 0;
  params = params || '';
  var url = (needSsl ? "https:" : window.location.protocol) + "//" + window.location.host + window.location.pathname + window.location.search;
  if (params.length > 0) {
    if (window.location.search.length > 0)
      url += '&';
    else
      url += '?'
    url += params;
  }
  return ODS.cleanupUrl(url);
}


/**
 * Reloads the current page resetting any parameters we added
 */
function resetAndReload(forced) {
  console.log("resetAndReload");
  var cleanUrl = ODS.cleanupUrl(window.location.href);
  if(cleanUrl != window.location.href || forced == true)
    window.location.href = cleanUrl;
}

/**
 * Callback function for successful ODS authentication.
 *
 * This function will store the session cookie and reflect the logged in
 * status on the page.
 */
function newSessionCallback(session) {
    console.log("New session created: " + session.sessionId());

    hideSpinner();

    s_odsSession = session;

    // save session id in cookie
    var expire = new Date();
    expire.setDate(expire.getDate() + 7); // one week expiration
    $.cookie("ods_session_id", s_odsSession.sessionId(), {expires: expire, path: '/'});

    setupLogoutLink();
    $(document).trigger('ods-new-session', s_odsSession);
    loadUserData();

    if(session.isNewUser()) {
      $('#odsWelcomeDlg').modal();
    }
}


function authConfirmCallback(confirmSession) {
  console.log("Auth Confirm");
  console.log(confirmSession);

  hideSpinner();

  setupAuthConfirmDialog();

  $('#odsAuthConfirmOnlineAccountService').text(confirmSession.onlineAccount.service);
  $('#odsAuthConfirmOnlineAccountUid').text(confirmSession.onlineAccount.uid);
  document.odsAuthConfirmForm.usr.value = confirmSession.user.name;
  document.odsAuthConfirmForm.email.value = confirmSession.user.email;
  document.odsAuthConfirmForm.cid.value = confirmSession.cid;

  $('#odsAuthConfirmDialog').modal();
}


/**
 * Check if the session id saved in the cookie is still valid.
 *
 * If so the logged in state will be reflected in the page.
 */
function checkSession() {
    console.log("Checking for existing session cookie...");
    if(s_odsSession) {
        loadUserData();
    }
    else {
        var sessionId = $.cookie("ods_session_id");
        if(sessionId != null) {
            console.log("Found session cookie " + sessionId);
            // check if the session is still valid
            ODS.createSessionFromId(sessionId, newSessionCallback, setupLoginDialog);
        }
        else {
            console.log("No session cookie stored.");
            setupLoginDialog();
        }
    }
}


/**
 * Preconditions: needs a valid s_odsSession object which has been authenticated.
 *
 * Will load user details and display them on the page tp refect the logged in status.
 */
function loadUserData() {
    console.log("loadUserInfo");

    s_odsSession.userInfo(function(result) {
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


function setupLoginDialog() {
    console.log("setupLoginDialog");

    if(!s_loginLinkSetupDone) {
      if ($('#loginPopup').size() == 0) {
        console.log("User authentication dialog HTML not loaded yet.");
        return;
      }
    }
    else {
      console.log("User authentication dialog already setup.");
      return;
    }
    s_loginLinkSetupDone = true;

    // For now we need to setup the digest authentication manually
    var digestLoginFnc = function() {
      ODS.createSession(document.digestLogin.usr.value, document.digestLogin.pwd.value, function(result) {
        $("#loginPopup").modal("hide");
        newSessionCallback(result);
      });
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

    var digestRegisterFnc = function() {
      ODS.register(document.odsDigestRegister.usr.value, document.odsDigestRegister.email.value, document.odsDigestRegister.pwd1.value, function(result) {
        $("#loginPopup").modal("hide");
        newSessionCallback(result);
      });
    };
    $("form#odsDigestRegister input.odsButton").click(function(event) {
        event.stopPropagation();
        digestRegisterFnc();
    });
    $("form#odsDigestRegister .odsDigestRegisterInput").keydown(function(event) {
        event.stopPropagation();
        if(event.keyCode == 13) {
          digestRegisterFnc();
        }
    });


    //
    // ====================================================
    // LOGIN AND AUTO LINKS
    // ====================================================
    //

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
              showSpinner("Verifying OpenID...");
              ODS.createOpenIdSession(document.openidLoginForm.openidUrl.value, callbackUrl(), newSessionCallback);
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

            var openIdAutoRegFnc = function() {
              var confirm = $('#forceAutoRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto';
              showSpinner("Verifying OpenID...");
              ODS.registerOrLoginViaOpenId(document.openidAutoRegisterForm.openidUrl.value, callbackUrl(), confirm);
            };
            $("#openidAutoRegisterForm .odsLoginInput").keydown(function(event) {
              event.stopPropagation();
              if(event.keyCode == 13) {
                openIdAutoRegFnc();
              }
            });
            $("#openidAutoRegisterBtn").click(function(event) {
              event.preventDefault();
              openIdAutoRegFnc();
            });
        }
        else {
          $("#otherLogins").show();

          // build the login link
          $("#odsThirdPartyLoginButtons").append('<a id="' + method + 'Login" class="odsLoginLink" title="Login via ' + method[0].toUpperCase() + method.substring(1) + '" href="#"><img src="http://' + ODS.host() + '/val/img/social16/' + method + '.png"/></a> ');
          loginUi = $("#" + method + "Login");

          loginUi.click(function(event) {
            // we extract the method from the id of the element
            // this is required since the "method" var scope spans all functions
            // created here and will always have the last value of the iteration
            var m = this.id.substring(0,this.id.indexOf("Login"));
            console.log("Performing login via " + m);
            // cancel default submit behaviour
            event.preventDefault();

            showSpinner("Performing authentication via " + m[0].toUpperCase() + m.substring(1) + "...");

            if(m == "webid") {
              //
              // Sadly it is not possible yet to send a client certificate via AJAX calls.
              //
              //ODS.createWebIdSession(newSessionCallback);
              $("#loginPopup").modal("hide");
              if(window.crypto && window.crypto.logout)
                window.crypto.logout();
              if(window.location.protocol == "https:")
                ODS.createWebIdSession(newSessionCallback);
              else
                window.location.href = callbackUrl(true, "login=webid");
            }
            else {
              // try to login via OpenID
              ODS.createThirdPartyServiceSession(m, callbackUrl());
            }
          });


          // build the auto login link
          $("#odsThirdPartyAutoButtons").append('<a id="' + method + 'Auto" class="odsLoginLink" title="Login or Register via ' + method[0].toUpperCase() + method.substring(1) + '" href="#"><img src="http://' + ODS.host() + '/val/img/social16/' + method + '.png"/></a> ');
          autoLoginUi = $("#" + method + "Auto");

          autoLoginUi.click(function(event) {
            event.preventDefault();
            // we extract the method from the id of the element
            // this is required since the "method" var scope spans all functions
            // created here and will always have the last value of the iteration
            var m = this.id.substring(0,this.id.indexOf("Auto"));

            var confirm = $('#forceAutoRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto';

            showSpinner("Performing authentication via " + m[0].toUpperCase() + m.substring(1) + "...");

            if(m == "webid") {
              //
              // Sadly it is not possible yet to send a client certificate via AJAX calls.
              //
              $("#loginPopup").modal("hide");
              if(window.crypto && window.crypto.logout)
                window.crypto.logout();
              if(window.location.protocol == "https:")
                ODS.registerOrLoginViaWebId(confirm, newSessionCallback, authConfirmCallback);
              else
                window.location.href = callbackUrl(true, "auto=webid&confirm=" + confirm);
            }
            else {
              // try to login via OpenID
              ODS.registerOrLoginViaThirdPartyService(m, callbackUrl(), confirm);
            }
          });
        }
      }
    });


    //
    // ====================================================
    // REGISTER LINKS
    // ====================================================
    //

    // determine the list of supported services
    ODS.registrationMethods(function(methods) {
      console.log(methods);
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        if (method == 'digest')
          continue;
        var registerUi = $("#" + method + "Register");
        registerUi.show();

        if(method == "browserid")
          continue;

        else if(method == "openid") {
            var openIdRegFnc = function() {
              var confirm = $('#forceRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto';
              showSpinner("Registering via OpenID...");
              ODS.registerViaOpenId(document.openidRegisterForm.openidUrl.value, callbackUrl(), confirm);
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

          // build the login link
          $("#odsThirdPartyRegisterButtons").append('<a id="' + method + 'Register" class="odsLoginLink" title="Register via ' + method[0].toUpperCase() + method.substring(1) + '" href="#"><img src="http://' + ODS.host() + '/val/img/social16/' + method + '.png"/></a> ');

          registerUi = $("#" + method + "Register");

          registerUi.click(function(event) {
            // we extract the method from the id of the element
            // this is required since the "method" var scope spans all functions
            // created here and will always have the last value of the iteration
            var m = this.id.substring(0,this.id.indexOf("Register"));
            console.log("Performing registration via " + m);
            // cancel default submit behaviour
            event.preventDefault();

            var confirm = $('#forceRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto';

            showSpinner("Registering via " + m[0].toUpperCase() + m.substring(1) + "...");

            if(m == "webid") {
              //
              // Sadly it is not possible yet to send a client certificate via AJAX calls.
              //
              //ODS.createWebIdSession(newSessionCallback);
              $("#loginPopup").modal("hide");
              if(window.crypto && window.crypto.logout)
                window.crypto.logout();
              if(window.location.protocol == "https:")
                ODS.registerViaWebId(confirm, newSessionCallback, authConfirmCallback);
              else
                window.location.href = callbackUrl(true, "register=webid&confirm=" + confirm);
            }
            else {
              // try to login via OpenID
              ODS.registerViaThirdPartyService(m, callbackUrl(), confirm);
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
          resetAndReload(true);
        });
    });
}


function setupAuthConfirmDialog() {
      $("#odsAuthConfirmDialog").on('hide', function() {
      if(window.location.search.length > 0)
        resetAndReload();
    });

    // setup the authentication confirmation dialog
    $("#odsAuthConfirmButton").click(function(e) {
      e.preventDefault();
      ODS.confirmAuthentication(document.odsAuthConfirmForm.cid.value, document.odsAuthConfirmForm.usr.value, document.odsAuthConfirmForm.email.value, function(result) {
        $("#odsAuthConfirmDialog").modal("hide");
        newSessionCallback(result);
      });
    });
}


function setupErrorDialog() {
    // we remove the error message from the URL after showing the error
    $('#errorDialog').on('hide', function() {
      if(window.location.search.length > 0)
        resetAndReload();
    });
}

ODS.ready(function() {
    // we allow to choose WebID as the default login mecahnism via a query parameter
    var defaultToWebID = (getParameterByName(window.location.href, 'defaultToWebID').toLowerCase() == 'true');

    var errHdl = function(msg) {
      setupErrorDialog();
      $('#errorDialogMsg').text(msg);
      $('#errorDialog').modal();
    };

    $('.odsLoginLink').click(function(e) {
      e.preventDefault();

      if(defaultToWebID) {
        // try login via WebID and fallback to the rest
        if(window.crypto && window.crypto.logout)
          window.crypto.logout();

        if(window.location.protocol == "https:") {
          ODS.createWebIdSession(newSessionCallback, function() {
            $("#loginPopup").modal();
          });
        }
        else {
          window.location.href = callbackUrl(true, "login=webid&showError=no");
        }
      }
      else {
        $("#loginPopup").modal();
      }
    });

    $('.odsSignUpLink').click(function(e) {
      e.preventDefault();

      if(defaultToWebID) {
        // try sign up via WebID and fallback to the rest
        if(window.crypto && window.crypto.logout)
          window.crypto.logout();

        if(window.location.protocol == "https:") {
          ODS.registerViaWebId('auto', newSessionCallback, authConfirmCallback, function() {
            $('#loginPopupMainTab li:eq(1) a').tab('show');
            $("#loginPopup").modal();
          });
        }
        else {
          window.location.href = callbackUrl(true, "login=webid&showError=no");
        }
      }
      else {
        $('#loginPopupMainTab li:eq(1) a').tab('show');
        $("#loginPopup").modal();
      }
    });

    if(!ODS.handleAuthenticationCallback(newSessionCallback, authConfirmCallback, errHdl)) {
      var login = getParameterByName(window.location.href, 'login');
      var register = getParameterByName(window.location.href, 'register');
      var auto = getParameterByName(window.location.href, 'auto');
      var confirm = getParameterByName(window.location.href, 'confirm') || 'auto';
      var showError = getParameterByName(window.location.href, 'showError');

      var loginErrorHandler = function(err) {
        hideSpinner();

        if(showError != "no")
          ODS.genericErrorHandler(err);

        setupLoginDialog();

        // show login dlg
        $("#loginPopup").modal();

        // go to the correct tab
        if(register == 'webid')
          $('#loginPopupMainTab li:eq(1) a').tab('show');
        else if(auto == 'webid')
          $('#loginPopupMainTab li:eq(2) a').tab('show');
      };

      if(login == "webid") {
        showSpinner("Performing authentication via WebID...");
        ODS.createWebIdSession(newSessionCallback, loginErrorHandler);
      }
      else if(register == "webid") {
        showSpinner("Registering via WebID...");
        ODS.registerViaWebId(confirm, newSessionCallback, authConfirmCallback, loginErrorHandler);
      }
      else if(auto == "webid") {
        showSpinner("Performing authentication via WebID...");
        ODS.registerOrLoginViaWebId(confirm, newSessionCallback, authConfirmCallback, loginErrorHandler);
      }
      else {
        checkSession();
      }
    }
});
