$(document).ready(function(){
	
        $.ajax({
	        url: "formulario.php",
			success: function(datos){
	       		alert( "Se guardaron los datos: " + datos);
	        },
        });
});
