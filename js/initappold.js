var ctr;

var clientId = '1065138508028-r2tgtdnk8fdr7pann7elgv6nptg85dtp.apps.googleusercontent.com';
var apiKey = 'AIzaSyAZX14yLHGoDHYUuxfL9LV6wjhCP_afLV0';
var clientSecret='uSPWvXfhwy0NvcNnX7uwDjaB';
var scopes = 'https://www.googleapis.com/auth/fusiontables';
var redirectUri='http://localhost';

//device ready
$(document).on('deviceready', function() {
		    //login flipswitch
		    $(document).on('change', '#loginFLP', function(event) {
		    	var loginState=$("#loginFLP").val();
		    	if(loginState=="on")loginGapi();
		    	if(loginState=="off")logoutGapi();
		    });
		    startApp();    
});

//start app
function startApp(){
	//controller
	ctr=new Controller();
	//check connection
	if (typeof google != "undefined") {
			ctr.init();
	}
	else{alert("keine Verbindung");}
}

// Initialize gapi
 function initialize() {
	gapi.client.setApiKey("AIzaSyAZX14yLHGoDHYUuxfL9LV6wjhCP_afLV0");
	$("#loginFLP").val("off").flipswitch( "refresh" );
	//gapi.auth.setToken({access_token:"ya29.1.AADtN_XXeC6mpwsDc6mq06qIEx2cenvp-TPCrDRckxBdkbxZ5wkmFsbrouuflA" , expires_in:3600 , state: 'https://www.googleapis.com/auth/fusiontables'});
}
			
//login gapi
function loginGapi(){
    googleapi.authorize({
        client_id: '1065138508028-r2tgtdnk8fdr7pann7elgv6nptg85dtp.apps.googleusercontent.com',
        client_secret: 'uSPWvXfhwy0NvcNnX7uwDjaB',
        redirect_uri: 'http://localhost',
        scope: 'https://www.googleapis.com/auth/fusiontables'
    }).done(function(data) {
    	alert(data.access_token);
    	gapi.auth.setToken({access_token:data.access_token , expires_in:3600 , state: 'https://www.googleapis.com/auth/fusiontables'});
    }).fail(function(data) {
        $loginStatus.html(data.error);
    });
 } 
 
//logout gapi
function logoutGapi(){
	gapi.auth.setToken(null);
	ctr.loggedIn=false;
}

//login gapi object
var googleapi = {
    authorize: function(options) {
        var deferred = $.Deferred();

        //Build the OAuth consent page URL
        var authUrl = 'https://accounts.google.com/o/oauth2/auth?' + $.param({
            client_id: options.client_id,
            redirect_uri: options.redirect_uri,
            response_type: 'code',
            scope: options.scope
        });

        //Open the OAuth consent page in the InAppBrowser
        alert(authUrl);
        var authWindow = window.open(authUrl, '_blank', 'location=no,toolbar=no');

        //The recommendation is to use the redirect_uri "urn:ietf:wg:oauth:2.0:oob"
        //which sets the authorization code in the browser's title. However, we can't
        //access the title of the InAppBrowser.
        //
        //Instead, we pass a bogus redirect_uri of "http://localhost", which means the
        //authorization code will get set in the url. We can access the url in the
        //loadstart and loadstop events. So if we bind the loadstart event, we can
        //find the authorization code and close the InAppBrowser after the user
        //has granted us access to their data.
        $(authWindow).on('loadstart', function(e) {
            var url = e.originalEvent.url;
            var code = /\?code=(.+)$/.exec(url);
            var error = /\?error=(.+)$/.exec(url);

            if (code || error) {
                //Always close the browser when match is found
                authWindow.close();
            }

            if (code) {
                //Exchange the authorization code for an access token
                $.post('https://accounts.google.com/o/oauth2/token', {
                    code: code[1],
                    client_id: options.client_id,
                    client_secret: options.client_secret,
                    redirect_uri: options.redirect_uri,
                    grant_type: 'authorization_code'
                }).done(function(data) {
                    deferred.resolve(data);
                }).fail(function(response) {
                    deferred.reject(response.responseJSON);
                });
            } else if (error) {
                //The user denied access to the app
                deferred.reject({
                    error: error[1]
                });
            }
        });

        return deferred.promise();
    }
};



 
    

