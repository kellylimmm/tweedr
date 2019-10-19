const express = require('express');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const pg = require('pg');

var sha256 = require('js-sha256');

var SALT = "tweedr";

/**
 * ===================================
 * Configurations and set up
 * ===================================
 */

const configs = {
  user: 'kellylim',
  host: '127.0.0.1',
  database: 'tweedr',
  port: 5432,
};

const pool = new pg.Pool(configs);

pool.on('error', function (err) {
  console.log('idle client error', err.message, err.stack);
});

// Init express app
const app = express();

// Set up middleware
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(express.urlencoded({
  extended: true
}));

// Set react-views to be the default view engine
const reactEngine = require('express-react-views').createEngine();
app.set('views', __dirname + '/views');
app.set('view engine', 'jsx');
app.engine('jsx', reactEngine);

// Set the configuration to tell express to use cookie parser
app.use(cookieParser());

/**
 * ===================================
 * Routes
 * ===================================
 */

// ============ Register =========

// Root GET request (it doesn't belong in any controller file)
app.get('/', (request, response) => {
  response.send('Welcome To Tweedr.');
});

app.get('/users/new', (request, response) => {
  response.render('user/newuser');
});

app.post('/users', (request, response) => {
    console.log(request.body);

    let hashedPassword = sha256(request.body.password + SALT);

    const queryString = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';

    const values = [
        request.body.username,
        hashedPassword,
    ];

    // execute query
    // pool.query(queryString, values, (err, result) => {

    //     if (err) {
    //         console.error('query error: ', err.stack);
    //         response.send('query error');
    //     } else {
    //         console.log('query result: ', result);
    //     //response.redirect('/');
    //     response.send('user created');
    //     console.log(result.rows, "JAJAJAJA");
    //     }
      pool.query(queryString, values, (err,result) =>{

        if (err) {
          console.error('query error:', err.stack);
          response.send( 'query error' );
        } else {
          console.log('query result:', result);


          response.send( result.rows );
        }
    });
});

//========== Login =============

app.get('/login', (request, response) => {
    response.render('login');
})

app.post('/login', (request, response) => {
    let requestUsername = request.body.username;
    let requestPassword = request.body.password;

    const queryString = "SELECT * FROM users WHERE username= '"+requestUsername+"'";
    console.log("db query", queryString);

    pool.query(queryString, (err, result) => {

        if (err) {
            console.error('query error: ', err.stack);
            response.send('query error');
        } else {
            console.log('query result: ', result.rows);


if (result.rows.length > 0) {

    let hashedRequestPassword = sha256(requestPassword + SALT);
    console.log("hashed request password : " + hashedRequestPassword);

    if (hashedRequestPassword === result.rows[0].password) {
        let user_id = result.rows[0].id
        let hashedCookie = sha256(SALT+ user_id);


        response.cookie('user_id', user_id);
        response.cookie('hasLoggedIn', hashedCookie);

        response.send('LOGGING IN.....');
    } else {
        response.status(403).send('wrong password');
    }

}

else {
    response.status(403).send('NO USERNAME!');
}
        }

    });

});


//=========== Cookies =======

app.get('/special', (request,response) => {

    let user_id = request.cookies['user_id'];
    let hashedValue = sha256(SALT + user_id);


if (request.cookies['hasLoggedIn'] === hashedValue) {
    response.send("LOGGED IN");
} else {
    response.redirect('/login');
}


});

/**
 * ===================================
 * Listen to requests on port 3000
 * ===================================
 */

const server = app.listen(3000, () => console.log('~~~ Tuning in to the waves of port 3000 ~~~'));

let onClose = function(){

  server.close(() => {
    console.log('Process terminated')
    pool.end( () => console.log('Shut down db connection pool'));
  })
};

process.on('SIGTERM', onClose);
process.on('SIGINT', onClose);