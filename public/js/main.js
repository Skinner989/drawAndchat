if(window.localStorage.getItem("logged") != 1) {
  window.location.href = 'index.html';
}

class Variables {
   constructor() {
      this.isMine;
      this.myName;
      this.otherRoom;
      this.otherId;
      this.otherName;
      this.numberOfComments;
      this.block;
   }
}

function hideAlert() {
	$("#alert")[0].style.display = "none";
	$("#alert_ok")[0].style.display = "none";
	$("#alert_error")[0].style.display = "none";
}

function alertOK(tresc) {
	hideAlert();
	$("#alert").show().delay(5000).fadeOut('slow');
	$("#alert_ok").show();
	$("#trescAlertu_Ok").html(tresc);
}

function alertERROR(tresc) {
	hideAlert();
	$("#alert").show().delay(5000).fadeOut('slow');
	$("#alert_error").show();
	$("#trescAlertu_Error").html(tresc);
}

const dane = new Variables();
dane.isMine = true;
dane.block = false;

var canvas = document.getElementById("draw");
var ctx = canvas.getContext("2d");
let color = document.getElementById("kolor").value;
let rozmiar = document.getElementById("rozmiar").value;
let id = window.localStorage.getItem("id");
let roomUsers = [];
if(localStorage.getItem("roomUsers") !== null) {
  roomUsers = JSON.parse(localStorage.getItem("roomUsers"));
}

function showLeave() {
  $("#dolacz").hide();
  $("#opuscBtn").fadeIn('fast');
}

function showJoin() {
  $("#opuscBtn").hide();
  $("#dolacz").fadeIn('fast');
}

var pos = { x: 0, y: 0 };

function resize() {
  ctx.canvas.width = document.getElementById("rysunek-content").offsetWidth;
  ctx.canvas.height = document.getElementById("rysunek-content").offsetHeight;
  pos = { x: 0, y: 0 };
  if((dane.isMine) && (localStorage.getItem("otherName") === null)) {
    getData(false);
  }
  else if((!dane.isMine) && (localStorage.getItem("otherName") !== null)) {
    getOtherData(dane.otherName, false);
  }
}

window.addEventListener("resize", resize);
document.getElementById("alert").addEventListener("mouseup", hideAlert);
document.getElementById("rysunek-content").addEventListener("mousemove", draw);
document.getElementById("rysunek-content").addEventListener("mousedown", setPosition);
document.getElementById("rysunek-content").addEventListener("mouseenter", setPosition);
document.getElementById("rysunek-content").addEventListener("mouseup", sendData);
document.getElementById("kolor").addEventListener("change", colorChange);
document.getElementById("rozmiar").addEventListener("change", sizeChange);
document.getElementById("chat-img").addEventListener("click", openChat);
document.getElementById("ukryjWiadomosci").addEventListener("click", unlockChat);

function setPosition(e) {
  pos.x = e.clientX - 15;
  pos.y = (e.clientY - 115) + document.documentElement.scrollTop;
}

function draw(e) {
  if (e.buttons !== 1) return;

  ctx.beginPath();

  ctx.lineWidth = document.getElementById("rozmiar").value;
  ctx.lineCap = "round";
  ctx.strokeStyle = document.getElementById("kolor").value;

  ctx.moveTo(pos.x, pos.y);
  var tempx = pos.x;
  var tempy = pos.y;
  setPosition(e);
  ctx.lineTo(pos.x, pos.y);

  ctx.stroke();
  sendmouse(tempx, tempy, pos.x, pos.y);
}

var socket;
socket = io.connect('http://localhost:3000');
const myRoom = 'room_' + id;
socket.emit('create', myRoom);

function sendmouse(xspos, yspos, xpos, ypos) {
  var data = {
    x: xpos,
    y: ypos,
    sx: xspos,
    sy: yspos,
    color: color,
    rozmiar: rozmiar,
    name: dane.myName
  };

  if(dane.isMine) {
    socket.emit('mouse', data, myRoom);
  }
  else {
    socket.emit('mouse', data, dane.otherRoom);
  }
}

