

<html>


<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js"></script>	


<script src="http://localhost:8099/channel/bcsocket.js"></script>
<script src="http://localhost:8099/share/share.js"></script>
<script src="http://localhost:8099/share/textarea.js"></script>
<script src="http://localhost:8099/share/json.js"></script>

<script>
	$(function() {
  // *** Editor window
  var elem = document.getElementById('pad');
  
  var connection = sharejs.open('blag', 'text', 'http://127.0.0.1:8099/channel', function(error, doc) {
  	if (error) {
  		console.log(error);
  	} else {
  		elem.disabled = false;
  		doc.attach_textarea(elem);
  	}
  });
});
</script>

<textarea id="pad" rows="8" disabled>Loading. (Or its probably broken and you should come back later.)</textarea>

</html>
