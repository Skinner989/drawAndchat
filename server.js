const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({limit: '500mb'}))
app.use(express.urlencoded({limit: '500mb', extended: false}));

const config_mysql = {
	"host"     : "localhost",
	"user"     : "root",
	"password" : "mysql",
	"database" : "draw&chat"
}

//===================================================
//===================================================
//===================================================
//===================================================

const Database = require('./SQL');

app.use('/', express.static(__dirname + "/public/"));
const http = require('http');

app.get('/', (req,res)=>
{
  res.sendFile(__dirname + "/./public/start.html")
});

const server = http.createServer(app).listen(PORT, ()=> 
{
  console.log(`Startowanie servera na porcie ${PORT}`);
})

var io = require('socket.io')(server, {cors: {origin: "*"}});

let onlineUsers = [];

io.sockets.on('connection', function (socket) 
  {
	socket.on('create', function(room) 
	{
		socket.join(room);
	});
	socket.on('join', function(room, name) 
	{
		socket.join(room);
		socket.in(room).emit('joinedToRoom', room, name);
	});
	socket.on('leave', function(room, name) 
	{
		socket.leave(room);
		socket.in(room).emit('userLeft', room, name);
	});
    socket.on('mouse', function(data, room) 
	{
        socket.in(room).emit('mouse', data);
    });
	socket.on('msg', function(data) 
	{
        io.sockets.in(data.room).emit('msg', data);
    });
	socket.on('joinRequest', function(name, roomOwnerName, room) 
	{
        socket.in(room).emit('considerJoinRequest', name, roomOwnerName);
    });
	socket.on('sendJoinRequestResponse', function(roomOwnerName, name, decision) 
	{
        io.emit('joinRequestResponse', roomOwnerName, name, decision);
    });
	socket.on('add', function(name) 
	{
		if(!onlineUsers.includes(name)) 
		{
			onlineUsers.push(name);
		}
        io.emit('onlineUsers', onlineUsers);
    });
	socket.on('remove', function(name) 
	{
		if(onlineUsers.includes(name)) 
		{
			onlineUsers.splice(onlineUsers.indexOf(name), 1);
			io.emit('onlineUsers', onlineUsers);
		}
    });
	socket.on('removeUser', function(name, room)
	{
        socket.in(room).emit('removeFromRoom', name);
    });
	socket.on('removeMessages', function(room)
	{
        socket.in(room).emit('removeMessagesNotification');
    });
  }
);

function isNameUnique(username)
{
	return new Promise(async (resolve, reject) => 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM `users` WHERE username = ?',[username]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0 && response.result.length === 0) 
			{
				resolve();
			}
			else 
			{
				reject();
			}
		});
	});
}

