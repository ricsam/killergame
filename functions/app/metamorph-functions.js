

const fb = (() => {
  let ob = {};

  if (typeof module !== 'undefined' && module.exports) {
    // node.js
    let functions = require('firebase-functions');
    const admin = require('firebase-admin');
    admin.initializeApp(functions.config().firebase);
    ob.database = admin.database;
  } else {
    // browser
    ob.database = firebase.database;
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
          return fb.database()
            .ref('game_data/' + dead_user_data[keylock] + '/status/allowed_write_uid')
            .set(killer_uid);
        });


      });


    });

  } else {
    throw new Error(`Status: ${status}, dead_man_uid: ${dead_man_uid}, killer_uid: ${killer_uid}`);
  }
  // return ('user is still alive!');

}


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

  let game_data = {};


  let items_data = itemsSnapshot.val();

  let items_values = Object.keys(items_data).map((key) => {
      return items_data[key];
  });

  let keys = shuffle(Object.keys(register_data)),
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

    game_data[keys[i]] = {
      target_name: register_data[keys[future_index]].email, // target name
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

function getItems(cb) {
  return fb.database().ref('/items').once('value').then(cb);
}

function setInitialGameData() {
  let registerRef = fb.database().ref('/users/register');

  return registerRef.once('value').then(registerSnapshot => {

    return getItems((itemsSnapshot) => {
      let gd = getGameData(registerSnapshot, itemsSnapshot);
      fb.database().ref('/game_data').update(gd).then(() => {

        console.log('game data set');

      }).catch((err) => console.log(err));

      console.log(gd);
    });

  }).catch(error => {
    console.log(error);
  });

}

function registerUser(user) {

  if ( user.providerData && user.providerData.length === 1 && user.providerData[0].providerId === 'password' ) {
    return;
  }
  
  let registerRef = fb.database().ref('/users/register');

  return registerRef.once('value').then(registerSnapshot => {

    let register_data = registerSnapshot.val();

    let code = generateUserCode(register_data);

    let new_user = {};
    new_user[user.uid] = {
      code,
      email: user.email,
      name: user.displayName || 'Anonymous'
    };

    registerRef.update(new_user);

  });

}

function cloudFunctionKillUser(event) {

  let uid = event.params.uid;
  let killerUIDRef = fb.database().ref('/game_data/' + uid + '/status/allowed_write_uid');

  return killerUIDRef.once('value').then((killerUIDsnapshot) => {
    let killer_uid = killerUIDsnapshot.val();
    return killUser(event.data.val(), uid, killer_uid);
  });

}

if (typeof module !== 'undefined' && module.exports) {
  // node.js
  module.exports = {
    registerUser,
    cloudFunctionKillUser,
    setInitialGameData
  }
}


