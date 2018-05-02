USE game;

GRANT ALL ON game.* TO user@localhost IDENTIFIED BY "pass";

DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users
(
	id INT AUTO_INCREMENT,
	nick VARCHAR(20),
    pass CHAR(60),
    
    PRIMARY KEY (id)
);