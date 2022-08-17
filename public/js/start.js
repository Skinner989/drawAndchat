window.localStorage.setItem("logged", 0);

function hideAlert()
{
	$("#alert")[0].style.display = "none";
	$("#alert_ok")[0].style.display = "none";
	$("#alert_error")[0].style.display = "none";
}

function alertOK(tresc)
{
	hideAlert();
	$("#alert").show().delay(5000).fadeOut('slow');
	$("#alert_ok").show();
	$("#trescAlertu_Ok").html(tresc);
}

function alertERROR(tresc)
{
	hideAlert();
	$("#alert").show().delay(5000).fadeOut('slow');
	$("#alert_error").show();
	$("#trescAlertu_Error").html(tresc);
}

function logowanie()
{
  const packet = {username: document.getElementById("nazwa").value, password: document.getElementById("haslo").value};
  $.post("/signin", packet, function(data)
  {
      if(data.exit_code === 0)
      {
        window.localStorage.setItem("id", data.packet.userID);
        window.localStorage.setItem("logged", 1);
        $("#nazwa").val('');
        $("#haslo").val('');
        window.location.href = 'main.html';
      }
      else if((data.exit_code === 1) || (data.exit_code === 2) || (data.exit_code === 3))
      {
        let tresc = "Podane dane są nieprawidłowe";
        alertERROR(tresc);
        $("#nazwa").val('');
        $("#haslo").val('');
      }
      else
      {
        let tresc = "Błąd logowania";
        alertERROR(tresc);
      }
  });
}