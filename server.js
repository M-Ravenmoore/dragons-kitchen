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
const auth0Config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH_CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL
};

// middleware garrage
app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverRide('_method'));


app.use(auth(auth0Config));


// route landing
app.get('/', homeHandler);
app.get('/profile', requiresAuth(), profileHandler);
app.get('/about', aboutHandler);
app.post('/searchRecipies',requiresAuth(), getRecipies);
app.get('/recipeDetails/:id', getRecipeDetails)
app.get('/recipeBox', requiresAuth(), recipeBoxHandler)
app.post('/recipeBox', savedRecipe);
app.get('/recipeBox/:id', recipeBoxDetail);
// app.get('/edit/:id' recipeEditForm);
app.get('/newRecipe', newRecipeCreate)
app.post('/newRecipe', userSavedRecipe)

// error proccessing
app.get('/error', errorHandler)
app.use('*', errorHandler);


// universals

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

function newRecipeCreate(request,response){
  let ingredientNum = 2;

  let instructionsNum = 5;


  console.log(request.oidc.user)
  response.status(200).render('pages/recipe-box/new.ejs',{
    lineCount: ingredientNum,
    instructionsLineCount : instructionsNum})
}



// Working route handdling

function getRecipies (request,response){
  console.log(request.oidc.user);
  console.log(request.body);
  const queryContent = request.body.content;
  const queryType = request.body.type;
  const queryCount = request.body.count;
  let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.SPOON_API_KEY}&
  instructionsRequired=true&addRecipeInformation=true&number=${queryCount}&analyzedInstructions`;
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

// TODO(#)add update saved by array to include new user add
function getRecipeDetails (request,response){
  const spoonId = request.params.id.slice(1);
  console.log(spoonId)
  const user = [request.oidc.user.email];
  let safeValues = [spoonId];
  const SQL = 'SELECT * FROM recipies WHERE $1=spoon_id'
  client.query(SQL,safeValues)
    .then(results =>{
      if(results.rowCount >= 1){
        console.log('results are:',results.rows[0]);
        let id = results.rows[0].id;
        const UPDATE = `UPDATE recipies SET saved_by = array_append(saved_by,${user});`;
        client.query(UPDATE)
          .then(results)
        response.status(200).redirect(`/recipeBox/${id}`)
      }else{
        let url = `https://api.spoonacular.com/recipes/${spoonId}/information?apiKey=${process.env.SPOON_API_KEY}&includeNutrition=false`;
        superagent(url)
          .then(recipeDetails =>{
            // console.log(recipeDetails.body.extendedIngredients);
            const recipe = recipeDetails.body;
            const sendableRecipe = new Recipe(recipe);
            console.log(sendableRecipe);
            response.status(200).render('pages/search/details.ejs',{
              recipe : sendableRecipe});
          })
      }
    })
}

function savedRecipe(request,response){
  // console.log("dragons request data",request.body)
  const {spoon_id, title, cook_time, servings, image, vegetarian, vegan,ingredients_name,ingredients_unit,ingredients_amount, instructions, source_name, source_url} = request.body;

  const user = [request.oidc.user.email];
  const SQL = 'INSERT INTO recipies (spoon_id, title, cook_time, servings, image, vegetarian, vegan, ingredients_name,ingredients_unit,ingredients_amount, instructions, source_name, source_url,saved_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id;'
  const safeValues =[spoon_id, title, cook_time, servings, image, vegetarian, vegan, ingredients_name,ingredients_unit,ingredients_amount, instructions, source_name, source_url, user]
  client.query(SQL, safeValues)
    .then(results => {
      console.log(results.rows)
      response.status(200).redirect(`/recipeBox`)
    })
}

function userSavedRecipe(request,response){
  const {image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url,ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep, instructions} = request.body;
  
  // console.log("dragons request data",request.body)
  const user = [request.oidc.user.email];
  const SQL = 'INSERT INTO user_recipies (image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url, ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep, instructions,created_by,saved_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id;'
  const safeValues =[image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url, ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep, instructions,user, user]
  client.query(SQL, safeValues)
    .then(results => {
      console.log(results.rows)
      response.status(200).redirect(`/recipeBox`)
    })
}

function recipeBoxHandler(request,response){
  const SQL = 'SELECT title , image, servings FROM recipies WHERE $1 = ANY(saved_by)';
  // const SQL = 'SELECT * FROM user_recipies WHERE $1 = ANY(saved_by)';

  let safeValues = [request.oidc.user.email];
  client.query(SQL,safeValues)
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
  // const SQL = 'SELECT * FROM user_recipies WHERE id=$1;';
  const safeValues = [id];
  client.query(SQL,safeValues)
    .then(recipe => {
      // console.log('Return from db2',recipe.rows)
      const savedRecipe = recipe.rows[0];
      console.log('this is db recipe;',savedRecipe)
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
  this.ingredientsList = recipeData.extendedIngredients;
  this.credit = recipeData.creditsText;
  this.source_name = recipeData.sourceName;
  this.source_url = recipeData.sourceUrl;
}

// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
