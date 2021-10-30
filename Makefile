deploy:
	cp -f index.html hexreplay.js hexreplay.css www/
	cp -f images/buttons.svg images/favicon.ico www/images/
	chmod -R a+rX www 
