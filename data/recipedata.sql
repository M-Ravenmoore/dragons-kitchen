DROP TABLE IF EXISTS recipies;

CREATE TABLE recipies(
  id SERIAL PRIMARY KEY,
  spoon_id VARCHAR(225),
  title VARCHAR(225),
  time VARCHAR(225),
  servings VARCHAR(20),
  image VARCHAR(225),
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  ingredients JSON,
  instructions TEXT,
  source_name VARCHAR(225),
  source_url VARCHAR(225),
  saved_by TEXT[] 
  );

DROP TABLE IF EXISTS user_recipies;

CREATE TABLE user_recipies(
  id SERIAL PRIMARY KEY,
  title VARCHAR(225) NOT NULL,
  time VARCHAR(225),
  servings INT,
  image VARCHAR(225),
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  ingredients JSON,
  instructions TEXT NOT NULL,
  source_name VARCHAR(225),
  source_url VARCHAR(225),
  saved_by TEXT[],
  rateing INT,
  reviews TEXT[],
  created_by VARCHAR(225)
  )

