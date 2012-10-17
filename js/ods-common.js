function extractODSErrorMessage(result) {
  if(!result.getElementsByTagName)
      result = $.parseXML(result);
    return $(result).find('message').text();
}

/**
 * Check if a standard ODS error code result is an error or not.
 *
 * @param result The result XML element as returned by the ODS REST call.
 * @param showMessage If \p true a message box will pop up with the error message.
 *
 * @return \p true if it is in fact an error.
 */
function hasError(result, showMessage) {
    if (showMessage != false)
        showMessage = true;

    if(!result.getElementsByTagName)
      result = $.parseXML(result);

    var error = result.getElementsByTagName('failed')[0];
    if (error) {
        var message = extractODSErrorMessage(result);
        if (message && showMessage) {
          if($.showMessageBox) {
            $.showMessageBox({
                content: message,
                type: "warning"
            });
          }
          else {
            alert(message);
          }
        }
        return true;
    }
    return false;
}


/**
 * The Openlink Data Spaces client lib.
 *
 * The central object is the {@link ODS.Session} which can be created through one
 * of the session creation functions provided by ODS.
 *
 * @class
 * @name ODS
 */
var ODS = (function() {

    /// The ODS instance host (private vars)
    // TODO: add a way to change this without having the SSL host being fetched twice!
    var odsHost = window.location.host;
    var odsSSLHost = null;


    /* BROWSER ID ************************************/

    /// global variable to remember which action we took for browser id.
    var s_browserIdAction = null;
    /// the ODS session from which the connection call was made
    var s_browserIdOdsSession = null;
    /// the success callback for browserid
    var s_browseridSuccessHandler = null;
    /// the error callback for browserid
    var s_browseridErrorHandler = null;

    /**
     * Setup the BrowserID integration. This will be called when the document
     * is ready. See below.
     *
     * @private
     */
    var setupBrowserId = function() {
      console.log("ODS: Setting up BrowserID integration");
      navigator.id.watch({
        // We use ODS' session management, thus the logged in user from the BrowserID point of view os always null
        loggedInUser: null,

        // the actual ODS BrowserID login
        onlogin: function(assertion) {
          console.log("ODS BrowserID login: " + s_browserIdAction);
          // We use ODS session management, thus, we never want BrowserID auto-login
          navigator.id.logout();

          // connect requires authentication...
          if(s_browserIdAction == "connect") {
            s_browserIdOdsSession.apiCall("user.authenticate.browserid", { action: "connect", "assertion": assertion }).success(s_browseridSuccessHandler).error(s_browseridErrorHandler);
          }

          // ...everything else does not
          else {
            // Log into ODS via the BrowserID, requesting a new session ID
            $.get(ODS.apiUrl('user.authenticate.browserid'), { assertion: assertion, action: s_browserIdAction }).success(function(result) {
              console.log("Browser ID Login SID: " + result);
              ODS.createSessionFromId(result, s_browseridSuccessHandler, s_browseridErrorHandler || ODS.genericErrorHandler);
            }).error(s_browseridErrorHandler || ODS.genericErrorHandler);
          }
        },

        // we do nothing here as we do logout the ods way
        onlogout: function() {
        }
      });
    };

    /*********************** BrowserID end*/


    /**
     * Fetch the SSL host if it is not set and when done fire the ODS.ready event.
     * This will be called when the document is ready. See below.
     *
     * @private
     */
    var fetchSslHost = function() {
        console.log("ODS: Fetching SSL host from ODS instance");
        // fetch the SSL host and port from ODS
        if(odsSSLHost == null) {
          $.get(odsApiUrl("server.getInfo", 0), {info: "sslPort"}).success(function(result) {
            if(result["sslHost"]) {
              odsSSLHost = result["sslHost"] + ":" + result["sslPort"];
              console.log("Fetched SSL Host from ODS: " + odsSSLHost);
              }
            else {
              console.log("Could not fetch SSL Host from ODS.");
            }

            $(document).trigger('ods-ready-event');
          });
        }
        else {
            // nothing to do
          $(document).trigger('ods-ready-event');
        }
    };

    /**
     * ODS initialization.
     */
    $(document).ready(function() {
      if(navigator.id)
        setupBrowserId();
      fetchSslHost();
    });

    /**
     * Construct an ODS API URL with optional ssl.
     * @param methodName The name of the method to call.
     * @param ssl If \p true the returned URL will use the https protocol.
     *
     * @private
     */
    var odsApiUrl = function(methodName, ssl) {
      if(ssl == 1 && odsSSLHost != null) {
        return "https://" + odsSSLHost + "/ods/api/" + methodName;
      }
      else {
          return window.location.protocol + "//" + odsHost + "/ods/api/" + methodName;
      }
    };

    /** @private */
    var Session = function(sessionId) {
        /**
         * ODS Session main object.
         * The main ODS session object provides methods to all the ODS
         * functionality.
         *
         * Create an instance of a session via one of the ODS.authenticate methods.
         *
         * @class
         * @name ODS.Session
         */
        var m_sessionId = sessionId;

        /** @lends ODS.Session# */
        return {
            /**
             * Perform a REST request against this ODS session.
             *
             * @return A jQuery jqXHR object. FIXME: do our own processing.
             */
            apiCall: function(method, params, type) {
                return $.get(odsApiUrl(method), $.extend({ realm: "wa", sid: m_sessionId }, params), type);
            },

            sessionId: function() { return m_sessionId; },

            /**
             * Fetch information about a user.
             *
             * The function has up to three parameters:
             * <li>An optional first parameter which refers to the username, by default the
             * authenticated user is assumed.</li>
             * <li>An optional function to be called on successful retrieval of the user info.
             * This function has one parameter: the map of user details.</li>
             * <li>An optional error function which is called in case the call fails. This
             * function has one parameter: the error message.</li>
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
                        error = arguments[i+1];
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

            connectToThirdPartyService: function(type, url, success, error) {
              if(error == null) {
                error = ODS.genericErrorHandler;
              }

              this.apiCall("user.authenticate.authenticationUrl", { action: "connect", service: type, "callback": url }).success(function(result) {
                window.location.href = result;
              }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error(jqXHR);
              });
            },

            connectToOpenId: function(openid, url, success, error) {
              if(error == null) {
                error = ODS.genericErrorHandler;
              }

              this.apiCall("user.authenticate.authenticationUrl", { action: "connect", service: 'openid', "callback": url, data: openid }).success(function(result) {
                window.location.href = result;
              }).error(error);
            },

            /**
             * Connect this session's account to a BrowserID.
             */
            connectToBrowserId: function(success, error) {
              if(navigator.id) {
                s_browserIdOdsSession = this;
                s_browserIdAction = 'connect';
                s_browseridSuccessHandler = success;
                s_browseridErrorHandler = error || ODS.genericErrorHandler;
                navigator.id.request();
              }
            },

            connectToWebID: function(success, error) {
              if(error == null) {
                error = ODS.genericErrorHandler;
              }

              this.apiCall("user.authenticate.webid", { action: "connect" }).success(success).error(error);
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
     *
     * @private
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

    /** @lends ODS# */
    return {
        /**
         * Bind a function to the custom event of ODS being ready for action.
         *
         * @param callback The function to call once ODS is ready.
         */
        ready: function(callback) {
          $(document).bind('ods-ready-event', callback);
        },

        /**
         * Generic callback for AJAX calls and the like
         */
        genericErrorHandler: function(result) {
          console.log(result);

          if (result.responseText)
            result = result.responseText;

          if(hasError(result, false))
            alert(extractODSErrorMessage(result));
          else
            alert(result);
        },


        host: function() {
          return odsHost;
        },

        sslHost: function() {
          return odsSSLHost;
        },

        /**
         * Creates a URL to an ODS DAV resource.
         *
         * @param path The absolute path to the DAV resource.
         */
        davUrl: function(path) {
          return "http://" + odsHost + "/DAV" + path;
        },

        /**
         * Construct an ODS API URL with optional ssl.
         * @param methodName The name of the method to call.
         * @param ssl If <em>true</em> the returned URL will use the https protocol.
         */
        apiUrl: function(methodName, ssl) {
            return odsApiUrl(methodName, ssl);
        },

        authenticationMethods: function(callback) {
            var methods = [];
            $.get(odsApiUrl("server.getInfo", 0), {info: "regData"}).success(function(result) {
              for(a in result.authenticate) {
                if(result.authenticate[a])
                  methods.push(a);
              }
              callback(methods);
            });
        },

        registrationMethods: function(callback) {
            var methods = [];
            $.get(odsApiUrl("server.getInfo", 0), {info: "regData"}).success(function(result) {
              for(a in result.register) {
                if(result.register[a])
                  methods.push(a);
              }
              callback(methods);
            });
        },

        /**
         * Create a new ODS session with password hash authentication.
         *
         * @param usr The user name.
         * @param pwd The password.
         * @param success A callback function which has one parameter: the new
         * ODS {@link ODS.Session} object.
         * @param error A callback function which has two parameters:
         * <li>An error code</li>
         * <li>A human readable error message.</li>
         */
        createSession: function(usr, pwd, success, error) {
            var authenticationUrl = odsApiUrl("user.authenticate", 0),
            authenticationParams = {
                user_name : usr,
                password_hash : $.sha1(usr + pwd)
            };

            if(error == null) {
                error = ODS.genericErrorHandler;
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
                    error(result);
                }
            }).error(function(jqXHR) {
                // FIXME: handle HTTP errors
                error(jqXHR);
            });
        },

        /**
         * Create a new ODS session through WebID authentication.
         *
         * The browser will automatically request the WebID certificate from
         * the user.
         *
         * @param success A callback function with a single parameter: the new
         * {@link ODS.Session} object.
         * @param An optional error callback function which is called if the
         * session is no longer valid or the ODS call failed.
         */
        createWebIDSession: function(success, error) {
            if(error == null) {
                error = ODS.genericErrorHandler;
            }

            $.get(odsApiUrl("user.authenticate.webid", 1), {}).success(function(result) {
                var s = result;

                console.log("Authentication result: " + s);
                success(new Session(s));
            }).error(error);
        },

        /**
         * Create a new ODS session via an existing OpenID.
         *
         * Creating an ODS session via OpenID is a two-step process:
         * <li>Request the authentication URL from ODS and let the user authenticate and get the redirection</li>
         * <li>Get the new session ID from the redirected URL parameter or parse the error.</li>
         *
         * For the first step pass the <em>openid</em> the user wants to login with to this function as well as
         * the redirection URL to which the OpenID provider should redirect once the OpenID authentication
         * was sucessful. This function will then navigate the user to the OpenID provider's login page.
         * Once the redirection is done this function needs to be called again, this time leaving both
         * parameters empty.
         *
         * @param openid The OpenID the user wants to login with. This needs to be specified for step 1.
         * @param url The callback URL.
         * @param error An optional error callback function which is called if the ODS call failed.
         */
        createOpenIdSession: function(openid, url, error) {
            if(error == null) {
                error = ODS.genericErrorHandler;
            }

            $.get(odsApiUrl("user.authenticate.authenticationUrl", 0), { service: "openid", callback: url, data: openid }, "text/plain").success(function(result) {
              window.location.href = result;
            }).error(error);
        },

        createThirdPartyServiceSession: function(type, url, success, error) {
          if(error == null) {
            error = ODS.genericErrorHandler;
          }

          $.get(odsApiUrl("user.authenticate.authenticationUrl", 0), { service: type, "callback": url }, "text/plain").success(function(result) {
            window.location.href = result;
          }).error(error);
        },

        createBrowserIdSession: function(success, error) {
          if(navigator.id) {
            s_browserIdAction = 'authenticate';
            s_browseridSuccessHandler = success;
            s_browseridErrorHandler = error || ODS.genericErrorHandler;
            navigator.id.request();
          }
        },

        /**
         * Create a new ODS session from an existing session id.
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
            console.log("ODS: createSessionFromId: " + sessionId);
            if(error == null) {
                error = ODS.genericErrorHandler;
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
            }).error(error);
        },

        // FIXME: let the register and auto methods actually create session objects, including the redirect handling.

        registerViaThirdPartyService: function(type, url, success, error) {
          if(error == null) {
            error = ODS.genericErrorHandler;
          }

          $.get(odsApiUrl("user.authenticate.authenticationUrl", 0), { action: "register", service: type, "callback": url }, "text/plain").success(function(result) {
            window.location.href = result;
          }).error(error);
        },

        registerViaWebID: function(success, error) {
          if(error == null) {
            error = ODS.genericErrorHandler;
          }

          $.get(odsApiUrl("user.authenticate.webid", 1), { action: "register" }).success(function(sid) {
            success(new Session(sid));
          }).error(error);
        },

        registerViaOpenId: function(openid, url, success, error) {
            if(error == null) {
                error = ODS.genericErrorHandler;
            }

            $.get(odsApiUrl("user.authenticate.authenticationUrl", 0), { action: "register", service: "openid", callback: url, data: openid }, "text/plain").success(function(result) {
              window.location.href = result;
            }).error(error);
        },

        registerViaBrowserId: function(success, error) {
          if(navigator.id) {
            s_browserIdAction = 'register';
            s_browseridSuccessHandler = success;
            s_browseridErrorHandler = error || ODS.genericErrorHandler;
            navigator.id.request();
          }
        },

        registerOrLoginViaThirdPartyService: function(type, url, success, error) {
          if(error == null) {
            error = ODS.genericErrorHandler;
          }

          $.get(odsApiUrl("user.authenticate.authenticationUrl", 0), { action: "auto", service: type, "callback": url }, "text/plain").success(function(result) {
            window.location.href = result;
          }).error(error);
        },

        registerOrLoginViaWebID: function(success, error) {
          if(error == null) {
            error = ODS.genericErrorHandler;
          }
          $.get(odsApiUrl("user.authenticate.webid", 0), { action: "auto" }, "text/plain").success(function(sid) {
            success(new Session(sid));
          }).error(error);
        },

        registerOrLoginViaBrowserId: function(success, error) {
          if(navigator.id) {
            s_browserIdAction = 'auto';
            s_browseridSuccessHandler = success;
            s_browseridErrorHandler = error || ODS.genericErrorHandler;
            navigator.id.request();
          }
        },

        /**
         * A callback handler which interprets the results from an authentication call
         * via methods like {@link createThirdPartyServiceSession} or {@link registerViaOpenId}.
         *
         * The method will parse the result from the current URL and provide it to the
         * given handler functions in an appropriate form.
         *
         * @param success A function which handles a successful authentication. It has one
         * parameter: the new {@link ODS.Session} object.
         * @param error A function which handles the error case. It has one parameter:
         * the error message.
         *
         * @return If there was a result to process <em>true</em> is returned, <em>false</em>
         * otherwise. In the latter case none of the handler functions is called. Thus, this
         * method can also be used to check if the current URL contains any ODS authentication
         * result.
         */
        handleAuthenticationCallback: function(success, error) {
          error = error || ODS.genericErrorHandler;
          var sid = getParameterByName(window.location.href, 'sid');
          var err = getParameterByName(window.location.href, 'error_msg');
          if(sid.length > 0) {
            success(new Session(sid));
          }
          else if(err.length > 0) {
            error(err);
            return true;
          }
          else {
            return false;
          }
        },

        /**
         * Check if an email address is properly formatted.
         *
         * @param {String} email The candidate email address.
         *
         * @return <em>true</em> if the email address is properly formatted.
         */
        verifyEmailAddressFormat: function(email) {
            var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return filter.test(email);
        }
    }
})();
