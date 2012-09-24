
/// The ODS instance host
var odsHost = "localhost:8890";
var odsSSLHost = "localhost:4433";

/**
 * Construct an ODS API URL with optional ssl.
 * @param methodName The name of the method to call.
 * @param ssl If \p true the returned URL will use the https protocol.
 */
function odsApiUrl(methodName, ssl) {
    if(ssl == 1 || /* HACK: work around local CORS issues */ document.location.protocol == "https:") {
        return "https://" + odsSSLHost + "/ods/api/" + methodName;
    }
    else {
        return "http://" + odsHost + "/ods/api/" + methodName;
    }
}

/**
 * Create an ODS DAV URL.
 * @param path The path to the file in the DAV system.
 */
function odsDavUrl(path) {
    return "http://" + odsHost + "/DAV" + path;
}

function extractODSErrorMessage(result) {
    return $(result).find('message').text();
}

/**
 * Check if a standard ODS error code result is an error or not.
 * 
 * @param root The root XML element as returned by the ODS REST call.
 * @param showMessage If \p true a message box will pop up with the error message.
 * 
 * @return \p true if it is in fact an error.
 */
function hasError(root, showMessage) {
    if (showMessage != false)
        showMessage = true;

    var error = root.getElementsByTagName('failed')[0];
    if (error) {
        var message = extractODSErrorMessage(root);
        if (message && showMessage) {
            $.showMessageBox({
                content: message,
                type: "warning"
            });
        }
        return true;
    }
    return false;
}

/**
 * Check if an email address is properly formatted.
 * 
 * @param {String} email The candidate email address.
 * 
 * @return \p true if the email address is properly formatted.
 */
function checkEmailAddress(email) {
    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return filter.test(email);
}


/**
 * @brief The Openlink Data Spaces client lib.
 * 
 * The central object is the Session which can be created through one
 * of the session creation functions provided by ODS.
 */
