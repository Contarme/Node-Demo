var express = require('express')
    , http = require('http')
    , path = require('path'),
    events = require('events'),
    util = require('util'),
    sys = require('sys'),
    io = require('socket.io');
    
var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 8080);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'hbs');
    app.use(express.logger('dev'));
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});


app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500, 'Something broke!');
});


app.get('/chat', function(req, res){
	res.contentType("text/html");
	res.render('chat.html', {});
});


var redis = require('redis');
var db = redis.createClient();

db.on("error", function (err){
    console.log("Error " + err);
});


var server = http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

// socket.io


var socketIO = io.listen(server);

socketIO.sockets.on('connection', function (socket) {
  
  socket.on('subscribe', function(data) { 
	socket.join(data.room);
	socket.emit("past messages", []);
  });

  socket.on('unsubscribe', function(data) { 
	socket.leave(data.room);
	socket.set('room', "");
  });

  socket.on('disconnect', function(data) { 
        socket.get("room", function(err, val){
			if(err){
				console.log(err);
				return;
			}
			socket.leave(val);
			socket.set('room', "");
		});
		
  });

  socket.on('new message', function(data){
	socket.get("room", function(err, val){
		db.zadd(data.room, new Date().getTime(), JSON.stringify(data));
		if(err){
			console.log(err);
			return;
		}
		socketIO.sockets.in(val).emit('new message', data); 
	});
	
  });

});
