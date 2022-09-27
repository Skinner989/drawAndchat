let amountOfAlerts = 0;
let alertNum = 0

function checkIfSignedIn()
{
  if(window.sessionStorage.getItem("sessionExpired"))
  {
    window.sessionStorage.clear();
    clearCookie();
    alertERROR("Sesja wygasła. Zaloguj się ponownie");
  }
  else if(window.sessionStorage.getItem("logout"))
  {
    window.sessionStorage.clear();
    clearCookie();
  }
  else
  {
    checkSession();
  }
}

function hideAlert() 
{
  $("#alert")[0].style.display = "none";
}

function alertOK(contents) 
{
  $("#alert").show();
  amountOfAlerts = document.querySelectorAll(".alert-success").length + document.querySelectorAll(".alert-danger").length;
  let newAlert = document.createElement('div');
  newAlert.setAttribute('id', 'alert_' + alertNum);
  newAlert.classList.add('alert', 'alert-subContainer');
  let newAlertContainer = document.createElement('div');
  newAlertContainer.setAttribute('id', 'alertContainer_' + alertNum);
  newAlertContainer.classList.add('alert', 'alert-success');
  newAlertContainer.setAttribute('onclick', 'removeAlert(this.id);');
  let newAlertContent = document.createElement('div');
  newAlertContent.innerHTML = contents;
  newAlertContent.classList.add('alertContent');
  let newAlertRemoveButton = document.createElement('a');
  newAlertRemoveButton.innerHTML = '&times';
  newAlertRemoveButton.setAttribute('href', '#');
  newAlertRemoveButton.classList.add('close', 'text-center');
  newAlertRemoveButton.setAttribute('id', 'removeAlert_' + alertNum);
  newAlertRemoveButton.setAttribute('onclick', 'removeAlert(this.id);');
  newAlert.appendChild(newAlertContainer);
  newAlertContainer.appendChild(newAlertRemoveButton);
  newAlertContainer.appendChild(newAlertContent);
  document.querySelector("#alert").appendChild(newAlert);
  alertNum++;
  const tempAlertNumber = alertNum-1;
  autoRemoveAlert(tempAlertNumber);
}

function alertERROR(contents) 
{
  $("#alert").show();
  amountOfAlerts = document.querySelectorAll(".alert-success").length + document.querySelectorAll(".alert-danger").length;
  let newAlert = document.createElement('div');
  newAlert.setAttribute('id', 'alert_' + alertNum);
  newAlert.classList.add('alert', 'alert-subContainer');
  let newAlertContainer = document.createElement('div');
  newAlertContainer.setAttribute('id', 'alertContainer_' + alertNum);
  newAlertContainer.classList.add('alert', 'alert-danger');
  newAlertContainer.setAttribute('onclick', 'removeAlert(this.id);');
  let newAlertContent = document.createElement('div');
  newAlertContent.innerHTML = contents;
  newAlertContent.classList.add('alertContent');
  let newAlertRemoveButton = document.createElement('a');
  newAlertRemoveButton.innerHTML = '&times';
  newAlertRemoveButton.setAttribute('href', '#');
  newAlertRemoveButton.classList.add('close', 'text-center');
  newAlertRemoveButton.setAttribute('id', 'removeAlert_' + alertNum);
  newAlertRemoveButton.setAttribute('onclick', 'removeAlert(this.id);');
  newAlert.appendChild(newAlertContainer);
  newAlertContainer.appendChild(newAlertRemoveButton);
  newAlertContainer.appendChild(newAlertContent);
  document.querySelector("#alert").appendChild(newAlert);
  alertNum++;
  const tempAlertNumber = alertNum-1;
  autoRemoveAlert(tempAlertNumber);
}

function removeAlert(id)
{
  let alertId = id.split('_')[1];
  $("#alert_" + alertId).remove();
  amountOfAlerts = document.querySelectorAll(".alert-success").length + document.querySelectorAll(".alert-danger").length;
  if(amountOfAlerts == 0) hideAlert();
}

function autoRemoveAlert(id)
{
  setTimeout(() =>
  {
    $("#alert_" + id).fadeOut('slow');
    setTimeout(() =>
    {
      $("#alert_" + id).remove();
      amountOfAlerts = document.querySelectorAll(".alert-success").length + document.querySelectorAll(".alert-danger").length;
      if(amountOfAlerts == 0) hideAlert();
    }, 500);
  }, 5000);
}

function showLogin()
{
  $("#signupPage").hide();
  $("#loginPage").fadeIn(1000);
}

function showSignup()
{
  $("#loginPage").hide();
  $("#signupPage").fadeIn(1000);
  alertERROR("Błąd logowania");
}

function clearCookie() 
{
  $.ajax({
    url: "/clearCookie",
    type: 'delete',
  });
}

function checkSession() 
{
  $.ajax({
    url: "/checkSession",
    type: 'get',
    dataType: 'json',
    success: function (data)
    {
      window.sessionStorage.setItem("myName", data.username);
      window.sessionStorage.setItem("id", data.userID);
      window.location.href = 'main.html';
    },
    error: function(response) 
    {
      if(response.status == 401)
      {
        getNewToken(checkSession);
      }
      else
      {
        console.clear(); 
      }
    }
  });
}

function getNewToken(functionToExecute, functionArgument)
{  
  return new Promise((resolve) => 
  {
    $.ajax({
      url: "/token",
      type: 'post',
      success: function()
      {
        resolve();
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
        resolve();
      }
    });
  });
}


function login() 
{
  $.ajax({
    url: "/signin",
    type: 'post',
    data:{
      username: $("#username").val(), 
      password: $("#password").val()
    },
    dataType: 'json',
    success: function(data)
    {
      window.sessionStorage.setItem("myName", data.username);
      window.sessionStorage.setItem("id", data.userID);
      $("#username").val('');
      $("#password").val('');
      window.location.href = 'main.html';
    },
    error: function(response) 
    {
      console.clear();
      $("#username").val('');
      $("#password").val('');
      alertERROR(response.responseText);
    }
  });
}

function createAccount() 
{
  if(document.getElementById("signupUsername").value.length > 14)
  {
    alertERROR("Nazwa użytkownika jest za długa.\nMaksymalna długość to 14 znaków");
    $("#signupPassword").val('');
  }
  else
  {
    const packet = {username: $("#signupUsername").val(), password: $("#signupPassword").val()};
    $.post("/signup", packet, function(data) 
    {
      if(data.exit_code === 0) 
      {
        alertOK("Utworzono konto");
        $("#signupUsername").val('');
        $("#signupPassword").val('');
      }
      else if(data.exit_code === 1) 
      {
        alertERROR("Nie wszystkie pola są wypełnione"); 
      }
      else if(data.exit_code === 2) 
      {
        alertERROR("Podana nazwa jest już zajęta");
        $("#signupUsername").val('');
        $("#signupPassword").val('');
      }
      else 
      {
        alertERROR("Wystąpił problem z rejestracją.\nKod błędu: " + data.exit_code);
        $("#signupUsername").val('');
        $("#signupPassword").val('');
      }
    });
  }
}

function start()
{
  checkIfSignedIn();
}

start();

$(document).ready(function() 
{
	setTimeout(function()
  {
    $('#pageContent').fadeIn(1000);
	});
});