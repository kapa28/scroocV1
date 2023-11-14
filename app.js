// Modules
const express = require('express');
const app = express();
require('dotenv').config();
const port = process.env.port;
const db = require('./db.js');
const DbInstance = db.getDbInstance();
const connection = DbInstance.getConnection();
const compression = require("compression");
const cookieparser = require('cookie-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const helmet = require('helmet');
const fs = require('fs');
const UglifyJS = require('uglify-js');
const UglifyCSS= require('uglifycss');
var redis = require("ioredis");
var redisStore = require('connect-redis')(session);
/* 
    const path = require("path");
    const fsPromises = fs.promises;
*/

// Security patches
app.use(helmet.dnsPrefetchControl());
app.use(helmet.expectCt());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());

// Session connection
var redisClient = redis.createClient({host: process.env.REDIS_HOST, port: 6379});
const sessionStore = new redisStore({ client: redisClient });

// Redis connection check
redisClient.on('error', function (err) {
    console.log('Could not establish a connection with redis.');
});
redisClient.on('connect', function (err) {
    console.log('Connected to redis successfully.');
});

// Parsing
app.use(express.json({ limit: '10kb'}));
app.use(express.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(cookieparser());
app.use(compression());
app.use(session({ secret: process.env.sessionsecret, saveUninitialized: false, resave: false, store: sessionStore, cookie : {
    sameSite: 'lax',
    secure: true,
    domain: ".scrooc.com"
    }, maxAge: process.env.jwtcookieexpiresin * 24 * 60 * 60,
}));
app.use(flash());

// Flash
app.use((req, res, next) => {
    res.locals.flash= req.flash("flash");
    next();
});

// Define routes
app.use('/', require('./routes/sites'));
app.use('/auth', require('./routes/auth'));
app.use('/', express.static('./public', { maxAge: 31557600, }));
app.use('/act/:topic/:id', express.static('./public', { maxAge: 31557600 }));

/* Static files - dodajmo http cachin 
setHeaders: function(res, path) {
        res.setHeader("Expires", new Date(Date.now() + 604800*4).toUTCString());
    },
*/

// Mysql start up query
//DROP EVENT IF EXISTS record;
var query = ` SET GLOBAL sql_mode = "NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION";
SET GLOBAL event_scheduler = ON; DROP EVENT IF EXISTS record;
ANALYZE TABLE cat, joined_cat, posts, records, reports, social, user;
OPTIMIZE TABLE cat, joined_cat, posts, records, reports, social, user; 

SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS record
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
ENDS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
INSERT INTO records VALUES (
	NULL,
	CURDATE(),
	(SELECT COUNT(*) FROM user),
	(SELECT COUNT(*) FROM posts WHERE posts.reply = 0),
	(SELECT COUNT(*) FROM posts WHERE posts.reply != 0),
	(SELECT SUM(a.max_views) FROM (SELECT MAX(social.views) AS max_views FROM social GROUP BY post_id) a),
	(SELECT sum(social.likes) AS max_likes FROM social 
	  WHERE social.id IN (SELECT MAX(social.id) 
	  FROM social GROUP BY post_id)),
	0,
	(SELECT COUNT(*) FROM user WHERE user.ban >= 3),
	(SELECT COUNT(*) FROM reports WHERE approved = 0 || approved = 3)
); `;

// Use scrooc DB
connection.query(query, async (error, results) => {
    if(error)
        console.log(error);
});

if (process.env.MODE === "production") {
} else { 
}

// JS minification
fs.writeFileSync("./public/js/ui.js", UglifyJS.minify([fs.readFileSync("./public/js/original/ui.js").toString(), fs.readFileSync("./public/js/original/header.js").toString(), fs.readFileSync("./public/js/original/search.js").toString()]).code, function(err) {
    if(err) {
        console.log(err);
    }
});
fs.writeFileSync("./public/js/crypto.js", UglifyJS.minify(fs.readFileSync("./public/js/original/crypto.js").toString()).code, function(err) {
    if(err) {
        console.log(err);
    }
});
fs.writeFileSync("./public/js/notifications.js", UglifyJS.minify(fs.readFileSync("./public/js/original/notifications.js").toString()).code, function(err) {
    if(err) {
        console.log(err);
    }
});
fs.writeFileSync("./public/js/suggest.js", UglifyJS.minify(fs.readFileSync("./public/js/original/suggest.js").toString()).code, function(err) {
    if(err) {
        console.log(err);
    }
});  
fs.writeFileSync("./public/js/topics.js", UglifyJS.minify(fs.readFileSync("./public/js/original/topics.js").toString()).code, function(err) {
    if(err) {
        console.log(err);
    }
});
fs.writeFileSync("./public/service-worker.js", UglifyJS.minify(fs.readFileSync("./public/js/original/service-worker.js").toString()).code, function(err) {
    if(err) {
        console.log(err);
    }
});

// CSS minification
fs.writeFileSync("./public/css/main_styles.css", UglifyCSS.processString(fs.readFileSync("./public/css/original/main_styles.css").toString()), function(err) {
    if(err) {
        console.log(err);
    }
});

// Set views
app.set('views', './sites/');
app.set('view engine', 'ejs');
app.set('trust proxy', 1);

// Error handler (for now)
app.use((req, res, next) => {
    const err = new Error("Not found");
    err.status = 404;
    next(err);
});
app.use((err, req, res, next) => {
    if(err.status == 404) {
        res.status(err.status);
        req.flash("flash", '404 page not found.');
        return res.redirect('back');
    } else {
        res.status(500);
        req.flash("flash", 'A server error has occurred.');
        return res.redirect('back');
    }
});

// Listen on 3306
app.listen(port, process.env.host, () => console.log(`Server started on port ${port}.`));