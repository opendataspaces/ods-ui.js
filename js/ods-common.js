/**
 * Create an ODS DAV URL.
 * \param path The path to the file in the DAV system.
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
 * \param root The root XML element as returned by the ODS REST call.
 * \param showMessage If \p true a message box will pop up with the error message.
 *
 * \return \p true if it is in fact an error.
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
 * \param {String} email The candidate email address.
 *
 * \return \p true if the email address is properly formatted.
 */
function checkEmailAddress(email) {
    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return filter.test(email);
}


var ODS = (function() {

    /**
     * \brief ODS Session main object
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
             * \brief Perform a REST request against this ODS session.
             *
             * \return A jQuery jqXHR object. FIXME: do our own processing.
             */
            apiCall: function(method, params) {
                return $.get(ODS.createOdsApiUrl(method), $.extend({ realm: "wa", sid: m_sessionId }, params));
            },

            sessionId: function() { return m_sessionId; },

            /**
             * \brief Fetch information about a user.
             *
             * The function has up to three parameters:
             * - An optional first parameter which refers to the username, by default the
             * authenticated user is assumed.
             * - An optional function to be called on succesful retrieval of the user info.
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

    // Member variables
    var m_odsHost = null;
    var m_odsSslHost = null;

    return {
        /**
         * \brief Create a new ODS session with password hash authentication.
         *
         * \param usr The user name.
         * \param pwd The password.
         * \param success A callback function which has one parameter: the new
         * ODS instance object.
         * \param error A callback function which has two parameters:
         * - An error code
         * - A human readable error message. TODO: translate the error message.
         */
        createSession: function(usr, pwd, success, error) {
            var authenticationUrl = ODS.createOdsApiUrl("user.authenticate", 0),
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

        createWebIDSession: function(success, error) {
            var authenticationUrl = ODS.createOdsApiUrl("user.authenticate", 1);

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
         * \brief Create a new ODS session from an existing session id.
         *
         * This is for example useful for storing the session id in a cookie.
         * The function will check if the session is still valid and if so
         * create a corresponding Session object.
         *
         * \param sessionId The id of the session.
         * \param success A callback function with a single parameter: the new
         * Session object.
         * \param An optional error callback function which is called if the
         * session is no longer valid or the ODS call failed.
         */
        createSessionFromId: function(sessionId, success, error) {
            if(error == null) {
                error = function(msg) { alert(msg); };
            }

            // check if the session is still valid by fetching user details
            $.get(ODS.createOdsApiUrl("user.info"), { realm: "wa", sid: sessionId }).success(function(result) {
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
        },

        /**
         * @brief Set the ODS host address.
         *
         * This ODS framework can connect to any ODS instance, given that
         * CORS is configured properly.
         *
         * By default the host is empty (null) which means that the ODS instance
         * is expected to run on the serving machine.
         *
         * In order to change the default this method can be used to set the host
         * name and an optional SSL host.
         *
         * @param host The hostname of the ODS instance.
         * @param sslHost An optional hostname for SSL access to the ODS instance.
         *
         * Examples:
         * @code
         * ODS.setOdsHost("localhost:8890", "localhost:4433");
         * @endcode
         */
        setOdsHost: function(host, sslHost) {
            m_odsHost = host;
            m_odsSslHost = sslHost;
        },

        /// @sa setOdsHost
        getOdsHost: function() {
            return m_odsHost;
        },

        /// @sa setOdsHost
        getOdsSslHost: function() {
            return m_odsSslHost;
        },

        /**
         * @brief Construct an ODS API URL with optional ssl.
         *
         * Normally one should rather use a session.
         *
         * @param methodName The name of the method to call.
         * @param ssl If \p true the returned URL will use the https protocol.
         *
         * @return A new URL which can be used for an HTTP call.
         */
        createOdsApiUrl: function (methodName, ssl) {
            var oh = m_odsHost == null || m_odsHost.length == 0 ? window.location.host : m_odsHost;
            var os = m_odsSslHost == null || m_odsSslHost.length == 0 ? oh : m_odsSslHost;
            if(ssl == true || /* HACK: work around local CORS issues */ window.location.protocol == "https:") {
                return "https://" + os + "/ods/api/" + methodName;
            }
            else {
                return "http://" + oh + "/ods/api/" + methodName;
            }
        }
    };
})();
