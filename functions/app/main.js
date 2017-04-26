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
  current_user_name;


function loadUserGameInfo() {

  return getGameDataValues(['target_name', 'death_code', 'weapon', 'status/alive']).then((object) => {

    // $('#user-game-data').html(JSON.stringify(object, null, '  '));

    $('#current-uid').html('Hej ' + current_user_name + ', du är <b>' + (object['status/alive'] ? 'i liv' : 'död') + '</b>!' + '<br>Du ska döda ' + object.target_name + ' med en/ett ' + object.weapon);

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

    // $('#user-game-data').html(JSON.stringify(user, null, '  '));
    // JSON.stringify(user);

    // registerUser(user);
    current_user_name = user.displayName;

    loadUserGameInfo();
    $('#current-uid').text('Hej ' + user.displayName);
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
  let registerRef = firebase.database().ref('/users/register');
  // admin code

  return registerRef.once('value').then(registerSnapshot => {

    let register_data = registerSnapshot.val();

    let code = generateUserCode(register_data);

    let new_user = {};
    new_user[user.uid] = {
      code,
      email: user.email,
      name: name
    };

    registerRef.update(new_user);

  }).catch(error => {
    console.log(error);
  });
}

