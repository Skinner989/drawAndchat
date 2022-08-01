const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({limit: '500mb'}))
app.use(express.urlencoded({limit: '500mb', extended: false}));

const config_mysql = {
	"host"     : "localhost",
	"user"     : "root",
	"password" : "mysql",
	"database" : "rozproszone"
}

const Database = require('./SQL');

app.use('/', express.static(__dirname + "/public/"));
const http = require('http');

app.get('/', (req,res)=>{
  res.sendFile(__dirname + "/./public/index.html")
});

const server = http.createServer(app).listen(PORT, ()=> {
  console.log(`Startowanie servera na porcie ${PORT}`);
})

var io = require('socket.io')(server, {cors: {origin: "*"}});

let onlineUsers = [];

io.sockets.on('connection', function (socket) 
  {
	socket.on('create', function(room) {
		socket.join(room);
	});
	socket.on('join', function(room, name) {
		socket.join(room);
		socket.in(room).emit('joinedToRoom', room, name);
	});
	socket.on('leave', function(room, name) {
		socket.leave(room);
		socket.in(room).emit('userLeft', room, name);
	});
    socket.on('mouse', function(data, room) {
        socket.in(room).emit('mouse', data);
    });
	socket.on('msg', function(data) {
        io.sockets.in(data.Room).emit('msg', data);
    });
	socket.on('joinRequest', function(name, roomOwnerName, room) {
        socket.in(room).emit('considerJoinRequest', name, roomOwnerName);
    });
	socket.on('sendJoinRequestResponse', function(roomOwnerName, name, decision) {
        io.emit('joinRequestResponse', roomOwnerName, name, decision);
    });
	socket.on('add', function(name) {
		if(!onlineUsers.includes(name)) {
			onlineUsers.push(name);
		}
        io.emit('onlineUsers', onlineUsers);
    });
	socket.on('remove', function(name) {
		if(onlineUsers.includes(name)) {
			onlineUsers.splice(onlineUsers.indexOf(name), 1);
			io.emit('onlineUsers', onlineUsers);
		}
    });
	socket.on('removeUser', function(name, room){
        socket.in(room).emit('removeFromRoom', name);
    });
	socket.on('removeMessages', function(room){
        socket.in(room).emit('removeMessagesNotification');
    });
  }
);

function CzyUnikalnaNazwa(nazwa){
	return new Promise(async (resolve, reject) => {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM `users` WHERE Nazwa = ?',[nazwa]).then((response) => {
			db.Stop();
			if(response.exit_code === 0 && response.result.length === 0) {
				resolve();
			}
			else {
				reject();
			}
		});
	});
}

