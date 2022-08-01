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

function utworzKonto()
{
  const packet = {Nazwa: document.getElementById("nazwa").value, Haslo: document.getElementById("haslo").value};
  $.post("/rejestracja", packet, function(data)
  {
      if(data.exit_code === 0)
      {
        let tresc = "Utworzono konto";
        alertOK(tresc);
        $("#nazwa").val('');
        $("#haslo").val('');
      }
      else if(data.exit_code === 1)
      {
        let tresc = "Nie wszystkie pola są wypełnione";
        alertERROR(tresc);
      }
      else if(data.exit_code === 2)
      {
        let tresc = "Podana nazwa jest już zajęta";
        alertERROR(tresc);
        $("#nazwa").val('');
        $("#haslo").val('');
      }
      else
      {
        let tresc = "Wystąpił problem z rejestracją.\nKod błędu: " + data.exit_code;
        alertERROR(tresc);
        $("#nazwa").val('');
        $("#haslo").val('');
      }
  });
}