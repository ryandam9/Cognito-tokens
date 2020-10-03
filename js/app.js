var region;
var userPoolId;
var identityPoolId;
var appId;
var poolData;
var userPool;
var cognitoUser = '';

// Set Event handlers
document.getElementById('signup-btn').addEventListener('click', addUser);
document.getElementById('confirm-user-btn').addEventListener('click', confirmUser);
document.getElementById('signin-btn').addEventListener('click', authenticateUser);
document.getElementById('save-btn').addEventListener('click', saveConfigData);

var signupMessage = document.getElementById('signup-message');
var signinMessage = document.getElementById('signin-message');
var configMessage = document.getElementById('config-message');

function saveConfigData(e) {
    e.preventDefault();
    configMessage.className = '';
    configMessage.innerText = '';

    // Read UI Data
    region = document.getElementById('region').value;
    userPoolId = document.getElementById('user-pool-id').value;
    identityPoolId = document.getElementById('identity-pool-id').value;
    appId = document.getElementById('client-id').value;

    if (region === '' || userPoolId === '' || identityPoolId === '' || appId === '') {
        configMessage.innerText = 'Provide Region, User Pool ID, Identity Pool ID, app ID values';
        configMessage.style.display = 'block';
        configMessage.className = 'alert alert-danger';
        return;
    }

    poolData = {
        UserPoolId: userPoolId,
        ClientId: appId
    };

    userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
}


/**
 * Signup a User
 * @param e
 */
function addUser(e) {
    signupMessage.style.display = 'none';
    signupMessage.className = '';

    e.preventDefault();

    let name = document.getElementById('name').value;
    let email = document.getElementById('signup-email').value;
    let password = document.getElementById('signup-password').value;

    if (name.length === 0 || email === 0 || password === 0) {
        return;
    }

    let attributeList = [
        new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
            Name: 'given_name', Value: name
        }),
    ];

    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            signupMessage.innerText = err;
            signupMessage.style.display = 'block';
            signupMessage.className = 'alert alert-danger';
            return;
        }

        cognitoUser = result.user;
        console.log('user name is ' + cognitoUser.getUsername());

        // Show a text box to enter Confirmation code
        document.getElementById('signup-btn').style.display = 'none';
        document.getElementById('code-block').style.display = 'block';
        document.getElementById('confirm-user-btn').style.display = 'inline-block';
    });
}

/**
 * Confirm the user by taking the Confirmation code.
 * @param e
 */
function confirmUser(e) {
    e.preventDefault();
    let verificationCode = document.getElementById('code').value;

    cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
        if (err) {
            signupMessage.innerText = err;
            signupMessage.style.display = 'block';
            signupMessage.className = 'alert alert-danger';
            return;
        }

        signupMessage.innerText = result;
        signupMessage.style.display = 'block';
        signupMessage.className = 'alert alert-success';
    });
}

/**
 * Signin user with Email and Password
 * @param e
 */
