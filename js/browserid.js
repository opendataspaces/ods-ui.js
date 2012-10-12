/**
 * global variable to remember which action we took for browser id.
 */
var s_browserIdAction = null;

ODS.ready(function() {
  console.log("BROWSERID READY");
  $('#browseridLogin a').click(function(event) {
    event.preventDefault();
    s_browserIdAction = 'authenticate';
    navigator.id.request();
  });
  $('#browseridRegister a').click(function(event) {
    event.preventDefault();
    s_browserIdAction = 'register';
    navigator.id.request();
  });
  $('#browseridAuto a').click(function(event) {
    event.preventDefault();
    s_browserIdAction = 'auto';
    navigator.id.request();
  });
  $('#browseridConnect').click(function(event) {
    event.preventDefault();
    s_browserIdAction = 'connect';
    navigator.id.request();
  });

    navigator.id.watch({
      // We use ODS' session management, thus the logged in user from the BrowserID point of view os always null
      loggedInUser: null,

      // the actual ODS BrowserID login
      onlogin: function(assertion) {
        // We use ODS session management, thus, we never want BrowserID auto-login
        navigator.id.logout();

        // connect requires authentication...
        if(s_browserIdAction == "connect") {
          s_odsSession.connectToBrowserId(assertion, loadUserProfile, errorCallback);
        }

        // ...everything else does not
        else {
          // Log into ODS via the BrowserID, requesting a new session ID
          $.get(ODS.apiUrl('user.authenticate.browserid'), { assertion: assertion, action: s_browserIdAction }).success(function(result) {
            console.log("Browser ID Login SID: " + result);
          ODS.createSessionFromId(result, newSessionCallback, errorCallback);
            }).error(errorCallback);

          // hide the login dlg
          $("#loginPopup").modal("hide");
        }
      },

      // we do nothing here as we do logout the ods way
      onlogout: function() {
      }
    });
});
