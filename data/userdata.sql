DROP TABLE IF EXISTS userdata;

CREATE TABLE userdata(
  id SERIAL PRIMARY KEY,
  username VARCHAR(225),
  password VARCHAR(225),
  useremail VARCHAR(225)
)
