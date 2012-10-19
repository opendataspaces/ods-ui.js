ODS.ready(function() {
  $('#browseridLogin a').click(function(event) {
    event.preventDefault();
    $("#loginPopup").modal("hide");
    ODS.createBrowserIdSession(newSessionCallback);
  });
  $('#browseridRegister a').click(function(event) {
    event.preventDefault();
    $("#loginPopup").modal("hide");
    ODS.registerViaBrowserId($('#forceRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto', newSessionCallback, authConfirmCallback);
  });
  $('#browseridAuto').click(function(event) {
    event.preventDefault();
    $("#loginPopup").modal("hide");
    ODS.registerOrLoginViaBrowserId($('#forceRegistrationConfirmation').attr('checked') == "checked" ? 'always' : 'auto', newSessionCallback, authConfirmCallback);
  });
  $('#browseridConnect').click(function(event) {
    event.preventDefault();
    s_odsSession.connectToBrowserId(loadOnlineAccounts);
  });
});
