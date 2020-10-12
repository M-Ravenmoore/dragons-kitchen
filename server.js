'use strict'

// SYSTEM FRAMEWORK

require('dotenv').config();
require('ejs');

const cors = require('cors');
const express = require('express');
const {auth} = require('express-openid-connect');
const {requiresAuth} = require('express-openid-connect');
const pg = require('pg');
const superagent = require('superagent');
const methodOverRide = require('method-override')

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4004;
const client = new pg.Client(process.env.DATABASE_URL);

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL
};

client.on('error', error => {
  console.log(error);
});

// middleware garrage

app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverRide('_method'));

app.use(auth(config));


// route landing

app.get('/', homeHandler);
app.get('/profile', requiresAuth(), profileHandler)
app.get('/about', aboutHandler);

// let userStatus;

// ROUTE hanndling

function homeHandler(request,response){
  // userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  // console.log(userStatus);
  response.status(200).render('index.ejs');
}

function profileHandler(request,response){
  response.status(200).send(JSON.stringify(request.oidc.user));
}

function aboutHandler(request,response){
  console.log(request.oidc.user)
  response.status(200).send(`you are hee and a about page is coming`);
}



// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
