//

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var router = express.Router();              // get an instance of the express Router
var admin = require("firebase-admin");
var request = require("request");

var serviceAccount = require("./junkbase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://junkbase-39fbb.firebaseio.com"
});

var db = admin.database();

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'ChopBot!' });
});

// ROUTES FOR OUR API
// router.route('/theRoute') returns an instance of a single route which you can then use to handle HTTP verbs with optional middleware.
// =============================================================================

// body in the form of:
// {'state':'WAIT_FOR_ZIP'}
// Will save under the order node.
router.route('/order')
    .post(function(req, res){
        sender_id = req.query['sender_id'];
        var key = Object.keys(req.body)[0];
        var ref = db.ref("orders/"+sender_id+"/"+key);
        ref.set(req.body[key]);
        res.json(req.body);
    })
    .delete(function(req, res){
        sender_id = req.query['sender_id'];
        var ref = db.ref("orders/"+sender_id+"/");
        ref.remove();
        res.json({});
    })
    .get(function(req, res){
        sender_id = req.query['sender_id'];
        key = req.query['key'];
        path = "orders/"+sender_id;
        if(key){
            path = path + "/" + key;
        }
        ref = db.ref(path);
        ref.once("value",function(data){
            res.json(data.val());
        })
    });

router.route('/archive')
.post(function(req,res){
    sender_id = req.query['sender_id'];
    var ref = db.ref("archive/"+sender_id);
    ref.push(req.body);
    res.json(req.body);
});

router.route('/state')
    .get(function(req, res){
        sender_id = req.query['sender_id'];
        //var ref = db.ref("orders/"+sender_id+"/");
        var ref = db.ref("orders/"+sender_id+"/state");
        ref.once("value",function(data){
            res.json(data.val());
        })
    })

    .post(function(req,res){
        sender_id = req.query['sender_id'];
        //var ref = db.ref("orders/"+sender_id+"/");
        var ref = db.ref("orders/"+sender_id+"/state");
        // body in the form {"state":"INIT"}
        ref.set(req.body['state']);
        res.json(req.body);
    });

// => working on POST
router.route('/menu')
    .get(function(req, res){
        var ref = db.ref("menu/");
        ref.once("value", function(data){
            res.json(data.val());
        });
    })

    .post(function(req, res){
        var ref = db.ref("menu/");
        console.log('received: '+JSON.stringify(req.body));
        ref.set(req.body);
        console.log('done');
        res.json(req.body);
    });

router.route('/message')
    .get(function(req,res){
        // test code
        //var ref = db.ref("baymax/12345");
        //var node = ref.child("messages");
        //node.set({test:'test'});
        res.json({ message: 'Hello JF1!' });
    })

    .post(function(req,res){
        // incoming message
        // outgoing message
        var body = req.body;
        console.log('received: '+JSON.stringify(body));
        var ref = db.ref("messages/"+body["sender_id"]+"/");
        ref.push(body);
        res.json(body);
});

router.route('/score')
    .get(function(req, res){
        sender_id = req.query['sender_id'];
        var ref = db.ref("scores/"+sender_id+"/");
        ref.once("value", function(data){
            res.json(data.val());
        });
    })
    .post(function(req, res){
        var body = req.body
        var ref = db.ref("scores/"+body["sender_id"]+"/"+body["question"]+"/");
        ref.set(body);
    });

router.route('/profile')
    .get(function(req, res){
        sender_id = req.query['sender_id'];
        token = process.env.FB_ACCESS_TOKEN;

        request({
            url: 'https://graph.facebook.com/v2.6/'+sender_id+'?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token='+token,
            method: 'GET',
            }, function(error, response, body) {
                if (error) {
                    console.log('Error getting FB Profile: ', error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                }else{
                    res.json(JSON.parse(body));
                }
        });
    })

// Express Config
// ==============
app.set('port', (process.env.PORT || 5000));

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.all(path, callback [, callback ...])
// This method is like the standard app.METHOD() methods, except it matches all HTTP verbs.
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    // To allow cross-origin so front-end dev can be done on a different box.
    //http://stackoverflow.com/questions/12111936/angularjs-performs-an-options-http-request-for-a-cross-origin-resource
    //res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods",'PUT,GET,POST,DELETE');
    res.header("Access-Control-Allow-Headers", ['content-type','X-Chop-User-Session-Token','x-parse-application-id','x-parse-rest-api-key']);
    next();
});

// Handle Error
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500, 'FAIL...');
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/v1', router);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
