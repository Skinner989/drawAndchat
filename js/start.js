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

function login() 
{
  const packet = {username: document.getElementById("username").value, password: document.getElementById("password").value};
  $.post("/signin", packet, function(data) 
  {
      if(data.exit_code === 0) 
      {
        window.sessionStorage.setItem("id", data.packet.userID);
        window.sessionStorage.setItem("logged", 1);
        window.localStorage.setItem("test2", 0);
        $("#username").val('');
        $("#password").val('');
        window.location.href = 'main.html';
      }
      else if((data.exit_code === 1) || (data.exit_code === 2) || (data.exit_code === 3)) 
      {
        alertERROR("Podane dane są nieprawidłowe");
        $("#username").val('');
        $("#password").val('');
      }
      else 
      {
        alertERROR("Błąd logowania");
      }
  });
}