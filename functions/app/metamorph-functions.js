

const fb = (() => {
  let ob = {};

  if (typeof module !== 'undefined' && module.exports) {
    // node.js
    let functions = require('firebase-functions');
    const admin = require('firebase-admin');
    admin.initializeApp(functions.config().firebase);
    ob.database = admin.database;
    ob.messaging = admin.messaging;
    ob.admin = admin;
  } else {
    // browser
    ob.database = firebase.database;
    ob.messaging = firebase.messaging;
  }


  return ob;

})();



// admin function
function killUser(status, dead_man_uid, killer_uid) {

  if ( status === false && dead_man_uid && killer_uid )  {

    console.log('will kill', dead_man_uid, 'by', killer_uid);
    // getGameDataValues(['weapon', 'target_name',], dead_man_uid);

    let deadUserRef = fb.database().ref('/game_data/' + dead_man_uid);
    return deadUserRef.once('value').then((deadUserSnapshot) => {
      let dead_user_data = deadUserSnapshot.val();

      return getGameDataValues(['hunted-by-weapon', 'death_code', 'status'], killer_uid).then((current_user_data) => {

        let keylock = dead_user_data.targetUID_keylock;

        let new_user_data = {
          // inherited from victim
          weapon: dead_user_data.weapon,
          target_name: dead_user_data.target_name,
          targetUID_keylock: keylock,

          // kept data
          "hunted-by-weapon": current_user_data["hunted-by-weapon"],
          death_code: current_user_data.death_code,
          status: current_user_data.status
        };

        new_user_data[keylock] = dead_user_data[keylock];


        return fb.database().ref('/game_data/' + killer_uid).set(new_user_data).then(() => {
        return fb.database().ref('game_data/' + dead_user_data[keylock] + '/status/allowed_write_uid').set(killer_uid).then(() => {
        return fb.database().ref('/users/register/' + killer_uid + '/tokens').once('value');
        }).then((tokensSnap) => {
          if ( ! tokensSnap.exists() ) return;

          let tokens = Object.keys(tokensSnap.val());

          return fb.messaging().sendToDevice(tokens, {data: {new_target: "true"}});
        })});
      }); 

    });

  } else if (status !== false) {
    throw new Error(`Status: ${status}, dead_man_uid: ${dead_man_uid}, killer_uid: ${killer_uid}`);
  }
  // return ('user is still alive!');

}

function updateEveryClientUserTarget() {
  return getAllTokens().then(updateClientUserTarget);
}

function updateClientUserTarget(tokens) {
  if ( ! tokens || ! tokens.length ) return;
  return fb.messaging().sendToDevice(tokens, {data: {new_target: "true"}});
}

function getAllTokens() { return new Promise((resolve) => {
  let tokens = [];
  let registerRef = fb.database().ref('/users/register');
  registerRef.once('value').then((registerSnapshot) => {
    registerSnapshot.forEach((userSnapshot) => {
      if (userSnapshot.hasChild('tokens')) {
        let user_tokens = Object.keys(userSnapshot.child('tokens').val());
        tokens = Array.prototype.concat.call([], tokens, user_tokens);
      }
    });

    resolve(
      tokens.filter((item, index) => {
        return tokens.indexOf(item) === index;
      })
    );
  });

})}


