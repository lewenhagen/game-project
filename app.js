var express = require("express");
var app = express();
var serv = require("http").Server(app);
const account = require("./server/src/account.js");

app.set("view engine", "ejs");


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/client/index.html");
});

app.use("/client", express.static(__dirname + "/client"));

serv.listen(1337);
console.info("Server started.");

var SOCKET_LIST = {};
// var PLAYER_LIST = {};

var Entity = () => {
    var self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        id: ""
    }
    self.update = () => {
        self.updatePosition();
    }
    self.updatePosition = () => {
        self.x += self.spdX;
        self.y += self.spdY;
    }
    self.getDistance = (pt) => {
        return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
    }
    return self;
};

var Player = (id) => {
    var self = Entity();

    self.id = id;
    self.username = "";
    self.number = Math.floor(10 * Math.random()).toString();
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;

    self.maxSpd = 1;

    var super_update = self.update;

    self.update = () => {
        self.updateSpd();
        super_update();

        if (self.pressingAttack) {
            self.shootBullet(self.mouseAngle);
        }
    }

    self.shootBullet = function(angle) {
        var b = Bullet(self.id, angle);
        b.x = self.x;
        b.y = self.y;
    }

    self.updateSpd = function() {
        if (self.pressingRight) {
            self.spdX += self.maxSpd;
        } else if (self.pressingLeft) {
            self.spdX -= self.maxSpd;
        } else {
            self.spdX = 0;
        }

        if (self.pressingUp) {
            self.spdY -= self.maxSpd;
        } else if (self.pressingDown) {
            self.spdY += self.maxSpd;
        } else {
            self.spdY = 0;
        }
    }
    Player.list[id] = self;
    initPack.player.push({
        id: self.id,
        x: self.x,
        y: self.y,
        number: self.number
    });
    return self;
};

Player.list = {};
Player.onConnect = function(socket) {
    var player = Player(socket.id);

    socket.on("keyPress", (data) => {
        if (data.inputId === "left") {
            player.pressingLeft = data.state;
        } else if (data.inputId === "right") {
            player.pressingRight = data.state;
        } else if (data.inputId === "up") {
            player.pressingUp = data.state;
        } else if (data.inputId === "down") {
            player.pressingDown = data.state;
        } else if (data.inputId === "attack") {
            player.pressingAttack = data.state;
        } else if (data.inputId === "mouseAngle") {
            player.mouseAngle = data.state;
        }
    });
};

Player.onDisconnect = function(socket) {
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}

Player.update = function() {
    var pack = [];
    for(var i in Player.list) {
        var player = Player.list[i];
        player.update();
        pack.push({
            id: player.id,
            x: player.x,
            y: player.y,
        });
    }
    return pack;
}

var Bullet = (parent, angle) => {
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
    self.parent = parent;

    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = () => {
        if (self.timer++ > 100) {
            self.toRemove = true;
        }
        super_update();

        for (var i in Player.list) {
            var p = Player.list[i];

            if (self.getDistance(p) < 32 && self.parent !== p.id) {
                //handle collision ex: hp --
                self.toRemove = true;
            }
        }
    }
    Bullet.list[self.id] = self;
    initPack.bullet.push({
        id: self.id,
        x: self.x,
        y: self.y
    });
    return self;
}
Bullet.list = {};

Bullet.update = function() {
    var pack = [];
    for(var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update();
        if (bullet.toRemove) {
            delete Bullet.list[i];
            removePack.bullet.push(bullet.id);
        } else {
            pack.push({
                id: bullet.id,
                x: bullet.x,
                y: bullet.y
            });
        }
    }
    return pack;
}

var DEBUG = true;

// var USERS = {
//     //username:password
//     "bob": "bob123",
//     "kenneth": "kenneth123",
//     "malin": "malin123"
// }

// var isValidPassword = function(data) {
//     return USERS[data.username] === data.password;
// }
//
// var isUserNameTaken = function(data) {
//     return USERS[data.username];
// }
//
// var addUser = async function(data) {
//     return USERS[data.username] = data.password;
// }

var io = require("socket.io")(serv, {});
io.sockets.on("connection", async (socket) => {
    console.log("socket connection!");
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;


    socket.on("signIn", async (data) => {
        let isValid = await account.isValidPassword(data.username, data.password);
        if (isValid.length === 1) {
            Player.onConnect(socket);
            Player.list[socket.id].username = data.username;
            socket.emit("signInResponse", {success: true});
            console.log("Login success!");
        } else {
            socket.emit("signInResponse", {success: false});
            console.log("Login failed!");
        }
    });

    socket.on("signUp", async (data) => {
        let isTaken = await account.checkForDuplicates(data.username);

        if (isTaken.length === 0) {
            await account.addUser(data.username, data.password);
            socket.emit("signUpResponse", {success: true});
            console.log("User added!");
        } else {
            socket.emit("signUpResponse", {success: false});
            console.log("Username taken!");
        }
    });


    socket.on("disconnect", () => {
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);

    });

    socket.on("sendMsgToServer", (data) => {
        var playerName = Player.list[socket.id].username;
        for (var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit("addToChat", playerName + ": " + data);
        }
    });

    socket.on("evalServer", (data) => {
        if (!DEBUG) {
            return;
        }
        var res = eval(data);
        socket.emit("evalAnswer", res);
    });


});

var initPack = {
    player: [],
    bullet: []
}

var removePack = {
    player: [],
    bullet: []
}

setInterval(function() {
    var pack = {
        player: Player.update(),
        bullet: Bullet.update()
    };

    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit("init", initPack);
        socket.emit("update", pack);
        socket.emit("remove", removePack);
    }
    initPack.player = [];
    initPack.bullet = [];
    removePack.player = [];
    removePack.bullet = [];
}, 1000/25);
