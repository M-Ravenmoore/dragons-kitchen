DROP TABLE IF EXISTS userdata;

CREATE TABLE userdata(
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(225) NOT NULL,
  user_email TEXT NOT NULL,
  user_image VARCHAR(225) NOT NULL,
  user_bio TEXT
)