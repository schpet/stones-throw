.PHONY: build

build:
	# WACKY
	( echo "---" && echo "production: true" && echo 'tweet: |' && cat tweet.mustache && echo "---" ) | mustache - stones-throw.mustache > index.html
	( echo "---" && echo 'tweet: |' && cat tweet.mustache && echo "---" ) | mustache - stones-throw.mustache > dev.html
	cat js/* > build/js/combined.js
	uglifyjs build/js/combined.js > build/js/combined.min.js
	recess --compile less/style.less > build/css/style.css
	recess --compress less/style.less > build/css/style.min.css

test:
	# todo: make some tests
	jshint js/app.js --config js/.jshintrc

