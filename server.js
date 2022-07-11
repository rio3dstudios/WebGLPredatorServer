/*
*@autor: Rio 3D Studios
*@description:  java script file that works as master server of the PredatorIO Game
*@date: 09/06/2021
*/
var express = require('express'); //import express NodeJS framework module

var app = express(); // create an object of the express module

var http = require('http').Server(app); // create a http web server using the http library

var io = require('socket.io')(http); // import socketio communication module

var shortId 		= require('shortid');

app.use("/public/TemplateData",express.static(__dirname + "/public/TemplateData"));

app.use("/public/Build",express.static(__dirname + "/public/Build"));

app.use(express.static(__dirname+'/public'));

var sockets = {}; // to storage sockets

var clientLookup = {};

var clients			= [];  // to storage clients

var powerUpSpawnPoints = [];

var powerUpLookup = {};

var leaderboard = [];

var leaderboardChanged = false;

//auxiliary function to sort the best players
function compare(a, b) {
  if (a.kills > b.kills) {
    if(a.isDead)
	{
	  return 1;
	}	
    return -1;
  }
  if (a.kills < b.kills) {
     if(b.isDead)
	{
	  return -1;
	}	
    return 1;
  }
 
  return 0;
}


//open a connection with the specific client
io.on('connection', function(socket){

 console.log('A user ready for connection!');//prints in the  nodeJS console


  var current_player;
 
 //create a callback fuction to listening EmitPing() method in NetworkMannager.cs unity script
  socket.on("PING",function(pack){

   var json_pack = {

     message:"pong!!!"

   };

  socket.emit("PONG",json_pack);


});//END_SOCKET.ON

//create a callback fuction to listening EmitJoin() method in NetworkMannager.cs unity script
socket.on("JOIN_ROOM",function(_pack){

   var pack = JSON.parse(_pack);

  // fills out with the information emitted by the player in the unity
  current_player = {

    name : pack.name,
    id: socket.id,
	avatar: pack.avatar,
	xp:0,
	position:pack.position,
	rotation:'0',
	kills:0,
	isMasterClient:'false',
	isDead:false,
	isMute:false
	
  };
  
  
  console.log("[INFO] player " + current_player.id + ": logged!");
  
  sockets[current_player.id] = socket;//add curent user socket
  
  clientLookup[current_player.id] = current_player;
  
  clients.push(current_player);//add current_player in clients
  
  console.log ("[INFO] Total players: " + Object.keys(clientLookup).length);
  

  socket.emit("JOIN_SUCCESS",current_player.id,current_player.name,current_player.avatar,current_player.isMasterClient);
  

  
    //spawn all connected clients for currentUser client 
     clients.forEach( function(i) {
		    if(i.id!=current_player.id)
			{ 
			   console.log("i.position: "+i.position);
		      //send to the client.js script
		      socket.emit('SPAWN_PLAYER',i.id,i.name,i.avatar,i.position);
			  
		    }//END_IF
	   
	  });//end_forEach
  
  // spawn current_player client on clients in broadcast
  socket.broadcast.emit('SPAWN_PLAYER',current_player.id,current_player.name,current_player.avatar,current_player.position);
  
  //if is master client
  if(Object.keys(clientLookup).length == 1)
  {
  
    current_player.isMasterClient = 'true';// first client to joint to the game
	
	
	powerUpSpawnPoints.splice(0,powerUpSpawnPoints.length); // clear the powerup list
	
	var amount = 100;
	 
	 //spawn 100 power ups in game
	 for (var i = 0; i < 100; i++)
     {
	   var spawnX = (Math.floor(Math.random() * 20) );// choose a  x random position in game
	   var spawnY = (Math.floor(Math.random() * 10) );// choose a  y random position in game
	   
	   var negativeXValue = (Math.floor(Math.random() * 2) ); // choose a negative or positive x position in game
	   
	   if(negativeXValue == 1)
	   {
	     spawnX = -spawnX;
	   }
	   
	   var negativeYValue = (Math.floor(Math.random() * 2) ); // choose a negative or positive y position in game
	   
	   if(negativeYValue == 1)
	   {
	     spawnY = -spawnY;
	   }
	   
	   var powerUpSpawnPoint = {
	     id: shortId.generate(),
		 type: (Math.floor(Math.random() * 4) ),
         posx:spawnX,
         posy:spawnY
       }// creates a spawn point object for power up
 
       powerUpSpawnPoints.push(powerUpSpawnPoint);// add power up on the list
	   
	   powerUpLookup[powerUpSpawnPoint.id] = powerUpSpawnPoint;//add powerUp in search engine
	   
	 }//END_FOR
	 
	 
  }//END_IF
  
  for (var c = 0; c < powerUpSpawnPoints.length; c++)
   {
			   
	  socket.emit('SPAWN_POWERUP', powerUpSpawnPoints[c].id,powerUpSpawnPoints[c].type,powerUpSpawnPoints[c].posx,powerUpSpawnPoints[c].posy); // spawn power up in unity scene
	            
   }//END_FOR
  
});//END_SOCKET.ON


socket.on("RESPAWN",function(_pack){

   var pack = JSON.parse(_pack);
  
  if(current_player)
  {
	  current_player.isDead = false;

	  current_player.avatar = pack.avatar;
	  current_player.position = pack.position;
	  current_player.kills = 0;
		 
	
      socket.emit("JOIN_SUCCESS",current_player.id,current_player.name,current_player.avatar,current_player.isMasterClient);
  
  
      socket.broadcast.emit('SPAWN_PLAYER',current_player.id,current_player.name,current_player.avatar,current_player.position);

      for(client in clientLookup)
      {
         if(clientLookup[client].id!=current_player.id)
         { 
           socket.emit('SPAWN_PLAYER',clientLookup[client].id,clientLookup[client].name,clientLookup[client].avatar,clientLookup[client].position);
         }
    }
	}
	
	for (var c = 0; c < powerUpSpawnPoints.length; c++)
    {
			   
	    socket.emit('SPAWN_POWERUP',powerUpSpawnPoints[c].id,powerUpSpawnPoints[c].type,powerUpSpawnPoints[c].posx,powerUpSpawnPoints[c].posy); // END emit
	            
	 }//END_FOR
		  
		
  
});//END_SOCKET.ON


 socket.on('PICKUP', function(_pack) {
      
	   var pack = JSON.parse(_pack);
	 
	if(current_player)
    {
	   
		if(powerUpLookup[pack.id])
		{
		    current_player.xp +=  3;
			
			
			if(current_player.xp >=100)
			{// evolution
			  
			  //evolution
			  if(current_player.avatar == '0')
			  { //evolution to leon
			    current_player.xp = 0;
				current_player.avatar = '1';
							    
			  }
			  else if( current_player.avatar == '1')
			  { // evolution to crocodille
			    current_player.xp = 0;
				current_player.avatar = '2';
			  }
			  else if( current_player.avatar == '2')
			  { // evolution to crocodille, but player is already a croccodille so do nothing ;)
			    current_player.xp = 0;
				current_player.avatar = '2';
			  }
			   
			   socket.emit('UPDATE_EVOLUTION', current_player.id,current_player.avatar);
                    socket.broadcast.emit('UPDATE_EVOLUTION', current_player.id,current_player.avatar);
			  
			}
			
			delete powerUpLookup[pack.id];// delete power up
			
			
		    for (var i = 0; i < powerUpSpawnPoints.length; i++)
		    {
			    if (powerUpSpawnPoints[i].id == pack.id) 
			    {
					 
                    socket.emit('UPDATE_PICKUP', current_player.id,pack.id);
                    socket.broadcast.emit('UPDATE_PICKUP', current_player.id,pack.id);
				    powerUpSpawnPoints.splice(i,1);// remove powerup from vector

			    };// END_IF
		    };//END_FOR
			
			
			var spawnX = (Math.floor(Math.random() * 20) );
	        var spawnY = (Math.floor(Math.random() * 10) );
	   
	        var negativeXValue = (Math.floor(Math.random() * 2) );
	   
	        if(negativeXValue == 1)
	        {
	          spawnX = -spawnX;
	        }
	   
	        var negativeYValue = (Math.floor(Math.random() * 2) );
	   
	        if(negativeYValue == 1)
	        {
	          spawnY = -spawnY;
	        }
	   
	        var powerUpSpawnPoint = {
	           id: shortId.generate(),
		       type: (Math.floor(Math.random() * 4) ),
               posx:spawnX,
               posy:spawnY
            }
 
            powerUpSpawnPoints.push(powerUpSpawnPoint);
	   
	        powerUpLookup[powerUpSpawnPoint.id] = powerUpSpawnPoint;//add powerUp in search engine
	   
			socket.emit('SPAWN_POWERUP', powerUpSpawnPoint.id,powerUpSpawnPoint.type,powerUpSpawnPoint.posx,powerUpSpawnPoint.posy);// END emit
            socket.broadcast.emit('SPAWN_POWERUP',powerUpSpawnPoint.id,powerUpSpawnPoint.type,powerUpSpawnPoint.posx,powerUpSpawnPoint.posy);			 
				 
			 }	//END_IF
			}//END_IF
			
			
    });

	
	
 socket.on('REGRESSION', function(_pack) {
      
	var _data= JSON.parse(_pack);
	if(current_player)
    {
	 
	    if( current_player.avatar == '1')
		{ // regression form leon to antelope
			current_player.xp = 0;
		    current_player.avatar = '0';
	    }
	    else if( current_player.avatar == '2')
		{ // regression from crocodille to lion
			current_player.xp = 0;
			current_player.avatar = '1';
		}
			  
	    socket.emit('UPDATE_REGRESSION',current_player.id,current_player.avatar);
        socket.broadcast.emit('UPDATE_REGRESSION', current_player.id,current_player.avatar);
			  
	}//END_IF
				
			
    });//END_SOCKET.IO

 
socket.on("POS_AND_ROT",function(_pack){

  if(current_player)
  {
   var pack= JSON.parse(_pack);
   clientLookup[current_player.id].position = pack.position;
 
   clientLookup[current_player.id].rotation = pack.rotation;
 
    var data = {
     id:current_player.id,
     position:pack.position,
     rotation:pack.rotation
    };

    socket.broadcast.emit('UPDATE_POS_AND_ROT',data.id,data.position,data.rotation);

  }
  
});//END_SOCKET.ON



socket.on('PLAYER_DAMAGE',function(_pack){
  
     var pack= JSON.parse(_pack);
   if(current_player && clientLookup[pack.id])
    {
	  
   var target = clientLookup[pack.id];
   
   // if current player is an antilope and target is a leon
   if(current_player.avatar == '0' && target.avatar == '1')
   { 
      target.kills +=1;
	  
      socket.emit('GAME_OVER',current_player.id);
	  
	  socket.broadcast.emit('GAME_OVER',current_player.id);
    
   }
    // if current player is an antilope and target is a crocodille
   else if(current_player.avatar == '0' && target.avatar == '2')
   {
      target.kills +=1;
	  
      socket.emit('GAME_OVER',current_player.id);
	  
	  socket.broadcast.emit('GAME_OVER',current_player.id);
    
   }
    // if current player is anleon and target is a crocodille
   else if(current_player.avatar == '1' && target.avatar == '2' )
   {
      target.kills +=1;
	  
      socket.emit('GAME_OVER',current_player.id);
	  
	  socket.broadcast.emit('GAME_OVER',current_player.id);
   
   }
    // if current player is an leon and target is a antelope
   else if(current_player.avatar == '1' && target.avatar == '0')
   {
      
     current_player.kills +=1;
	 
      socket.emit('GAME_OVER',target.id);
	  
	  socket.broadcast.emit('GAME_OVER',target.id);
   
   }
    // if current player is an crocodille and target is an antelope or  if current player is an crocodille and target is an leon
   else if( current_player.avatar == '2' && target.avatar == '0' || current_player.avatar == '2' && target.avatar == '1')
   {
      current_player.kills +=1;
	  
      socket.emit('GAME_OVER',target.id);
	  
	  socket.broadcast.emit('GAME_OVER',target.id);
   
   }
    // if current player is an crocodileand target is a leon
    else if( current_player.avatar == '2' && target.avatar == '1')
   {
      current_player.kills +=1;
	  
      socket.emit('GAME_OVER',target.id);
	  
	  socket.broadcast.emit('GAME_OVER',target.id);
   
   }
  
  }//END_IF
  

});//END_SOCKET.ON


//create a callback fuction to listening EmitGetBestKillers() method in NetworkMannager.cs unity script
socket.on('GET_BEST_KILLERS',function(pack){

   if(current_player)
   {
     for (var j = 0; j < leaderboard.length; j++) {
              
		socket.emit('UPDATE_BEST_KILLER', leaderboard[j].name,j,leaderboard[j].kills);
		   
	 }
   
   }
  

});//END_SOCKET.ON

socket.on("VOICE", function (data) {


  if(current_player)
  {
    
    
    var newData = data.split(";");
    newData[0] = "data:audio/ogg;";
    newData = newData[0] + newData[1];

     
    clients.forEach(function(u) {
     
      if(sockets[u.id]&&u.id!= current_player.id&&!u.isMute)
      {
    
      sockets[u.id].emit('UPDATE_VOICE',newData);
      }
    });
    
    

  }
 
});

socket.on("AUDIO_MUTE", function (data) {


if(current_player)
{
  current_player.isMute = !current_player.isMute;

}

});

socket.on('disconnect', function ()
	{
        console.log("User  has disconnected");
	    
	      if(current_player)
		    {
		       current_player.isDead = true;
		       socket.broadcast.emit('USER_DISCONNECTED', current_player.id);
			   
			   for (var i = 0; i < clients.length; i++)
		       {
			     if (clients[i].id ==  current_player.id) 
			     {
			       clients[i].isDead = true;
				   clients.splice(i,1);
			     };
		       };

		       
		       delete sockets[current_player.id];
		       delete clientLookup[current_player.id];
			     
        }//END_IF
    });//END_SOCKET.ON


});//END_IO.ON


