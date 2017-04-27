$(() => {

  $('#sign-in-kgk').click((ev) => {
    $('#sign-in-kgk-form').show();
    $('#sign-in-form').hide();
  });


  $('#auth-google').click(() => {
    var provider = new firebase.auth.GoogleAuthProvider();
    signInWithPopup(provider);
  });

  $('#auth-fb').click(() => {
    var provider = new firebase.auth.FacebookAuthProvider();
    signInWithPopup(provider);
  });

  $('#auth-kgk').click(() => {
    firebase.auth().signInWithEmailAndPassword($('#kgk-login-email').val(), $('#kgk-login-password').val())
    .then(() => {
      $('#sign-in-kgk-form').hide();
    })
    .catch(err => {
      console.log(err);
    });
  });

  $('#logout').click(() => {
    firebase.auth().signOut();
    $('#kill-code-form,#kip,#user-info,#logout').hide();
    $('#sign-in-form').show();
  });

  $('#register-kgk-account').click(() => {
    $('#register-kgk-form').show();
    $('#sign-in-kgk-form').hide();
  });

  // $('#enable-notifications').click(() => {
  //   handleTokenPermission();
  // });

  $('#register').click(() => {

    let email = $('#kgk-register-email').val();
    let password = $('#kgk-register-pw').val();
    let name = $('#kgk-register-name').val();

    if (email.length < 4) {
      alert('Please enter an email address.');
      return;
    }

    if (password.length < 4) {
      alert('Please enter a password.');
      return;
    }

    if (password !== $('#kgk-register-pw-confirm').val()) {
      alert('The passwords do not match.');
      return;
    }

    if (name.length <= 6) {
      if ( ! confirm('Is that name corret?')) {
        return;
      }
    }


    firebase.auth().createUserWithEmailAndPassword(email, password).then((user) => {

      return user.updateProfile({
        displayName: name
      })
      .then(() => {
        return addKGKUserData(user, name);
      });

    })
    .then((user) => {

      $('#register-kgk-form').hide();
      return displayTheUserInfo();

    })
    .catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // [START_EXCLUDE]
      if (errorCode == 'auth/weak-password') {
        alert('The password is too weak.');
      } else {
        console.log(errorCode, errorMessage);
      }
      console.log(error);
      // [END_EXCLUDE]
    });
  });



  $('#admin-start-game').click(() => {
    setInitialGameData();
  });

  $('#kill').click(() => {

    killSomeone();

  });


  function noKillingInProgress() {
    loadUserGameInfo().then(() => {
      $('#kip').hide();
      $('#kill-code-form,#user-info').show();
      $('#killcode').val('');
    });
  }


  firebase.auth().onAuthStateChanged(onAuthStateChanged);

  let messaging = firebase.messaging();

  messaging.onTokenRefresh(() => {
    messaging.getToken()
    .then((refreshedToken) => {

      if (currentToken !== refreshedToken) {

        console.log('Token is refreshed, will update!');

        let tokensReference = firebase.database().ref('/users/register/' + currentUID + '/tokens');

        tokensReference.child(currentToken).remove().then(() => {

          return tokensReference.once('value');

        })
        .then((tokensSnapshot) => {
          if ( ! tokensSnapshot.hasChild(token) ) {
            tokensReference.child(refreshedToken).set(navigator.userAgent);
          }
        });

      }

    })
    .catch((err) => {
      console.log('Unable to retrieve refreshed token ', err);
    });
  });


  messaging.onMessage((payload) => {
    console.log(payload);
    if (payload && payload.data && payload.data.new_target) {
      noKillingInProgress();
    }
  });

  navigator.serviceWorker.addEventListener('message', function(event) { // will be called if the page is in the background
    console.log('Received a message from service worker: ', event.data);
    if (event.data && event.data.new_target) {
      noKillingInProgress();
    }
  });

  $('form').on('submit', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    return false;
  });
});
