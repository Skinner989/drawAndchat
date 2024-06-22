const express = require("express");
const app = express();
const PORT = process.env.PORT || 8000;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieparser = require("cookie-parser");
const session = require('express-session');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

require('dotenv').config();

app.use(express.json({limit: '500mb'}))
app.use(express.urlencoded({limit: '500mb', extended: false}));
app.use(cookieparser());

// Database config
//===================================================
const config_mysql = {
	"host"     : "sql7.freesqldatabase.com",
	"user"     : "sql7714708",
	"password" : "xTEaunWkyv",
	"database" : "sql7714708"
}

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
  clearRefreshTokens(true);
})

const io = require('socket.io')(server, {cors: {origin: "*"}});
let onlineUsers = [];
const joinRequestResponses = new Map()

async function clearRefreshTokens(initialization)
{
	const expTime = 3600000;
	const currentData = Date.now();
	try
	{
		const db = new Database(config_mysql);
		db.Start();
		await db.Query('DELETE FROM refreshtokens WHERE (`created(miliseconds)` + ?) < ?', [expTime, currentData]).then((response) => 
		{
			db.Stop();
			if(response.exit_code !== 0) 
			{
				console.log("Nie udało się usunąć starych tokenów z bazy danych");
			}
		});
	}
	catch(err)
	{
		console.log("Błąd połączenia z bazą danych", err);
		if(initialization) process.exit();
	}
}

io.sockets.on('connection', function(socket) 
{
	socket.on('createRoom', function(room)
	{
		socket.join(room);
		io.to(socket.id).emit('createRoomResponse', room);
	});
	socket.on('join', function(room, name) 
	{
		if(joinRequestResponses.get(name))
		{
			if(joinRequestResponses.get(name).dec)
			{
				socket.join(room);
				socket.in(room).emit('joinedToRoom', room, name);
				joinRequestResponses.delete(name);
			}
			else
			{
				joinRequestResponses.delete(name);
			}
		}
	});
	socket.on('leave', function(room, name) 
	{
		socket.leave(room);
		socket.in(room).emit('userLeft', room, name);
	});
	socket.on('msg', function(data) 
	{
        io.sockets.in(data.room).emit('msg', data);
    });
	socket.on('checkIfOnline', function(name, roomOwnerName) 
	{
		if(onlineUsers.includes(roomOwnerName))
		{
			socket.emit('checkIfOnlineResponse', name, roomOwnerName, true);
		}
		else
		{
			socket.emit('checkIfOnlineResponse', name, roomOwnerName, false);
		}
    });
	socket.on('joinRequest', function(name, roomOwnerName, room) 
	{
        socket.in(room).emit('considerJoinRequest', name, roomOwnerName);
    });
	socket.on('sendJoinRequestResponse', function(roomOwnerName, room, name, decision) 
	{
		if(decision)
		{
			joinRequestResponses.set(name, {dec: decision});
		}
        io.emit('joinRequestResponse', roomOwnerName, name, decision);
    });
	socket.on('getOnlineUsers', function() 
	{
        io.to(socket.id).emit('getOnlineUsersResponse', onlineUsers);
    });
	socket.on('removeUser', function(name, room)
	{
        socket.in(room).emit('removeFromRoom', name);
    });
  }
);

