// ----------------------------------------------------------------------------
// Load dependencies...
// ----------------------------------------------------------------------------
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const Chatkit = require('@pusher/chatkit-server');
// ----------------------------------------------------------------------------
// Instantiate Express and Chatkit
// ----------------------------------------------------------------------------

const app = express();
const chatkit = new Chatkit.default(require('./config.js'));
// ----------------------------------------------------------------------------
// Load Express Middlewares
// ----------------------------------------------------------------------------
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname,'assets')))

// ----------------------------------------------------------------------------
// Define Routes
// ----------------------------------------------------------------------------
app.post('/session/auth', (req, res) => {
    const authData = chatkit.authenticate({ userId: req.query.user_id });
  
    res.status(authData.status).send(authData.body);
  });

  app.post('/session/load', (req, res, next) => {
    let createdUser = null;
    chatkit
      .createUser({
        id: req.body.email,
        name: req.body.name,
      })
      .then(user => {
        createdUser = user;
  
        getUserRoom(req, res, next, false);
      })
      .catch(err => {
        if (err.error === 'services/chatkit/user_already_exists') {
          createdUser = {
            id: req.body.email,
          };
  
          getUserRoom(req, res, next, true);
          return;
        }
  
        next(err);
      });
  
    function getUserRoom(req, res, next, existingAccount) {
      const name = createdUser.name;
      const email = createdUser.email;
  
      // Get the list of rooms the user belongs to. Check within that room list for one whos
      // name matches the users ID. If we find one, we return that as the response, else
      // we create the room and return it as the response.
  
      chatkit
        .getUserRooms({
          userID: createdUser.id,
        })
        .then(rooms => {
          let clientRoom = null;
  
          // Loop through user rooms to see if there is already a room for the client
          clientRoom = rooms.filter(room => {
            return room.name === createdUser.id;
          });
  
          if (clientRoom && clientRoom.id) {
            return res.json(clientRoom);
          }
  
          // Since we can't find a client room, we will create one and return that.
          chatkit
            .createRoom({
              creatorId: createdUser.id,
              isPrivate: true,
              name: createdUser.id,
              userIds: ['chatkit-dashboard',createdUser.id],
            })
            .then(room => res.json(room))
            .catch(err => {
              console.log(err);
              next(new Error(`${err.error_type} - ${err.error_description}`));
            });
        })
        .catch(err => {
          console.log(err);
          next(new Error(`ERROR: ${err.error_type} - ${err.error_description}`));
        });
    }
  });

  
app.post('/session/auth', (req, res) => {
    const authData = chatkit.authenticate({ userId: req.query.user_id });
  
    res.status(authData.status).send(authData.body);
  });
  
app.get('/admin', (req, res) => {
    res.sendFile('admin.html', { root: __dirname + '/views' });
  });

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname + '/views'})
  });

app.listen(3000, ()=>console.log('Application listen at 127.0.0.1:3000'));
