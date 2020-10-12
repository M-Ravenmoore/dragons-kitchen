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
app.get('/profile', requiresAuth(), profileHandler);
app.get('/about', aboutHandler);
app.post('/searchRecipies', getRecipies);
app.get('/error', errorHandler)
app.use('*', errorHandler);

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

function getRecipies (request,response){
  console.log(request.body);
  const queryContent = request.body.content;
  const queryType = request.body.type;

  let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.SPOON_API_KEY}&q=&number=5`;
  if (queryType === 'query'){ url += `&query=${queryContent}`}
  if (queryType === 'cuisine'){url += `&query=${queryContent}`}
  superagent(url)
    .then(recipes => {
      const recipeArr = recipes.body.results;
      const recipeItems = recipeArr.map(recipe => new Recipe(recipe));
      
      console.log('this is recipeItems',recipeItems)
      response.status(200).render('pages/search/show',{recipies : recipeItems})




    })

  console.log(request.oidc.user);
}


function errorHandler(request, response) {

  app.use((err, req, res, next) => {
    res.status(500).render('500error.ejs',{error: err, error_Msg: err.message});
  });
  response.status(404).render('404error.ejs',{error: err, error_Msg: err.message});
}

// constructor

function Recipe (recipe) {
  this.id = recipe.id;
  this.title = recipe.title;
  this.image = recipe.image ? recipe.image.replace(/^http:\/\//i, 'https://') : 'tempimg.jpg';
  this.imageType = recipe.imageType ? recipe.imageType : 'jpg';

}


// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
