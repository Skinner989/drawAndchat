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
   }
}

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

var canvas = document.getElementById("draw");
var ctx = canvas.getContext("2d");
let color = document.getElementById("drawingColor").value;
let size = document.getElementById("drawingSize").value;
let id = window.sessionStorage.getItem("id");
let roomUsers = [];
if(sessionStorage.getItem("roomUsers") !== null) 
{
  roomUsers = JSON.parse(sessionStorage.getItem("roomUsers"));
}

function showLeave() 
{
  $("#dolacz").hide();
  $("#leaveBtn").fadeIn('fast');
}

function showJoin() 
{
  $("#leaveBtn").hide();
  $("#dolacz").fadeIn('fast');
}

var pos = { x: 0, y: 0 };

function resize() 
{
  ctx.canvas.width = document.getElementById("drawingBoxContent").offsetWidth;
  ctx.canvas.height = document.getElementById("drawingBoxContent").offsetHeight;
  pos = { x: 0, y: 0 };
  if((myData.isMine) && (sessionStorage.getItem("otherName") === null)) 
  {
    getData(false);
  }
  else if((!myData.isMine) && (sessionStorage.getItem("otherName") !== null))
  {
    getOtherData(myData.otherName, false);
  }
}

window.addEventListener("resize", resize);
window.addEventListener("unload", leave(true));
document.getElementById("drawingBoxContent").addEventListener("mousemove", draw);
document.getElementById("drawingBoxContent").addEventListener("mousedown", setPosition);
document.getElementById("drawingBoxContent").addEventListener("mouseenter", setPosition);
document.getElementById("drawingBoxContent").addEventListener("mouseup", sendData);

function setPosition(e) 
{
  pos.x = e.clientX - 15;
  pos.y = (e.clientY - 115) + document.documentElement.scrollTop;
}

function draw(e) 
{
  if (e.buttons !== 1) return;

  ctx.beginPath();

  ctx.lineWidth = document.getElementById("drawingSize").value;
  ctx.lineCap = "round";
  ctx.strokeStyle = document.getElementById("drawingColor").value;

  ctx.moveTo(pos.x, pos.y);
  var tempX = pos.x;
  var tempY = pos.y;
  setPosition(e);
  ctx.lineTo(pos.x, pos.y);

  ctx.stroke();
  sendmouse(tempX, tempY, pos.x, pos.y);
}

var socket;
socket = io.connect('http://localhost:3000');
const myRoom = 'room_' + id;
socket.emit('create', myRoom);

function sendmouse(xspos, yspos, xpos, ypos) 
{
  var data = {
    x: xpos,
    y: ypos,
    sx: xspos,
    sy: yspos,
    color: color,
    size: size,
    name: myData.myName
  };

  if(myData.isMine) 
  {
    socket.emit('mouse', data, myRoom);
  }
  else 
  {
    socket.emit('mouse', data, myData.otherRoom);
  }
}

socket.on('mouse', function(data) 
{
    if((myData.isMine) || (data.name === myData.otherName)) 
    {
      ctx.beginPath()

      ctx.lineWidth = data.size;
      ctx.lineCap = "round";
      ctx.strokeStyle = data.color;

      ctx.moveTo(data.sx, data.sy);
      ctx.lineTo(data.x, data.y);

      ctx.stroke();
    } 
  }
);

socket.on('msg', function(data) 
{
    if(myData.numberOfMessages == 0) 
    {
      $("#messages").html('');
    }
    $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left">' + data.author + '</p>' + 
    '<textarea id="komentarz_' + myData.numberOfMessages + '" readonly class="pb-2 col-11">' + data.msg + '</textarea>');
    $("#komentarz_" + myData.numberOfMessages)[0].style.height = $("#komentarz_" + myData.numberOfMessages)[0].scrollHeight + "px";					
    $("#komentarz_" + myData.numberOfMessages)[0].style.overflow = "hidden";
    $("#komentarz_" + myData.numberOfMessages)[0].style.resize = "none";
    myData.numberOfMessages++;
  }
);

socket.on('onlineUsers', function(onlineUsers) 
{
  getOnlineUsers(onlineUsers);
});

socket.on('joinedToRoom', function(room, name) 
{
  if(room === myRoom) 
  {
    if((!roomUsers.includes(name)) && (name != null))
    {
			roomUsers.push(name);
      sessionStorage.setItem("roomUsers", JSON.stringify(roomUsers));
      getRoomUsers();
		}
  }
});

