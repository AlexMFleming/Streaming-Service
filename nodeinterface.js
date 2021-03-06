var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var nodemailer = require('nodemailer');

var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'pineapplemusic'
});

var app = express();

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'pineapplemusicdonotreply@gmail.com',
		pass: 'Softwareeng!neering2019'
	}
});

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/firstPage.html'));
});

app.get('/homePage', function(request, response) {
	response.sendFile(path.join(__dirname + '/homePage.html'));
});

app.get('/artistProfilePage', function(request, response) {
	response.sendFile(path.join(__dirname + '/artistProfilePage.html'));
});

app.get('/nonArtistProfilePage', function(request, response) {
	response.sendFile(path.join(__dirname + '/nonArtistProfilePage.html'));
});

app.get('/ForgotPassword', function(request, response) {
	response.sendFile(path.join(__dirname + '/forgotPassword.html'));
});

app.post('/loadCreateAccount', function(request, response) {
	response.sendFile(path.join(__dirname + '/CreateAccount.html'));
});

app.post('/loadBecomeArtist', function(request, response) {
	response.sendFile(path.join(__dirname + '/becomeArtist.html'));
});

app.post('/authLogin', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
				request.session.userID = results[0].accountID;
				connection.query('SELECT * FROM artist WHERE acntID = ?', [request.session.userID], function(error, results, fields) {
					if (results.length > 0) {
						request.session.isArtist = true;
					}else{
						request.session.isArtist = false;
					}
					response.redirect('/homePage');
				});
			} else {
				response.send('Incorrect Username and/or Password!');
			}			
			//response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.post('/forgotPassword', function(request,response) {
	connection.query('SELECT passwordResetCode FROM accounts WHERE email = ?', [request.body.email], function(error, results, fields) {
		if (results.length > 0) {
			var mailOptions = {
				from: 'pineapplemusicdonotreply@gmail.com',
				to: request.body.email,
				subject: 'Reset password for Pineapple Music',
				text: 'your reset code is: ' + results[0].passwordResetCode
			};
			
			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
					console.log(error);
				} else {
					console.log('Email sent succesfully: ' + info.response);
					response.end();
				}
			});
		
		}else{
			response.send("There is no account associated with this email");
		}
	});
}); 

app.post('/authCreateAccount', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	var verifyPassword = request.body.verifyPassword;
	var email = request.body.email;
	if (username && password && verifyPassword && email) {
		if (password==verifyPassword) {			//these queries are nested because the output of the query determines the input of the next
			connection.query('SELECT * FROM accounts WHERE username = ?', [username], function(error, results, fields) {
				if (results.length > 0) {
					response.send('Username is taken');
					response.end();
				} else {
					connection.query('SELECT * FROM accounts WHERE email = ?', [email], function(error, results, fields) {
						if (results.length > 0) {
							response.send('There is already an account associated with this email');
							response.end();
						} else {
							connection.query('INSERT INTO accounts (username, password, passwordResetCode, email) VALUES (?,?,?,?)', [username, password, getRandomInt(1000, 9999), email], function(error, results, fields) {
								request.session.loggedin = true;
								request.session.username = username;
								request.session.userID = results.insertId;
								response.redirect('/homePage');
							});
						}
					});
				}
			}); 
				
		} else {
			response.send('Passwords do not match');
			response.end();
		}
	} else {
		response.send('Please fill out required fields');
		response.end();
	}
});
//these queries still need functionality for the returned values
app.post('/lookup', function(request, response) {
	if (request.session.loggedin) {
		var searchObject = request.body.searchObject;
		var attribute = request.body.attribute;
		var value = request.body.value;
		if (searchObject=="artist"){
			if(attribute=="title"){
				connection.query('SELECT * FROM artist WHERE stageName = ?', [value], function (error, results, fields) {
					response.send(results);
					response.end;
				});
			} else {
				connection.query('SELECT * FROM artist WHERE artistTag = ?', [value], function (error, results, fields) {
					response.send(results);
					response.end;
				});
			}
		} else if (searchObject=="song"){
			if(attribute=="title"){
				connection.query('SELECT * FROM songs WHERE filename = ?', [value], function (error, results, fields) {
					if(results.length>0){
						response.send("found it");
					}
					response.end;
				});
			} else {
				connection.query('SELECT * FROM songs WHERE songTag = ?', [value], function (error, results, fields) {
					response.send(results);
					response.end;
				});
			}
		} else {
			if(attribute=="title"){
				connection.query('SELECT * FROM playlist WHERE name = ?', [value], function (error, results, fields) {
					response.send(results);
					response.end;
				});
			} else {
				connection.query('SELECT * FROM playlist WHERE playlistTag = ?', [value], function (error, results, fields) {
					response.send(results);
					response.end;
				});
			}
		}
			
			
	} else {
		response.send('Please login to view this page!');
	}
	//response.end();
});

app.post('/loadProfile', function(request, response) {
	if (request.session.isArtist==true)
		response.redirect('/artistProfilePage');
	else
		response.redirect('/nonArtistProfilePage');
});

app.post('/becomeArtist', function(request, response) {
	if (request.session.loggedin) {
		connection.query('INSERT INTO artist VALUES (?,?,?,?)', [request.session.userID, request.body.stageName, request.body.location, request.body.artistTag], function (error, results, fields) {
			request.session.isArtist=true;
			response.redirect('/artistProfilePage');
		});
	
	} else {
		response.send('Please login to view this page!');
	}
});
	

//default from tutorial
app.get('/home', function(request, response) { 
	if (request.session.loggedin) {
		response.send('Welcome back, ' + request.session.username + '!');
	} else {
		response.send('Please login to view this page!');
	}
	response.end();
});

app.get('/homePage', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/homePage.html'));
	} else {
		response.send('Please login to view this page!');
	}
	response.end();
});


//used for generating passwordResetCode in accounts
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}


app.listen(3000);