app.post("/rejestracja", async function(req, res) {
	if(req.body.Nazwa && req.body.Haslo) {
		try {
			await CzyUnikalnaNazwa(req.body.Nazwa);
			const db = new Database(config_mysql);
			db.Start();
			db.Query('INSERT INTO `users` (`ID`, `Nazwa`, `Haslo`) VALUES (NULL, ?, ?) ', [req.body.Nazwa, req.body.Haslo]).then((response) => {
				db.Stop();
				if(response.exit_code === 0) {
					res.send({exit_code: 0});
				}
				else {
					res.send({exit_code: 3});
				}
			});
		}
		catch {
			res.send({exit_code: 2});
		}	
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/logowanie", function(req, res) {
	if(req.body.Nazwa && req.body.Haslo) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM users WHERE Nazwa = ? AND Haslo = ?', [req.body.Nazwa, req.body.Haslo]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				if(response.result.length === 1) {
					if(response.result[0].Nazwa === req.body.Nazwa && response.result[0].Haslo === req.body.Haslo) {
            			let packet = {rysunek: response.result[0].Rysunek, userID: response.result[0].ID};
						res.send({exit_code: 0, packet})
					}
					else {
						res.send({exit_code: 4});
					}
				}
				else {
					res.send({exit_code: 3});
				}
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/update", function(req, res) {
	if(req.body.ID && req.body.Dane) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('UPDATE `users` SET `Rysunek` = ? WHERE `users`.`ID` = ?', [req.body.Dane, req.body.ID]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				res.send({exit_code: 0});
			}
			else {
				res.send({exit_code: 3});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/sendMessage", function(req, res) {
	if(req.body.Autor && req.body.Room && req.body.Msg) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('INSERT INTO `messages` (`ID`, `ID_Pokoju`, `Autor`, `Tresc`) VALUES (NULL, ?, ?, ?)', [req.body.Room, req.body.Autor, req.body.Msg]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				res.send({exit_code: 0});
			}
			else {
				res.send({exit_code: 2});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/removeMessages", function(req, res) {
	if(req.body.Room && req.body.Amount) {
		if(req.body.Amount == "All") {
			const db = new Database(config_mysql);
			db.Start();
			db.Query('DELETE FROM `messages` WHERE `ID_Pokoju` = ?', [req.body.Room]).then((response) => {
				db.Stop();
				if(response.exit_code === 0) {
					res.send({exit_code: 0});
				}
				else {
					res.send({exit_code: 2});
				}
			});
		}
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/getMessages", function(req, res) {
	if(req.body.Room) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM messages WHERE ID_Pokoju = ?', [req.body.Room]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {			
				res.send({exit_code: 0, packet: response.result})
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/getName", function(req, res) {
	if(req.body.ID) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT Nazwa FROM users WHERE ID = ?', [req.body.ID]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				res.send({exit_code: 0, name: response.result[0].Nazwa})
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/blockUser", function(req, res) {
	if(req.body.Nazwa_Wlasciciela && req.body.Nazwa) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('INSERT INTO `blockedUsers` (`ID`, `Nazwa_Wlasciciela_Pokoju`, `Nazwa_Uzytkownika`) VALUES (NULL, ?, ?)', [req.body.Nazwa_Wlasciciela, req.body.Nazwa]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				res.send({exit_code: 0})
			}
			else {
				res.send({exit_code: 2})
			}
		});
	}
	else {
		res.send({exit_code: 1})
	}
});

app.post("/unblockUser", function(req, res) {
	if(req.body.Nazwa_Wlasciciela && req.body.Nazwa) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('DELETE FROM `blockedUsers` WHERE `Nazwa_Wlasciciela_Pokoju` = ? AND `Nazwa_Uzytkownika` = ?', [req.body.Nazwa_Wlasciciela, req.body.Nazwa]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				res.send({exit_code: 0})
			}
			else {
				res.send({exit_code: 2})
			}
		});
	}
	else {
		res.send({exit_code: 1})
	}
});

app.post("/checkUser", function(req, res) {
	if(req.body.Nazwa_Wlasciciela && req.body.Nazwa) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM blockedUsers WHERE Nazwa_Wlasciciela_Pokoju = ? AND Nazwa_Uzytkownika = ?', [req.body.Nazwa_Wlasciciela, req.body.Nazwa]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				if(response.result.length >= 1) {
					res.send({exit_code: 0})
				}
				else {
					res.send({exit_code: 2})
				}
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/getBlockedUsers", function(req, res) {
	if(req.body.Nazwa_Wlasciciela) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM blockedUsers WHERE Nazwa_Wlasciciela_Pokoju = ?', [req.body.Nazwa_Wlasciciela]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {			
				res.send({exit_code: 0, packet: response.result})
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/getImg", function(req, res) {
	if(req.body.ID) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT Rysunek FROM users WHERE ID = ?', [req.body.ID]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				let packet = {rysunek: response.result[0].Rysunek};
				res.send({exit_code: 0, packet})
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});

app.post("/getOtherImg", function(req, res) {
	if(req.body.Nazwa) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM users WHERE Nazwa = ?', [req.body.Nazwa]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) {
				if(response.result.length === 1) {
					let packet = {rysunek: response.result[0].Rysunek, id: response.result[0].ID};
					res.send({exit_code: 0, packet});
				}
				else {				
					res.send({exit_code: 2});
				}	
			}
			else {
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else {
		res.send({exit_code: 1});
	}
});