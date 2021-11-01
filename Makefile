deploy: hexreplay-mangled.js dummy
	cp -f index.html about.html hexreplay.css www/
	cp -f hexreplay-mangled.js www/hexreplay.js
	cp -f images/buttons.svg images/favicon.ico www/images/
	chmod -R a+rX www 

deploy-clear: dummy
	cp -f index.html about.html hexreplay.css www/
	cp -f hexreplay.js www/hexreplay.js
	cp -f images/buttons.svg images/favicon.ico www/images/
	chmod -R a+rX www 


hexreplay-mangled.js: hexreplay.js
	uglifyjs -c --mangle-props -m toplevel "$<" > "$@" 

dummy:

clean:
	rm -f hexreplay-mangled.js