app.post("/sendDrawing", authenticateToken, async function(req, res) 
{
	if(req.body.room && req.body.data && req.body.socketId) 
	{
		try
		{
			await checkIfRoomMember(req.body.room, req.body.socketId);
			io.in(req.body.room).emit('draw', req.body.data);
			res.sendStatus(200);
		}
		catch
		{
			res.status(403).send("Uzytkownik nie jest członkiem pokoju");
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.get("/checkRoom", authenticateToken, function(req, res)
{
	if(req.query.room) 
	{
		if(req.query.room == 'room_' + req.user.id)
		{
			res.sendStatus(200);
			io.in('room_' + req.user.id).emit('getRoomUser', req.user.id);
		}
		else
		{
			res.sendStatus(403);
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.post("/addMeToOnlineUsers", authenticateToken, function(req, res) 
{
	if(req.session.name)
	{
		if(!onlineUsers.includes(req.user.name)) 
		{
			onlineUsers.push(req.user.name);
			io.emit('addOnlineUser', req.user.name);
		}
		res.sendStatus(200);
	}
	else
	{
		res.sendStatus(400);
	}
});

app.post("/sendJoinRequestResponse", authenticateToken, function(req, res) 
{
	if(req.body.room && req.body.roomUsers && req.body.username && req.body.decision) 
	{
		let roomUsers = [];
		if(req.body.decision)
		{
			if(req.body.roomUsers == "none")
			{
				roomUsers.push(req.user.name);
			}
			else
			{
				roomUsers = req.body.roomUsers;
			}
			joinRequestResponses.set(req.body.username, {dec: req.body.decision});
		}
        io.emit('joinRequestResponse', req.user.name, req.body.username, roomUsers, req.body.decision);
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.delete("/removeUserFromRoom", authenticateToken, function(req, res) 
{
	if(req.body.username) 
	{
        io.emit('removeFromRoom', req.body.username, req.user.room);
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.post("/getRoomUserResponse", authenticateToken, function(req, res)
{
	if(req.body.room && req.body.socketId) 
	{
        io.in('room_' + req.body.room).emit("getRoomUserResponse", req.body.room, req.body.socketId, req.user.name)
		res.end();
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.get("/checkIfRoomMember", async function(req, res) 
{
	if(req.query.room && req.query.socketId) 
	{
        try
		{
			await checkIfRoomMember('room_' + req.query.room, req.query.socketId);
			res.sendStatus(200);
		}
		catch
		{
			res.status(403).send("Uzytkownik nie jest członkiem pokoju");
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

function checkIfRoomMember(room, user)
{
	return new Promise(async (resolve, reject) => 
	{
		const clients = io.sockets.adapter.rooms.get(room);
		const arr = Array.from(clients);
		if(arr.includes(user))
		{
			resolve();
		}
		else 
		{
			reject();
		}
	});
}

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

function generateAccessToken(user) 
{
	return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
}

function authenticateToken(req, res, next)
{
	const authHeader = req.headers['authorization'];
	let token = authHeader && authHeader.split(' ')[1];
	if(token === undefined)
	{
		token = req.cookies.accessToken;
		if(token === undefined) return res.sendStatus(401)
	}
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => 
	{
		if (err) return res.sendStatus(401)
		req.user = user;
		next();
	});
}

app.post("/token", function(req, res)
{
	const refreshToken = req.cookies.refreshToken;
	if(refreshToken === undefined) return res.sendStatus(401)
	const db = new Database(config_mysql);
	db.Start();
	db.Query('SELECT * FROM `refreshtokens` WHERE token = ?',[refreshToken]).then((response) => 
	{
		db.Stop();
		if(response.exit_code === 0 && response.result.length >= 1) 
		{
			jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) =>
			{
				if(err) return res.sendStatus(401)
				const userData = {id: user.id, name: user.name, room: user.room};
				const accessToken = generateAccessToken(userData);
				res.cookie('accessToken', accessToken, {httpOnly: true});
				res.status(200).send({message: "OK"});
				clearRefreshTokens(false);
			});
		}
		else
		{
			res.sendStatus(401);
			clearRefreshTokens(false);
		}
	});
});

app.put("/signup", async function(req, res) 
{
	if(req.body.username && req.body.password) 
	{
		try 
		{
			await isNameUnique(req.body.username);
			try
			{
				const salt = await bcrypt.genSalt();
				const hashedPassword = await bcrypt.hash(req.body.password, salt)
				const db = new Database(config_mysql);
				db.Start();
				db.Query('INSERT INTO `users` (`ID`, `username`, `password`) VALUES (NULL, ?, ?)', [req.body.username, hashedPassword]).then((response) => 
				{
					db.Stop();
					if(response.exit_code === 0) 
					{
						res.status(201).send("Utworzono konto");
					}
					else 
					{
						res.status(500).send("Nieoczekiwany błąd serwera");
					}
				});
			}
			catch
			{
				res.status(500).send("Nieoczekiwany błąd serwera");
			}	
		}
		catch 
		{
			res.status(400).send("Podana nazwa użytkownika jest już zajęta");
		}	
	}
	else 
	{
		res.status(400).send("Nie wszystkie pola są wypełnione");
	}
});

app.post("/signin", async function(req, res) 
{
	if(req.body.username && req.body.password) 
	{
		const db = new Database(config_mysql);
		db.Start();
		let data = await db.Query('SELECT * FROM users WHERE username = ?', [req.body.username]); 
		db.Stop();
		if(data.exit_code === 0 && data.result.length === 1) 
		{
			try
			{	
				const temp = await bcrypt.compare(req.body.password, data.result[0].password);
				if(temp)
				{
					const username = req.body.username;
					const user = {id: data.result[0].ID, name: username, room: 'room_' + data.result[0].ID};
					const accessToken = generateAccessToken(user);
					const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '60m'});
					let packet = {userID: data.result[0].ID, username: req.body.username};
					db.Start();
					db.Query('INSERT INTO `refreshtokens` (`ID`, `token`, `created(miliseconds)`) VALUES (NULL, ?, ?)', [refreshToken, Date.now()]).then((response) => 
					{
						db.Stop();
						if(response.exit_code === 0) 
						{
							res.cookie('accessToken', accessToken, {httpOnly: true});
							res.cookie('refreshToken', refreshToken, {httpOnly: true});
							req.session.name = user.name;
							req.session.room = user.room;
							res.status(200).send(packet);
						}
						else 
						{
							res.status(500).send("Nieoczekiwany błąd serwera");
						}
					});
				}
				else
				{
					res.status(400).send("Podane dane są nieprawidłowe");
				}
			}
			catch
			{
				res.status(500).send("Nieoczekiwany błąd serwera");
			}
		}
		else 
		{
			res.status(400).send("Podane dane są nieprawidłowe");
		}
	}
	else 
	{
		res.status(400).send("Podane dane są nieprawidłowe");
	}
});

app.get("/checkSession", function(req, res) 
{
	const authHeader = req.headers['authorization'];
	let token = authHeader && authHeader.split(' ')[1];
	if(token === undefined)
	{
		token = req.cookies.accessToken;
		if(token === undefined) return res.sendStatus(401)
	}
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => 
	{
		if (err) return res.sendStatus(401)
		else
		{
			req.user = user;
			const db = new Database(config_mysql);
			db.Start();
			db.Query('SELECT * FROM users WHERE username = ?', [req.user.name]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0 && response.result.length === 1) 
				{
					let packet = {userID: response.result[0].ID, username: req.user.name};
					res.status(200).send(packet);
				}
			});
		}
	});
});

app.post("/update", authenticateToken, async function(req, res) 
{
	if(req.body.room && req.body.data && req.body.socketId)
	{
		try
		{
			await checkIfRoomMember('room_' + req.body.room, req.body.socketId);
			const db = new Database(config_mysql);
			db.Start();
			db.Query('UPDATE `users` SET `drawing` = ? WHERE `users`.`ID` = ?', [req.body.data, req.body.room]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0) 
				{
					res.sendStatus(201);
				}
				else 
				{
					res.status(500).send("Nieoczekiwany błąd serwera");
				}
			});
		}
		catch
		{
			res.status(403).send("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.get("/getMessages", authenticateToken, async function(req, res) 
{
	if(req.query.room && req.query.socketId) 
	{
		try
		{
			await checkIfRoomMember('room_' + req.query.room, req.query.socketId);
			const db = new Database(config_mysql);
			db.Start();
			db.Query('SELECT * FROM messages WHERE roomID = ?', [req.query.room]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0) 
				{			
					res.status(200).send(response.result);
				}
				else 
				{
					res.status(500).send("Nieoczekiwany błąd serwera");
				}
			});
		}
		catch
		{
			res.status(403).send("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.post("/sendMessage", authenticateToken, async function(req, res) 
{
	if(req.user.name && req.body.room && req.body.msg && req.body.socketId) 
	{
		try
		{
			await checkIfRoomMember('room_' + req.body.room, req.body.socketId);
			const db = new Database(config_mysql);
			db.Start();
			db.Query('INSERT INTO `messages` (`ID`, `roomID`, `author`, `contents`) VALUES (NULL, ?, ?, ?)', [req.body.room, req.user.name, req.body.msg]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0) 
				{
					io.in('room_' + req.body.room).emit('newMessage', req.user.name, req.body.msg);
					res.status(201).send(req.body.msg);
				}
				else 
				{
					res.status(500).send("Nieoczekiwany błąd serwera");
				}
			});
		}
		catch
		{
			res.status(403).send("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.delete("/removeMessages", authenticateToken, function(req, res) 
{
	if(req.user.room && req.body.amount) 
	{
		const room = req.user.room.split('_')[1];
		if(req.body.amount == "All") 
		{
			const db = new Database(config_mysql);
			db.Start();
			db.Query('DELETE FROM `messages` WHERE `roomID` = ?', [room]).then((response) => 
			{
				db.Stop();
				if(response.exit_code === 0) 
				{
					res.sendStatus(204);
					io.in(req.user.room).emit('removeMessagesNotification');
				}
				else 
				{
					res.status(500).send("Nieoczekiwany błąd serwera");
				}
			});
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.post("/blockUser", authenticateToken, function(req, res) 
{
	if(req.user.name && req.body.username) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('INSERT INTO `blockedUsers` (`ID`, `roomOwnerName`, `username`) VALUES (NULL, ?, ?)', [req.user.name, req.body.username]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				res.sendStatus(200);
			}
			else 
			{
				res.status(500).send("Nieoczekiwany błąd serwera");
			}
		});
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.post("/unblockUser", authenticateToken, function(req, res) 
{
	if(req.user.name && req.body.username) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('DELETE FROM `blockedUsers` WHERE `roomOwnerName` = ? AND `username` = ?', [req.user.name, req.body.username]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				res.sendStatus(200);
			}
			else 
			{
				res.status(500).send("Nieoczekiwany błąd serwera");
			}
		});
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.get("/joinToRoom", authenticateToken, function(req, res) 
{
	if(req.query.roomOwnerName && req.user.name) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM blockedUsers WHERE roomOwnerName = ? AND username = ?', [req.query.roomOwnerName, req.user.name]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{
				if(response.result.length >= 1) 
				{
					res.status(200).send({message: "Użytkownik jest zablokowany w tym pokoju", isBlocked: true});
				}
				else 
				{
					db.Start();
					db.Query('SELECT id FROM users WHERE username = ?', [req.query.roomOwnerName]).then((response) => 
					{
						db.Stop();
						if(response.exit_code === 0)
						{			
							res.status(200).send({id: response.result, isBlocked: false});
						}
						else 
						{
							res.status(500).send("Nieoczekiwany błąd serwera");
						}
					});
				}
			}
			else 
			{
				res.status(500).send("Nieoczekiwany błąd serwera");
			}
		});
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.get("/getBlockedUsers", authenticateToken, function(req, res) 
{
	if(req.user.name) 
	{
		const db = new Database(config_mysql);
		db.Start();
		db.Query('SELECT * FROM blockedUsers WHERE roomOwnerName = ?', [req.user.name]).then((response) => 
		{
			db.Stop();
			if(response.exit_code === 0) 
			{			
				res.status(200).send(response.result);
			}
			else 
			{
				res.status(500).send("Nieoczekiwany błąd serwera");
			}
		});
	}
	else
	{
		res.status(401).send("Niepoprawny token");
	}
});

app.get("/getUserImg", authenticateToken, async function(req, res) 
{
	if(req.query.username && req.query.room && req.query.socketId) 
	{
		try
		{
			const db = new Database(config_mysql);
			db.Start();
			let data = await db.Query('SELECT * FROM users WHERE username = ?', [req.query.username]); 
			db.Stop();
			if(data.exit_code === 0)
			{
				if(data.result.length === 1) 
				{
					try
					{
						await checkIfRoomMember('room_' + req.query.room, req.query.socketId);
						let packet = {drawing: data.result[0].drawing, id: data.result[0].ID};
						res.status(200).send(packet);
					}
					catch
					{
						res.status(403).send("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
					}
				}
				else 
				{				
					res.status(500).send("Nieoczekiwany błąd serwera");
				}	
			}
			else 
			{
				res.status(400).send("Nie ma takiego użytkownika");
			}
		}
		catch
		{
			res.status(400).send("Nie ma takiego użytkownika");
		}
	}
	else 
	{
		res.status(400).send("Nie podano wymaganych danych");
	}
});

app.delete("/clearCookie", function(req, res) 
{
	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');
	req.session.destroy();
});

app.post("/logout", function(req, res) 
{
	if(req.body.username && req.body.room)
	{
		if(onlineUsers.includes(req.body.username)) 
		{
			let test = onlineUsers.splice(onlineUsers.indexOf(req.body.username), 1);
			io.emit('removeOnlineUser', req.body.username, onlineUsers);
		}
		io.in(req.body.room).emit('userLeft', req.body.room, req.body.username);
		if(req.body.removeToken === true)
		{
			if(req.cookies.refreshToken !== undefined)
			{
				const db = new Database(config_mysql);
				db.Start();
				db.Query('DELETE FROM `refreshtokens` WHERE `token` = ?', [req.cookies.refreshToken]).then((response) => 
				{
					db.Stop();
					if(response.exit_code === 0) 
					{
						res.sendStatus(204);
					}
					else 
					{
						res.status(500).send("Nieoczekiwany błąd serwera");
					}
				});				
			}
			else
			{
				res.sendStatus(400);
			}
		}
	}
	else
	{
		res.sendStatus(400);
	}
});