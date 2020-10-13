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
app.post('/recipeBox', savedRecipe)


// error proccessing
app.get('/error', errorHandler)
app.use('*', errorHandler);


// universals



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
    .then(results => {
      const resultsArr = results.body.results;
      const sendableResults = resultsArr.map(resultData => new ResultItem(resultData));
      // console.log('this is recipeItems',recipeItems)
      response.status(200).render('pages/search/show',{resultItems : sendableResults})
    })
}

function getRecipeDetails (request,response){
  const spoonId = request.params.id.slice(1);
  console.log(spoonId)
  let url = `https://api.spoonacular.com/recipes/${spoonId}/information?apiKey=${process.env.SPOON_API_KEY}&includeNutrition=false`;
  superagent(url)
    .then(recipeDetails =>{
      // console.log(recipeDetails.body);
      const recipe = recipeDetails.body;
      const sendableRecipe = new Recipe(recipe)
      console.log(sendableRecipe)
      response.status(200).render('pages/search/details.ejs',{recipe : sendableRecipe})
    })

}
function savedRecipe(request,response){
  console.log(request.body)
  // const SQL = 'INSERT INTO recipies () VALUES () RETURNING id;'
  // const saveValues =[]
  // cliet.query(SQL, safeValues)
  //  .then(result => {
    // response.status(200).redirect(`/recipeBox/${result.rows[0].spoon_id}`)
  // })
  response.status(200).send('soontocome')
}


function errorHandler(request, response) {

  app.use((err, req, res, next) => {
    console.log(err)
    res.status(500).render('500error.ejs',{error: err, error_Msg: err.message});
  });
  response.status(404).render('404error.ejs');
}

// constructors

function ResultItem (result) {
  this.id = result.id;
  this.title = result.title ? result.title : 'Dragon Ash';
  this.image = result.image ? result.image.replace(/^http:\/\//i, 'https://') : 'tempimg.jpg';
  this.vegetarian = result.vegetarian ? result.vegetarian : 'not listed';
  this.vegan = result.vegan ? result.vegan : 'not listed';
  this.gluten = result.gluten ? result.gluten : 'not listed';
  this.time = result.readyInMinutes ? result.readyInMinutes : 'not listed';
  this.servings = result.servings ? result.servings : 'not listed';
}

function Recipe (recipeData) {
  this.id =recipeData.id;
  this.title = recipeData.title;
  this.time = recipeData.readyInMinutes;
  this.servings = recipeData.servings;
  this.image = recipeData.image;
  this.vegetarian = recipeData.vegetarian;
  this.vegan = recipeData.vegan ? recipeData.vegan : 'not listed';
  this.gluten = recipeData.gluten ? recipeData.gluten : 'not listed';
  this.summary = recipeData.summary;
  this.instructionsList = recipeData.instructions;
  this.wine = recipeData.winePairing;
  this.ingredients = recipeData.extendedIngredients.map(ingredients => new Ingredient(ingredients));
  this.credit = recipeData.creditsText;
  this.sourceName = recipeData.sourceName;
  this.sourceUrl = recipeData.sourceUrl;
}

function Ingredient(ingredients){
  this.id = ingredients.id;
  this.name = ingredients.originalName;
  this.amount = ingredients.amount;
  this.unit = ingredients.unit;
  this.string = ingredients.originalString;
}


// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