socket.on('mouse', function(data) {
    if((dane.isMine) || (data.name === dane.otherName)) {
      ctx.beginPath()

      ctx.lineWidth = data.rozmiar;
      ctx.lineCap = "round";
      ctx.strokeStyle = data.color;

      ctx.moveTo(data.sx, data.sy);
      ctx.lineTo(data.x, data.y);

      ctx.stroke();
    } 
  }
);

socket.on('msg', function(data) {
    if(dane.numberOfMessages == 0) {
      $("#messages").html('');
    }
    $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left">' + data.Autor + '</p>' + 
    '<textarea id="komentarz_' + dane.numberOfMessages + '" readonly class="pb-2 col-11">' + data.Msg + '</textarea>');
    $("#komentarz_" + dane.numberOfMessages)[0].style.height = $("#komentarz_" + dane.numberOfMessages)[0].scrollHeight + "px";					
    $("#komentarz_" + dane.numberOfMessages)[0].style.overflow = "hidden";
    $("#komentarz_" + dane.numberOfMessages)[0].style.resize = "none";
    dane.numberOfMessages++;
  }
);

socket.on('onlineUsers', function(onlineUsers) {
    getOnlineUsers(onlineUsers);
  });

socket.on('joinedToRoom', function(room, name) {
  if(room === myRoom) {
    if(!roomUsers.includes(name)) {
			roomUsers.push(name);
      localStorage.setItem("roomUsers", JSON.stringify(roomUsers));
      getRoomUsers();
		}
  }
});

socket.on('userLeft', function(room, name) {
  if(room === myRoom) {
    let index = roomUsers.indexOf(name);
    if (index > -1) {
      roomUsers.splice(index, 1);
      localStorage.setItem("roomUsers", JSON.stringify(roomUsers));
    }
    getRoomUsers();
  }
});

socket.on('removeFromRoom', function(name) {
  if(name === dane.myName) {
   leave(true);
  }
});