socket.on('userLeft', function(room, name) 
{
  if(room === myRoom) {
    let index = roomUsers.indexOf(name);
    if (index > -1) {
      roomUsers.splice(index, 1);
      sessionStorage.setItem("roomUsers", JSON.stringify(roomUsers));
    }
    getRoomUsers();
  }
});

socket.on('removeFromRoom', function(name) 
{
  if(name === myData.myName) 
  {
   leave(true);
  }
});

socket.on('considerJoinRequest', function(name, roomOwnerName) 
{
  if(roomOwnerName == myData.myName) 
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

socket.on('joinRequestResponse', function(roomOwnerName, name, decision) 
{
  if(name == myData.myName) 
  {
    if(decision == true)
    {
      getOtherData(roomOwnerName, true);
      alertOK("Użytkownik <b>" + roomOwnerName + "</b> zaakceptował prośbę dołączenia");
    }
    else 
    {
      alertERROR("Użytkownik <b>" + roomOwnerName + "</b> odrzucił prośbę dołączenia");
    }
  }
});

socket.on('removeMessagesNotification', function() 
{
  alertOK("Wyczyszczono chat");
  $("#messages").html('');
  $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
  myData.numberOfMessages = 0;
});

function acceptJoinRequest(name) 
{
  socket.emit('sendJoinRequestResponse', myData.myName, name, true);
  $("#joinRequest")[0].style.display = "none";
  $("#joinRequestText").html('');
  $("#buttonsContainer").html('');
}

function rejectJoinRequest(name) 
{
  socket.emit('sendJoinRequestResponse', myData.myName, name, false);
  $("#joinRequest")[0].style.display = "none";
  $("#joinRequestText").html('');
  $("#buttonsContainer").html('');
}

function getRoomUsers() 
{
  $("#roomUsers").html("");
  if(roomUsers.length === 0) 
  {
    $("#roomUsers").append('<div class="m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
  }
  for(const item of roomUsers) 
  {
    $("#roomUsers").append('<div class="m-0 p-0 col-2 pt-2 pb-2" id="' + item + '" onclick="removeUser(this.id);">' + item + '<img src="./img/xtlo.png" class="float-right"></div>');
  } 
}

function removeUser(name) 
{
  socket.emit('removeUser', name, myRoom);
  let index = roomUsers.indexOf(name);
  if (index > -1) 
  {
    roomUsers.splice(index, 1);
    sessionStorage.setItem("roomUsers", JSON.stringify(roomUsers));
  }
  getRoomUsers();
}

function getName() 
{
  $.post("/getName", {ID: id}, function(data) 
  {
    if(data.exit_code === 0) 
    {
      myData.myName = data.name;
      window.sessionStorage.setItem("myName", data.name);
      socket.emit('add', myData.myName);
      $("#loggedUser").append(myData.myName);
      loadBlockedUsers();
    }
  });
}


function getOnlineUsers(onlineUsers) 
{
  $("#onlineUsers").html("");
  if((onlineUsers.length == 1) && (onlineUsers.includes(myData.myName))) 
  {
    $("#onlineUsers").append('<div class="m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
  }
  else 
  {
    for(const item of onlineUsers) 
    {
      if(myData.myName != item)
      {
        $("#onlineUsers").append('<div class="user m-0 p-0 pt-2 pb-2 col-2" id="' + item + '" onclick="checkAndJoin(this.id, true);">' + item + '</div>');  
      }
    }
  }
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
  WIDTH = document.getElementById("drawingBoxContent").offsetWidth;
  HEIGHT = document.getElementById("drawingBoxContent").offsetHeight;
  var dataURL = document.getElementById("draw").toDataURL();
  let packet;

  if(myData.isMine)
  {
    packet = {data: dataURL, ID: id};
  }
  else 
  {
    packet = {data: dataURL, ID: myData.otherId};
  }
  
  $.post("/update", packet, function(data) 
  {
      if(data.exit_code !== 0) 
      {
        alertERROR("Błąd połączenia.\nKod błędu: " + data.exit_code);
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
    $.post("/sendMessage", {author: myData.myName, room: room, msg: msg}, function(data) 
    {
      $("#contents").val('');
      if (data.exit_code === 0) 
      {
        let packet;
        if(myData.isMine) 
        {
          packet = {room: myRoom, author: myData.myName, msg: msg}
          socket.emit('msg', packet);
        }
        else 
        {
          packet = {room: myData.otherRoom, author: myData.myName, msg: msg}
          socket.emit('msg', packet);
        }
      }
      else if (data.exit_code !== 0) 
      {
        alertERROR("Błąd wysyłania wiadomości.\nKod błędu: " + data.exit_code);
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
  $.post("/getMessages", {room: room}, function(data) 
  {
    if(data.exit_code !== 0) 
    {
      alertERROR("Błąd wczytywania wiadomości.\nKod błędu: " + data.exit_code);
    }
    else
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
      if(data.packet.length == 0) 
      {
        $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
        myData.numberOfMessages = 0;
      }
      else 
      {
        let counter = 0;
        data.packet.forEach(function(dt) 
        {
          if(counter == 0) 
          {
            $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left mt-3">' + dt.author + '</p>' + 
            '<textarea id="komentarz_' + counter + '" readonly class="pb-2 col-11">' + dt.contents + '</textarea>');   
            counter ++;
          }
          else 
          {
            $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left">' + dt.author + '</p>' + 
            '<textarea id="komentarz_' + counter + '" readonly class="pb-2 col-11">' + dt.contents + '</textarea>');   
            counter ++;
          }
        });
        resizeMsgs();
        myData.numberOfMessages = counter;
      } 
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
  room = myRoom.split('_')[1];
  $.post("/removeMessages", {room: room, amount: "All"}, function(data) {
    if (data.exit_code === 0) 
    {
      alertOK("Wyczyszczono chat");
      $("#messages").html('');
      $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
      myData.numberOfMessages = 0;
      socket.emit('removeMessages', myRoom);
    }
    else if (data.exit_code !== 0) 
    {
      alertERROR("Błąd usuwania wiadomości.\nKod błędu: " + data.exit_code);
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
      $("#komentarz_" + i)[0].style.height = $("#komentarz_" + i)[0].scrollHeight + "px";					
      $("#komentarz_" + i)[0].style.overflow = "hidden";
      $("#komentarz_" + i)[0].style.resize = "none";
    }
  }
}

function unlockChat() 
{
  myData.block = false;
  $("#chatContent")[0].style.display = "none";
}

function getData(loadMsgsRequest) 
{
  $.post("/getImg", {ID: id}, function(data) 
  {
      if(data.exit_code === 0) 
      {
        if(loadMsgsRequest === true) 
        {
          loadMsgs();
        }
        var img = new Image;
        if(data.packet.drawing != null) 
        {
          img.src = data.packet.drawing;
        }
        img.onload = function()
        {
          ctx.drawImage(img,0,0);
        };
      }
  });
}

function blockUser(name) 
{
  $.post("/blockUser", {roomOwnerName: myData.myName, username: name}, function(data) 
  {
    if(data.exit_code === 0) 
    {
      socket.emit('sendJoinRequestResponse', myData.myName, name, false);
      $("#joinRequest")[0].style.display = "none";
      $("#joinRequestText").html('');
      $("#buttonsContainer").html('');
      alertOK("Zablokowano użytkownika <b>" + name + "</b>");
      loadBlockedUsers();     
    }
    else if(data.exit_code === 2) 
    {
      alertERROR("Wystąpił błąd podczas próby zablokowania użytkownika");
    }
  });
}

function unblockUser(name) 
{
  $.post("/unblockUser", {roomOwnerName: myData.myName, username: name}, function(data) 
  {
    if(data.exit_code === 0) 
    {   
      alertOK("Odblokowano użytkownika <b>" + name + "</b>");
      loadBlockedUsers();   
    }
    else if(data.exit_code === 2) 
    {
      alertERROR("Wystąpił błąd podczas próby odblokowania użytkownika");
    }
  });
}

function checkIfBlocked(name) 
{
  $.post("/checkUser", {roomOwnerName: name, username: myData.myName}, function(data) 
  {
    if(data.exit_code === 0) 
    {
      alertERROR("Właściciel pokoju zablokował Ci możliwość dołączania");
    }
    else if(data.exit_code === 2) 
    {
      sendJoinRequest(name);
    }
  });
}

function loadBlockedUsers() 
{
  $("#blockedUsersContent").html("");
  $.post("/getBlockedUsers", {roomOwnerName: myData.myName}, function(data) 
  {
    if(data.exit_code !== 0) 
    {
      alertERROR("Błąd wczytywania zablokowanych użytkowników.\nKod błędu: " + data.exit_code);
    }
    else 
    {
      if(data.packet.length == 0) 
      {
        $("#blockedUsersContent").append('<div class="col-12 mb-1 bg-secondary text-white border-left border-right">Brak zablokowanych użytkowników</div>');
      }
      else 
      {
        data.packet.forEach(function(dt) 
        {
          $("#blockedUsersContent").append('<div class="col-12 mb-1 text-left bg-secondary text-white pr-0 border-left">' + dt.username
          + '<button id="' + dt.username + '" class="btn btn-success rounded-0" onclick="unblockUser(this.id);">Odblokuj</button></div>');
        });
      }
    }
  });
}

function showBlockedUsers() 
{
  $("#blockedUsers")[0].style.display = "block";
}

function hideBlockedUsers() 
{
  $("#blockedUsers")[0].style.display = "none";
}

function sendJoinRequest(name) 
{
  $.post("/getOtherImg", {username: name}, function(data) 
  {
    if(data.exit_code === 0) 
    {
      socket.emit('joinRequest', myData.myName, name, 'room_' + data.packet.id);
      alertOK("Wysłano prośbę dołączania");
    }
  });
}

function checkAndJoin(name) 
{
  if(!myData.isMine) 
  {
    leave(false);
  }
  checkIfBlocked(name);
}

function getOtherData(name, loadMsgsRequest) 
{
  $.post("/getOtherImg", {username: name}, function(data) 
  {
    if(data.exit_code === 0) 
    {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var img = new Image;
        if(data.packet.drawing != null) 
        {
          img.src = data.packet.drawing;
        }
        img.onload = function()
        {
          ctx.drawImage(img,0,0);
        };
        myData.isMine = false;
        myData.otherRoom = 'room_' + data.packet.id;
        window.sessionStorage.setItem("otherRoom", myData.otherRoom);
        myData.otherId = data.packet.id;
        myData.otherName = name;
        window.sessionStorage.setItem("otherName", name);
        socket.emit('join', myData.otherRoom, myData.myName);
        showLeave();
        if(loadMsgsRequest === true) 
        {
          loadMsgs();
        }
      }
      else if(data.exit_code === 1)
      {
        alertERROR("Nie podano nazwy użytkownika");
      }
      else if(data.exit_code === 2) 
      {
        alertERROR("Podany użytkownik nie istnieje");
      }
      else 
      {
        alertERROR("Wystąpił problem z dołączeniem do użśytkownika.\nKod błędu: " + data.exit_code);
      }
  });
}

function leave(loadRequest) 
{
  window.sessionStorage.removeItem("otherName");
  if((myData.otherRoom == undefined) && (window.sessionStorage.getItem("otherRoom") !== null) && (window.sessionStorage.getItem("myName") !== null))
  {
    console.log(myData.otherRoom);
    console.log(window.sessionStorage.getItem("otherRoom"));
    myData.otherRoom = window.sessionStorage.getItem("otherRoom");
    myData.myName = window.sessionStorage.getItem("myName");
    console.log(myData.otherRoom);
    console.log(myData.myName);
    // socket.emit('leave', window.sessionStorage.getItem("otherRoom"), window.sessionStorage.getItem("myName"));
    $.post("/exit", {username: window.sessionStorage.getItem("myName"), room: window.sessionStorage.getItem("otherRoom")}); 
  }
  window.sessionStorage.removeItem("otherRoom");
  window.sessionStorage.removeItem("myName");
  if(loadRequest) 
  {
    myData.isMine = true;
    showJoin();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    getData(true);
  }
}

function logout()
{
  if(!myData.isMine) 
  {
    leave(false);
  }
  socket.emit('remove', myData.myName);
  window.sessionStorage.setItem("logged", 0);
  $("#username").val('');
  window.location.href = 'start.html';
}

function start() 
{
  getName();
  getRoomUsers();
  if(sessionStorage.getItem("otherName") !== null) 
  {
    getOtherData(sessionStorage.getItem("otherName"), true);
  }
  else
  {
    getData(true);
  }
  resize();
}
if(window.sessionStorage.getItem("logged") != 1) 
{
  logout();
}
start();