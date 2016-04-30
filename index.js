
var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

app.use(express.static("./exposed/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)

var wss = new WebSocketServer({server: server})


var winner = -1;
var racelength = 20;
var currentRound = "Round 1";
var numberOfRounds = 0;

function buildBoat(boatName, distance){
	var boatStatus = {
        	boatName: "Not Named",
        	distance: 0,
        	finished: false,
        	jokerPlayed: false,
        	totalDistance: 0,
        	winCount: 0
	};
	var returnS = boatStatus;
	returnS.boatName = boatName;
	returnS.distance = distance;
	return returnS;
}


var boats = [buildBoat("Team 1", 0),buildBoat("Team 2", 0),buildBoat("Team 3", 0),buildBoat("Team 4", 0),buildBoat("Team 5", 0),buildBoat("Team 6", 0),buildBoat("Team 7", 0),buildBoat("Team 8", 0)];


wss.on('connection', function connection(ws) {

	ws.send(getBoatsJSON());
	ws.on('message', function incoming(message) {
		var parsedMessage = JSON.parse(message);
		var isPing = false;
		/*
			1 = boat distance
			2 = boat name
			3 = new boat
			4 = reset
			5 = racelength
			*/

		switch (parsedMessage.type) {

		    case 1:
		    	var id = parsedMessage.id;
		    	if(!boats[id].finished){
				boats[id].distance ++;
				boats[id].totalDistance ++; 
				if(boats[id].distance>=racelength){
					if(winner==-1){
						winner = id;
					}
					boats[id].finished = true;

				} 
			}
			break;
		    case 2:
		    	if(parsedMessage.boatName==""){
		    		if(winner==-1){
					boats.splice(parsedMessage.id, 1);
				} 
			} else {
				boats[parsedMessage.id].boatName = parsedMessage.boatName;
			}
			break;
		    case 3:
			boats.push(buildBoat("No Name",0));
			break;
		    case 4:
			newRound();
			break;
		    case 5: //There is a bug whereby the win event is not triggered if the distance is shortened, but who cares?
		    	if(winner==-1){
				racelength = parsedMessage.maxlength;
			}
			break;
		    case 6:
		    	var id = parsedMessage.id;
		    	if(!boats[id].finished&!boats[id].jokerPlayed){
				boats[id].totalDistance += boats[id].distance;
				boats[id].distance = boats[id].distance * 2;
				boats[id].jokerPlayed = true;
				if(boats[id].distance>=racelength){
					if(winner==-1){
						winner = id;
					}
					boats[id].finished = true;
					boats[id].distance = racelength;
				} 
			}

			break;
		    case 7:
		    	currentRound = parsedMessage.currentRound;
			break;
		    case 8:
			reset();
			break;
		    case 100:
			break;
		    case 200:
			isPing = true;
			break;
		    default:
		    	break;
		}

		if(!isPing){
			sendRepeat(); //Update Everywhere
		}
  	});



});


function reset(){
	for (var i = 0; i < boats.length; i++) {
	    boats[i].distance = 0;
            boats[i].boatName = "Not Named";
	    boats[i].finished = false;
	    boats[i].jokerPlayed = false;
	    boats[i].totalDistance = 0;
	    boats[i].winCount = 0;
	}
	winner = -1;
	racelength = 20;
	currentRound = "Round 1";
	numberOfRounds = 0;
}

function newRound(){
	for (var i = 0; i < boats.length; i++) {
	    boats[i].distance = 0;
            boats[i].finished =  false;
	    if(winner==i){
		boats[i].winCount ++;
	    }
	}
	numberOfRounds ++;
	winner = -1;
}
function getBoatsJSON(){
	var obj = new Object();
	obj.boats = boats;
	obj.racelength = racelength;
	obj.winner=winner;
	obj.currentRound=currentRound;
	obj.numberOfRounds=numberOfRounds;
	return JSON.stringify(obj);
}

function sendRepeat() {
	wss.clients.forEach(function each(client) {
	    //console.log(getBoatsJSON());
	    client.send(getBoatsJSON());
	});
}