var ODS = (function() {

    /**
     * @brief ODS Session main object
     *
     * The main ODS session object provides methods to all the ODS
     * functionality.
     *
     * Create an instance of a session via one of the ODS.authenticate methods.
     */
    var Session = function(sessionId) {
        var m_sessionId = sessionId;

        return {
            /**
             * @brief Perform a REST request against this ODS session.
             *
             * @return A jQuery jqXHR object. FIXME: do our own processing.
             */
            apiCall: function(method, params) {
                return $.get(odsApiUrl(method), $.extend({ realm: "wa", sid: m_sessionId }, params));
            },

            sessionId: function() { return m_sessionId; },

            /**
             * @brief Fetch information about a user.
             *
             * The function has up to three parameters:
             * - An optional first parameter which refers to the username, by default the
             * authenticated user is assumed.
             * - An optional function to be called on successful retrieval of the user info.
             * This function has one parameter: the map of user details.
             * - An optional error function which is called in case the call fails. This
             * function has one parameter: the error message.
             */
            userInfo: function() {
                var success = null,
                error = null,
                parameters = {},
                i = 0;

                // parse arguments
                if(arguments[0] && typeof arguments[0] === "string") {
                    parameters = { name: arguments[0] };
                    i = 1;
                }
                if(typeof arguments[i] === "function") {
                    success = arguments[i];
                    if(typeof arguments[i+1] === "function") {
                        error= arguments[i+1];
                    }
                }

                // perform the call
                this.apiCall("user.info", parameters).success(function(result) {
                    if(hasError(result, error == null)) {
                        if(error) {
                            error(extractODSErrorMessage(result));
                        }
                    }
                    else {
                        // build our dict
                        var propDict = {};

                        // parse the result.
                        $(result).find("user").children().each(function() {
                            propDict[this.nodeName] = $(this).text();
                        });

                        // call the client
                        if(success) {
                            success(propDict);
                        }
                    }
                }).error(function(jqErr) {
                    if(error) {
                        error(jqErr);
                    }
                });
            },

            logout: function(success, error) {
                this.apiCall("user.logout").success(function() {
                    this.m_sessionId = null;
                    success();
                }).error(function(jqxhr) {
                    error();
                });
            }
        };
    };


    /**
     * Extract query parameters from a URL
     */
    var getParameterByName = function(url, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(url.substring(url.indexOf('?')));
        if(results == null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    };


    
    // ===========================================================================
    // PUBLIC API of namespace "ODS"
    // ===========================================================================

    return {
        /**
         * @brief Create a new ODS session with password hash authentication.
         * 
         * @param usr The user name.
         * @param pwd The password.
         * @param success A callback function which has one parameter: the new
         * ODS instance object.
         * @param error A callback function which has two parameters:
         * - An error code
         * - A human readable error message. TODO: translate the error message.
         */
        createSession: function(usr, pwd, success, error) {
            var authenticationUrl = odsApiUrl("user.authenticate", 0),
            authenticationParams = {
                user_name : usr,
                password_hash : $.sha1(usr + pwd)
            };

            if(error == null) {
                error = function(msg) { alert(msg); };
            }

            $.get(authenticationUrl, authenticationParams).success(function(result) {
                var s = $(result).find("sid").text();

                console.log("Authentication result: " + s);

                if(s.length > 0) {
                    // login succeeded
                    success(new Session(s));
                }
                else {
                    // login failed
                    error(extractODSErrorMessage(result));
                }
            }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error("AJAX call failed.");
            });
        },

        /**
         * @brief Create a new ODS session through WebID authentication.
         * 
         * The browser will automatically request the WebID certificate from
         * the user.
         * 
         * @param success A callback function with a single parameter: the new
         * Session object.
         * @param An optional error callback function which is called if the
         * session is no longer valid or the ODS call failed.
         */
        createWebIDSession: function(success, error) {
            var authenticationUrl = odsApiUrl("user.authenticate", 1);

            if(error == null) {
                error = function(msg) { alert(msg); };
            }

            $.get(authenticationUrl, {}).success(function(result) {
                var s = $(result).find("sid").text();

                console.log("Authentication result: " + s);

                if(s.length > 0) {
                    // login succeeded
                    success(new Session(s));
                }
                else {
                    // login failed
                    error(extractODSErrorMessage(result));
                }
            }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error("AJAX call failed.");
            });
        },

        /**
         * @brief Create a new ODS session via an existing OpenID.
         *
         * Creating an ODS session via OpenID is a two-step process:
         * -# Request the authentication URL from ODS and let the user authenticate and get the redirection
         * -# Pass the redirection URL to this function to complete the authentication
         *
         * For the first step pass the \p openid the user wants to login with to this function as well as
         * the redirection URL to which the OpenID provider should redirect once the OpenID authentication
         * was sucessful. This function will then navigate the user to the OpenID provider's login page.
         * Once the redirection is done this function needs to be called again, this time leaving both
         * parameters empty.
         * 
         * @param openid The OpenID the user wants to login with. This needs to be specified for step 1.
         * @param url The callback URL.
         * @param success A callback function with a single parameter: the new
         * Session object. This, however, is only called for the second step of the authentication.
         * @param error An optional error callback function which is called if the ODS call failed.
         */
        createOpenIdSession: function(openid, url, success, error) {
            if(error == null) {
                error = function(msg) { alert(msg); };
            }
            if(openid == null || openid == '') {
                // Step 2: Extract details from the URL
                var openIdUrl = window.location.href;
                $.get(odsApiUrl("user.openid.loginUrl", 0), { "url": openIdUrl }).success(function(result) {
                    console.log("user.openid.loginUrl: " + result);

                    var authenticationUrl = odsApiUrl("user.authenticate", 0),
                    authenticationParams = {
                        openIdUrl : result,
                        openIdIdentity : getParameterByName(openIdUrl, "openid.identity")
                    };

                    $.get(authenticationUrl, authenticationParams).success(function(result) {
                        var s = $(result).find("sid").text();

                        console.log("Authentication result: " + s);

                        if(s.length > 0) {
                            // login succeeded
                            success(new Session(s));
                        }
                        else {
                            // login failed
                            error(extractODSErrorMessage(result));
                        }
                    }).error(function(jqXHR) {
                        // FIXME: handle HTTP errors
                        error("AJAX call failed.");
                    });
                }).error(function(jqXHR) {
                    // FIXME: handle HTTP errors
                    error("AJAX call failed.");
                });
          }
          else {
            // Step 1: Build the authentication url and navigate to it
            $.get(odsApiUrl("user.openid.authenticationUrl", 0), { "openid": openid, "hostUrl": url }, "text/plain").success(function(result) {
              console.log("user.openid.authenticationUrl: " + result);
              window.location.href = result;
            }).error(function(jqXHR) {
              // FIXME: handle HTTP errors
                error("AJAX call failed.");
            });
          }
        },

        /**
         * @brief Create a new ODS session via Facebook login.
         *
         * This function allows to authenticate an ODS user via their Facebook account by simply
         * calling it twice: once with the callback URL and once without any parameters besides
         * the error handling functions.
         *
         * The first call will result in a redirection to the Facebook login page which in turn will
         * redirect to the specified @p url adding an access_token hash parameter. This is then
         * interpreted by the second call to this function resulting in the authentication to complete.
         * 
         * @param url The callback URL.
         * @param success A callback function with a single parameter: the new
         * Session object. This, however, is only called for the second step of the authentication.
         * @param error An optional error callback function which is called if the ODS call failed.
         */
        createFacebookSession: function(url, success, error) {
            if(error == null) {
                error = function(msg) { alert(msg); };
            }
            // Check if there is already an access token in the URL
            var at = window.location.hash.substring(window.location.hash.indexOf('access_token=')+13);
            if(at.length > 0) {
              // strip the expiration date
              var len = at.indexOf('&');
              if(len > 0)
                at = at.substring(0, len);
              console.log("createFacebookSession Step 2: " + at);
              // Step 2: Use the access token to authenticate
              var authenticationUrl = odsApiUrl("user.authenticate", 0);

              $.get(authenticationUrl, { oauthMode: 'facebook', oauthToken: at}).success(function(result) {
                var s = $(result).find("sid").text();

                console.log("Authentication result: " + s);

                if(s.length > 0) {
                    // login succeeded
                    success(new Session(s));
                }
                else {
                    // login failed
                    console.log("createFacebookSession: login failed: " + extractODSErrorMessage(result));
                    error(extractODSErrorMessage(result));
                }
              }).error(function(jqXHR) {
                  // FIXME: handle HTTP errors
                  error("AJAX call failed.");
              });
            }
            else {
              console.log("createFacebookSession Step 1");
              // Step 1: Build the authentication url and navigate to it
              $.get(odsApiUrl("user.oauth.facebook.authenticationUrl", 0), { "hostUrl": url }, "text/plain").success(function(result) {
                console.log("user.oauth.facebook.authenticationUrl: " + result);
                window.location.href = result;
              }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error("AJAX call failed.");
              });
            }
        },

        createTwitterSession: function(url, success, error) {
            if(error == null) {
                error = function(msg) { alert(msg); };
            }
            // Check if there is already an OAuth session id in the URL
            var sid = getParameterByName(window.location.href, 'sid');
            if(sid.length > 0) {
              // strip the expiration date
              console.log("createTwitterSession Step 2: " + sid);
              // Step 2: Use the OAuth credentials to authenticate
              $.get(odsApiUrl("user.authenticate", 0), {
                  oauthMode: 'twitter',
                  oauthToken: getParameterByName(window.location.href, 'oauth_token'),
                  oauthVerifier: getParameterByName(window.location.href, 'oauth_verifier')
              }).success(function(result) {
                var s = $(result).find("sid").text();

                console.log("Authentication result: " + s);

                if(s.length > 0) {
                    // login succeeded
                    success(new Session(s));
                }
                else {
                    // login failed
                    console.log("createTwitterSession: login failed: " + extractODSErrorMessage(result));
                    error(extractODSErrorMessage(result));
                }
              }).error(function(jqXHR) {
                  // FIXME: handle HTTP errors
                  error("AJAX call failed.");
              });
            }
            else {
              console.log("createTwitterSession Step 1");
              // Step 1: Build the authentication url and navigate to it
              $.get(odsApiUrl("user.oauth.twitter.authenticationUrl", 0), { "hostUrl": url }, "text/plain").success(function(result) {
                console.log("user.oauth.twitter.authenticationUrl: " + result);
                window.location.href = result;
              }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error("AJAX call failed.");
              });
            }
        },

        createLinkedInSession: function(url, success, error) {
            if(error == null) {
                error = function(msg) { alert(msg); };
            }
            // Check if there is already an OAuth session id in the URL
            var sid = getParameterByName(window.location.href, 'sid');
            if(sid.length > 0) {
              // strip the expiration date
              console.log("createLinkedInSession Step 2: " + sid);
              // Step 2: Use the OAuth credentials to authenticate
              $.get(odsApiUrl("user.authenticate", 0), {
                  oauthMode: 'twitter',
                  oauthToken: getParameterByName(window.location.href, 'oauth_token'),
                  oauthVerifier: getParameterByName(window.location.href, 'oauth_verifier')
              }).success(function(result) {
                var s = $(result).find("sid").text();

                console.log("Authentication result: " + s);

                if(s.length > 0) {
                    // login succeeded
                    success(new Session(s));
                }
                else {
                    // login failed
                    console.log("createLinkedInSession: login failed: " + extractODSErrorMessage(result));
                    error(extractODSErrorMessage(result));
                }
              }).error(function(jqXHR) {
                  // FIXME: handle HTTP errors
                  error("AJAX call failed.");
              });
            }
            else {
              console.log("createLinkedInSession Step 1");
              // Step 1: Build the authentication url and navigate to it
              $.get(odsApiUrl("user.oauth.linkedin.authenticationUrl", 0), { "hostUrl": url }, "text/plain").success(function(result) {
                console.log("user.oauth.linkedin.authenticationUrl: " + result);
                window.location.href = result;
              }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error("AJAX call failed.");
              });
            }
        },

        /**
         * @brief Create a new ODS session from an existing session id.
         *
         * This is for example useful for storing the session id in a cookie.
         * The function will check if the session is still valid and if so
         * create a corresponding Session object.
         *
         * @param sessionId The id of the session.
         * @param success A callback function with a single parameter: the new
         * Session object.
         * @param An optional error callback function which is called if the
         * session is no longer valid or the ODS call failed.
         */
        createSessionFromId: function(sessionId, success, error) {
            if(error == null) {
                error = function(msg) { alert(msg); };
            }

            // check if the session is still valid by fetching user details
            $.get(odsApiUrl("user.info"), { realm: "wa", sid: sessionId }).success(function(result) {
                var name = $(result).find("name").text();
                var fullName = $(result).find("fullName").text();
                var photo = $(result).find("photo").text();
                if(name == null || name == "") {
                    sessionId = null;
                    error("Session timed out: " + sessionId);
                }
                else {
                    success(new Session(sessionId));
                }
            }).error(function(jqxhr) {
                // FIXME: handle error
                error("AJAX call failed.");
            });
        }
    }
})();