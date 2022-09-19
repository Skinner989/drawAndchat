class Variables 
{
   constructor() 
   {
      this.isMine;
      this.myName;
      this.otherRoom;
      this.otherId;
      this.otherName;
      this.numberOfComments;
      this.block;
      this.noOnlineUsers;
      this.noRoomUsers;
   }
}

// Refresh
window.sessionStorage.removeItem("otherRoom");

function hideAlert() 
{
	$("#alert")[0].style.display = "none";
	$("#alertOk")[0].style.display = "none";
	$("#alertError")[0].style.display = "none";
}

function alertOK(contents) 
{
	hideAlert();
	$("#alert").show().delay(5000).fadeOut('slow');
	$("#alertOk").show();
	$("#alertContentOk").html(contents);
}

function alertERROR(contents) 
{
	hideAlert();
	$("#alert").show().delay(5000).fadeOut('slow');
	$("#alertError").show();
	$("#alertContentError").html(contents);
}

const myData = new Variables();
myData.isMine = true;
myData.block = false;
myData.noOnlineUsers = true;
myData.noRoomUsers = true;
const myName = window.sessionStorage.getItem("myName");
const canvas = document.getElementById("draw");
const ctx = canvas.getContext("2d");
const id = window.sessionStorage.getItem("id");
const socket = io.connect('http://localhost:3000');
const myRoom = 'room_' + id;
let color = document.getElementById("drawingColor").value;
let size = document.getElementById("drawingSize").value;
let pos = { x: 0, y: 0 };
let roomUsers = [];
if(sessionStorage.getItem("roomUsers") !== null) 
{
  roomUsers = JSON.parse(sessionStorage.getItem("roomUsers"));
}

function resize() 
{
  ctx.canvas.width = document.getElementById("drawingBoxContent").offsetWidth;
  ctx.canvas.height = document.getElementById("drawingBoxContent").offsetHeight;
  pos = { x: 0, y: 0 };
  // Refresh
  // if((myData.isMine) && (sessionStorage.getItem("otherName") === null))
  //==================================================================================
  // if(myData.isMine)
  // {
  //   getData(false);
  // }
  // else if((!myData.isMine) && (sessionStorage.getItem("otherName") !== null))
  // {
  //   getOtherData(myData.otherName, false);
  // }
  getUserData(false);
}

window.addEventListener("resize", resize);
window.addEventListener("unload", () =>
{
  if(window.sessionStorage.getItem("otherRoom") === null)
  {
    let blob = new Blob([JSON.stringify({username: window.sessionStorage.getItem("myName"), room: "none"})], {type : 'application/json; charset=UTF-8'});
    navigator.sendBeacon("/logout", blob);
  }
  else
  {
    let blob = new Blob([JSON.stringify({username: window.sessionStorage.getItem("myName"), room: window.sessionStorage.getItem("otherRoom")})], {type : 'application/json; charset=UTF-8'});
    navigator.sendBeacon("/logout", blob);
  }
});
document.getElementById("joinToUser").addEventListener("click", () =>
{
  let userToJoin = $("#username").val();
  socket.emit('checkIfOnline', myName, userToJoin);
});
document.getElementById("drawingBoxContent").addEventListener("mousemove", draw);
document.getElementById("drawingBoxContent").addEventListener("mousedown", setPosition);
document.getElementById("drawingBoxContent").addEventListener("mouseenter", setPosition);
document.getElementById("drawingBoxContent").addEventListener("mouseup", sendData);

function setPosition(e) 
{
  if($(document).width() >= 1033)
  {
    pos.x = e.clientX - 15;
    pos.y = (e.clientY - 100) + document.documentElement.scrollTop;
  }
  else if($(document).width() < 1033 && $(document).width() >= 756)
  {
    pos.x = e.clientX - 15;
    pos.y = (e.clientY - 140) + document.documentElement.scrollTop;
  }
  else if($(document).width() < 756)
  {
    pos.x = e.clientX - 15;
    pos.y = (e.clientY - 179) + document.documentElement.scrollTop;
  }
}

