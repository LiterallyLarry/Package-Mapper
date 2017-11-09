var http = require('http');
var querystring = require("querystring");
var xml2js = require('xml2js');
var config = require('./config.json');
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var geocoder = require('geocoder');

var USPS_API_URL = "http://production.shippingapis.com/ShippingAPI.dll?API=TrackV2";
var usps_api_key = config.usps_api_key;
var numbers_list = config.tracking_numbers;
var geoapikey = config.google_maps_api_key;

var map, log, log2, gauge, clock, genkai;
var screen = blessed.screen();
var grid = new contrib.grid({rows: 8, cols: 8, screen: screen});
var log1_pos = 0;
var log2_pos = 0;
var working = {};
var colors = [ "yellow", "cyan", "magenta", "red", "blue"];
var ready = true;

if (usps_api_key == null || usps_api_key.length == 0) {
    console.log('error: Missing USPS API key (usps_api_key) in config.json!');
    ready = false;
}

if (geoapikey == null || geoapikey.length == 0) {
    console.log('error: Missing Google Maps API key (google_maps_api_key) in config.json!');
    ready = false;
}

if (numbers_list == null || numbers_list.length == 0) {
    console.log('error: Missing tracking numbers (tracking_numbers) in config.json!');
    ready = false;
}
else {
    for (number in numbers_list) {
        if (numbers_list[number].length == 0) {
            console.log('error: Empty tracking number found in config.json!');
            ready = false;
        }
    }
}

if (!ready) {
    console.log('Configuration is invalid, program will now exit.');
    process.exit();
}

function getDateTime(mode) {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
	switch (mode) {
		case 0:
			return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;
			break;
		case 1:
			return hour + ":" + min + ":" + sec;
			break;
		default:
			return date.getTime();
	}
    
}

function reengage() {
	map = grid.set(0, 0, 5, 5, contrib.map, {label: 'USPS Tracking World Map'});
	log = grid.set(5, 0, 3, 8, contrib.log, { fg: "green", selectedUnderline: true, tags: true, label: 'Tracking Information'});
	log2 = grid.set(2, 5, 3, 3, contrib.log, { fg: "green", selectedUnderline: true, tags: true, label: 'Location Aggregator'});
	gauge = grid.set(1, 5, 1, 3, contrib.gauge, {label: 'Last Update Was On '+getDateTime(0)+'', stroke: 'green', fill: 'white'});
	gauge.setPercent(0);
	clock = grid.set(0, 5, 1, 3, contrib.lcd, {segmentWidth: 0.01 , segmentInterval: 0.11 , strokeWidth: 0.11 , elements: 8 , display: "00:00:00" , elementSpacing: 0 , elementPadding: 2 , color: 'cyan' , label: 'Current Time'});
	clock.setDisplay(getDateTime(1));
	genkai = getDateTime(2) + 3600000;
	screen.render();
}

reengage();

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        return process.exit(0);
});

var xml = "<TrackRequest USERID=\""+usps_api_key+"\">";

for (var track_id in numbers_list) {
	xml += "<TrackID ID=\""+numbers_list[track_id]+"\"></TrackID>";
}

xml += "</TrackRequest>";

var xml_request = encodeURI(xml);

var log_step = [];
var city_step = [];
var geocounter = 0;

function getXML() {
	var url = USPS_API_URL+"&XML="+xml_request;
	http.get(url, function(res){
		var str = '';
		res.on('data', function (chunk) {
			   str += chunk;
		 });
		res.on('end', function () {
			parseXML(str);
		});
	});
}

function parseXML(data) {
	var parser = new xml2js.Parser();
	parser.parseString(data, function (err, result) {
		parseTrackingObject(result);
    });
}

function regex_city(string){
	var regexes = [ /Your item has left our acceptance facility .* in (.*)\./g , /Your item .* at our (.*?) origin .*/g , /Your item .* in (.*?) (?:at|on) .*/g , /Your item .* in (.*?)\./g , /Your item was .* in (.*?). This does not .*/g , /Your item was delivered .* in (.*) to .*/g , /Your item was .* in (.*) .*/g , /Your item departed .* in (.*) on .*/g , /Your item arrived .* our (.*) destination .*/g , /Your item arrived at the Post Office .* in (.*)./g , /Accepted at USPS Destination Facility, .*m, (.*)/g , /(?:Picked|Shipping|Processed|Acceptance|Arrived|Available).*m, (.*)/g , /A shipping .* in (.*)\. .*/g];
	for (var regex in regexes) {
		var match = regexes[regex].exec(string);
		if (match) {
			return match[1];
		}
	}
	return "";
}

