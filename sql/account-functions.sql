USE game;

DROP PROCEDURE IF EXISTS addUser;

DELIMITER //
CREATE PROCEDURE addUser
(
	pnick VARCHAR(20), 
    ppass CHAR(30)
)
BEGIN
	INSERT INTO users (nick, pass) VALUES (pnick, MD5(ppass));
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS duplicateUser;

DELIMITER //
CREATE PROCEDURE duplicateUser
(
	pnick VARCHAR(20)
)
BEGIN
	SELECT * FROM users WHERE nick = pnick;
END //

DELIMITER ;


DROP PROCEDURE IF EXISTS validate;

DELIMITER //
CREATE PROCEDURE validate
(
	pnick VARCHAR(20), 
    ppass CHAR(30)
)
BEGIN
	SELECT * FROM users WHERE nick = pnick AND pass = MD5(ppass);
END //

DELIMITER ;

call addUser("test", "test123");
call validate("test", "test123");
select * from users;