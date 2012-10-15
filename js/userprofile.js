// load all connected online accounts
function loadOnlineAccounts() {
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
      $coa.append('<p class="odsOnlineAccount" id="onlineAccount_' + account[0] + '"><img class="odsOnlineAccountCell" src="img/social16/' + account[1].toLowerCase() + '.png"/><span class="odsOnlineAccountCell"><b>' + account[1] + '</b>: ' + account[2] + '</span><span class="odsOnlineAccountCell"><a href="#" onclick="s_odsSession.apiCall(\'user.onlineAccounts.delete\', { id: ' + account[0] + '}); $(\'#onlineAccount_' + account[0] + '\').remove();" title="Disconnect this ' + account[1] + ' account from the ODS profile">Disconnect</a></span></p>');
    }
  });
}

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

  loadOnlineAccounts();
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

    if (service == "webid") {
      if(window.crypto && window.crypto.logout)
        window.crypto.logout();
      if(window.location.protocol == "https:")
        s_odsSession.connectToWebID(loadOnlineAccounts, errorCallback);
      else
        window.location.href = "https://" + ODS.sslHost() + window.location.pathname + "?connect=webid";
    }
    else {
      var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      s_odsSession.connectToThirdPartyService(service, callbackUrl);
    }
  });

  // react to resize events on the profile window and re-center the modal
  $(".modal").on("resize", function(event, ui) {
    ui.element.css("margin-left", -ui.size.width/2);
    ui.element.css("margin-top", -ui.size.height/2);
    ui.element.css("top", "50%");
    ui.element.css("left", "50%");
  });
}

/**
 * Checks in the input on the register form and optionally marks the input fields.
 */
function verifyPasswordChangeDlgInput(form) {
    var pwd1 = form.password1.value;
    var pwd2 = form.password2.value;

    var $form = $(form);

    // compare passwords if we have input in pwd2
    if(pwd2.length > 0 && pwd1 != pwd2) {
        var $pwd2 = $form.find("div.control-group").has(":input#password2");
        if(!$pwd2.hasClass("error")) {
            $pwd2.addClass("error");
            $pwd2.find("div.controls").append('<p class="help-inline">Passwords do not match</p>');
        }
    }
    else {
        var $pwd2 = $form.find("div.control-group").has(":input#password2");
        $pwd2.removeClass("error");
        $pwd2.find("p.help-inline").remove();
    }
};

function setupPasswordDialog() {
  var chPwdFct = function() {
    // verify that both pwds are the same
    var pwd1 = document.passwordChangeForm.password1.value;
    var pwd2 = document.passwordChangeForm.password2.value;

    if(pwd1 != pwd2) {
      alert("The password repeat did not match the password");
    }
    else {
      // send the new password
      s_odsSession.apiCall("user.password_change", { old_password: "foobar", new_password: pwd1 }).done(function(result) {
        if(!hasError(result, true)) {
          alert("Password successfully updated");
          $("#odsPasswordDlg").modal("hide");
        }
      }).fail(function() {
        console.log("We should normally not reach this.");
      });
    }
  };

  $("#passwordSaveButton").click(function(e) {
    e.preventDefault();
    chPwdFct();
  });
  $("#odsPasswordDlg input").keydown(function(event) {
    event.stopPropagation();
    if(event.keyCode == 13) {
      chPwdFct();
    }
  });

  /* Call the verifyPasswordChangeDlgInput whenever the contents change. */
  $(document.passwordChangeForm).find(':input').change(function() {
      verifyPasswordChangeDlgInput(document.passwordChangeForm);
  });
}

ODS.ready(function() {
    setupProfileWindow();
    setupPasswordDialog();

    // make our profile dlg resizable
    $("#odsUserProfileWindow").resizable();

    $(".profileDetail#firstName").change(function(event) {
      console.log("This is where you break!!!");
    });
});

$(document).bind('ods-new-session', function(s) {
  console.log('Checking for webid connect parameter');
  if(window.location.protocol == "https:" && getParameterByName(window.location.href, 'connect') == "webid") {
    s_odsSession.connectToWebID(loadOnlineAccounts, errorCallback);
  }
});
