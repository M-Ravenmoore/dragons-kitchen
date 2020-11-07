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
app.get('/newRecipe', newRecipeCreate)
app.post('/newRecipe', userSavedRecipe)
app.get('/join' , requiresAuth(), joinHandler)
app.post('/join', saveUser)
app.get('/delete/:id', deleteRecipe)

// error proccessing
app.get('/error', errorHandler)
app.use('*', errorHandler);


// custom middle ware
// goal is to use db for user block from req header
// i think i need to implememt use of session here but might need support.
// app.use(tdkUserAdd);

// if loged in check user aginst tdkuser db and set as request.tdkUser{name image email}
// function tdkUserAdd(request,response,next){
//   let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
//   let user = request.oidc.user;
//   if(userStatus === 'Logged in'){
//     const SQL = 'SELECT * FROM userdata WHERE user_email = $1;';
//     const safeValues = [user.email];
//     client.query(SQL,safeValues)
//       .then(results =>{
//         let userinfo = results.rows[0];
//         request.tdkUser.display_name =`${userinfo.display_name}`;
//         request.tdkUser.user_image = `${userinfo.user_image}`;
//         request.tdkUser.user_email = `${userinfo.user_email}`;
//       })
//   }
//   next();
// }


// universals
function getUserStatus (request){
  let userStatus = request.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
  return userStatus;
}

function getUserInfo (request){
  if (getUserStatus(request)=== 'Logged in'){
    let user = new User(request.oidc.user);
    return user;
  }
}

// render route Handlers

function homeHandler(request,response){
  console.log(request)
  response.status(200).render('index.ejs',{
    userStatus : getUserStatus(request),
    userInfo : getUserInfo(request)
  });
}
function joinHandler(request,response){
  let user = request.oidc.user;
  const SQL = 'SELECT * FROM userdata WHERE user_email = $1;';
  const safeValues = [user.email];
  client.query(SQL,safeValues)
    .then(results =>{
      if(results.rowCount !== 0){
        response.status(200).redirect('/profile')
      }else{
        response.status(200).render('pages/join.ejs',{
          userStatus : getUserStatus(request),
          userInfo : getUserInfo(request)
        });
      }
    })
}
function profileHandler (request,response){
  let user = new User(request.oidc.user);
  const SQL = 'SELECT * FROM userdata WHERE user_email = $1;';
  const safeValues = [user.user_email];
  console.log(safeValues)
  client.query(SQL,safeValues)
    .then(results =>{
      let userProfile = results.rows[0];
      console.log(userProfile);

      response.status(200).render('pages/profile.ejs',{
        userStatus : getUserStatus(request),
        userInfo : getUserInfo(request),
        profile : userProfile
      });
    })
}
function aboutHandler(request,response){
  response.status(200).render('./pages/about.ejs',{
    userStatus : getUserStatus(request),
    userInfo : getUserInfo(request)
  });
}
function newRecipeCreate(request,response){
  response.status(200).render('pages/recipe-box/new.ejs',{
    userStatus : getUserStatus(request),
    userInfo : getUserInfo(request)})
}

// Working route handdling

function saveUser (request, response){
  console.log('im a req.body',request.body);
  let user_email = request.oidc.user.email;
  const {display_name, user_bio, user_image} = request.body;
  const SQL = 'INSERT INTO userdata (display_name, user_email, user_bio, user_image) VALUES ($1,$2,$3,$4) RETURNING user_email;';
  const safeValues = [display_name, user_email, user_bio, user_image];
  client.query(SQL,safeValues)
    .then(results =>{
      response.status(200).redirect('/profile')
    })
}
function getRecipies (request,response){
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
        userStatus : getUserStatus(request),
        userInfo : getUserInfo(request)})
    })
}
function getRecipeDetails (request,response){
  const spoonId = request.params.id.slice(1);
  console.log(spoonId)
  const user = request.oidc.user.email;
  let safeValues = [spoonId];
  const SQL = 'SELECT * FROM recipies WHERE $1=spoon_id'
  client.query(SQL,safeValues)
    .then(results =>{
      if(results.rowCount !== 0){
        console.log(results.rows[0].saved_by, user)
        if(results.rows[0].saved_by.includes(user)){
          let id = results.rows[0].id;
          response.status(200).redirect(`/recipeBox/${id}`);
        }else{
          const savedRecipe= results.rows[0];
          console.log('this is tdk recipe',savedRecipe);
          response.status(200).render(`pages/recipe-box/details.ejs`,{
            recipe : savedRecipe,
            userStatus : getUserStatus(request),
            userInfo : getUserInfo(request)
          });
        }
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
              userStatus : getUserStatus(request),
              userInfo : getUserInfo(request)
            });
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
  const user = [request.oidc.user.email];
  const SQL = 'INSERT INTO recipies (image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url, ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep,ingredient_string, instructions,created_by,saved_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id;'
  const safeValues =[image, title, servings, prep_time, cook_time, vegetarian, vegan, source_name, source_url, ingredient_name,ingredient_unit,ingredient_amount,ingredient_prep,ingredient_string, instructions,user, user]
  client.query(SQL, safeValues)
    .then(results => {
      console.log(results.rows)
      response.status(200).redirect(`/recipeBox`)
    })
}
function recipeBoxHandler(request,response){
  const SQL = 'SELECT title , image, servings, id FROM recipies WHERE $1 = ANY(saved_by);';
  let safeValues = [request.oidc.user.email];
  client.query(SQL,safeValues)
    .then(recipies =>{
      let recipeCount = recipies.rowCount;
      const savedRecipesArr =recipies.rows;
      // console.log('return from db 1',recipies.rows[0])
      response.status(200).render('pages/recipe-box/recipebox.ejs',{
        recipeTotal : recipeCount,
        savedRecipesList :savedRecipesArr,
        userStatus : getUserStatus(request),
        userInfo : getUserInfo(request)
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
      console.log('this is db recipe;',savedRecipe)
      response.render('pages/recipe-box/details.ejs',{
        recipe:savedRecipe,
        userStatus : getUserStatus(request),
        userInfo : getUserInfo(request)
      })
    })
}
function deleteRecipe (request, response){
  const id = request.params.id;
  console.log(id);
  const user = [request.oidc.user.email];
  const SQL = `UPDATE recipies SET saved_by = array_remove(saved_by,'${user}') WHERE $1 = id;`;
  const safeValues = [id];
  client.query(SQL,safeValues)
    .then(() => {
      response.redirect('/recipeBox');
    })

}
function errorHandler(request, response) {
  app.use((err, req, res, next) => {
    console.log(err)

    response.status(500).render('500error.ejs',{
      error: err,
      error_Msg: err.message,
      userStatus : getUserStatus(request),
      userInfo : getUserInfo(request)
    });
  });
  response.status(404).render('404error.ejs',{
    userStatus : getUserStatus(request),
    userInfo : getUserInfo(request)
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
function User (userInfo){
  this.display_name = userInfo.name;
  this.user_email = userInfo.email;
  this.user_image = userInfo.picture;
}

// connect to db and port

client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