//updates the list of best players every 1000 milliseconds
function gameloop() {
    if (clients.length > 0) {
        clients.sort(compare);

        var topClients = [];

        for (var i = 0; i < Math.min(10, clients.length); i++) {
                if(!clients[i].isDead)
				{
				
                 topClients.push({
                    id: clients[i].id,
                    name: clients[i].name,
					kills: clients[i].kills
                });
				}
            
        }
        if (isNaN(leaderboard) || leaderboard.length !== topClients.length) {
            leaderboard = topClients;
            leaderboardChanged = true;
        }
        else {
            for (i = 0; i < leaderboard.length; i++) {
                if (leaderboard[i].id !== topClients[i].id) {
                    leaderboard = topClients;
                    leaderboardChanged = true;
                    break;
                }
            }
        }
      
    }

}//END_GAME_LOOP

function sendUpdates() {

    // for each game client make the necessary updates
    clients.forEach( function(u) {
       
	   if(sockets[u.id])
	   {
        
		sockets[u.id].emit('CLEAR_LEADERBOARD');// emit to client u.socketID
        if (leaderboardChanged) {
		
		   for (var j = 0; j < leaderboard.length; j++) {
		      sockets[u.id].emit('UPDATE_BEST_KILLER', leaderboard[j].name,j,leaderboard[j].kills);
		   
		   }
            
        }
		
		
		}
 
    });
	    
		
    leaderboardChanged = false;
	
}//END_SEND_UPDATES

setInterval(gameloop, 1000);//updates the list of best players every 1000 milliseconds
setInterval(sendUpdates, 10000);//run the send updates function every 10 seconds


http.listen(process.env.PORT ||3000, function(){
	console.log('listening on *:3000');
});

console.log('------- NodeJS server is running -------');
