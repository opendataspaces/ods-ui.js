function loadUserProfile() {
  s_odsSession.userInfo(function(userProps) {
    console.log("loadProfile");
    console.log(userProps);

/*    $("#profileWebId").html(userProps["iri"]);
    var davUrl = odsDavUrl("/home/" + userProps["name"]);
    $("#profileWebDavUrl").html(davUrl).attr("href", davUrl);*/

    var name = userProps.fullName || userProps.name;
    $("#odsUserProfileWindow .modal-header h3 small").html('<a href="' + userProps.iri + '">' + name + "</a>");

    for(key in userProps) {
      // find the corresponding input element
      $('.profileDetail#' + key).each(function() {
        console.log("Loading profile detail " + key + ": " + userProps[key]);
        console.log(this);
        this.value = userProps[key];
      });
    }
  });

  // load all connected online accounts
  s_odsSession.apiCall('user.onlineAccounts.list', { type: 'P' }, "json").success(function(result) {
    /* a JSON stream like so:
    [
    [
        1,
        "Facebook",
        "http://www.facebook.com/sebastian.trug",
        "http://localhost:8890/about/id/entity/http/www.facebook.com/trueg"
    ],
    We are only interested in the first 3.
    */
    console.log(result);
    $coa = $('#connectedOnlineAccounts');
    $coa.text('');
    for(var i = 0; i < result.length; i++) {
      var account = result[i];
      $coa.append('<p id="onlineAccount_' + account[0] + '"><b>' + account[1] + '</b>: ' + account[2] + ' <a href="#" onclick="s_odsSession.apiCall(\'user.onlineAccounts.delete\', { id: ' + account[0] + '}); $(\'#onlineAccount_' + account[0] + '\').remove();">Disconnect</a></p>');
    }
  });
}


function saveUserProfile() {
  // gather new values
  var userProps = {};
  $("#userProfile").find(".profileDetail").each(function() {
    userProps[this.id] = this.value;
  });

  console.log("Saving user profile");
  console.log(userProps);

  // perform the ODS update call
  s_odsSession.apiCall("user.update.fields", userProps).success(function(result) {
    // hide the busy spinner
    $("#odsUserProfileWindow .modal-footer").spin(false);

    // Give basic user feedback
    if(hasError(result, false))
      $("#odsUserProfileWindow .modal-body").dynalert(extractODSErrorMessage(result), { type: "error" });
    else
      $("#odsUserProfileWindow .modal-body").dynalert("Successfully updated profile", { type: "info" });
  });
}


function setupProfileWindow() {
  // use our hidden file input to select a new photo
  $("#profilePhotoBtn").click(function(event) {
    event.preventDefault();
    $("#pf_photoContent").trigger("click");
  });

  // submit the form only if the photo has changed
  $("a#profileSaveButton").click(function(event) {
    event.preventDefault();
    $("#odsUserProfileWindow .modal-footer").spin();

    // we do not want the button to submit the form
    // if the profile image was not changed
    if($('#pf_photoContent').get(0).files.length) {
        var file = $('#pf_photoContent').get(0).files[0];
        $('#pf_photo').val(file.name);
        $('#sid').val(s_odsSession.sessionId());
        $("form#userProfile").ajaxSubmit(function() {
          // once the form upload is done (only for the photo) we follow up with the rest of the data
          saveUserProfile();
        });
    }
    else {
        saveUserProfile();
    }
  });

  // load user profile when opening the window
  $('#odsUserProfileWindow').on('show', function() {
    // there is a little "bug" in Bootstrap: we get a show event for each tab change in the modal-body
    // thus, we simply make sure we only act on the first show
    var $this = $(this);
    if(!$this.data("odsModalShown")) {
      $("#odsUserProfileWindow .modal-body").dynalert(false);
      loadUserProfile();
      $this.data("odsModalShown", true);
    }
  });
  $('#odsUserProfileWindow').on('hide', function() {
    $(this).data("odsModalShown", false);
  });

  $('#openidConnectBtn').click(function(e) {
    e.preventDefault();
    var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    s_odsSession.connectToOpenId(document.openidConnectForm.openidUrl.value, callbackUrl);
  });

  $('#thirdPartyProfileConnect a').click(function(e) {
    e.preventDefault();

    // get service type from id
    var service = this.id.substring(0,this.id.indexOf("Connect"));
    var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;

    s_odsSession.connectToThirdPartyService(service, callbackUrl);
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

      s_odsSession.connectToBrowserId(assertion, function() {}, errorCallback);
    },

    // we do nothing here as we do logout the ods way
    onlogout: function() {
    }
  });
}


ODS.ready(function() {
    setupProfileWindow();

    $(".profileDetail#firstName").change(function(event) {
      console.log("This is where you break!!!");
    });
});
