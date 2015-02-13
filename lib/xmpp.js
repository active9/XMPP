/*
 * XMPP - Main Server Module
 */
var Waterline = require('waterline');
var xmpp = require('xmpp-chat-server');
var express = require('express');
var _ = require('lodash');
var app = express();
var Waterline = require('waterline');
var config = require('./config.js');
var diskAdapter = require('sails-disk');
var orm = new Waterline();
var adapter = require('./adapter.js');

var User = Waterline.Collection.extend(require('./models/user.js'));
orm.loadCollection(User);

//
// XMPP
//
xmpp.Server.prototype.initUserList = function() {
    var list = [];

    var echo_friend = new xmpp.User( "echo@localhost", "Echo 1" );

    echo_friend.onRecieveMessage = function( message ) {
        if( message.getChild("body") ) {
            echo_friend.sendMessageFrom( new xmpp.JID( message.attrs.from ), message.getChild("body").getText() );
        }
    }

    var friend2 = new xmpp.User( "friend1@localhost", "Friend 1" );

    var localhost = new xmpp.User( "main@clever", "Test Localhost" );
    localhost.addBuddy( echo_friend );
    localhost.addBuddy( friend2 );

    friend2.addBuddy( localhost );

    list.push( localhost );
    list.push( echo_friend );
    list.push( friend2 );
    return list;
}

var xmppserver = new xmpp.Server( { domain: config.domain, port: config.xmppPort, tls: config.tls } );

//
// HTTP
//
app.get('/', function (req, res) {
  res.send('Hello XMPP World!')
})


// Setup Express Application
app.use(express.bodyParser());
app.use(express.methodOverride());

// Build Express Routes (CRUD routes for /users)

app.get('/users', function(req, res) {
  app.models.user.find().exec(function(err, models) {
    if(err) return res.json({ err: err }, 500);
    res.json(models);
  });
});

app.post('/users', function(req, res) {
  app.models.user.create(req.body, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

app.get('/users/:id', function(req, res) {
  app.models.user.findOne({ id: req.params.id }, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

app.del('/users/:id', function(req, res) {
  app.models.user.destroy({ id: req.params.id }, function(err) {
    if(err) return res.json({ err: err }, 500);
    res.json({ status: 'ok' });
  });
});

app.put('/users/:id', function(req, res) {
  // Don't pass ID to update
  delete req.body.id;

  app.models.user.update({ id: req.params.id }, req.body, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});


// Start Waterline passing adapters in
orm.initialize(adapter, function(err, models) {

	if(err) throw err;
	app.models = models.collections;
	app.connections = models.connections;

	// Start Server
	var server = app.listen(config.httpPort);
});