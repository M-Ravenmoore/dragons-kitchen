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

// port setup and error catch
const PORT = process.env.PORT || 4004;
const client = new pg.Client(process.env.DATABASE_URL);

client.on('error', error => {
  console.log(error);
});

// config for Auth
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL
};

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
app.post('/searchRecipies',requiresAuth(), getRecipies);
app.get('/recipeDetails/:id', getRecipeDetails)

// error proccessing
app.get('/error', errorHandler)
app.use('*', errorHandler);


// universals

let spoonResultsCache;

// ROUTE hanndling

function homeHandler(request,response){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  console.log(userStatus);
  console.log(request.oidc.user)
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
  console.log(request.oidc.user);
  console.log(request.body);
  const queryContent = request.body.content;
  const queryType = request.body.type;
  const queryCount = request.body.count;
  
  let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.SPOON_API_KEY}&
  instructionsRequired=true&addRecipeInformation=true&limitLicense=true&number=${queryCount}&analyzedInstructions`;
  if (queryType === 'query'){ url += `&query=${queryContent}`}
  if (queryType === 'cuisine'){url += `&query=${queryContent}`}
  superagent(url)
    .then(recipies => {
      const recipeArr = recipies.body.results;
      const recipeItems = recipeArr.map(recipe => new Recipe(recipe));
      spoonResultsCache = recipeItems;
      // console.log('this is recipeItems',recipeItems)
      response.status(200).render('pages/search/show',{recipies : recipeItems})
    })
}
// function searchDatabaseSave (request,response){

// }

function getRecipeDetails (request,response){
  console.log('im a dragon',spoonResultsCache)
  response.status(200).send('this will be something soon')
}


function errorHandler(request, response) {

  app.use((err, req, res, next) => {
    console.log(err)
    res.status(500).render('500error.ejs',{error: err, error_Msg: err.message});
  });
  response.status(404).render('404error.ejs');
}

// constructors

function Recipe (recipe) {
  this.id = recipe.id;
  this.title = recipe.title ? recipe.title : 'Dragon Ash';
  this.image = recipe.image ? recipe.image.replace(/^http:\/\//i, 'https://') : 'tempimg.jpg';
  this.imageType = recipe.imageType ? recipe.imageType : 'jpg';
  this.vegetarian = recipe.vegetarian ? recipe.vegetarian : 'not listed';
  this.vegan = recipe.vegan ? recipe.vegan : 'not listed';
  this.gluten = recipe.gluten ? recipe.gluten : 'not listed';
  this.cheap = recipe.cheap ? recipe.cheep : 'not listed';
  this.time = recipe.readyInMinutes ? recipe.readyInMinutes : 'not listed';
  this.servings = recipe.servings ? recipe.servings : 'not listed';
  this.summary = recipe.summary? recipe.summary : 'not listed';
  this.creditName = recipe.creditsText;
  this.creditUrl = recipe.sourceUrl;
  this.license = recipe.license;
}




// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
