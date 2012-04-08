function success(position) {
    // via html5demos.com/geo
    var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    var userPosition = new LatLon(position.coords.latitude, position.coords.longitude);

    var myOptions = {
        zoom: 13,
        center: latlng,
        mapTypeControl: false,
        navigationControlOptions: {style: google.maps.NavigationControlStyle.SMALL},
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    var map = new google.maps.Map($("#map").get(0), myOptions);
    var marker = new google.maps.Marker({
        position: latlng 
       ,map: map
       ,title:"Your location, within " + position.coords.accuracy + " meters"
    });

    function highlight(selector, scrollTo){
        if(scrollTo === undefined)
            scrollTo = true;

        return function() {
            $('.highlight').each(function(){
                $(this).removeClass('highlight');
            });
            $(selector).addClass('highlight');
            if(scrollTo)
                $(window).scrollTop($(selector).offset().top);
        }
    }

    // TODO use streaming api as it's geo results can be filtered better.
    //      no client side js support though
    var twitterSearchURL = 'http://search.twitter.com/search.json?callback=?';
    var geocode = position.coords.latitude 
            + "," + position.coords.longitude 
            + ",1km"; 

    params = {
        geocode: geocode
       ,include_entities: true
    }

    $.getJSON(twitterSearchURL, params, function(data){
        var tweets = $("<ul class='unstyled' />");
        var tweetsNoGeo = $("<ul class='unstyled' />");
        var icon = new google.maps.MarkerImage('img/tweet.png')
        var latlngs = []
        for (var i = 0; i < data.results.length; i++){
            var tweet = data.results[i];
            var time = prettyDate(tweet.created_at);
            var text = twttr.txt.autoLink(tweet.text, {
                urlEntities: tweet.entities.urls 
            });

            if(tweet.geo){
                console.log(tweet);
                var lat = tweet.geo.coordinates[0];
                var lon = tweet.geo.coordinates[1];
                var tweetPosition = new LatLon(lat, lon);
                var distance = userPosition.distanceTo(tweetPosition);
                distance = parseFloat(distance).toFixed(2);

                var tweetData = {
                    distance:  distance
                   ,text: text
                   ,handle: tweet.from_user
                   ,time: time
                   ,lat: lat
                   ,lon: lon
                   ,id: i
                   ,location: true
                }

                var rendered = ich.tweet(tweetData)
                tweets.append(rendered);

                // G Maps marker
                var latlng = new google.maps.LatLng(lat, lon);
                latlngs.push(latlng);
                var tweetMarker = new google.maps.Marker({
                    title: tweet.text
                   ,map: map
                   ,position: latlng
                   ,icon: icon 
                });

                google.maps.event.addListener(tweetMarker, 'click', 
                        highlight('#' + i));
            } else {
                var tweetData = {
                    text: text
                   ,handle: tweet.from_user
                   ,time: time
                   ,id: i
                }
                var rendered = ich.tweet(tweetData)
                tweetsNoGeo.append(rendered);
            }
        }

        $('#tweets').append(tweets);
        $('#tweets-no-geo').append(tweetsNoGeo);

        var latlngbounds = new google.maps.LatLngBounds();
        for (var i = 0; i < latlngs.length; i++){
            latlngbounds.extend(latlngs[i]);
        }

        map.fitBounds(latlngbounds);

        $('.maplink').on('click', function(){
            window.scrollTo(0,0);
            var that = this;
            (function(){
                var lat = ($(that).attr('lat'));
                var lon = ($(that).attr('lon'));
                var latlng = new google.maps.LatLng(lat, lon);

                map.setCenter(latlng);
                map.setZoom(15);

                console.log('#' + $(that).attr('tweetid'));
                highlight('#' + $(that).attr('tweetid'), false)();
            })();

            return false;
        });
    });
}

function error(msg) {
    alert(msg);
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
} else {
    alert('not supported, dang');
}
