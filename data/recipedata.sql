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
  ingredients TEXT,
  instructions TEXT,
  source_name VARCHAR(225),
  source_url VARCHAR(225)
  );

DROP TABLE IF EXISTS user_recipies;

CREATE TABLE user_recipies(
  id SERIAL PRIMARY KEY,
  title VARCHAR(225),
  time VARCHAR(225),
  servings INT,
  image VARCHAR(225),
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  ingredients TEXT,
  instructions TEXT,
  source_name VARCHAR(225),
  source_url VARCHAR(225)
  )

