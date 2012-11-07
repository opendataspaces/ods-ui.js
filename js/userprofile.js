// load all connected online accounts
function loadOnlineAccounts() {
  s_odsSession.apiCall('user.onlineAccounts.list', { type: 'P' }, "json").success(function(onlineAccounts) {
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
    console.log(onlineAccounts);
    $coa = $('#connectedOnlineAccounts');
    $coa.text('');

    // sort the accounts
    onlineAccounts.sort(function(a, b) {
      if (a[1].toLowerCase() == b[1].toLowerCase())
        return a[2].localeCompare(b[2]);
      else
        return a[1].localeCompare(b[1]);
    });

    for(var i = 0; i < onlineAccounts.length; i++) {
      var account = onlineAccounts[i];
      $coa.append('<p class="odsOnlineAccount" id="onlineAccount_' + account[0] + '"><img class="odsOnlineAccountCell" src="img/social16/' + account[1].toLowerCase() + '.png"/><span class="odsOnlineAccountCell"><b>' + account[1] + '</b>: ' + account[2] + '</span><span class="odsOnlineAccountCell"><a href="#" onclick="s_odsSession.apiCall(\'user.onlineAccounts.delete\', { id: ' + account[0] + ', type: \'P\'}); $(\'#onlineAccount_' + account[0] + '\').remove();" title="Disconnect this ' + account[1] + ' account from the ODS profile">Disconnect</a></span></p>');
    }
  });
}

