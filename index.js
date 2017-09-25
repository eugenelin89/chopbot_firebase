//

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var router = express.Router();              // get an instance of the express Router
var admin = require("firebase-admin");
var request = require("request");


admin.initializeApp({
  credential: admin.credential.cert({
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: "https://chopbase.firebaseio.com"
});

var db = admin.database();

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');

    if(process.env.CHOPBASE_TOKEN != req.get('CHOPBASE_TOKEN')){
        console.log('Unauthorized')
        next(new Error('Unauthorized'));
    }

    next(); // make sure we go to the next routes and don't stop here

});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'ChopBot!' });
});

// ROUTES FOR OUR API
// router.route('/theRoute') returns an instance of a single route which you can then use to handle HTTP verbs with optional middleware.
// =============================================================================

router.route('/state')
    .get(function(req, res){
        sender_id = req.query['sender_id'];
        bot_id = req.query['bot_id'];
        //var ref = db.ref("orders/"+sender_id+"/");
        var ref = db.ref(bot_id+'/'+sender_id+"/state");
        ref.once("value",function(data){
            res.json(data.val());
        })
    })

    .post(function(req,res){
        sender_id = req.query['sender_id'];
        bot_id = req.query['bot_id'];
        //var ref = db.ref("orders/"+sender_id+"/");
        var ref = db.ref(bot_id +'/'+sender_id+"/state");
        // body in the form {"state":"INIT"}
        ref.set(req.body['state']);
        res.json(req.body);
    });

router.route('/current_order')
    .get(function(req, res){
        sender_id = req.query['sender_id'];
        bot_id = req.query['bot_id'];
        var ref = db.ref(bot_id +'/'+sender_id+"/current_order");
        ref.once("value",function(data){
            res.json(data.val());
        })
    })
    .post(function(req, res){
        sender_id = req.query['sender_id'];
        bot_id = req.query['bot_id'];
        req.body['time_stamp'] = (new Date).getTime();
        var ref = db.ref(bot_id +'/'+sender_id+"/current_order");
        var newPostRef = ref.push(req.body);
        res.json({'push_id' : newPostRef.key});

        // time stamp
        var ref = db.ref(bot_id +'/'+sender_id+"/current_order/time_stamp");
        ref.set((new Date).getTime());
    })
    .put(function(req, res){

        sender_id = req.query['sender_id'];
        bot_id = req.query['bot_id'];
        time_stamp = req.query['time_stamp']
        path = bot_id +'/'+sender_id+'/current_order';
        req.body['time_stamp'] = (new Date).getTime();
        var ref = db.ref(path);
        ref.set(req.body);
        res.json(req.body);
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



// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/v1', router);


// Handle Error
app.use(function(err, req, res, next){
    console.log('An error has occurred... ')
    //console.error(err.stack);
    res.status(err.status || 500).send(err);
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
