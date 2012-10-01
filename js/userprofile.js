function loadUserProfile() {
  s_odsSession.userInfo(function(userProps) {
    console.log("loadProfile");
    console.log(userProps);

/*    $("#profileWebId").html(userProps["iri"]);
    var davUrl = odsDavUrl("/home/" + userProps["name"]);
    $("#profileWebDavUrl").html(davUrl).attr("href", davUrl);*/

    for(key in userProps) {
      // find the corresponding input element
      $('.profileDetail#' + key).each(function() {
        console.log("Loading profile detail " + key + ": " + userProps[key]);
        console.log(this);
        this.value = userProps[key];
      });
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
  // Use the jQuery Form plugin to submit our form and get a JS callback
  $("form#userProfile").ajaxForm(function() {
    // once the form upload is done (only for the photo) we follow up with the rest of the data
    saveUserProfile();
  });

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
        $("form#userProfile").ajaxSubmit();
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
}


ODS.ready(function() {
    setupProfileWindow();

    $(".profileDetail#firstName").change(function(event) {
      console.log("This is where you break!!!");
    });
});
