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

    var zindex = 1000;
    var highlighted = null;

    var markers = {};

    var icon = new google.maps.MarkerImage('img/tweet_s.png')
    var icon_highlight = new google.maps.MarkerImage('img/tweet_highlight_s.png')

    function highlight(tweetId, scrollTo){
        if(scrollTo === undefined)
            scrollTo = true;

        return function() {
            $('.highlight').each(function(){
                $(this).removeClass('highlight');
            });
            $('#' + tweetId).addClass('highlight');
            if(scrollTo)
                $(window).scrollTop($('#' + tweetId).offset().top);

            if(highlighted !== null){
                markers[highlighted].setIcon(icon);
            }

            markers[tweetId].setZIndex(zindex++);
            markers[tweetId].setIcon(icon_highlight);
            highlighted = tweetId;
            
        }
    }


    function searchTwitter(radius){
        // TODO use streaming api as it's geo results can be filtered better.
        //      no client side js support though

        for(var key in markers){
            markers[key].setMap(null);
        }
        markers = {};

        var twitterSearchURL = 'http://search.twitter.com/search.json?callback=?';
        var geocode = position.coords.latitude 
                + "," + position.coords.longitude 
                + "," + (radius / 1000) + "km"; 
        
        params = {
            geocode: geocode
           ,include_entities: true
           ,result_type: 'recent'
           ,rpp: 100
        }

        $.getJSON(twitterSearchURL, params, function(data){
            var tweets = $("<ul class='unstyled' />");
            var tweetsNoGeo = $("<ul class='unstyled' />");
            var latlngs = []
            for (var i = 0; i < data.results.length; i++){
                var tweet = data.results[i];
                var time = prettyDate(tweet.created_at);
                var text = twttr.txt.autoLink(tweet.text, {
                    urlEntities: tweet.entities.urls 
                });
                var link = 'https://twitter.com/' + tweet.from_user + '/status/' + tweet.id_str;

                var tweetData = {
                    text: text
                   ,handle: tweet.from_user
                   ,time: time
                   ,id: i
                   ,permalink: link
                }

                if(tweet.geo){
                    console.log(tweet);
                    var lat = tweet.geo.coordinates[0];
                    var lon = tweet.geo.coordinates[1];
                    var tweetPosition = new LatLon(lat, lon);
                    var distance = userPosition.distanceTo(tweetPosition);
                    distance = parseFloat(distance).toFixed(2);

                    tweetData['distance'] = distance;
                    tweetData['lat'] = lat;
                    tweetData['lon'] = lon
                    tweetData['location'] = true

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
                    markers[i] = tweetMarker;

                    google.maps.event.addListener(tweetMarker, 'click', 
                            highlight(i));
                } else {
                    var rendered = ich.tweet(tweetData)
                    tweetsNoGeo.append(rendered);
                }
            }
            console.log(markers);

            $('#tweets').empty();
            $('#tweets').append(tweets);
            $('#tweets-no-geo').empty();
            $('#tweets-no-geo').append(tweetsNoGeo);

            var latlngbounds = new google.maps.LatLngBounds();
            for (var i = 0; i < latlngs.length; i++){
                latlngbounds.extend(latlngs[i]);
            }

            map.fitBounds(latlngbounds);

            $('.maplink').on('click', function(){
                window.scrollTo(0,$('#map').offset().top - 20);
                var that = this;
                (function(){
                    var lat = ($(that).attr('lat'));
                    var lon = ($(that).attr('lon'));
                    var latlng = new google.maps.LatLng(lat, lon);

                    map.setCenter(latlng);
                    map.setZoom(15);

                    highlight($(that).attr('tweetid'), false)();

                })();

                return false;
            });
            $('.mute').on('click', function(){
                var that = this;
                (function(){
                    var handle = $(that).attr('handle');
                    var rule = '.' + handle + '{ display: none }';
                    $("<style type='text/css'>" + rule + "</style>").appendTo("head");
                })();
                return false;
            });
        });
    }

    var radius = 600;
    function changeRadius(positive){
        if(positive){
            if(radius >= 1000){
                radius += 1000;
            } else {
                radius += 100;
            }
        } else {
            if(radius > 1000){
                radius -= 1000;
            } else if(radius > 100){
                radius -= 100
            }
        }
        text = "";
        if(radius >= 1000){
            text = parseInt(radius / 1000) + " km";
        } else {
            text = radius + " m";
        }

        $('#radius-feedback').text(text);
        searchTwitter(radius);
    }
    changeRadius(false);

    $('#radius-increase').on("click", function(){
        changeRadius(true);
    });
    $('#radius-decrease').on("click", function(){
        changeRadius(false);
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
