DROP TABLE IF EXISTS recipies;

CREATE TABLE recipies(
  id SERIAL PRIMARY KEY,
  spoon_id VARCHAR(225),
  image VARCHAR(225),
  title VARCHAR(225) NOT NULL,
  servings INT,
  prep_time VARCHAR(225),
  cook_time VARCHAR(225),
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  source_name VARCHAR(225),
  source_url VARCHAR(225),
  ingredients_name TEXT[],
  ingredients_amount TEXT[],
  ingredients_unit TEXT[],
  instructions TEXT,
  saved_by TEXT[]
);

DROP TABLE IF EXISTS user_recipies;

CREATE TABLE user_recipies(
  id SERIAL PRIMARY KEY,
  image VARCHAR(225),
  title VARCHAR(225) NOT NULL,
  servings INT,
  prep_time VARCHAR(225),
  cook_time VARCHAR(225),
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  source_name VARCHAR(225),
  source_url VARCHAR(225),
  ingredient_name TEXT[],
  ingredient_amount TEXT[],
  ingredient_unit TEXT[],
  ingredient_prep TEXT[],
  instructions TEXT[],
  created_by VARCHAR(225),
  saved_by TEXT[],
  rateing INT,
  reviews TEXT[]
  )
  

