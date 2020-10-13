DROP TABLE IF EXISTS userdata;

CREATE TABLE userdata(
  id SERIAL PRIMARY KEY,
  username VARCHAR(225),
  useremail VARCHAR(225),
  user_photo VARCHAR(225),
  spoon_recipies TEXT,
  tdk_recipies TEXT
)
