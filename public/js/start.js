window.sessionStorage.setItem("logged", 0);

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
      window.sessionStorage.setItem("refreshToken", data.refreshToken);
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

$(document).ready(function() 
{
	setTimeout(function()
  {
    $('#pageContent').fadeIn(1000);
	});
});