app.post("/signup", async function(req, res) 
{
	if(req.body.username && req.body.password) 
	{
		try {
			await isNameUnique(req.body.username);
			const db = new Database(config_mysql);
			db.Start();
			db.Query('INSERT INTO `users` (`ID`, `username`, `password`) VALUES (NULL, ?, ?) ', [req.body.username, req.body.password]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0) 
				{
					res.send({exit_code: 0});
				}
				else 
				{
					res.send({exit_code: 3});
				}
			});
		}
		catch 
		{
			res.send({exit_code: 2});
		}	
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/signin", function(req, res) 
{
	if(req.body.username && req.body.password) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM users WHERE username = ? AND password = ?', [req.body.username, req.body.password]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				if(response.result.length === 1) 
				{
					if(response.result[0].username === req.body.username && response.result[0].password === req.body.password) 
					{
            			let packet = {drawing: response.result[0].drawing, userID: response.result[0].ID};
						res.send({exit_code: 0, packet})
					}
					else 
					{
						res.send({exit_code: 4});
					}
				}
				else 
				{
					res.send({exit_code: 3});
				}
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/update", function(req, res) 
{
	if(req.body.ID && req.body.data) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('UPDATE `users` SET `drawing` = ? WHERE `users`.`ID` = ?', [req.body.data, req.body.ID]).then((response) => {
			db.Stop();

			if(response.exit_code === 0) 
			{
				res.send({exit_code: 0});
			}
			else 
			{
				res.send({exit_code: 3});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/sendMessage", function(req, res) 
{
	if(req.body.author && req.body.room && req.body.msg) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('INSERT INTO `messages` (`ID`, `roomID`, `author`, `contents`) VALUES (NULL, ?, ?, ?)', [req.body.room, req.body.author, req.body.msg]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				res.send({exit_code: 0});
			}
			else 
			{
				res.send({exit_code: 2});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/removeMessages", function(req, res) 
{
	if(req.body.room && req.body.amount) 
	{
		if(req.body.amount == "All") 
		{
			const db = new Database(config_mysql);
			db.Start();
			db.Query('DELETE FROM `messages` WHERE `roomID` = ?', [req.body.room]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0) 
				{
					res.send({exit_code: 0});
				}
				else 
				{
					res.send({exit_code: 2});
				}
			});
		}
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/getMessages", function(req, res) 
{
	if(req.body.room) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM messages WHERE roomID = ?', [req.body.room]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{			
				res.send({exit_code: 0, packet: response.result})
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/getName", function(req, res) 
{
	if(req.body.ID) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT username FROM users WHERE ID = ?', [req.body.ID]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				res.send({exit_code: 0, name: response.result[0].username})
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/blockUser", function(req, res) 
{
	if(req.body.roomOwnerName && req.body.username) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('INSERT INTO `blockedUsers` (`ID`, `roomOwnerName`, `username`) VALUES (NULL, ?, ?)', [req.body.roomOwnerName, req.body.username]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				res.send({exit_code: 0})
			}
			else 
			{
				res.send({exit_code: 2})
			}
		});
	}
	else 
	{
		res.send({exit_code: 1})
	}
});

app.post("/unblockUser", function(req, res) 
{
	if(req.body.roomOwnerName && req.body.username) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('DELETE FROM `blockedUsers` WHERE `roomOwnerName` = ? AND `username` = ?', [req.body.roomOwnerName, req.body.username]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				res.send({exit_code: 0})
			}
			else 
			{
				res.send({exit_code: 2})
			}
		});
	}
	else 
	{
		res.send({exit_code: 1})
	}
});

app.post("/checkUser", function(req, res) 
{
	if(req.body.roomOwnerName && req.body.username) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM blockedUsers WHERE roomOwnerName = ? AND username = ?', [req.body.roomOwnerName, req.body.username]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) 
			{
				if(response.result.length >= 1) 
				{
					res.send({exit_code: 0})
				}
				else 
				{
					res.send({exit_code: 2})
				}
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/getBlockedUsers", function(req, res) 
{
	if(req.body.roomOwnerName) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM blockedUsers WHERE roomOwnerName = ?', [req.body.roomOwnerName]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{			
				res.send({exit_code: 0, packet: response.result})
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/getImg", function(req, res) 
{
	if(req.body.ID) {
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT drawing FROM users WHERE ID = ?', [req.body.ID]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				let packet = {drawing: response.result[0].drawing};
				res.send({exit_code: 0, packet})
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/getOtherImg", function(req, res) 
{
	if(req.body.username) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM users WHERE username = ?', [req.body.username]).then((response) => {
			db.Stop();
			if(response.exit_code === 0) 
			{
				if(response.result.length === 1) 
				{
					let packet = {drawing: response.result[0].drawing, id: response.result[0].ID};
					res.send({exit_code: 0, packet});
				}
				else 
				{				
					res.send({exit_code: 2});
				}	
			}
			else 
			{
				res.send({exit_code: response.exit_code});
			}
		});
	}
	else 
	{
		res.send({exit_code: 1});
	}
});

app.post("/exit", function(req, res) 
{
	if((req.body.username) && (req.body.username))
	{
		console.log("wykonano!");
	}
});