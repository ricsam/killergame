var functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp(functions.config().firebase);


const { registerUser, cloudFunctionKillUser, setInitialGameData, updateEveryClientUserTarget } = require('./app/metamorph-functions.js');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((req, res) => {
  // const registerRef = admin.database().ref('users/data');

  // let data = usersRef.toJSON();
  // let keys = Object.keys(data);

  res.end('Game started!');

  return setInitialGameData().then(() => {
    updateEveryClientUserTarget();
  }).catch(err => console.log(err));


});


exports.sendWelcomeEmail = functions.auth.user().onCreate(event => {

  const user = event.data;

  return registerUser(user);

});

exports.killUser = functions.database.ref('/game_data/{uid}/status/alive').onWrite(cloudFunctionKillUser);


  // let linkRef = firebase.database().ref('users/register/' + uid);
  // linkRef.once('value').then((snapshot) => {
  //   if (snapshot.exists()) {
  //     console.log('user already registered');
  //   } else {
  //     console.log('creating new user!');
  //     let new_user = {};
  //     new_user[uid] = {
  //       name: user.displayName,
  //       email: user.email
  //     };

  //     firebase.database().ref('users/register').update(new_user);
  //   }
  // }).catch((error) => {
  //   console.log(error);
  // })