socket.on('considerJoinRequest', function(name, roomOwnerName) {
  if(roomOwnerName == dane.myName) {
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

socket.on('joinRequestResponse', function(roomOwnerName, name, decision) {
  if(name == dane.myName) {
    if(decision == true)
    {
      getOtherData(roomOwnerName, true);
      let tresc = "Użytkownik <b>" + roomOwnerName + "</b> zaakceptował prośbę dołączenia";
      alertOK(tresc);
    }
    else {
      let tresc = "Użytkownik <b>" + roomOwnerName + "</b> odrzucił prośbę dołączenia";
      alertERROR(tresc);
    }
  }
});

socket.on('removeMessagesNotification', function() {
  let tresc = "Wyczyszczono chat";
  alertOK(tresc);
  $("#messages").html('');
  $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
  dane.numberOfMessages = 0;
});

function acceptJoinRequest(name) {
  socket.emit('sendJoinRequestResponse', dane.myName, name, true);
  $("#joinRequest")[0].style.display = "none";
  $("#joinRequestText").html('');
  $("#buttonsContainer").html('');
}

function rejectJoinRequest(name) {
  socket.emit('sendJoinRequestResponse', dane.myName, name, false);
  $("#joinRequest")[0].style.display = "none";
  $("#joinRequestText").html('');
  $("#buttonsContainer").html('');
}

function getRoomUsers() {
  $("#roomUsers").html("");
  if(roomUsers.length === 0) {
    $("#roomUsers").append('<div class="m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
  }
  for(const item of roomUsers) {
    $("#roomUsers").append('<div class="m-0 p-0 col-2 pt-2 pb-2" id="' + item + '" onclick="removeUser(this.id);">' + item + '<img src="./img/xtlo.png" class="float-right"></div>');
  } 
}

getRoomUsers();

function removeUser(name) {
  socket.emit('removeUser', name, myRoom);
  let index = roomUsers.indexOf(name);
  if (index > -1) {
    roomUsers.splice(index, 1);
    localStorage.setItem("roomUsers", JSON.stringify(roomUsers));
  }
  getRoomUsers();
}

function getName() {
  $.post("/getName", {ID: id}, function(data) {
    if(data.exit_code === 0) {
      dane.myName = data.name;
      socket.emit('add', dane.myName);
      $("#nazwaZalogowanegoUzytkownika").append(dane.myName);
      loadBlockedUsers();
    }
  });
}

getName();

function getOnlineUsers(onlineUsers) {
  $("#onlineUsers").html("");
  if((onlineUsers.length == 1) && (onlineUsers.includes(dane.myName))) {
    $("#onlineUsers").append('<div class="m-0 ml-auto mr-auto p-0 pt-2 pb-2 col-2">Brak</div>');
  }
  else {
    for(const item of onlineUsers) {
      if(dane.myName != item){
        $("#onlineUsers").append('<div class="user m-0 p-0 pt-2 pb-2 col-2" id="' + item + '" onclick="checkAndJoin(this.id, true);">' + item + '</div>');  
      }
    }
  }
}

function colorChange() {
  color = $("#drawingColor").val();
};

function sizeChange() {
  rozmiar = $("#rozmiar").val();
};

function sendData() {
  WIDTH = document.getElementById("rysunek-content").offsetWidth;
  HEIGHT = document.getElementById("rysunek-content").offsetHeight;
  var dataURL = document.getElementById("draw").toDataURL();
  let packet;

  if(dane.isMine) {
    packet = {data: dataURL, ID: id};
  }
  else {
    packet = {data: dataURL, ID: dane.otherId};
  }
  
  $.post("/update", packet, function(data) {
      if(data.exit_code !== 0) {
        let tresc = "Błąd połączenia.\nKod błędu: " + data.exit_code;
        alertERROR(tresc);
      }
  });
}

function sendMsg() {
  let msg = $("#tresc").val();
  if((msg == "") || (msg == " ")) {
    let tresc = "Wpisz treść wiadomości";
    alertERROR(tresc);
  }
  else {
    let room;
    if(dane.isMine) {
      room = myRoom.split('_')[1];
    }
    else {
      room = dane.otherRoom.split('_')[1];
    }
    $.post("/sendMessage", {author: dane.myName, room: room, msg: msg}, function(data) {
      $("#tresc").val('');
      if (data.exit_code === 0) {
        let packet;
        if(dane.isMine) {
          packet = {Room: myRoom, Autor: dane.myName, Msg: msg}
          socket.emit('msg', packet);
        }
        else {
          packet = {Room: dane.otherRoom, Autor: dane.myName, Msg: msg}
          socket.emit('msg', packet);
        }
      }
      else if (data.exit_code !== 0) {
        let tresc = "Błąd wysyłania wiadomości.\nKod błędu: " + data.exit_code;
        alertERROR(tresc);
      }     
    });
  }
}

function loadMsgs() {
  $("#messages").html("");
  let room;
  if(dane.isMine) {
    room = myRoom.split('_')[1];;
  }
  else {
    room = dane.otherRoom.split('_')[1];;
  }
  $.post("/getMessages", {room: room}, function(data) {
    if(data.exit_code !== 0) {
      let tresc = "Błąd wczytywania wiadomości.\nKod błędu: " + data.exit_code;
      alertERROR(tresc);
    }
    else{
      $("#chatHeader").html('');
      if(dane.isMine) {
        $("#chatHeader").append(' Chat <button type="button" class="btn btn-danger ml-2" onclick="removeMessagesConfirmation();" style="height:30%;">Wyczyść</button>');
      }
      else {
        $("#chatHeader").append(' Chat ');
      }
      if(data.packet.length == 0) {
        $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
        dane.numberOfMessages = 0;
      }
      else {
        let licznik = 0;
        data.packet.forEach(function(dt) {
          if(licznik == 0) {
            $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left mt-3">' + dt.author + '</p>' + 
            '<textarea id="komentarz_' + licznik + '" readonly class="pb-2 col-11">' + dt.contents + '</textarea>');   
            licznik ++;
          }
          else {
            $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto text-left">' + dt.author + '</p>' + 
            '<textarea id="komentarz_' + licznik + '" readonly class="pb-2 col-11">' + dt.contents + '</textarea>');   
            licznik ++;
          }
        });
        resizeMsgs();
        dane.numberOfMessages = licznik;
      } 
    }
  });
}

function removeMessagesConfirmation() {
  if($("#removeMessagesConfirmation")[0].style.display == "block") {
    $("#removeMessagesConfirmation")[0].style.display = "none";
  }
  else {
    $("#removeMessagesConfirmation")[0].style.display = "block";
  }
}

function removeAllMessages() {
  removeMessagesConfirmation();
  room = myRoom.split('_')[1];
  $.post("/removeMessages", {room: room, amount: "All"}, function(data) {
    if (data.exit_code === 0) {
      let tresc = "Wyczyszczono chat";
      alertOK(tresc);
      $("#messages").html('');
      $("#messages").append('<p class="col-11 m-0 p-0 ml-auto mr-auto mt-3"> Brak wiadomości </p>');
      dane.numberOfMessages = 0;
      socket.emit('removeMessages', myRoom);
    }
    else if (data.exit_code !== 0) {
      let tresc = "Błąd usuwania wiadomości.\nKod błędu: " + data.exit_code;
      alertERROR(tresc);
    }
  });     
}

function openChat() {
  if(!dane.block) {
    $("#chat-content")[0].style.display = "block";
    if(dane.numberOfMessages != 0) {
      resizeMsgs();
    }
    dane.block = true;
  }
  else{
    $("#chat-content")[0].style.display = "none";
    unlockChat();
  }
}

function resizeMsgs() {
  if($("#chat-content")[0].style.display == "block") {
    for(let i = 0; i < dane.numberOfMessages; i++) {
      $("#komentarz_" + i)[0].style.height = $("#komentarz_" + i)[0].scrollHeight + "px";					
      $("#komentarz_" + i)[0].style.overflow = "hidden";
      $("#komentarz_" + i)[0].style.resize = "none";
    }
  }
}

function unlockChat() {
  dane.block = false;
  $("#chat-content")[0].style.display = "none";
}

function getData(loadMsgsRequest) {
  $.post("/getImg", {ID: id}, function(data) {
      if(data.exit_code === 0) {
        if(loadMsgsRequest === true) {
          loadMsgs();
        }
        var img = new Image;
        if(data.packet.drawing != null) {
          img.src = data.packet.drawing;
        }
        img.onload = function(){
          ctx.drawImage(img,0,0);
        };
      }
  });
}

function blockUser(name) {
  $.post("/blockUser", {Nazwa_Wlasciciela: dane.myName, Nazwa: name}, function(data) {
    if(data.exit_code === 0) {
      socket.emit('sendJoinRequestResponse', dane.myName, name, false);
      $("#joinRequest")[0].style.display = "none";
      $("#joinRequestText").html('');
      $("#buttonsContainer").html('');
      alertOK("Zablokowano użytkownika <b>" + name + "</b>");
      loadBlockedUsers();     
    }
    else if(data.exit_code === 2) {
      alertERROR("Wystąpił błąd podczas próby zablokowania użytkownika");
    }
  });
}

function unblockUser(name) {
  $.post("/unblockUser", {Nazwa_Wlasciciela: dane.myName, Nazwa: name}, function(data) {
    if(data.exit_code === 0) {   
      alertOK("Odblokowano użytkownika <b>" + name + "</b>");
      loadBlockedUsers();   
    }
    else if(data.exit_code === 2) {
      alertERROR("Wystąpił błąd podczas próby odblokowania użytkownika");
    }
  });
}

function checkIfBlocked(name) {
  $.post("/checkUser", {Nazwa_Wlasciciela: name, Nazwa: dane.myName}, function(data) {
    if(data.exit_code === 0) {
      alertERROR("Właściciel pokoju zablokował Ci możliwość dołączania");
    }
    else if(data.exit_code === 2) {
      sendJoinRequest(name);
    }
  });
}

function loadBlockedUsers() {
  $("#blockedUsersContent").html("");
  $.post("/getBlockedUsers", {roomOwnerName: dane.myName}, function(data) {
    if(data.exit_code !== 0) {
      let tresc = "Błąd wczytywania zablokowanych użytkowników.\nKod błędu: " + data.exit_code;
      alertERROR(tresc);
    }
    else{
      data.packet.forEach(function(dt) {
        $("#blockedUsersContent").append('<div class="col-12 mb-1 text-left bg-secondary text-white pr-0 border-left">' + dt.Nazwa_Uzytkownika
        + '<button id="' + dt.Nazwa_Uzytkownika + '" class="btn btn-success rounded-0" onclick="unblockUser(this.id);">Odblokuj</button></div>');
      });
    }
  });
}

function showBlockedUsers() {
  $("#blockedUsers")[0].style.display = "block";
}

function hideBlockedUsers() {
  $("#blockedUsers")[0].style.display = "none";
}

function sendJoinRequest(name) {
  $.post("/getOtherImg", {Nazwa: name}, function(data) {
    if(data.exit_code === 0) {
      socket.emit('joinRequest', dane.myName, name, 'room_' + data.packet.id);
      let tresc = "Wysłano prośbę dołączania";
      alertOK(tresc);
    }
  });
}

function checkAndJoin(name, loadMsgsRequest) {
  if(!dane.isMine) {
    leave(false);
  }
  checkIfBlocked(name);
}

function getOtherData(name, loadMsgsRequest) {
  $.post("/getOtherImg", {username: name}, function(data) {
    if(data.exit_code === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var img = new Image;
        if(data.packet.rysunek != null) {
          img.src = data.packet.rysunek;
        }
        img.onload = function(){
          ctx.drawImage(img,0,0);
        };
        dane.isMine = false;
        dane.otherRoom = 'room_' + data.packet.id;
        dane.otherId = data.packet.id;
        dane.otherName = name;
        window.localStorage.setItem("otherName", name);
        socket.emit('join', dane.otherRoom, dane.myName);
        showLeave();
        if(loadMsgsRequest === true)
        {
          loadMsgs();
        }
      }
      else if(data.exit_code === 1) {
        let tresc = "Nie podano nazwy użytkownika";
        alertERROR(tresc);
      }
      else if(data.exit_code === 2) {
        let tresc = "Podany użytkownik nie istnieje";
        alertERROR(tresc);
      }
      else {
        let tresc = "Wystąpił problem z dołączeniem do użśytkownika.\nKod błędu: " + data.exit_code;
        alertERROR(tresc);
      }
  });
}

function leave(loadRequest) {
  window.localStorage.removeItem("otherName");
  socket.emit('leave', dane.otherRoom, dane.myName);
  if(loadRequest) {
    dane.isMine = true;
    showJoin();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    getData(true);
  }
}

function logout(){
  if(!dane.isMine) {
    leave(false);
  }
  socket.emit('remove', dane.myName);
  window.localStorage.setItem("logged", 0);
  $("#nazwaUzytkownika").val('');
  window.location.href = 'main.html';
}

function start() {
  if(localStorage.getItem("otherName") !== null) {
    getOtherData(localStorage.getItem("otherName"), true);
  }
  else{
    getData(true);
  }
  resize();
}
start();