// Initialize Firebase
var config = {
  apiKey: "AIzaSyDG2LyyD4ai7p7vxb9kNxG-V28fNbYUdc8",
  authDomain: "killergame-42f36.firebaseapp.com",
  databaseURL: "https://killergame-42f36.firebaseio.com",
  projectId: "killergame-42f36",
  storageBucket: "killergame-42f36.appspot.com",
  messagingSenderId: "1026367273727"
};
firebase.initializeApp(config);

var currentUID,
  currentToken;


function loadUserGameInfo() {

  return getGameDataValues(['target_name', 'death_code', 'weapon', 'status/alive']).then((object) => {

    let user = firebase.auth().currentUser;

    $('#user-info').html(
      'Hej '
      + user.displayName
      + ', du är <b>'
      + (object['status/alive'] ? 'i liv' : 'död')
      + '</b>!'
      + '<br>Du ska döda '
      + object.target_name
      + ' med en/ett '
      + object.weapon
      + '<div style="margin-top: 5px;"><i>Har du blivit dödad?</i> - i så fall uppge '
      + "<pre style='display: inline; font-size: 16px'>"
      + object.death_code
      + "</pre></div>"
      );

  });

}

function killSomeone() {
  let code = $('#killcode').val();
  let user = firebase.auth().currentUser;

  if ( ! code.length ) {
    return console.log('invalid code');
  }

  getGameDataValues([code]).then((data) => {

    let data_values = Object.keys(data).map((key) => {
        return data[key];
    });

    let target_uid = data_values[0];


    if ( ! data[code] ) {
      throw new Error('invalid code');
      return;
    }

    let targetAliveRef = firebase.database().ref('/game_data/' + target_uid + '/status/alive');
    return targetAliveRef.set(false).then(() => {
      $('#kip').show();
      $('#kill-code-form,#user-info').hide();

      // return getGameDataValues(['status/alive'], target_uid).then((data) => {
        // let alive_status = Object.values(data)[0];
        // if using admin on client
        // return killUser(alive_status, target_uid, firebase.auth().currentUser.uid);
      // });
    });


  }).then((status) => {

    console.log('That user is now dead, you have a new target!');

  }).catch(err => console.log(err));
}


function saveToken(token) {
  if (token) {

    currentToken = token;

    let reference = firebase.database().ref('/users/register/' + currentUID + '/tokens');
    reference.once('value').then((snap) => {
      if ( ! snap.hasChild(token) ) {
        reference.child(token).set(navigator.userAgent);
      }
    });

  } else {
    console.log('No Instance ID token available. Request permission to generate one.');
  }
}

function handleTokenPermission() {
  firebase.messaging().requestPermission().then(() => {
    console.log('Notification permission granted.');
    $('#push-notifications-form').hide();

    return firebase.messaging().getToken();

  })
  .then(saveToken)
  .catch((err) => {

    if (Notification.permission === 'denied') {
      $('#push-notifications-form').show();
    }
    console.log(err);

  });    
}

function displayTheUserInfo() {

  let user = firebase.auth().currentUser;

  return loadUserGameInfo().then(() => {
    $('#kill-code-form').show();
  }).catch(err => {
    // Client doesn't have permission to access the desired data
    $('#user-info').html('Hej ' + user.displayName + '! Du är registrerad men omgången har redan påbörjats. Du kommer vara med nästa omgång');
  });
}

function onAuthStateChanged(user) {
  if (user && currentUID === user.uid) {
    return;
  }
  if (user) {
    // logged in!
    currentUID = user.uid;

    console.log(user);
    $('#sign-in-form').hide();
    $('#user-info, #logout').show();

    if ( ! user.displayName || user.displayName === 'Anonymous-name') { // only happens during manual registration, and the name is yet to be set
      $('#user-info').html('Laddar...');
    } else {
      displayTheUserInfo();
    }

    handleTokenPermission();



  } else {
    currentUID = null;
  }
}

function signInWithPopup(provider) {
  firebase.auth().signInWithPopup(provider).then((result) => {
    console.log('logged in!');
  }).catch((error) => {
    console.log(error);
  });
}

function addKGKUserData(user, name) {
  let registerNameRef = firebase.database().ref('/users/register/' + user.uid + '/name');
  return registerNameRef.set(name);
}

