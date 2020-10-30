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
  secret: process.env.AUTH_SECRET,
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
  response.status(200).render('index.ejs',{
    logedStatus : userStatus});
}
function profileHandler(request,response){
  response.status(200).send(JSON.stringify(request.oidc.user));
}
function aboutHandler(request,response){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  console.log(request.oidc.user)
  response.status(200).render('./pages/about.ejs',{
    logedStatus : userStatus});
}

function newRecipeCreate(request,response){
  let ingredientNum = 2;
  let instructionsNum = 5;
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';

// TODO(2): Create addline buttons and functionality
  console.log(request.oidc.user)
  response.status(200).render('pages/recipe-box/new.ejs',{
    lineCount: ingredientNum,
    instructionsLineCount : instructionsNum,
    logedStatus : userStatus})
}

// Working route handdling

function getRecipies (request,response){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  console.log(request.oidc.user);
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
      response.status(200).render('pages/search/show',{resultItems : sendableResults,
        logedStatus: userStatus})
    })
}

function getRecipeDetails (request,response){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  const spoonId = request.params.id.slice(1);
  console.log(spoonId)
  const user = [request.oidc.user.email];
  let safeValues = [spoonId];
  const SQL = 'SELECT * FROM recipies WHERE $1=spoon_id'
  client.query(SQL,safeValues)
    .then(results =>{
      if(results.rowCount !== 0){
        results.rows[0].saved_by.forEach(savedUser =>{
          if(user === savedUser){
            response.status(200).redirect('/recipeBox');
          }else{
            const savedRecipe= results.rows[0];
            console.log('this is tdk recipe',savedRecipe);
            response.status(200).render(`pages/search/details.ejs`,{
              recipe : savedRecipe,
              logedStatus : userStatus
            });
          }
        })
      }else{
        let url = `https://api.spoonacular.com/recipes/${spoonId}/information?apiKey=${process.env.SPOON_API_KEY}&includeNutrition=false`;
        superagent(url)
          .then(recipeDetails =>{
            console.log(recipeDetails.body.extendedIngredients);
            const recipe = recipeDetails.body;
            const sendableRecipe = new Recipe(recipe);
            console.log(sendableRecipe);
            response.status(200).render('pages/search/details.ejs',{
              recipe : sendableRecipe,
              logedStatus: userStatus});
          })
      }
    })
}

function savedRecipe(request,response){
  const {spoon_id, title, cook_time, servings, image, vegetarian, vegan,ingredients_name,ingredients_unit,ingredients_amount,ingredients_string, instructions, source_name, source_url} = request.body;
  const user = [request.oidc.user.email];
  const CHECKDB = 'SELECT saved_by FROM recipies WHERE $1 = spoon_id;';
  const checkValues = [spoon_id];
  client.query(CHECKDB,checkValues)
    .then(results =>{
      if(results.rowCount !== 0){
        results.rows[0].saved_by.forEach(savedUser =>{
          if(user !== savedUser){
            const UPDATE = `UPDATE recipies SET saved_by = array_append(saved_by,'${user}') WHERE $1 = spoon_id;`;
            client.query(UPDATE, checkValues)
              .then(results)
            response.status(200).redirect(`/recipeBox`)
          }
        });
      }else{
        console.log('dragonstoreing')
        const SQL = 'INSERT INTO recipies (spoon_id, title, cook_time, servings, image, vegetarian, vegan, ingredients_name,ingredients_unit,ingredients_amount,ingredients_string, instructions, source_name, source_url,saved_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id;'
        const safeValues =[spoon_id, title, cook_time, servings, image, vegetarian, vegan, ingredients_name,ingredients_unit,ingredients_amount,ingredients_string, instructions, source_name, source_url, user]
        client.query(SQL, safeValues)
          .then(results => {
            response.status(200).redirect(`/recipeBox`)
          })
      }
    })
}

function userSavedRecipe(request,response){
  const {image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url,ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep,ingredient_string, instructions} = request.body;

  // console.log("dragons request data",request.body)
  const user = [request.oidc.user.email];
  const SQL = 'INSERT INTO user_recipies (image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url, ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep,ingredient_string, instructions,created_by,saved_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id;'
  const safeValues =[image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url, ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep,ingredient_string, instructions,user, user]
  client.query(SQL, safeValues)
    .then(results => {
      console.log(results.rows)
      response.status(200).redirect(`/recipeBox`)
    })
}

function recipeBoxHandler(request,response){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  const SQL = 'SELECT title , image, servings, id FROM recipies WHERE $1 = ANY(saved_by)';
  let safeValues = [request.oidc.user.email];
  client.query(SQL,safeValues)
    .then(recipies =>{
      let recipeCount = recipies.rowCount;
      const savedRecipesArr =recipies.rows;
      // console.log('return from db 1',recipies.rows[0])
      response.status(200).render('pages/recipe-box/recipebox.ejs',{
        recipeTotal : recipeCount,
        savedRecipesList :savedRecipesArr,
        logedStatus : userStatus
      });
    })
}

function recipeBoxDetail(request,response){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  console.log(request.params)
  const id = request.params.id;
  const SQL = 'SELECT * FROM recipies WHERE id=$1;';
  const safeValues = [id];
  client.query(SQL,safeValues)
    .then(recipe => {
      // console.log('Return from db2',recipe.rows)
      const savedRecipe = recipe.rows[0];
      console.log('this is db recipe;',savedRecipe)
      response.render('pages/recipe-box/details.ejs',{
        recipe:savedRecipe,
        logedStatus: userStatus
      })
    })
}

function errorHandler(request, response) {
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  app.use((err, req, res, next) => {
    console.log(err)

    response.status(500).render('500error.ejs',{
      error: err,
      error_Msg: err.message,
      logedStatus : userStatus
    });
  });
  response.status(404).render('404error.ejs',{
    logedStatus : userStatus
  });
}

// constructors

function ResultItem (result) {
  this.spoon_id = result.id;
  this.title = result.title;
  this.image = result.image ? result.image.replace(/^http:\/\//i, 'https://') : 'tempimg.jpg';
  this.vegetarian = `${result.vegetarian}`;
  this.vegan = `${result.vegan}`;
  this.time = result.readyInMinutes ? result.readyInMinutes : 'not listed';
  this.servings = result.servings ? result.servings : 'not listed';
}

function Recipe (recipeData) {
  this.spoon_id =recipeData.id;
  this.title = recipeData.title;
  this.time = recipeData.readyInMinutes ? recipeData.readyInMinutes : 'not listed';
  this.servings = recipeData.servings ? recipeData.servings : 'not listed';
  this.image = recipeData.image;
  this.vegetarian = `${recipeData.vegetarian}`;
  this.vegan = `${recipeData.vegan}`;
  this.instructions = recipeData.instructions;
  this.wine = recipeData.winePairing ? recipeData.winePairing : 'not listed';
  this.ingredients_string = recipeData.extendedIngredients.map(ingredient => ingredient.originalString)
  this.ingredients_name = recipeData.extendedIngredients.map(ingredient => ingredient.name);
  this.ingredients_unit = recipeData.extendedIngredients.map(ingredient => ingredient.unit);
  this.ingredients_amount = recipeData.extendedIngredients.map(ingredient => ingredient.amount);
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
