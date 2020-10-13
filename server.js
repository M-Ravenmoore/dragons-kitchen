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
app.get('/recipeBox', requiresAuth(), recipeBoxHandler)
app.post('/recipeBox', savedRecipe)
app.get('/recipeBox/:id', recipeBoxDetail)


// error proccessing
app.get('/error', errorHandler)
app.use('*', errorHandler);


// universalsconst SQL = 'SELECT * FROM '

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

// Working route handdling

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

  // add if logic to check db for the recipe first by spoon id if not in db add it then update userdata db column spoon_recipies for user @user id to include spoon_id in array of ids.

  const {spoon_id, title, time, servings, image, vegetarian, vegan, ingredients, instructions, source_name, source_url} = request.body;
  const SQL = 'INSERT INTO recipies (spoon_id, title, time, servings, image, vegetarian, vegan,  ingredients, instructions, source_name, source_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id;'
  const safeValues =[spoon_id, title, time, servings, image, vegetarian, vegan, ingredients, instructions, source_name, source_url]
  client.query(SQL, safeValues)
    .then(results => {

      response.status(200).redirect(`/recipeBox`)
    })
}

function recipeBoxHandler(request,response){

  // sql call to userdata for arrays of spoon_recipies and tdk_recipies.
  // useing array data from previous sql call make annother call to sql recipies and user-recpies for the matching ids.(is this where forgien keys come in?)

  const SQL = 'SELECT * FROM recipies;';
  client.query(SQL)
    .then(recipies =>{
      let recipeCount = recipies.rowCount;
      const savedRecipesArr =recipies.rows;
      // console.log('return from db 1',recipies.rows[0])
      response.status(200).render('pages/recipe-box/recipebox.ejs',{
        recipeTotal : recipeCount,
        savedRecipesList :savedRecipesArr
      });
    })
}

function recipeBoxDetail(request,response){
  console.log(request.params)
  const id = request.params.id;
  const SQL = 'SELECT * FROM recipies WHERE id=$1;';
  const safeValues = [id];
  client.query(SQL,safeValues)
    .then(recipe => {
      // console.log('Return from db2',recipe.rows)
      const savedRecipe = recipe.rows[0];
      response.render('pages/recipe-box/details.ejs',{
        recipe:savedRecipe
      })
    })
}

function errorHandler(request, response) {
  app.use((err, req, res, next) => {
    console.log(err)
    response.status(500).render('500error.ejs',{error: err, error_Msg: err.message});
  });
  response.status(404).render('404error.ejs');
}

// constructors

function ResultItem (result) {
  this.id = result.id;
  this.title = result.title;
  this.image = result.image ? result.image.replace(/^http:\/\//i, 'https://') : 'tempimg.jpg';
  this.vegetarian = `${result.vegetarian}`;
  this.vegan = `${result.vegan}`;
  this.time = result.readyInMinutes ? result.readyInMinutes : 'not listed';
  this.servings = result.servings ? result.servings : 'not listed';
}

function Recipe (recipeData) {
  this.id =recipeData.id;
  this.title = recipeData.title;
  this.time = recipeData.readyInMinutes ? recipeData.readyInMinutes : 'not listed';
  this.servings = recipeData.servings ? recipeData.servings : 'not listed';
  this.image = recipeData.image;
  this.vegetarian = `${recipeData.vegetarian}`;
  this.vegan = `${recipeData.vegan}`;
  this.instructionsList = recipeData.instructions;
  this.wine = recipeData.winePairing ? recipeData.winePairing : 'not listed';
  this.ingredients = recipeData.extendedIngredients.map(ingredients => new Ingredient(ingredients));
  this.credit = recipeData.creditsText;
  this.source_name = recipeData.sourceName;
  this.source_url = recipeData.sourceUrl;
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