function authenticateUser(e) {
    e.preventDefault();

    let email = document.getElementById('signin-email').value;
    let password = document.getElementById('signin-password').value;

    if (email.length === 0 || password === 0 || userPool === null || userPool === undefined) {
        signinMessage.innerText = 'Fill in all fields!';
        signinMessage.style.display = 'block';
        signinMessage.className = 'alert alert-danger';
        return;
    }

    let authenticationData = {
        Username: email,
        Password: password,
    };

    let authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

    let userData = {
        Username: email,
        Pool: userPool
    };

    let cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                signinMessage.innerText = 'Authentication Success!';
                signinMessage.style.display = 'block';
                signinMessage.className = 'alert alert-success';

                document.getElementById('token-section').style.display = 'block';
                document.getElementById('signin-btn').style.display = 'none';

                // Decode ID Token
                let idToken = result.idToken.jwtToken;
                document.getElementById('id-token').innerText = idToken;
                document.getElementById('decoded-id-token').appendChild(parseIdToken(idToken));

                // Decode Access Token
                let accessToken = result.getAccessToken().getJwtToken();
                document.getElementById('access-token').innerText = accessToken;
                document.getElementById('decoded-access-token').appendChild(parseAccessToken(accessToken));

                let cognitoUser = userPool.getCurrentUser();

                if (cognitoUser != null) {
                    cognitoUser.getSession(function (err, result) {
                        if (result) {
                            // Set the region where your identity pool exists (us-east-1, eu-west-1)
                            AWS.config.region = region;
                            AWS.config.update({region: region});

                            logins = {};
                            let key = 'cognito-idp.us-east-2.amazonaws.com/' + userPoolId;
                            logins[key] = result.getIdToken().getJwtToken();

                            // Add the User's Id Token to the Cognito credentials login map.
                            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                                IdentityPoolId: identityPoolId,
                                Logins: logins,
                            });

                            // Make the call to obtain credentials
                            AWS.config.credentials.get(function () {
                                // Credentials will be available when this function is called.
                                var accessKeyId = AWS.config.credentials.accessKeyId;
                                var secretAccessKey = AWS.config.credentials.secretAccessKey;
                                var sessionToken = AWS.config.credentials.sessionToken;
                            });

                            // Create a new service object
                            // var s3 = new AWS.S3({
                            //     apiVersion: '2006-03-01',
                            //     params: {Bucket: 'Specify bucket name here'}
                            // });

                            // Call S3 to list the buckets
                            // s3.listObjects({Delimiter: '/'}, function (err, data) {
                            //     if (err) {
                            //         return alert('There was an error listing your albums: ' + err.message);
                            //     } else {
                            //         var albums = data.CommonPrefixes.map(function (commonPrefix) {
                            //             var prefix = commonPrefix.Prefix;
                            //             var albumName = decodeURIComponent(prefix.replace('/', ''));
                            //             var albumPhotosKey = encodeURIComponent(albumName) + '/';
                            //
                            //             s3.listObjects({Prefix: albumPhotosKey}, function (err, data) {
                            //                 if (err) {
                            //                     return alert('There was an error viewing your album: ' + err.message);
                            //                 }
                            //                 // 'this' references the AWS.Response instance that represents the response
                            //                 var href = this.request.httpRequest.endpoint.href;
                            //                 var bucketUrl = href + 'Specify bucket name here' + '/';
                            //
                            //                 var photos = data.Contents.map(function (photo) {
                            //                     var photoKey = photo.Key;
                            //                     var photoUrl = bucketUrl + encodeURIComponent(photoKey);
                            //                     console.log(photoUrl);
                            //                 });
                            //             });
                            //         });
                            //     }
                            // });
                        }
                    });
                }
            },
            onFailure: function (err) {
                        signinMessage.innerText = err;
                        signinMessage.style.display = 'block';
                        signinMessage.className = 'alert alert-danger';
            }
        }
    );
}

function createListElement(key, text) {
    let li = document.createElement('li');
    li.innerText = key + ' - ' + text;
    return li;
}

function parseIdToken(idToken) {
    let decodedIdToken = jwt_decode(idToken);

    let temp = document.createElement('ul');
    temp.appendChild(createListElement('token_use', decodedIdToken.token_use));
    temp.appendChild(createListElement('aud', decodedIdToken.aud));
    temp.appendChild(createListElement('sub', decodedIdToken.sub));
    temp.appendChild(createListElement('cognito:username', decodedIdToken['cognito:username']));
    temp.appendChild(createListElement('auth_time', decodedIdToken.auth_time));
    temp.appendChild(createListElement('exp', decodedIdToken.exp));
    temp.appendChild(createListElement('email', decodedIdToken.email));
    temp.appendChild(createListElement('email_verified', decodedIdToken.email_verified));
    temp.appendChild(createListElement('event_id', decodedIdToken.event_id));
    temp.appendChild(createListElement('given_name', decodedIdToken.given_name));
    temp.appendChild(createListElement('iat', decodedIdToken.iat));
    temp.appendChild(createListElement('iss', decodedIdToken.iss));

    return temp;
}

function parseAccessToken(accessToken) {
    let decodedAccessToken = jwt_decode(accessToken);

    let temp = document.createElement('ul');
    temp.appendChild(createListElement('token_use', decodedAccessToken.token_use));
    temp.appendChild(createListElement('client_id', decodedAccessToken.client_id));
    temp.appendChild(createListElement('sub', decodedAccessToken.sub));
    temp.appendChild(createListElement('username', decodedAccessToken.username));
    temp.appendChild(createListElement('auth_time', decodedAccessToken.auth_time));
    temp.appendChild(createListElement('event_id', decodedAccessToken.event_id));
    temp.appendChild(createListElement('exp', decodedAccessToken.exp));
    temp.appendChild(createListElement('iat', decodedAccessToken.iat));
    temp.appendChild(createListElement('iss', decodedAccessToken.iss));
    temp.appendChild(createListElement('jti', decodedAccessToken.jti));
    temp.appendChild(createListElement('scope', decodedAccessToken.scope));

    return temp;
}