function parseTrackingObject(object) {
	log_step = [];
	city_step = [];
	if (object["TrackResponse"]) {
	var count = -1;
	for (var track_1 in object) {
		for (var track_2 in object[track_1]) {
			for (var track_3 in object[track_1][track_2]) {
				var trackid;
				for (var track_4 in object[track_1][track_2][track_3]) {
					if (track_4 == "$") {
						count += 1;
						// only one item, ID
						for (var track_5 in object[track_1][track_2][track_3][track_4]) {
							trackid = object[track_1][track_2][track_3][track_4][track_5];
							log_step[trackid] = [];
							city_step[trackid] = [];
						}
					}
					else if (track_4 == "TrackSummary") {
						// only one item, TrackSummary
						for (var track_5 in object[track_1][track_2][track_3][track_4]) {
							var summary = object[track_1][track_2][track_3][track_4][track_5];
							log_step[trackid].push("{"+colors[count]+"-fg}   "+summary+"{/"+colors[count]+"-fg}");
							var city = regex_city(summary);
							if (city) {
							city_step[trackid].push([city,[]]);
							}
						}
					}
					else if (track_4 == "TrackDetail") {
						// multiple items, TrackDetail
						for (var track_5 in object[track_1][track_2][track_3][track_4]) {
							var detail = object[track_1][track_2][track_3][track_4][track_5];
							log_step[trackid].push("{white-fg}    *** "+detail+"{/white-fg}");
							var city = regex_city(detail);
							if (city) {
                                city_step[trackid].push([city,[]]);
							}
						}
					}
					city_step[trackid].reverse();
				}
			}
		}
	}
	nextLevel();
	}
	else {
		//log.log("Unknown object!");
	}
}

function geocity(city,retry) {
	var realname = city[0];
	var name = realname;
	if (name.startsWith("ISC")) {
		name = "New York";
	}
	else if (name.startsWith("TOKYO")) {
		name = "Tokyo";
	}
	geocoder.geocode(name, function ( err, data ) {
        var cancelPhase = false;
		if (data["results"].length > 0) {
		var lat = data["results"][0]["geometry"]["location"]["lat"];
		var lng = data["results"][0]["geometry"]["location"]["lng"];
			if (lat && lng && city[1].length == 0) {
				city[1] = [lat, lng];
			}
			else {
				console.dir(data);
			}
			delete working[realname];
		}
		else if (data["status"] == "OVER_QUERY_LIMIT") {
			console.log("warning: Google API ratelimit!");
            cancelPhase = true;
			setTimeout(geocity, 3000, city, true);
		}
		else if (data["status"] == "ZERO_RESULTS") {
			delete working[realname];
		}
		else {
			console.log("error: "+realname);
			console.dir(data);
			delete working[realname];
		}
		if ( Object.keys(working).length == 0 && !cancelPhase ) {
			phaseTwo();
		}
	}, geoapikey);
}

function nextLevel() {
	var pseudocounter = 0;
	var timeout = 100;
	geocounter = 0;
	for (var tracking in city_step) {
		for (var city in city_step[tracking]) {
			pseudocounter += 1;
			if (pseudocounter > 10) {
				timeout = Math.floor(pseudocounter/10) * 3000;
			}
			working[city_step[tracking][city][0]] = true;
			setTimeout(geocity, timeout, city_step[tracking][city], false);
		}
	}
    if (pseudocounter == 0) {
        phaseTwo();
    }
}

var mapat = -1;
var lead = true;
var pause = false;

