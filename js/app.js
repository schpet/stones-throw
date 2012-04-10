/*
 * This code is quite ugly. I hastily piled it on top of itself
 * much like stacking a deck of cards. It was fun though.
 *
 */


var markers = {};
var zindex = 1000;
var highlighted = undefined;
var icon = new google.maps.MarkerImage('img/tweet.png')
var icon_highlight = new google.maps.MarkerImage('img/tweet_highlight.png')
var map;
var position;
var userPosition;
var oldest_id = undefined;

function highlight(tweetId, source, scrollTo){
    if(scrollTo === undefined)
        scrollTo = true;

    return function() {
        $('.highlight').each(function(){
            $(this).removeClass('highlight');
        });
        $('#' + tweetId).addClass('highlight');

        if(scrollTo)
            $(window).scrollTop($('#' + tweetId).offset().top);

        if(highlighted){
            markers[highlighted].setIcon(icon);
        }

        markers[tweetId].setZIndex(zindex++);
        markers[tweetId].setIcon(icon_highlight);

        highlighted = tweetId;

        _gaq.push(['_trackEvent', 'stones throw', 'user', source ]);
    }
}

function searchTwitter(since_id){

    for(var key in markers){
        markers[key].setMap(null);
    }

    markers = {};

    var twitterSearchURL = 'http://search.twitter.com/search.json';

    twitterSearchURL += "?callback=?";

    var geocode = position.coords.latitude 
            + "," + position.coords.longitude 
            + "," + (radius / 1000) + "km"; 

    params = {
        geocode: geocode
       ,include_entities: true
       ,result_type: 'recent'
       ,rpp: 100
    }

    if(since_id){
        params['since_id'] = since_id;
    }

    $.getJSON(twitterSearchURL, params, function(data){
        var tweets = $("<ul class='unstyled' />");
        var tweetsNoGeo = $("<ul class='unstyled' />");
        var latlngs = [];
        
        for (var i = 0; i < data.results.length; i++){
            var tweet = data.results[i];

            var date = new Date((tweet.created_at || "").replace(/-/g,"/")
                    .replace(/[TZ]/g," ")),
                diff = (((new Date()).getTime() - date.getTime()) / 1000),
                day_old = (diff > 86400);

            if(day_old){
                continue;
            }

            oldest_id = tweet.id_str;

            var time = prettyDate(tweet.created_at);
            var text = twttr.txt.autoLink(tweet.text, {
                urlEntities: tweet.entities.urls
               ,target: "_blank" 
            });
            var link = 'https://twitter.com/' + tweet.from_user + '/status/' + tweet.id_str;

            // If the date is older than yesterday, chuck it
            // set the since_id on each tweet that is 

            var tweetData = {
                text: text
               ,handle: tweet.from_user
               ,time: time
               ,id: i
               ,permalink: link
            }

            if(tweet.geo){
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

                google.maps.event.addListener(tweetMarker, 'click', highlight(i, 'map'));
            } else {
                var rendered = ich.tweet(tweetData)
                tweetsNoGeo.append(rendered);
            }
        }

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
            try {
                window.scrollTo(0,$('#map').offset().top - 20);
                var that = this;
                (function(){
                    var lat = ($(that).attr('lat'));
                    var lon = ($(that).attr('lon'));
                    var latlng = new google.maps.LatLng(lat, lon);

                    map.setCenter(latlng);
                    map.setZoom(15);

                    highlight($(that).attr('tweetid'), 'button click', false)();

                })();
            } catch(e){
                $('#error').text('erk something is borked :-(');
                console.log(e);
            } finally {
                return false;
            }
        });
        $('.mute').on('click', function(){
            var that = this;
            (function(){
                var handle = $(that).attr('handle');
                var rule = '.' + handle + '{ display: none }';
                $("<style type='text/css'>" + rule + "</style>").appendTo("head");
            })();
            _gaq.push(['_trackEvent', 'stones throw', 'user', 'mute']);
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
    searchTwitter();
}

function refresh(){
    searchTwitter(oldest_id);
}


function success(the_position) {
    _gaq.push(['_trackEvent', 'stones throw', 'geolocation', 'success']);

    position = the_position;

    $('.nogeo').hide();
    $('.geo').show();

    // via html5demos.com/geo
    var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    userPosition = new LatLon(position.coords.latitude, position.coords.longitude);

    var myOptions = {
        zoom: 13,
        center: latlng,
        mapTypeControl: false,
        navigationControlOptions: {style: google.maps.NavigationControlStyle.SMALL},
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map($("#map").get(0), myOptions);
    var marker = new google.maps.Marker({
        position: latlng 
       ,map: map
       ,title:"Your location, within " + position.coords.accuracy + " meters"
       ,zIndex: 1000
    });
    changeRadius(false);

    _gaq.push(['_trackEvent', 'stones throw', 'geolocation', 'accuracy', position.coords.accuracy]);

}

function error(msg) {
    _gaq.push(['_trackEvent', 'stones throw', 'geolocation', 'error', msg]);
}



if (navigator.geolocation) {
    //_trackEvent(category, action, opt_label, opt_value, opt_noninteraction)
    navigator.geolocation.getCurrentPosition(success, error);
} else {
    _gaq.push(['_trackEvent', 'stones throw', 'geolocation', 'not supported']);
}

$('#radius-increase').on("click", function(){
    changeRadius(true);
});
$('#radius-decrease').on("click", function(){
    changeRadius(false);
});
$('#refresh').on("click", function(){
    refresh();
});
