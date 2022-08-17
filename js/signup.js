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

function createAccount() 
{
  const packet = {username: document.getElementById("username").value, password: document.getElementById("password").value};
  $.post("/signup", packet, function(data) 
  {
      if(data.exit_code === 0) 
      {
        alertOK("Utworzono konto");
        $("#username").val('');
        $("#password").val('');
      }
      else if(data.exit_code === 1) 
      {
        alertERROR("Nie wszystkie pola są wypełnione"); 
      }
      else if(data.exit_code === 2) 
      {
        alertERROR("Podana nazwa jest już zajęta");
        $("#username").val('');
        $("#password").val('');
      }
      else 
      {
        alertERROR("Wystąpił problem z rejestracją.\nKod błędu: " + data.exit_code);
        $("#username").val('');
        $("#password").val('');
      }
  });
}