function mapstep(maparray) {
	var max = maparray.length;
	map.clearMarkers();
	if (pause) {
		pause = false;
	}
	else if (mapat < -1) {
		for (var item in maparray) {
			map.addMarker({"lon" : maparray[item][1], "lat" : maparray[item][2], color: maparray[item][3], char: maparray[item][0] });
		}
		mapat += 1;
	}
	else if (mapat == -1 || mapat == max) {
		mapat += 1;
	}
	else if (mapat >= max) {
		for (var item in maparray) {
			map.addMarker({"lon" : maparray[item][1], "lat" : maparray[item][2], color: maparray[item][3], char: "X" });
		}
		mapat = -1;
	}
	else {
		if (lead) {
			var item = maparray[mapat];
			map.addMarker({"lon" : item[1], "lat" : item[2], color: item[3], char: "X" });
			lead = false;
		}
		else {
			var item = maparray[mapat];
			map.addMarker({"lon" : item[1], "lat" : item[2], color: item[3], char: item[0] });
			lead = true;
			mapat += 1;
		}
	}
}

function round(number,decimals) {
	return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
}

var count_start = false;
var count_stat = 0;

function refreshCountdown() {
	if (count_start) {
		count_stat++;
		if (count_stat >= 2) {
			log.interactive = false;
			log2.interactive = false;
			count_start = false;
			count_stat = 0;
		}
	}
	else if (log.interactive) {
		count_start = true;
	}
	else if (log2.interactive) {
		count_start = true;
	}
	var current = getDateTime(2);
	var percent = (current-genkai+3600000)/3600000;
	percent = percent.toFixed(4);
	gauge.setPercent(percent);
	clock.setDisplay(getDateTime(1));
	mapstep(maparray);
	screen.render();
	if (current > genkai) {
	reengage();
	getXML();
	}
	else {
	setTimeout(refreshCountdown, 1000);
	}
}

var maparray = [];

function phaseTwo() {
	maparray = [];
	var count = 0;
	var countid = 1;
	for (var tracking in city_step) {
		log2.log("Package #"+countid+":");
		var current_city_name = "N/A";
		var current_city_location = [];
		for (var city in city_step[tracking]) {
			if (current_city_name != city_step[tracking][city][0]) {
				log2.log("{"+colors[count]+"-fg} *** "+city_step[tracking][city][0]+" : "+city_step[tracking][city][1]+"{/"+colors[count]+"-fg}");
			}
			current_city_name = city_step[tracking][city][0];
			current_city_location = city_step[tracking][city][1];
		}
		if (current_city_location.length > 0) {
		maparray.push([tracking,current_city_location[1],current_city_location[0],colors[count]]);
		log2.log("{white-fg} --> Your package is currently at "+current_city_name+"{/white-fg}");
		}
		else {
		log2.log("{white-fg} --> Your package location is currently unknown.{/white-fg}");
		}
		log2.log("{"+colors[count]+"-fg}{/"+colors[count]+"-fg}");
		count += 1;
		countid += 1;
	}
	var counter = 0;
	var countid = 1;
	for (var logg in log_step) {
		log.log("Package #"+countid+":");
		for (var item in log_step[logg]) {
			log.log(log_step[logg][item]);
		}
		log.log("");
		countid += 1;
	}
	log1_pos = log.logLines.length;
	log2_pos = log2.logLines.length;
	log.select(log1_pos);
	log2.select(log2_pos);
	screen.render();
	log.focus();
	refreshCountdown(maparray);
}

getXML();

screen.key(['down'], function(ch, key) {
    log.interactive = true;
    count_stat = 0;
    log1_pos = log1_pos + 1;
    if (log1_pos > log.logLines.length) {
        log1_pos = 0;
    }
    log.scrollTo(log1_pos);
    log.select(log1_pos);
    log2.select(log2_pos);
});
screen.key(['up'], function(ch, key) {
    log.interactive = true;
    count_stat = 0;
    log1_pos = log1_pos - 1;
    if (log1_pos < 0) {
        log1_pos = log.logLines.length;
    }
    log.scrollTo(log1_pos);
    log.select(log1_pos);
});
screen.key(['left'], function(ch, key) {
    log2.interactive = true;
    count_stat = 0;
    log2_pos = log2_pos - 1;
    if (log2_pos < 0) {
        log2_pos = log2.logLines.length;
    }
    log2.scrollTo(log2_pos);
    log2.select(log2_pos);
});
screen.key(['right'], function(ch, key) {
	log2.interactive = true;
    count_stat = 0;
    log2_pos = log2_pos + 1;
    if (log2_pos > log2.logLines.length) {
        log2_pos = 0;
    }
    log2.scrollTo(log2_pos);
    log2.select(log2_pos);
});