function loadCertificates() {
  s_odsSession.apiCall('user.certificates.list', {}, "json").success(function(certs) {
    /* A JSON stream like so:
[
    [
        37,
        "/CN=Da WUuuurst/emailAddress=trueg@openlinksw.com",
        "Less than 2 hours ago",
        "4A:83:96:6A:BF:D6:A7:FB:58:94:8D:82:64:B9:F2:4F",
        "Yes",
        {
            "id":37,
            "fingerprint":"4A:83:96:6A:BF:D6:A7:FB:58:94:8D:82:64:B9:F2:4F",
            "timestamp":"2012-10-25 16:14:53",
            "fuzzyTimestamp":"Less than 2 hours ago",
            "subject":[
                "CN",
                "Da WUuuurst",
                "emailAddress",
                "trueg@openlinksw.com"
            ]
        }
    ],
    We are only interested in the readable JSON blob
    */

    console.log(certs);
    $certs = $('#x509Certificates');
    $certs.text('');

    for(var i = 0; i < certs.length; i++) {
      var cert = certs[i][5];
      var certLine = '<p class="odsOnlineAccount" style="width:100%" id="cert_' + cert.id + '"><span class="odsOnlineAccountCell"><b>' + cert.subject.CN + '</b><br/>';
      if('emailAddress' in cert.subject)
        certLine += 'EMail: ' + cert.subject.emailAddress + ' ';
      certLine += '(created ' + cert.fuzzyTimestamp + ')</span> <span class="odsOnlineAccountCell pull-right"><a href="#" onclick="s_odsSession.apiCall(\'user.certificates.delete\', { id: ' + cert.id + '}); $(\'#cert_' + cert.id + '\').remove();" title="Delete this certificate from the ODS profile">Remove</a></span></p>';
      $certs.append(certLine);
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
    showSpinner("Connecting account to OpenID...");
    s_odsSession.connectToOpenId(document.openidConnectForm.openidUrl.value, callbackUrl);
  });

  // build the 3rd party connect buttons
  var $thirdPartyProfileConnect = $("#thirdPartyProfileConnect");
  ODS.connectionMethods(function(methods) {
    for (var i = 0; i < methods.length; i++) {
      var method = methods[i];
      if(method == "openid" || method == "browserid")
        continue;
      $thirdPartyProfileConnect.append('<a id="' + method + 'Connect" title="Connect ODS profile to ' + method[0].toUpperCase() + method.substring(1) + '" href="#"><img src="img/social16/' + method + '.png"/></a> ');
    }

    $('#thirdPartyProfileConnect a').click(function(e) {
      e.preventDefault();

      // get service type from id
      var service = this.id.substring(0,this.id.indexOf("Connect"));

      showSpinner("Connecting account to " + service[0].toUpperCase() + service.substring(1) + "...");

      if (service == "webid") {
        if(window.crypto && window.crypto.logout)
          window.crypto.logout();
        if(window.location.protocol == "https:")
          s_odsSession.connectToWebId(loadOnlineAccounts);
        else
          window.location.href = "https://" + ODS.sslHost() + window.location.pathname + "?connect=webid";
      }
      else {
        var callbackUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        s_odsSession.connectToThirdPartyService(service, callbackUrl);
      }
    });
  });

  // react to resize events on the profile window and re-center the modal
  $(".modal").on("resize", function(event, ui) {
    ui.element.css("margin-left", -ui.size.width/2);
    ui.element.css("margin-top", -ui.size.height/2);
    ui.element.css("top", "50%");
    ui.element.css("left", "50%");

    // set a fixed size for the modal-body for proper overflow
    $(ui.element).find(".modal-body").each(function() {
      $(this).css("max-height", 400 + ui.size.height - ui.originalSize.height);
    });
  });
}

function setupCertDialog() {
  // load the certs when opening the cert dialog
  // We exploit  a little "bug" in Bootstrap: we get a show event for each tab change in the modal-body
  // that is exactly what we want
  $('#odsCertDialog').on('show', function() {
    loadCertificates();
  });
}

/**
 * Checks in the input on the register form and optionally marks the input fields.
 */
function verifyPasswordChangeDlgInput(form) {
    var pwd1 = form.password1.value;
    var pwd2 = form.password2.value;

    var $form = $(form);
    var $pwd2 = $form.find("div.control-group").has(":input#password2");

    // compare passwords if we have input in pwd2
    if(pwd2.length > 0 && pwd1 != pwd2) {
        if(!$pwd2.hasClass("error")) {
            $pwd2.addClass("error");
            $pwd2.find("div.controls").append('<p class="help-inline">Passwords do not match</p>');
        }
    }
    else {
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
        if(!ODS.isErrorResult(result)) {
          alert("Password successfully updated");
          $("#odsPasswordDlg").modal("hide");
        }
        else {
          alert(ODS.extractErrorResultMessage(result));
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
    setupCertDialog();
    setupPasswordDialog();

    // make our profile dlg resizable
    $("#odsUserProfileWindow").resizable();

    $(".profileDetail#firstName").change(function(event) {
      console.log("This is where you break!!!");
    });

    // Since the keygen element is very badly designed there is no way to get any feedback
    // Thus, all we can do is to show a message that something is happening and hope for the best
/*    $('#initialCertificateGeneratorForm').submit(function() {
      $('#initialCertificateGeneratorDiv').html("<p><em>Your WebID certiticate is being generated and the private key is installed into your Browser's key store...</em></p>");
      return true;
    });*/
});

$(document).bind('ods-new-session', function(s) {
  console.log('Checking for webid connect parameter');
  if(window.location.protocol == "https:" && getParameterByName(window.location.href, 'connect') == "webid") {
    s_odsSession.connectToWebId(loadOnlineAccounts);
  }

  // For some reason we do not get the session ID in vsp in Opera and Chrome on Windows. Thus, we use JS as a fallback
  if(document.initialCertificateGeneratorForm.sid.value.length == 0)
    document.initialCertificateGeneratorForm.sid.value = s_odsSession.sessionId();
  if(document.certificateGeneratorForm.sid.value.length == 0)
    document.certificateGeneratorForm.sid.value = s_odsSession.sessionId();

  // Check if the user already changed the pwd
  // FIXME: reuse the already fetched user profile data
  s_odsSession.userInfo(function(result) {
    if(result.noPassword == "1") {
      $('#odsOldPwdInput').hide();
    }
  });
});