function draw(e) 
{
  if (e.buttons !== 1) return;

  ctx.beginPath();

  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;

  ctx.moveTo(pos.x, pos.y);
  let xsPos = pos.x;
  let ysPos = pos.y;
  setPosition(e);
  ctx.lineTo(pos.x, pos.y);

  ctx.stroke();

  let data = {
    x: pos.x,
    y: pos.y,
    sx: xsPos,
    sy: ysPos,
    color: color,
    size: size,
    name: myName
  };
  dataToSend.push(data);
}

let dataToSend = [];

function sendDrawing() 
{
  let room;
  if(myData.isMine) room = myRoom;
  else  room = myData.otherRoom;
  $.ajax({
    url: "/sendDrawing",
    type: 'post',
    data:{
      room: room,
      data: JSON.stringify(dataToSend),
      socketId: window.sessionStorage.getItem("socketId")
    },
    success: function()
    {
      dataToSend = [];
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(sendDrawing);
      }
      else
      {
        alertERROR("Bład połączenia z pokojem użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

socket.on('draw', function(responseData) 
{
  const data = JSON.parse(responseData);
  data.forEach(function (item) 
  {
    if(item.name != myName) 
    {
      ctx.beginPath()
      ctx.lineWidth = item.size;
      ctx.lineCap = "round";
      ctx.strokeStyle = item.color;
      ctx.moveTo(item.sx, item.sy);
      ctx.lineTo(item.x, item.y);
      ctx.stroke();
    } 
  });
});

socket.on('connect', () => 
{
  window.sessionStorage.setItem("socketId", socket.id);
  socket.emit('create', myRoom);
});

socket.on('createRoomResponse', function(room) 
{
  checkRoom(room);
});

function checkRoom(room)
{
  $.ajax({
    url: "/checkRoom",
    type: 'get',
    data:{
      room: room,
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(checkRoom, room);
      }
      else
      {
        alertERROR("Sesja wygasła. Zaloguj się ponownie");
        window.sessionStorage.setItem("sessionExpired", true);
        logout();      
      }
    }
  });
}

socket.on('newMessage', function(author, msg)
{
  if(myData.numberOfMessages == 0) 
  {
    $("#messages").html('');
  }
  $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left">' + author + '</p>' + 
  '<textarea id="message_' + myData.numberOfMessages + '" readonly class="pb-2 col-11">' + msg + '</textarea>');
  $("#message_" + myData.numberOfMessages)[0].style.height = $("#message_" + myData.numberOfMessages)[0].scrollHeight + "px";					
  $("#message_" + myData.numberOfMessages)[0].style.overflow = "hidden";
  $("#message_" + myData.numberOfMessages)[0].style.resize = "none";
  myData.numberOfMessages++;
});

socket.on('removeMessagesNotification', function() 
{
  alertOK("Wyczyszczono chat");
  $("#messages").html('');
  $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
  myData.numberOfMessages = 0;
});

socket.on('onlineUsers', function(onlineUsers) 
{
  updateOnlineUsers(onlineUsers);
});

socket.on('checkIfOnlineResponse', function (name, roomOwnerName, decision)
{
  if(name === myName)
  {
    if(decision === true)
    {
      checkAndJoin(roomOwnerName);
    }
    else
    {
      alertERROR("Użytkownik nie jest aktywny");
    }
  }
});

socket.on('getOnlineUsersResponse', function(name, onlineUsers)
{
  if(name == myName)
  {
    updateOnlineUsers(onlineUsers);
  }
});

socket.on('addOnlineUser', function(user)
{
  if(myName != user)  addOnlineUser(user);
});

socket.on('removeOnlineUser', function(user, onlineUsers)
{
  $("#" + user).remove();
  if((onlineUsers.length == 1) && (onlineUsers.includes(myName))) 
  {
    $("#onlineUsers").append('<div class="noUsers m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
    myData.noOnlineUsers = true;
  }
});

socket.on('considerJoinRequest', function(name, roomOwnerName) 
{
  if(roomOwnerName == myName) 
  {
    $("#joinRequest")[0].style.display = "block";
    $("#joinRequestText").html('');
    $("#joinRequestText").append('Użytkownik <b>' + name + '</b> chce dołączyć do Twojego pokoju.' + 
    '<p class="p-0 m-0">Zezwolić?</p>');
    $("#buttonsContainer").html('');
    $("#buttonsContainer").append('<button id="' + name + '" class="btn btn-success mr-1" onclick="acceptJoinRequest(this.id);">Akceptuj</button>' +
    '<button id="' + name + '" class="btn btn-danger ml-1" onclick="rejectJoinRequest(this.id);">Odrzuć</button>' + 
    '<p class="p-0 m-0"><button id="' + name + '" class="btn btn-warning mt-2" onclick="blockUser(this.id);">Zablokuj użytkownika</button></p>');
  }
});

function acceptJoinRequest(name) 
{
  $("#joinRequest")[0].style.display = "none";
  $("#joinRequestText").html('');
  $("#buttonsContainer").html('');

  $.ajax({
    url: "/sendJoinRequestResponse",
    type: 'post',
    data:{
      room: myRoom,
      username: name,
      decision: true
    },
    dataType: 'json',
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(acceptJoinRequest, name);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas akceptowania użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

function rejectJoinRequest(name) 
{
  $("#joinRequest")[0].style.display = "none";
  $("#joinRequestText").html('');
  $("#buttonsContainer").html('');

  $.ajax({
    url: "/sendJoinRequestResponse",
    type: 'post',
    data:{
      room: myRoom,
      username: name,
      decision: false
    },
    dataType: 'json',
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(acceptJoinRequest, name);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas akceptowania użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

socket.on('joinRequestResponse', function(roomOwnerName, name, decision) 
{
  if(name == myName) 
  {
    if(decision == 'true' && roomOwnerName == myData.otherName)
    {
      myData.otherRoom = 'room_' + myData.otherId;
      myData.isMine = false;
      socket.emit('join', myData.otherRoom, myName);
      getUserData(true);
      alertOK("Użytkownik <b>" + roomOwnerName + "</b> zaakceptował prośbę dołączenia");
    }
    else 
    {
      alertERROR("Użytkownik <b>" + roomOwnerName + "</b> odrzucił prośbę dołączenia");
      myData.otherName = '';
    }
  }
});

socket.on('joinedToRoom', function(room, name) 
{
  if(room === myRoom) 
  {
    if((!roomUsers.includes(name)) && (name != null))
    {
			roomUsers.push(name);
      sessionStorage.setItem("roomUsers", JSON.stringify(roomUsers));
      if(myData.noRoomUsers === true)
      {
        $("#roomUsers").html("");
        myData.noRoomUsers = false;
      }
      let newUser = document.createElement('div');
      newUser.setAttribute('id', 'U' + name);
      newUser.classList.add('row', 'roomUser', 'newUser', 'm-0', 'p-0', 'col-lg-2', 'col-md-4', 'col-sm-4');
      let newUsername = document.createElement('div');
      newUsername.innerHTML = name;
      newUsername.classList.add('roomUsername', 'm-0', 'p-0', 'col-10');
      let newUserRemoveButtonContainer = document.createElement('div');
      newUserRemoveButtonContainer.classList.add('removeButtonContainer', 'm-0', 'p-0', 'col-2');
      let newUserRemoveButton = document.createElement('i');
      newUserRemoveButton.setAttribute('id', 'removeButton_' + name);
      newUserRemoveButton.setAttribute('onclick', 'removeUser(this.id);');
      newUserRemoveButton.classList.add('center', 'fa-solid', 'fa-x');
      document.querySelector("#roomUsers").appendChild(newUser);
      newUser.appendChild(newUsername);
      newUser.appendChild(newUserRemoveButtonContainer);
      newUserRemoveButtonContainer.appendChild(newUserRemoveButton);
		}
  }
});

socket.on('userLeft', function(room, name) 
{
  if(room === myRoom) 
  {
    let index = roomUsers.indexOf(name);
    if (index > -1) 
    {
      roomUsers.splice(index, 1);
      sessionStorage.setItem("roomUsers", JSON.stringify(roomUsers));
    }
    let removedUser = document.querySelector("#U" + name);
    removedUser.classList.add('roomUserDelete');
    removedUser.addEventListener('transitionend', function() 
    {
      this.remove();
    });
    if(roomUsers.length == 0)
    {
      setTimeout(() =>
      {
        let noUsers = document.createElement('div');
        noUsers.innerHTML = 'Brak';
        noUsers.classList.add('noUsers', 'm-0', 'p-0', 'pt-2', 'pb-2', 'ml-auto', 'mr-auto', 'col-2');
        document.querySelector("#roomUsers").appendChild(noUsers);
        myData.noRoomUsers = true;
      }, 500);
    }
  }
});

socket.on('removeFromRoom', function(name, room) 
{
  if(name === myName) 
  {
    $.ajax({
      url: "/checkIfRoomMember",
      type: 'get',
      data:{
        room: room.split('_')[1],
        socketId: window.sessionStorage.getItem("socketId")
      },
      success: function()
      {
        leave(true);
      },
    });
  }
});

function getRoomUsers() 
{
  $("#roomUsers").html("");
  if(roomUsers.length === 0) 
  {
    $("#roomUsers").append('<div class="noUsers m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
  }
  for(const item of roomUsers) 
  {
    $("#roomUsers").append('<div id="U' + item + '" class="row roomUser m-0 p-0 col-lg-2 col-md-4 col-sm-4"><div class="roomUsername m-0 p-0 pt-2 col-10">'
    + item + '</div><div class="removeButtonContainer m-0 p-0 col-2" id="removeButton_' + item + '" onclick="removeUser(this.id);"><i class="center fa-solid fa-x"></i></div></div>');
  } 
}

function removeUser(user) 
{
  const name = user.split('_')[1];
  $.ajax({
    url: "/removeUserFromRoom",
    type: 'delete',
    data:{
      username: name
    },
    dataType: 'json',
    success: function()
    {
      const index = roomUsers.indexOf(name);
      if (index > -1) 
      {
        roomUsers.splice(index, 1);
        sessionStorage.setItem("roomUsers", JSON.stringify(roomUsers));
      }
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(removeUser, name);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas próby załadowania profilu użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

function getName() 
{
  $.ajax({
    url: "/getName",
    type: 'get',
    dataType: 'json',
    success: function(data)
    {
      myName = data.username;
      window.sessionStorage.setItem("myName", data.username);
      socket.emit('add', myName);
      socket.emit('getOnlineUsers', myName, myRoom);
      $("#loggedUser").append(myName);
      loadBlockedUsers();
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(getName);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas próby załadowania profilu użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

function updateOnlineUsers(onlineUsers) 
{
  $("#onlineUsers").html("");
  if((onlineUsers.length == 1) && (onlineUsers.includes(myName))) 
  {
    $("#onlineUsers").append('<div class="noUsers m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
    myData.noOnlineUsers = true;
  }
  else 
  {
    myData.noOnlineUsers = false;
    for(const item of onlineUsers) 
    {
      if(myName != item)
      {
        $("#onlineUsers").append('<div class="user m-0 p-0 pt-2 pb-2 col-lg-2 col-md-4 col-sm-4" id="' + item + '" onclick="checkAndJoin(this.id, true);">' + item + '</div>');  
      }
    }
  }
}

function addOnlineUser(user)
{
  if(myData.noOnlineUsers)
  {
    $("#onlineUsers").html("");
    myData.noOnlineUsers = false;
  }
  let newUser = document.createElement('div');
	newUser.innerHTML = user;
	newUser.classList.add('newUser', 'user', 'm-0', 'p-0', 'pt-2', 'pb-2', 'col-lg-2', 'col-md-4', 'col-sm-4');
  newUser.setAttribute('id', user)
  newUser.setAttribute('onclick', 'checkAndJoin(this.id, true);');
	document.querySelector("#onlineUsers").appendChild(newUser);
}

function colorChange() 
{
  color = $("#drawingColor").val();
};

function sizeChange() 
{
  size = $("#drawingSize").val();
};

function sendData() 
{
  sendDrawing();
  const dataURL = document.getElementById("draw").toDataURL();
  let ID;

  if(myData.isMine)
  {
    ID = id;
  }
  else 
  {
    ID = myData.otherId;
  }
  $.ajax({
    url: "/update",
    type: 'post',
    data:{
      room: ID,
      data: dataURL,
      socketId: window.sessionStorage.getItem("socketId")
    },
    error: function(response)
    {
      if(response.status == 403)
      {
        alertERROR("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
      }
      else if(response.status == 401)
      {
        getNewToken(sendData);
      }
      else
      {
        alertERROR("Błąd synchronizacji z użytkownikami pokoju.\nKod błędu: " + response.status);
      }
    }
  });
}

function sendMsg() 
{
  let msg = $("#contents").val();
  if((msg == "") || (msg == " ")) 
  {
    alertERROR("Wpisz treść wiadomości");
  }
  else 
  {
    let room;
    if(myData.isMine) 
    {
      room = myRoom.split('_')[1];
    }
    else 
    {
      room = myData.otherRoom.split('_')[1];
    }
    $.ajax({
      url: "/sendMessage",
      type: 'post',
      data:{
        room: room,
        msg: msg,
        socketId: window.sessionStorage.getItem("socketId")
      },
      success: function ()
      {
        $("#contents").val('');
      },
      error: function(response)
      {
        if(response.status == 403)
        {
          alertERROR("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
        }
        else if(response.status == 401)
        {
          getNewToken(sendMsg);
        }
        else
        {
          alertERROR("Błąd wysyłania wiadomości.\nKod błędu: " + response.status);
        }
      }
    });
  }
}

function loadMsgs() 
{
  $("#messages").html("");
  let room;
  if(myData.isMine) 
  {
    room = myRoom.split('_')[1];;
  }
  else 
  {
    room = myData.otherRoom.split('_')[1];;
  }
  $.ajax({
    url: "/getMessages",
    type: 'get',
    data:{
      room: room,
      socketId: window.sessionStorage.getItem("socketId")
    },
    dataType: 'json',
    success: function(data)
    {
      $("#chatHeader").html('');
      if(myData.isMine) 
      {
        $("#chatHeader").append(' Chat <button type="button" class="btn btn-danger ml-2" onclick="removeMessagesConfirmation();" style="height:30%;">Wyczyść</button>');
      }
      else 
      {
        $("#chatHeader").append(' Chat ');
      }
      if(data.length == 0) 
      {
        $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
        myData.numberOfMessages = 0;
      }
      else 
      {
        let counter = 0;
        data.forEach(function(dt) 
        {
          if(counter == 0) 
          {
            $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left mt-3">' + dt.author + '</p>' + 
            '<textarea id="message_' + counter + '" readonly class="pb-2 col-11">' + dt.contents + '</textarea>');   
            counter ++;
          }
          else 
          {
            $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left">' + dt.author + '</p>' + 
            '<textarea id="message_' + counter + '" readonly class="pb-2 col-11">' + dt.contents + '</textarea>');   
            counter ++;
          }
        });
        myData.numberOfMessages = counter;
        resizeMsgs();
      } 
    },
    error: function(response)
    {
      if(response.status == 403)
      {
        alertERROR("Brak uprawnień. Uzytkownik nie jest członkiem pokoju");
      }
      else if(response.status == 401)
      {
        getNewToken(loadMsgs);
      }
      else
      {
        alertERROR("Błąd ładowania wiadomości.\nKod błędu: " + response.status);
      }
    }
  });
}

function getNewToken(functionToExecute, functionArgument)
{
  $.ajax({
    url: "/token",
    type: 'post',
    success: function()
    {
      if(functionArgument == null)
      {
        functionToExecute();
      }
      else
      {
        functionToExecute(functionArgument);
      }
    },
    error: function()
    {
      alertERROR("Sesja wygasła. Zaloguj się ponownie1212");
      window.sessionStorage.setItem("sessionExpired", true);
      logout();
    }
  });
}

function checkRefreshToken()
{
  $.ajax({
    url: "/checkRefreshToken",
    type: 'post',
    data:{
      token: window.sessionStorage.getItem("refreshToken")
    },
    dataType: 'json',
    error: function()
    {
      alertERROR("Sesja wygasła. Zaloguj się ponownie");
      window.sessionStorage.setItem("sessionExpired", true);
      logout();
    }
  });
}

function removeMessagesConfirmation() 
{
  if($("#removeMessagesConfirmation")[0].style.display == "block") 
  {
    $("#removeMessagesConfirmation")[0].style.display = "none";
  }
  else 
  {
    $("#removeMessagesConfirmation")[0].style.display = "block";
  }
}

function removeAllMessages() 
{
  removeMessagesConfirmation();
  $.ajax({
    url: "/removeMessages",
    type: 'delete',
    data:{
      amount: "All"
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(removeAllMessages);
      }
      else
      {
        alertERROR("Błąd usuwania wiadomości.\nKod błędu: " + response.status);
      }
    }
  });     
}

function openChat() 
{
  if(!myData.block) 
  {
    $("#chatContent")[0].style.display = "block";
    if(myData.numberOfMessages != 0) 
    {
      resizeMsgs();
    }
    myData.block = true;
  }
  else
  {
    $("#chatContent")[0].style.display = "none";
    unlockChat();
  }
}

function resizeMsgs() 
{
  if($("#chatContent")[0].style.display == "block") 
  {
    for(let i = 0; i < myData.numberOfMessages; i++) 
    {
      $("#message_" + i)[0].style.height = $("#message_" + i)[0].scrollHeight + "px";					
      $("#message_" + i)[0].style.overflow = "hidden";
      $("#message_" + i)[0].style.resize = "none";
    }
  }
}

function unlockChat() 
{
  myData.block = false;
  $("#chatContent")[0].style.display = "none";
}

function blockUser(name) 
{
  $.ajax({
    url: "/blockUser",
    type: 'post',
    data:{
      username: name
    },
    success: function ()
    {
      socket.emit('sendJoinRequestResponse',  myName, myRoom, name, false);
      $("#joinRequest")[0].style.display = "none";
      $("#joinRequestText").html('');
      $("#buttonsContainer").html('');
      alertOK("Zablokowano użytkownika <b>" + name + "</b>");
      loadBlockedUsers();
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(blockUser, name);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas próby zablokowania użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

function unblockUser(name) 
{
  $.ajax({
    url: "/unblockUser",
    type: 'post',
    data:{
      username: name
    },
    success: function ()
    {
      alertOK("Odblokowano użytkownika <b>" + name + "</b>");
      loadBlockedUsers(); 
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(unblockUser, name);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas próby odblokowania użytkownika.\nKod błędu: " + response.status);
      }
    }
  });
}

function loadBlockedUsers() 
{
  $("#blockedUsersContent").html("");
  $.ajax({
    url: "/getBlockedUsers",
    type: 'get',
    dataType: 'json',
    success: function (data)
    {
      if(data.length == 0) 
      {
        $("#blockedUsersContent").append('<div class="col-12 mb-1 bg-secondary text-white border-left border-right">Brak zablokowanych użytkowników</div>');
      }
      else 
      {
        data.forEach(function(dt) 
        {
          $("#blockedUsersContent").append('<div class="col-12 mb-1 text-left bg-secondary text-white pr-0 border-left">' + dt.username
          + '<button id="' + dt.username + '" class="btn btn-success rounded-0" onclick="unblockUser(this.id);">Odblokuj</button></div>');
        });
      }
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(loadBlockedUsers);
      }
      else
      {
        alertERROR("Błąd wczytywania zablokowanych użytkowników.\nKod błędu: " + response.status);
      }
    }
  });
}

function showBlockedUsers() 
{
  $("#blockedUsers").fadeIn('fast');
}

function hideBlockedUsers() 
{
  $("#blockedUsers")[0].style.display = "none";
}

function checkAndJoin(name) 
{
  if(!myData.isMine) 
  {
    leave(false);
  }
  sendJoinRequest(name);
}

function sendJoinRequest(name) 
{
  $.ajax({
    url: "/joinToRoom",
    type: 'get',
    data:{
      roomOwnerName: name,
    },
    dataType: 'json',
    success: function (data)
    {
      if(data.isBlocked)
      {
        alertERROR("Właściciel pokoju zablokował Ci możliwość dołączania"); 
      }
      else
      {
        myData.otherName = name;
        myData.otherId = data.id[0].id;
        socket.emit('joinRequest', myName, name, 'room_' + data.id[0].id);
        alertOK("Wysłano prośbę dołączania");
      }
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(checkIfBlocked, name);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas dołączania do pokoju.\nKod błędu: " + response.status);
      }
    }
  });
}

function getUserData(loadMsgsRequest) 
{
  let name;
  let room;
  if(myData.isMine)
  {
    name = myName;
    room = id;
  }
  else
  {
    name = myData.otherName;
    room = myData.otherId;
  }
  $.ajax({
    url: "/getUserImg",
    type: 'get',
    data:{
      username: name,
      room: room,
      socketId: window.sessionStorage.getItem("socketId")
    },
    dataType: 'json',
    success: function(data)
    {
      if(loadMsgsRequest === true) 
      {
        loadMsgs();
      }
      $("#drawingBoxContent")[0].style.display = "none";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const img = new Image;
      $("#drawingBoxContent").fadeIn(1000);
      if(data.drawing != null) 
      {
        img.src = data.drawing;
      }
      img.onload = function()
      {
        ctx.drawImage(img,0,0);
      };
      if(!myData.isMine)
      {
        myData.isMine = false;
        window.sessionStorage.setItem("otherRoom", myData.otherRoom);
        window.sessionStorage.setItem("otherName", name);
        $("#leaveBtn").fadeIn('fast');
      }
    },
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(getUserData, loadMsgsRequest);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas próby załadowania obrazka.\nKod błędu: " + response.status);
      }
    }
  });
}

function leave(loadRequest) 
{
  window.sessionStorage.removeItem("otherName");
  window.sessionStorage.removeItem("otherRoom");
  socket.emit('leave', myData.otherRoom, window.sessionStorage.getItem("myName"));
  if(loadRequest) 
  {
    myData.isMine = true;
    $("#leaveBtn").hide();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    getUserData(true);
  }
}

function clearCookie() 
{
  $.ajax({
    url: "/clearCookie",
    type: 'delete'
  });
}

function logout()
{
  if(window.sessionStorage.getItem("otherRoom") === null)
  {
    let blob = new Blob([JSON.stringify({username: window.sessionStorage.getItem("myName"), room: "none"})], {type : 'application/json; charset=UTF-8'});
    navigator.sendBeacon("/logout", blob);
  }
  else
  {
    let blob = new Blob([JSON.stringify({username: window.sessionStorage.getItem("myName"), room: window.sessionStorage.getItem("otherRoom")})], {type : 'application/json; charset=UTF-8'});
    navigator.sendBeacon("/logout", blob);
  }
  clearCookie();
  if(window.sessionStorage.getItem("sessionExpired"))
  {
    window.sessionStorage.clear();
    window.sessionStorage.setItem("sessionExpired", true);
    window.location.href = 'start.html';
  }
  else
  {
    window.sessionStorage.clear();
    window.location.href = 'start.html';
  }
}

function addMeToOnlineUsers()
{
  $.ajax({
    url: "/addMeToOnlineUsers",
    type: 'post',
    error: function(response)
    {
      if(response.status == 401)
      {
        getNewToken(addMeToOnlineUsers);
      }
      else
      {
        alertERROR("Wystąpił błąd podczas dodawania użytkownika do listy aktywnych użytkowników" + response.status);
      }
    }
  });
}

function start() 
{
  checkRefreshToken();
  addMeToOnlineUsers();
  socket.emit('getOnlineUsers', myName);
  $("#loggedUser").append(myName);
  getRoomUsers();
}
start();

$(document).ready(function() 
{
	setTimeout(function()
  {
    $('#pageContent')[0].style.display = "none";
    $('#pageContent').fadeIn(1000);
    loadBlockedUsers();
    loadMsgs();
    resize();
		$('body').addClass('loaded');
    // Refresh
    // if(sessionStorage.getItem("otherName") !== null) 
    // {
    //   getOtherData(sessionStorage.getItem("otherName"), true);
    // }
    // else
    // {
    //   getData(true);
    // }
	}, 1000);
});