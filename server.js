'use strict'

require('dotenv').config();
require('ejs');

const cors = require('cors');
const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const methodOverRide = require('method-override')

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4004;
const client = new pg.Client(process.env.DATABASE_URL);

client.on('error', error => {
  console.log(error);
});

app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverRide('_method'));


app.get('/', homeRender);
app.get('/join', joinRender);
app.post('/join', newUserSave);


function homeRender(request,response){
  response.status(200).render('index.ejs');
}
function joinRender(request,response){
  response.status(200).render('pages/join.ejs');
}

let userInfoObject;
// becomes login handler for existing users compairs agains username and returns user info object.
function isLogedin(request,response){
  const id = request.params.id;
  console.log(request.params)
  const safeValues = [id];
  const SQL = 'SELECT * FROM userdata WHERE id=$1;';
  client.query(SQL,safeValues)
    .then(results =>{
      const data = results.rows[0];
      response.status(200).render('index.ejs',{userinfo : data})
    })
}
function newUserSave(request,response){
  console.log(request.body)
  const { userName,userPassword, userEmail} = request.body;
  const safeValues = [userName,userPassword,userEmail];
  const SQL = `INSERT INTO userdata (username,password,useremail) VALUES ($1,$2,$3) RETURNING id;`;
  client.query(SQL,safeValues)
    .then(result => {
      response.status(200).redirect(`/`);
    })

}


// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