function randomIntFromInterval(min,max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function generateUserCode(register_data) {
  let code = randomIntFromInterval(1000, 9999);

  if ( ! register_data ) return code;

  let keys = Object.keys(register_data),
      codes = Object.keys(register_data).map((key) => register_data[key].code);


  let while_limit = 0;
  while (codes.indexOf(code) > -1 && while_limit < 10) {
    code = randomIntFromInterval(1000, 9999);
    while_limit++;
  }

  return code;

}



function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


function getGameData(registerSnapshot, itemsSnapshot) {
  let register_data = registerSnapshot.val();

  const filterGameDataUser = (key) => {
    let user_data = register_data[key];
    return user_data.hasOwnProperty('name') && user_data.hasOwnProperty('code') && user_data.name !== 'Anonymous-name' && user_data.name !== null;
  };

  let game_data = {};


  let items_data = itemsSnapshot.val();

  let items_values = Object.keys(items_data).map((key) => {
      return items_data[key];
  });

  let keys = shuffle(Object.keys(register_data).filter(filterGameDataUser)),
      items = shuffle(items_values);

  if (keys.length < 2) {
    console.log('not enough members participating');
    return;
  }

  for (let i = 0; i < keys.length; i++) {
    let future_index,
        previous_index;

    if (i === keys.length - 1) {
      future_index = 0;
    } else {
      future_index = i + 1;
    }
    if (i === 0) {
      previous_index = keys.length - 1;
    } else {
      previous_index = i - 1;
    }

    if (typeof register_data[keys[future_index]].name === 'undefined' ) {
      console.log(register_data);
      console.log(keys);
      console.log(future_index);
    }

    game_data[keys[i]] = {
      target_name: register_data[keys[future_index]].name, // target name
      weapon: items[i % items.length],
      "hunted-by-weapon": items[previous_index % items.length],
      death_code: register_data[keys[i]].code,
      status: {
        allowed_write_uid: keys[previous_index],
        alive: true
      },
      targetUID_keylock: register_data[keys[future_index]].code
    };
    game_data[keys[i]][register_data[keys[future_index]].code] = keys[future_index]; // target
  }

  return game_data;
}

function getGameDataValues(data, uid) { return new Promise((resolve, reject) => {

  uid = uid || firebase.auth().currentUser.uid;
  let object = {};


  data.forEach((key) => {
    let ref = fb.database().ref('/game_data/' + uid + '/' + key);
    ref.once('value').then((snapshot) => {
      let value = snapshot.val();

      object[key] = value;
      if (Object.keys(object).length === data.length) {
        resolve(object);
      }

    }).catch((error) => {
      console.log(`Error with ${key}`);
      reject(error);
    });
  });
  
})}


function validateAndFixRegister() { return new Promise((resolve, reject) => { // only fix for manual KGK account creation
  let fixes = 0,
      fixed = 0;
  
  let registerRef = fb.database().ref('/users/register');

  registerRef.once('value').then((registerSnapshot) => {
    registerSnapshot.forEach((userSnapshot) => {
      if ( ! userSnapshot.hasChild('name')  || userSnapshot.child('name').val() === null || userSnapshot.child('name').val() === 'Anonymous-name') {

        fixes++;

        fb.admin.auth().getUser(userSnapshot.key).then((userRecord) => {
          if ( ! userRecord.displayName || userRecord.displayName !== 'Anonymous-name') {
            return registerRef.child(userSnapshot.key + '/name').set(userRecord.displayName);
          } else {
            return true;
          }
        }).then(() => {

          fixed++;
          if (fixed === fixes) {
            console.log('fixed: ' + fixed);
            resolve();
          }

        }).catch(reject);

      }
    });
    
    if (fixes === 0) {
      resolve();
    }
  }).catch(reject);


  
})}

function setInitialGameData() {
  let registerRef = fb.database().ref('/users/register');

  return validateAndFixRegister().then(() => {
    return registerRef.once('value');
  })
  .then(registerSnapshot => {
    return fb.database().ref('/items').once('value').then((itemsSnapshot) => {
      let game_data = getGameData(registerSnapshot, itemsSnapshot);
      return fb.database().ref('/game_data').update(game_data);
    });
  });

}

function registerUser(user) {

  let registerRef = fb.database().ref('/users/register');

  return registerRef.once('value').then(registerSnapshot => {

    let register_data = registerSnapshot.val();

    let code = generateUserCode(register_data);

    let new_user = {};
    new_user[user.uid] = {
      code,
      email: user.email || 'email-not-set',
      name: user.displayName || 'Anonymous-name'
    };

    return registerRef.update(new_user);

  });

}

function cloudFunctionKillUser(event) {

  let uid = event.params.uid;
  let killerUIDRef = fb.database().ref('/game_data/' + uid + '/status/allowed_write_uid');

  return killerUIDRef.once('value').then((killerUIDsnapshot) => {
    let killer_uid = killerUIDsnapshot.val();
    if (event.data.previous.val() === true && event.data.val() === false) { // was alive and now dead
      return killUser(event.data.val(), uid, killer_uid);
    } else {
      return; // at restarts of the game when data.previous.val() === false and data.val() === true the killUser should not be called!
    }
  });

}

if (typeof module !== 'undefined' && module.exports) {
  // node.js
  module.exports = {
    registerUser,
    cloudFunctionKillUser,
    setInitialGameData,
    updateEveryClientUserTarget
  }
}


