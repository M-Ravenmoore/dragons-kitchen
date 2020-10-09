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


app.get('/', homeHandle);


function homeHandle(request,response){
  response.status(200).render('index.ejs');
}


// connect to db and port
client.connect()
  .then(() =>{
    app.listen(PORT, () => {
      console.log(`The cook fires Rush to life on ${PORT}`);
    });
  })
