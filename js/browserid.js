ODS.ready(function() {
  $('#browseridLogin a').click(function(event) {
    event.preventDefault();
    $("#loginPopup").modal("hide");
    showSpinner();
    ODS.createBrowserIdSession(newSessionCallback);
  });
  $('#browseridRegister a').click(function(event) {
    event.preventDefault();
    $("#loginPopup").modal("hide");
    showSpinner();
    ODS.registerViaBrowserId($('#forceRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto', newSessionCallback, authConfirmCallback);
  });
  $('#browseridAuto').click(function(event) {
    event.preventDefault();
    $("#loginPopup").modal("hide");
    showSpinner();
    ODS.registerOrLoginViaBrowserId($('#forceRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto', newSessionCallback, authConfirmCallback);
  });
  $('#browseridConnect').click(function(event) {
    event.preventDefault();
    showSpinner();
    s_odsSession.connectToBrowserId(loadOnlineAccounts);
  });
});
