HTML=index.html about.html
CSS=hexreplay.css
JS=hexreplay.js
IMAGES=images/buttons.svg images/favicon.ico

UGLIFY=uglifyjs -c --mangle-props -m toplevel

deploy: 
	cp -f $(HTML) $(CSS) www/
	$(UGLIFY) hexreplay.js > www/hexreplay.js
	cp -f $(IMAGES) www/images/
	chmod -R a+rX www/
	chmod -R a-w www/*.html www/*.css www/*.js

deploy-clear:
	cp -f $(HTML) $(CSS) $(JS) www/
	cp -f $(IMAGES) www/images/
	chmod -R a+rX www/
	chmod -R a-w www/*.html www/*.css www/*.js

testing:
	cp -f $(HTML) $(CSS) www-testing/
	rm -f www-testing/hexreplay.js
	$(UGLIFY) hexreplay.js > www-testing/hexreplay.js
	cp -f $(IMAGES) www-testing/images/
	chmod -R a+rX www-testing/
	chmod -R a-w www-testing/*.html www-testing/*.css www-testing/*.js

testing-clear:
	cp -f $(HTML) $(CSS) $(JS) www-testing/
	cp -f $(IMAGES) www-testing/images/
	chmod -R a+rX www-testing/
	chmod -R a-w www-testing/*.html www-testing/*.css www-testing/*.js

