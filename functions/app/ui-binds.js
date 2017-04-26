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
    firebase.auth().signInWithEmailAndPassword($('#kgk-login-email').val(), $('#kgk-login-password').val()).catch(err => {
      console.log(err);
    });
  });

  $('#logout').click(() => {
    firebase.auth().signOut();
  });

  $('#admin-register-kgk-account').click(() => {
    $('#register-kgk-form').show();
  });

  $('#register').click(() => {

    let email = $('#kgk-register-email').val();
    let password = $('#kgk-register-pw').val();

    if (email.length < 4) {
      alert('Please enter an email address.');
      return;
    }

    if (password.length < 4) {
      alert('Please enter a password.');
      return;
    }


    firebase.auth().createUserWithEmailAndPassword(email, password).then((user) => {

      let name = $('#kgk-register-name').val();
      return user.updateProfile({
        displayName: name
      }).then(() => {
        return addKGKUserData(user, name);
      })
    })
    .then((user) => {
      // let user = firebase.auth().currentUser;
      console.log('even called?');

    })
    .catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // [START_EXCLUDE]
      if (errorCode == 'auth/weak-password') {
        alert('The password is too weak.');
      } else {
        alert(errorMessage);
      }
      console.log(error);
      // [END_EXCLUDE]
    });
  });



  $('#admin-start-game').click(() => {
    setInitialGameData();
  });

  $('#kill').click(() => {

    let code = $('#killcode').val();
    let user = firebase.auth().currentUser;

    if ( ! code.length ) {
      return console.log('invalid code');
    }

    getGameDataValues([code]).then((data) => {
      let target_uid = Object.values(data)[0];

      if ( ! data[code] ) {
        throw new Error('invalid code');
        return;
      }

      let targetAliveRef = firebase.database().ref('/game_data/' + target_uid + '/status/alive');
      return targetAliveRef.set(false).then(() => {
        $('#user-game-data').text('Loading new target...');

        // return getGameDataValues(['status/alive'], target_uid).then((data) => {
          // let alive_status = Object.values(data)[0];
          // if using admin on client
          // return killUser(alive_status, target_uid, firebase.auth().currentUser.uid);
        // });
      });


    }).then((status) => {

      console.log('That user is now dead, you have a new target!');
      setTimeout(loadUserGameInfo, 4000);

    }).catch(err => console.log(err));

  });



  firebase.auth().onAuthStateChanged(onAuthStateChanged);
});
