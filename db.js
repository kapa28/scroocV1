// SQL, secret import
var mysql = require('mysql');
// Optimized pool settings import
const MysqlPoolBooster = require('mysql-pool-booster');
mysql = MysqlPoolBooster(mysql);
const dotenv = require('dotenv');
dotenv.config({ path: './.env'});
var instance = null;

// MySQL connection
const pool = mysql.createPool({
    connectionLimit: 15,
    host: process.env.SQL_HOST,
    user: process.env.user,
    password: process.env.password,
    port: process.env.db_port,
    database: process.env.database,
    multipleStatements: true,
    insecureAuth : true
});

// Check connection
pool.getConnection(function (err) {
    if (err) {
        console.log('Error: ' + err);
    }
    else {
        console.log('MySQL connected.');
    }
});

// Use the right DB
var createDB = 'create database if not exists ' + process.env.database + '; use ' + process.env.database;
pool.query(createDB, function(err, results, fields) {
    if (err) {
        console.log(err.message);
    }
}); 

// Make Db class
class Db
{
    static getDbInstance()
    {
        return instance ? instance : new Db();
    }
    getConnection(){
        return pool;
    }
}

// Export
module.exports = Db;