module.exports = {
    addUser: addUser,
    checkForDuplicates: checkForDuplicates,
    isValidPassword: isValidPassword
}

const mysql = require("promise-mysql");
const config = require("./../../config/db/conf.json");
let db;

(async function() {
    db = await mysql.createConnection(config);

    process.on("exit", () => {
        db.end();
    });
})();

async function addUser(nick, pass) {
    let sql = `CALL addUser(?, ?);`;
    let res;
    res = await db.query(sql, [nick, pass]);

    return res;
}

async function checkForDuplicates(nick) {
    let sql = `CALL duplicateUser(?);`;
    let res;
    res = await db.query(sql, [nick]);
    return res[0];
}

async function isValidPassword(nick, pass) {
    let sql = `CALL validate(?, ?);`;
    let res;
    res = await db.query(sql, [nick, pass]);
    return res[0];
}
