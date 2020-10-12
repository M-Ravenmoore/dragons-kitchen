# the-dragons-kitchen

**Author**: Matt Ravenmoore
**Current Version**: 0.0.2

## Overview

A not so simple kitchen life helper app for mobile tablet and desktop use.

## Getting Started

1. clone Repo to local.
1. install the Dependancies useing 'npm i' or individualy
1. create a postgress database for the project for local testing and link the .sql files.

## Architecture

Currently using:

dependancies:

* "cors": "^2.8.5",
* "dotenv": "^8.2.0",
* "ejs": "^3.1.5",
* "express": "^4.17.1",
* "method-override": "^3.0.0",
* "pg": "^8.4.1",
* "superagent": "^6.1.0"
* "express-openid-connect"

AIPs and Other:

* heroku (deployment)
* Auth0: user authentication portal and db.

Languages:

* javascript
* css
* html

## Change Log

* version--0.0.2 10-08-2020 12:00 PST  Design plan in place, theme to be decided, documentation in place.
* version--0.1.0 10-09-2020 15:00 PST  CSS prof of life server working and db talking.
* version--0.2.0 10-10-2020 16:55 PST Home page has some basic content and a working slideshow with place holder images.
* version--0.2.1 10-10-2020 21:45 PST the web app can now store user informations and retrive user infromation from the database. user funtionality still in progress.
* version--0.3.0 10-11-2020 17:15 PST The web app now more securely deals with user auth via Auth0, interface and account see more below.


## Project Scope

This will be a kitchen helping utility. Beginning with a user login/create account experience. continuing with a recipe finding, saving, and creating functionality. there will be implementation of a music feature bringing music themed playlists from spotify based on the recipe you are cooking. the user will aslo be able to view videos of popular chefs from youtube making the dish of choice from their box.

## Planned Feature List

### MVP

I aim to achive my MVP goal on or before noon 10-14-2020

* user login and accounts
* recipe db table with attachment to account
* recipe finder with multiple options for getting meals including:
  * random meal (up to 3)
  * meal by main ingredient (max 10)
  * meal by xx
* shopping list maker (from ingredient lists)

### **stretch goals**

* expand shopping list for meal planning future feature
* connect to spotify via account page
  * if connected on cookit page generate 5 playlists based on some aspect of the meal
* have top 5 video results from youtube display below directions or in sidebar during cook this.
* timer with mobile compatiblity
* top 10 site searches section on home
* seasonal sugestion section on home
* db of factoids food and region related for use in the cook me page or other places in the app.

## Site layout

a general site plan

![site map](./readme-img/sitemap.png "Sitemap")

the mobile looks should end up like this:
![mobile](./readme-img/mobile.png "mobile wireframe")
the desktop version should look close to this:
![alt text](./readme-img/desktop.png "Desktop wireframe")

## work log

[Worklog](worklog.md)

this style guide is a template to be worked on as i get ideas:
![Style Guide](./readme-img/style-guide.png "style-guide")

## Credits and Collaborations

w3 schools

[slideshow frame work and js](https://www.w3schools.com/howto/howto_js_slideshow.asp)

