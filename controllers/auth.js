const bcrypt = require('bcryptjs');
const db = require('../db.js');
const fs = require('fs');
const { env } = require('process');
const fsPromises = fs.promises;
var recommendOffset2 = 0;

const DbInstance = db.getDbInstance();
const connection = DbInstance.getConnection();
const cookieoptions = {
    expires: new Date(
        Date.now() + process.env.jwtcookieexpiresin * 24 * 60 * 60
    ),
    domain: ".scrooc.com",
    sameSite: "lax",
    httpOnly: true,
    secure: true
}
const cookieoptions2 = {
    expires: new Date(
        Date.now() + process.env.jwtcookieexpiresin * 24 * 60 * 60
    ),
    domain: ".scrooc.com",
    sameSite: "lax"
}
var mod_type = false;
var uf_path = __dirname + "/.." + '/public';

/* ČE NI REQ, RES MORS throw error; -at */

exports.login = async (req, res) => {
    var error = null; 
    const { usernameoremail, password, honey } = req.body;

    req.check('usernameoremail', 'This username is invalid. It must be longer than 3 characters and shorter than 22.')
        .exists()
        .isLength({min: 3, max: 22})
        .trim()
        .escape();
    req.check('password', 'This password is invalid.')
        .exists()
        .isLength({min: 3, max: 75})
        .trim()
        .escape();

    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/register');
    }
    else {
        if(honey === ' '){
            try {
                if( !usernameoremail || !password ) { //if it's null or empty
                    req.flash("flash", 'You must enter both the username and password.');
                    return res.redirect('/register');
                }
                await connection.query(`SELECT id, password, confirmed, email, theme, moderation FROM user WHERE username = ?;`, [usernameoremail], async (error, results) =>{ //or email = \''+[usernameoremail]+
                    if( !results || results[0] == null || error) { //if no result or password incorrect
                        req.flash("flash", 'Your username or password is incorrect.');
                        return res.redirect('/register');
                    }
                    else if( !(await bcrypt.compare(password, results[0].password ))){

                        req.session.verify = results[0].id;

                        req.flash("flash", 'Your username or password is incorrect.');
                        return res.redirect('/register');
                    }
                    else if(results[0].confirmed == 0) {

                        req.session.verify = results[0].id;

                        //res.cookie('verifyScrooc', token, cookieoptions);
                        req.flash("flash", 'You need to confirm your email. It\' a one time thing =].');
                        return res.redirect('/register/verify');
                    }
                    else {
                        const id = results[0].id;
                        await connection.query(`SELECT
                            (SELECT COUNT(DISTINCT post_id) FROM social WHERE user_id = ?) AS social,
                            (SELECT COUNT(id) FROM posts WHERE user_id = ? AND reply != 0) AS replies,
                            (SELECT COUNT(id) FROM posts WHERE user_id = ? AND reply = 0) AS posts,
                            (SELECT COUNT(DISTINCT post_id) FROM reports WHERE user_id = ?) AS reports;`, [id, id, id, id], async (error, results1) =>{ //or email = \''+[usernameoremail]+
                            if(error) { //if no result or password incorrect
                                req.flash("flash", 'Your username or password is incorrect.');
                                return res.redirect('/register');
                            } else if ((results[0].moderation != 1) && results1[0].social > 150 && results1[0].replies > 20 && results1[0].posts > 2 && results1[0].reports > 0) {
                                connection.getConnection(function(err, conn) {
                                    try {
                                        conn.beginTransaction(async function(err) {
                                            if (err) { 
                                                throw err
                                            }
                                            await conn.query("UPDATE user SET moderation = 1 WHERE id = ? ;", [id], (error, results) => {
                                                if(error) {
                                                    throw error
                                                }
                                            });
                                            await conn.commit(async function(err) {
                                                if(error) {
                                                    throw error
                                                }
                                                await conn.destroy();

                                                req.session.uid = id;
                                                req.session.verify = id;
                                                res.cookie('theme', results[0].theme , cookieoptions2);
                                                
                                                req.flash("flash", 'You are now a moderator! More on profile...');
                                                res.redirect("back");
                                            });
                                        });
                                    } catch(err) {
                                        return conn.rollback(function() {
                                            conn.destroy();
                                            req.flash("flash", 'There was an error while logging in. Please try again.');
                                            res.redirect('/register');
                                        });
                                    }
                                })
                            } else {
                                // console.log(results1);
                                req.session.uid = id;
                                req.session.verify = id;

                                res.cookie('theme', results[0].theme , cookieoptions2);
                                
                                req.flash("flash", 'Logged in successfully.');
                                res.redirect("back");
                            }
                        });
                    }
                });
            } catch (error) {
                req.flash("flash", 'There was an error while logging in. Please try again.');
                res.redirect('/register');
            }
        } else {
            req.flash("flash", 'There was an error while logging in. Please try again.');
            res.redirect('/register');
        }
    }
}

exports.isLoggedIn = async (req, res, next) => {
    if (req.session.uid) {
        try {
            const decoded = req.session.uid;
            connection.query('SELECT id, username, notes, moderation, last_payment from USER where id = ?', [decoded], (error, result) =>  { // decoded.id
                if(!result){
                    return next();
                }
                req.user = result[0]; // gives access to id, name, email for that id...
                return next();
            });
        } 
        catch (error) {
            return next();
        }
    }
    else {
        next();
    }
}

exports.isBanned = async (decoded) => {
    const res = await new Promise((resolve, reject) => {
        connection.query('SELECT ban FROM user WHERE id = ?', [decoded], async (error, result) =>  {
            if(!result){
                return [];
            }
            else if(result[0].ban > 2) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    });
    return res;
}

exports.logout = async (req, res) => {
    if(req.session.uid != null) {
        /*res.cookie('scrooc', 'Hasta la vista, baby!', {
            expires: new Date(Date.now() + 100),
            domain: ".scrooc.com",
            sameSite: "lax",
            httpOnly: true,
            secure: true
        });*/

        res.redirect("/logout");
        req.session.destroy();
    }
}

exports.like = async (post_id, decoded) => {
    var error = null;
    if (decoded === undefined || decoded === null) 
        return;
    else {
        connection.query(`SELECT id, COUNT(id) AS counter FROM social WHERE user_id = ? AND post_id = ? ORDER BY id DESC`, [decoded, post_id], (error, results) => {
            if(error)
                return;
            else { 
                connection.query(`SELECT views, likes FROM social WHERE post_id = ? ORDER BY id DESC LIMIT 1`, [post_id], async (error, vl_res) => {
                    if(error)
                        return;
                    else {
                        connection.getConnection(function(err, conn) {
                            try {
                                conn.beginTransaction(async function(err) {
                                    if (err) { 
                                        throw err
                                    }

                                    if(!results[0].id) {
                                        await conn.query("INSERT INTO social SET post_id  = ?, user_id = ?, views = ?, likes = ? ;", [post_id, decoded, vl_res[0].views, vl_res[0].likes + 1], (error, results) => {
                                            if(error) {
                                                throw error
                                            }
                                        });
                                    }
                                    else if(results[0].counter % 2 == 0 && results[0].id != null) {
                                        await conn.query(`INSERT INTO social SET post_id  = ?, user_id = ?, views = ?, likes = ? ;`, [post_id, decoded, vl_res[0].views, vl_res[0].likes + 1], (error, results) => {
                                            if(error) {
                                                throw error
                                            }
                                        });
                                    }
                                    else if(results[0].counter % 2 != 0) {
                                        await conn.query(`INSERT INTO social SET post_id  = ?, user_id = ?, views = ?, likes = ?;`, [post_id, decoded, vl_res[0].views, vl_res[0].likes - 1], (error, results) => {
                                            if(error) {
                                                throw error
                                            }
                                        });
                                    }

                                    await conn.commit(async function(err) {
                                        if(error) {
                                            throw error
                                        }
                                        await conn.destroy();
                                    });
                                });
                            } catch(err) {
                                return conn.rollback(function() {
                                    conn.destroy();
                                });
                            }
                        })
                    }
                });
            }
        })
    }
}

exports.report = async (post_id, message, decoded, type) => {
    connection.query(`SELECT id, count FROM reports WHERE post_id = ?`, [post_id], (error, results) => {
        if (error)
            return;
        connection.getConnection(function(err, conn) {
            try {
                conn.beginTransaction(async function(err) {
                    if (err) { 
                        throw err;
                    }
                    else if(!results || results[0] == null) {
                        await conn.query(`INSERT INTO reports SET post_id = ?, date = ?, user_id = ?, message = ?, approved = ?, count = ?, type = ? ; `, [post_id, new Date, decoded, message, 1, 1, type], (error, results1) => {
                            if(error)
                                throw err;
                        });
                    }
                    else if(results[0].id) {
                        await conn.query(`SELECT id FROM reports WHERE post_id = ? AND user_id = ?`, [post_id, decoded], async (error, results1) => {
                            if(error)
                                throw error;
                            if(!results1) {
                                await conn.query(`UPDATE reports SET message = ?, user_id = ?, date = ?, approved = ?, count = ?,  WHERE post_id = ?`, [message, decoded, new Date, 1, results[0].count+1, post_id], async (error, results1) => {
                                    if(error) {
                                        throw err;
                                    }
                                })
                            }
                        });
                    }
                    await conn.commit(async function(err) {
                        if (err) {
                            throw err;
                        }
                        await conn.destroy();
                    });
                })
            } catch (error) {
                return conn.rollback(function() {
                    conn.destroy();
                });
            }
        })
    });
}

exports.judge = async (post_id, mod, message) => {
    connection.getConnection(function(err, conn) {
        try {
            conn.beginTransaction(async function(err) {
                if (err) { 
                    throw err
                }
                await conn.query(`UPDATE reports SET message = ?, approved = ? WHERE post_id = ?; `, [message, mod , post_id], async (error, results1) => {
                    if (error) { 
                        throw error
                    }

                    if(mod == 0) {
                        await conn.query(`UPDATE user
                        JOIN posts ON posts.user_id = user.id
                        JOIN reports ON posts.id = reports.post_id
                        SET ban = ban + 1
                        WHERE reports.post_id = ? AND reports.type = 0`, [post_id], async (error, results1) => {
                            if(error) {
                                throw error
                            }

                            await conn.query(`SELECT ban, user.id AS id, user_file FROM user
                            JOIN posts ON posts.user_id = user.id
                            JOIN reports ON posts.id = reports.post_id
                            WHERE reports.post_id = ? AND reports.type = 0`, [post_id], async (error, results2) => {
                                if(error) {
                                    throw error
                                }

                                // Zakaj ne gre sm not???
                                var result = results2;
                                if(result[0].user_file != '' && result[0].user_file != null) {
                                    try {
                                        fs.access(uf_path + result[0].user_file, async () => {
                                            await fsPromises.unlink(uf_path + result[0].user_file);
                                        });
                                        await conn.query(`UPDATE posts
                                        JOIN reports ON posts.id = reports.post_id
                                        SET user_file = null
                                        WHERE reports.post_id = ? AND reports.type = 0;`, [post_id], async (error, results1) => {
                                            if(error) {
                                                throw error
                                            }
                                        });
                                    } catch (error) {
                                        throw error;
                                    }
                                }

                                if(result[0].ban < 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].id, 2, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                } else if(result[0].ban == 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].id, 1, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                }

                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                });
                            });
                        });
                    } else if(mod == 3) {
                        await conn.query(`SELECT ban, user.id AS id, message, user_file FROM user
                        JOIN posts ON posts.user_id = user.id
                        JOIN reports ON posts.id = reports.post_id
                        WHERE reports.post_id = ? AND reports.type = 0;`, [post_id], async (error, results2) => {
                            if(error) {
                                throw error
                            }
                            var result = results2;

                            await conn.query(`UPDATE user
                            JOIN posts ON posts.user_id = user.id
                            JOIN reports ON posts.id = reports.post_id
                            SET ban = ban + 3
                            WHERE reports.post_id = ?; UPDATE posts
                            JOIN reports ON posts.id = reports.post_id
                            SET username = "x _ x", title  =  "x _ x", content = "x _ x", edit = "x _ x"
                            WHERE reports.post_id = ? AND reports.type = 0;`, [post_id, post_id], async (error, results1) => {
                                if(error) {
                                    throw error
                                }

                                var result = results2;
                                if(result[0].user_file != '' && result[0].user_file != null) {
                                    try {
                                        fs.access(uf_path + result[0].user_file, async () => {
                                            await fsPromises.unlink(uf_path + result[0].user_file);
                                        });
                                        await conn.query(`UPDATE posts
                                        JOIN reports ON posts.id = reports.post_id
                                        SET user_file = null
                                        WHERE reports.post_id = ? AND reports.type = 0;`, [post_id], async (error, results1) => {
                                            if(error) {
                                                throw error
                                            }
                                        });
                                    } catch (error) {
                                        throw error;
                                    }
                                }

                                // Insert all previous posts for judging
                                await conn.query(`INSERT INTO reports(user_id, post_id, date, message, approved, count) SELECT 1, id, ?, ?, 1, 1 FROM posts WHERE user_id = ?`, [new Date(), "auto", result[0].id], async (error, results) => {
                                    if(error) {
                                        throw error
                                    }
                                });

                                if(results2[0].ban < 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].id, 2, "#", message, new Date(), 0], (error, results) => {
                                        if(error)
                                            throw error;
                                    });
                                } else if(results2[0].ban == 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].id, 1, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                }

                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                });
                            });
                        });
                    }
                });
            })
        } catch {
            return conn.rollback(function() {
                conn.destroy();
            });
        }
    });
}

exports.judgeTopic = async (topic_id, mod, message) => {
    connection.getConnection(function(err, conn) {
        try {
            conn.beginTransaction(async function(err) {
                if (err) { 
                    throw err
                }
                await conn.query(`UPDATE reports SET message = ?, approved = ? WHERE post_id = ?  AND reports.type = 1; `, [message, mod , topic_id], async (error, results1) => {
                    if (error) { 
                        throw error
                    }

                    if(mod == 0) {
                        await conn.query(`UPDATE user
                        JOIN cat ON cat.user_id = user.id
                        JOIN reports ON cat.id = reports.post_id
                        SET ban = ban + 1
                        WHERE reports.post_id = ? AND reports.type = 1`, [topic_id], async (error, results1) => {
                            if(error) {
                                throw error
                            }

                            await conn.query(`SELECT cat.user_id, cat.user_file FROM user
                            JOIN cat ON cat.user_id = user.id
                            JOIN reports ON cat.id = reports.post_id
                            WHERE reports.post_id = ? AND reports.type = 1`, [topic_id], async (error, results2) => {
                                if(error) {
                                    throw error
                                }

                                var result = results2;
                                if(result[0].user_file != '' && result[0].user_file != null) {
                                    try {
                                        fs.access(uf_path + result[0].user_file, async () => {
                                            await fsPromises.unlink(uf_path + result[0].user_file);
                                        });
                                        await conn.query(`UPDATE cat
                                        JOIN reports ON cat.id = reports.post_id
                                        SET user_file = null
                                        WHERE reports.post_id = ?  AND reports.type = 1;`, [topic_id], async (error, results1) => {
                                            if(error) {
                                                throw error
                                            }
                                        });
                                    } catch (error) {
                                        throw error;
                                    }
                                }

                                if(result[0].ban < 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].user_id, 2, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                } else if(result[0].ban == 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].user_id, 1, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                }

                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                });
                            });
                        });
                    } else if(mod == 3) {
                        await conn.query(`SELECT cat.cat_name, cat.user_file FROM user
                        JOIN cat ON cat.user_id = user.id
                        JOIN reports ON cat.id = reports.post_id
                        WHERE reports.post_id = ? AND reports.type = 1;`, [topic_id], async (error, results2) => {
                            if(error) {
                                throw error
                            }
                            var result = results2;

                            await conn.query(`UPDATE user
                            JOIN cat ON cat.user_id = user.id
                            JOIN reports ON cat.id = reports.post_id
                            SET ban = ban + 1
                            WHERE reports.post_id = ? AND reports.type = 1;
                            UPDATE cat
                            JOIN reports ON cat.id = reports.post_id
                            SET description = "x _ x", members  =  "0", posts = "0", edit = "x _ x"
                            WHERE reports.post_id = ?  AND reports.type = 1;`, [topic_id, topic_id], async (error, results1) => {
                                if(error) {
                                    throw error
                                }

                                if(result[0].user_file != '' && result[0].user_file != null) {
                                    try {
                                        fs.access(uf_path + result[0].user_file, async () => {
                                            await fsPromises.unlink(uf_path + result[0].user_file);
                                        });
                                        await conn.query(`UPDATE cat
                                        JOIN reports ON cat.id = reports.post_id
                                        SET user_file = null
                                        WHERE reports.post_id = ?  AND reports.type = 1;`, [topic_id], async (error, results1) => {
                                            if(error) {
                                                throw error
                                            }
                                            await conn.query(`DELETE FROM joined_cat
                                            WHERE joined_cat.topic_id = ?;`, [topic_id], async (error, results1) => {
                                                if(error) {
                                                    throw error
                                                }
                                            });
                                        });
                                    } catch (error) {
                                        throw error;
                                    }
                                }

                                // Insert all previous posts for judging
                                await conn.query(`INSERT INTO reports(user_id, post_id, date, message, approved, count) SELECT 1, id, ?, ?, 1, 1 FROM posts WHERE cat_id = ?`, [new Date(), "auto", topic_id], async (error, results) => {
                                    if(error) {
                                        throw error
                                    }
                                });

                                if(result[0].ban < 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].id, 2, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                } else if(result[0].ban == 3) {
                                    await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [result[0].id, 1, "#", message, new Date(), 0], (error, results1) => {
                                        if(error)
                                            throw error;
                                    });
                                }

                                // Nitify the community about the ban

                                await conn.query(`INSERT INTO notifications(user_id, type, href, notification, date, read) SELECT user.id, ?, ?, ?, ?, ? FROM user JOIN cat ON user.id = cat.user_id WHERE cat_id = topic_id; `, 
                                [4, "#", (result[0].cat_name + " has been removed :/."), new Date(), 0], (error, results) => {
                                    if(error)
                                        throw error;
                                });

                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                });
                            });
                        });
                    }
                });
            })
        } catch {
            return conn.rollback(function() {
                conn.destroy();
            });
        }
    });
}

exports.joinTopic = async (topic, decoded) => {
    if (decoded === undefined || decoded === null) 
        return;
    else {
        return new Promise(resolve => connection.query(`SELECT id FROM joined_cat WHERE user_id = ? AND topic_id = ? ; `, [decoded, topic], async (error, results) => {
            if(error)
                return;

            connection.getConnection(function(err, conn) {
                try {
                    conn.beginTransaction(async function(err) {
                        if (err) { 
                            throw err
                        }

                        if(results.length > 0) {
                            await conn.query(`DELETE FROM joined_cat WHERE user_id = ? AND topic_id = ?;
                                            UPDATE cat SET members = members - 1 WHERE cat.id = ?;`, [decoded, topic, topic], (error, results1) => {
                                if(error)
                                    throw error
                                else 
                                    resolve(0);
                            });
                        } else { 
                            await conn.query(`INSERT INTO joined_cat VALUES (0, ?, ?);
                                            UPDATE cat SET members = members + 1 WHERE cat.id = ?;`, [decoded, topic, topic], (error, vl_res) => {
                                if(error)
                                    throw error
                                else 
                                    resolve(1);
                            });
                        }

                        await conn.commit(async function(err) {
                            if (err) {
                                throw err;
                            }
                            await conn.destroy();
                        });
                    })
                } catch {
                    return conn.rollback(function() {
                        conn.destroy();
                    });
                }
            })
        }))
    }
}

// Act & load
function addAndRemove(results, decoded) {
    for(var i = 0; i < results.length; i++) {
        if(decoded != 1 && decoded == results[i].user_id) {
            results[i].delete = true;
        } else {
            results[i].delete = false;
        }
    }
    for(var i = 0; i < results.length; i++) {
        if(decoded != 1 && results[i].polarity % 2 == 0) {
            results[i].liked = false;
        } else {
            results[i].liked = true;
        }
    }
    delete polarity, results.user_id;
    return results;
}

// Load Content
exports.posts = async (offset, sort, where, decoded) => {

    if(!offset)
        offset = 0;
    if(!decoded)
        decoded = 1;

    // type je 0 == navadn, 1 == popular...
    var ordering_query = ' ROUND(((LOG10((COALESCE(t2.b, 0 )+1)*10) + LOG10(social.likes+1)*5 + LOG10(social.views+1)*2)/(UNIX_TIMESTAMP(time)/120000)),7) AS ORDERS '; 

    var like_status = `(SELECT COUNT(social.id) AS counter FROM social WHERE user_id = ${decoded} AND post_id = t1.id) AS polarity `;

    // banned topic safeguard
    var topic_violation = `AND cat.id NOT IN (SELECT reports.post_id FROM reports WHERE reports.post_id = cat.id AND reports.type != 0 AND reports.approved IN (3))`;
    var topic_violation2 = `AND cat.id NOT IN (SELECT reports.post_id FROM reports WHERE reports.post_id = cat.id AND reports.type != 0 AND reports.approved IN (0,3))`;
    
    var query = ` SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, cat.description, 
        t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
        social.views, social.likes, COALESCE(t2.b, 0 ) AS replies,
        '0' AS type, ${ordering_query}, ${like_status}, blurred FROM posts t1
        JOIN user on t1.user_id = user.id 
        LEFT JOIN cat ON t1.cat_id = cat.id
        JOIN social ON t1.id = social.post_id
        LEFT JOIN reports ON t1.id = reports.post_id
        LEFT JOIN
        (
            SELECT a.id, count(b.reply) AS b
            FROM posts a
            LEFT JOIN posts b
            ON a.id=b.reply
            GROUP BY a.id, a.user_id
            HAVING b != 0
        ) t2
        ON t1.id = t2.id
        WHERE social.id IN (SELECT MAX(social.id) 
        FROM social GROUP BY post_id) AND reply = 0 AND t1.user_id != 1 AND (reports.post_id IS NULL OR reports.approved IN (1,2) OR reports.type != 0) ${topic_violation}`;
    var where_query = ' ';
    var groupby = '  ' //GROUP BY social.post_id, t1.id
    var limit  = ' LIMIT 8 OFFSET ';
    var union_pop = ` SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, cat.description,
        t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
        social.views, social.likes, COALESCE(t2.b, 0 ) AS replies,
        '1' AS type, ${ordering_query}, ${like_status},blurred FROM posts t1
        LEFT JOIN user on t1.user_id = user.id 
        LEFT JOIN cat ON t1.cat_id = cat.id
        LEFT JOIN social ON t1.id = social.post_id
        LEFT JOIN reports ON t1.id = reports.post_id
        LEFT JOIN
        (
            SELECT a.id, count(b.reply) AS b
            FROM posts a
            LEFT JOIN posts b
            ON a.id=b.reply
            GROUP BY a.id, a.user_id
            HAVING b != 0
        ) t2
        ON t1.id = t2.id
        WHERE social.id IN (SELECT MAX(social.id) 
        FROM social GROUP BY post_id) AND reply = 0 AND t1.user_id != 1 AND (reports.post_id IS NULL OR reports.approved IN (1,2) OR reports.type != 0) `;

    //console.log(sort);
    //console.log(where)

    switch(sort) {
        case "1":
            ordering = " ORDER BY TIME DESC, t1.id DESC ";
            break;
        case "2":
            ordering = " ORDER BY TIME ASC, t1.id ASC ";
            break;
        case "3":
            ordering = " ORDER BY social.likes DESC, social.views DESC ";
            break;
        case "4": //https://stackoverflow.com/questions/3003739/formula-for-popularity-based-on-like-it-comments-views
            ordering = " ORDER BY ORDERS desc ";
            break;
        default: //https://stackoverflow.com/questions/3003739/formula-for-popularity-based-on-like-it-comments-views
            ordering = " ORDER BY ORDERS DESC ";
            break;
    } 

    const findTerm = (term) => {
        if (where.includes(term)){
          return where;
        }
    };

    switch(where) {
        case 'undefined':
            break;
        case null:
            break;
        case 'profile':
            if(decoded == 1)
                return [];
            query = ` SELECT t1.id AS id, reply, t1.username, t1.time, cat.cat_name, cat.description, 
                t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
                social.views, social.likes, COALESCE(t2.b, 0 ) AS replies,
                '0' AS type, ${ordering_query}, ${like_status},blurred FROM posts t1
                LEFT JOIN user on t1.user_id = user.id 
                LEFT JOIN cat ON t1.cat_id = cat.id
                LEFT JOIN social ON t1.id = social.post_id
                LEFT JOIN reports ON t1.id = reports.post_id
                LEFT JOIN
                (
                    SELECT a.id, count(b.reply) AS b
                    FROM posts a
                    LEFT JOIN posts b
                    ON a.id=b.reply
                    GROUP BY a.id, a.user_id
                    HAVING b != 0
                ) t2
                ON t1.id = t2.id
                WHERE social.id IN (SELECT MAX(social.id) 
                FROM social GROUP BY post_id) AND ((reports.post_id IS NULL OR reports.approved != 0) OR reports.type != 0) ${topic_violation}`;
            where_query = ` AND user.id = ${decoded} `;
            break;
        case findTerm('sact'):
            where = where.substring(where.indexOf("sact/") + 5).replace('/', '');
            where_query = ` AND MATCH(t1.username, t1.title, t1.content, t1.edit) AGAINST('*${where}*' IN BOOLEAN MODE) `;
            query = ` SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, user.id AS user_id,
                        t1.title, t1.content, t1.edit, t1.user_file, t1.audio,
                        social.views, social.likes, COALESCE(t2.b, 0 ) AS replies, 
                        '0' AS type, MATCH(t1.username, t1.title, t1.content, t1.edit) AGAINST('*${where}*' IN BOOLEAN MODE) AS ORDERS, blurred FROM posts t1
                        LEFT JOIN user on t1.user_id = user.id 
                        LEFT JOIN cat ON t1.cat_id = cat.id
                        LEFT JOIN social ON t1.id = social.post_id
                        LEFT JOIN reports ON t1.id = reports.post_id
                        LEFT JOIN
                        (
                            SELECT a.id, count(b.reply) AS b
                            FROM posts a
                            LEFT JOIN posts b
                            ON a.id=b.reply
                            GROUP BY a.id, a.user_id
                            HAVING b != 0
                        ) t2
                        ON t1.id = t2.id
                        WHERE social.id IN (SELECT MAX(social.id) 
                        FROM social GROUP BY post_id) AND reply = 0 `;
            if (sort == 4)
                ordering = ' ORDER BY ORDERS DESC ';
            break;
        case 'explore': //post_cat_tag.tag_id,
            query = ` SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, cat.description, 
                        t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
                        social.views, social.likes, COALESCE(t2.b, 0 ) AS replies,
                        '0' AS type, ${ordering_query}, ${like_status},blurred FROM posts t1
                        LEFT JOIN user on t1.user_id = user.id 
                        LEFT JOIN cat ON t1.cat_id = cat.id
                        LEFT JOIN social ON t1.id = social.post_id
                        LEFT JOIN post_cat_tag ON post_cat_tag.post_id = t1.id
                        LEFT JOIN tags ON tags.id = post_cat_tag.tag_id
                        LEFT JOIN reports ON t1.id = reports.post_id
                        LEFT JOIN
                        (
                            SELECT a.id, count(b.reply) AS b
                            FROM posts a
                            LEFT JOIN posts b
                            ON a.id=b.reply
                            GROUP BY a.id, a.user_id
                            HAVING b != 0
                        ) t2
                        ON t1.id = t2.id
                        WHERE social.id IN (SELECT MAX(social.id) 
                        FROM social GROUP BY post_id) AND reply = 0 AND (reports.post_id IS NULL OR reports.approved IN (1,2) OR reports.type != 0) ${topic_violation2}`;
            where_query = ` AND post_cat_tag.tag_id IN (
                SELECT post_cat_tag.tag_id FROM post_cat_tag
                JOIN joined_cat ON joined_cat.topic_id = post_cat_tag.cat_id
                WHERE joined_cat.user_id = ${decoded} ) `;
            ordering = 'ORDER BY -LOG(1-RAND())';
            union = `UNION (SELECT)`
            break;
        case 'mod1': 
            query = ` (SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, 
                t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
                social.views, social.likes, ${ordering_query}, ${like_status}, COALESCE(t2.b, 0 ) AS replies,
                '0' AS type, blurred FROM posts t1
                LEFT JOIN user on t1.user_id = user.id 
                LEFT JOIN cat ON t1.cat_id = cat.id
                LEFT JOIN social ON t1.id = social.post_id
                LEFT JOIN reports ON t1.id = reports.post_id
                LEFT JOIN
                (
                    SELECT a.id, count(b.reply) AS b
                    FROM posts a
                    LEFT JOIN posts b
                    ON a.id=b.reply
                    GROUP BY a.id, a.user_id
                    HAVING b != 0
                ) t2
                ON t1.id = t2.id
                WHERE social.id IN (SELECT MAX(social.id) 
                FROM social GROUP BY post_id) AND cat.cat_name = "Random"
                ORDER BY social.views DESC
                LIMIT 1) UNION
                (SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, 
                t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
                social.views, social.likes,  ${ordering_query}, ${like_status}, COALESCE(t2.b, 0 ) AS replies,
                '0' AS type, blurred FROM posts t1
                LEFT JOIN user on t1.user_id = user.id 
                LEFT JOIN cat ON t1.cat_id = cat.id
                LEFT JOIN social ON t1.id = social.post_id
                LEFT JOIN reports ON t1.id = reports.post_id
                LEFT JOIN
                (
                    SELECT a.id, count(b.reply) AS b
                    FROM posts a
                    LEFT JOIN posts b
                    ON a.id=b.reply
                    GROUP BY a.id, a.user_id
                    HAVING b != 0
                ) t2
                ON t1.id = t2.id
                WHERE social.id IN (SELECT MAX(social.id) 
                FROM social GROUP BY post_id) AND cat.cat_name = "Random"
                ORDER BY id DESC
                LIMIT 1) UNION ALL
                (SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, 
                t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
                social.views, social.likes, ${ordering_query}, ${like_status}, COALESCE(t2.b, 0 ) AS replies,
                '0' AS type, blurred FROM posts t1
                LEFT JOIN user on t1.user_id = user.id 
                LEFT JOIN cat ON t1.cat_id = cat.id
                LEFT JOIN social ON t1.id = social.post_id
                LEFT JOIN reports ON t1.id = reports.post_id
                LEFT JOIN
                (
                    SELECT a.id, count(b.reply) AS b
                    FROM posts a
                    LEFT JOIN posts b
                    ON a.id=b.reply
                    GROUP BY a.id, a.user_id
                    HAVING b != 0
                ) t2
                ON t1.id = t2.id
                WHERE social.id IN (SELECT MAX(social.id) 
                FROM social GROUP BY post_id) AND cat.cat_name = "Random"
                ORDER BY RAND() DESC
                LIMIT 1)`;
            groupby = "";
            limit  = "";
            ordering = "";
            offset = "";
            where_query = "";
            break;
        default: //topic
            where_query = ` AND cat.cat_name = '${where}' `;
            break;
    }

    // console.log(query + where_query + groupby + ordering + limit + offset + ';')
    const res = await new Promise(async (resolve, reject) => {
        if (where == 'explore') {
            //console.log(`( ${query} ${where_query} ${groupby} ${ordering} ${limit} ${offset} ) UNION (${union_pop} ${groupby} ORDER BY ROUND((LOG10(likes) + SIGN(likes) * UNIX_TIMESTAMP(time)/80000),7) LIMIT 2 OFFSET ${Math.floor(offset/4)}); `)
            connection.query(`( ${query} ${where_query} ${groupby} ${ordering} ${limit} ${offset} ) UNION (${union_pop} ${groupby} ORDER BY ROUND((LOG10(likes) * views / UNIX_TIMESTAMP(time)/80000),7) LIMIT 2 OFFSET ${Math.floor(offset/4)}); `, function(err, results){
                if(err){
                    return [];
                }
                else if(!results || results.length < 3){
                    connection.query(union_pop + " LIMIT " + (8-results.length+2) + " OFFSET " + offset + " ;", function(err, results2){
                        if(err){
                            return [];
                        } else {
                            resolve(addAndRemove(results2, decoded));
                        }
                    });
                }
                else {
                    resolve(addAndRemove(results, decoded));
                }
            });
        } else if(where == 'undefined' && decoded != 1) {
            if (offset != 0)
                offset = offset - 2;
            //console.log(`( ${query} ${where_query} ${groupby} ${ordering} ${limit} ${offset} ) UNION (${union_pop} ${groupby} ORDER BY ROUND((LOG10(likes) + SIGN(likes) * UNIX_TIMESTAMP(time)/80000),7) LIMIT 2 OFFSET ${(Math.floor(offset/4))});`)
            connection.query(`( ${query} ${where_query} ${groupby} ${ordering} ${limit} ${offset} ) UNION (${union_pop} ${groupby} ORDER BY ROUND((LOG10(likes) + SIGN(likes) * UNIX_TIMESTAMP(time)/80000),7) LIMIT 2 OFFSET ${(Math.floor(offset/4))});`
            , function(err, results){
                if(err){
                    return [];
                } else if(!results || results.length < 3){
                    connection.query(union_pop + " LIMIT " + (8-results.length+2) + " OFFSET " + offset + " ;", function(err, results2){
                        if(err){
                            return [];
                        } else {
                            resolve(addAndRemove(results2, decoded));
                        }
                    });
                } else {
                    resolve(addAndRemove(results, decoded));
                }
            });
        } else {
            if(where == 'mod') {

                mod_type = !mod_type;
                await connection.query(`SELECT COUNT(id) AS count, type FROM reports GROUP BY type ORDER BY type ASC;`, async function(err, results) {
                    if(results[0].type == 1 || (results[1] && results[1].count/10 < results[0].count)) {
                        mod_type = false;
                    } else {
                        mod_type = true;
                    }

                    if (mod_type) {
                        query = ` SELECT t1.id AS id, t1.username, t1.time, cat.cat_name, 
                        t1.title, t1.content, t1.user_file, t1.audio, user.id AS user_id,
                        social.views, social.likes, COALESCE(t2.b, 0 ) AS replies,
                        '0' AS type, ${ordering_query}, ${like_status},blurred FROM posts t1
                        LEFT JOIN user on t1.user_id = user.id 
                        LEFT JOIN cat ON t1.cat_id = cat.id
                        LEFT JOIN social ON t1.id = social.post_id
                        LEFT JOIN reports ON t1.id = reports.post_id
                        LEFT JOIN
                        (
                            SELECT a.id, count(b.reply) AS b
                            FROM posts a
                            LEFT JOIN posts b
                            ON a.id=b.reply
                            GROUP BY a.id, a.user_id
                            HAVING b != 0
                        ) t2
                        ON t1.id = t2.id
                        WHERE social.id IN (SELECT MAX(social.id) 
                        FROM social GROUP BY post_id) AND reports.user_id != ${decoded} AND reports.approved = 1 AND reports.type = 0`;
                        where_query = "";
                        limit  = ' LIMIT 1 OFFSET ';
                        ordering = " ORDER BY -LOG(1-RAND()) ";
                    } else {
                        query = ` SELECT t1.id, t1.cat_name AS iframe, t1.members, t1.description,
                        t1.posts, t1.user_file, t1.tags, t1.cat_blurred FROM cat t1
                        LEFT JOIN reports ON t1.id = reports.post_id
                        WHERE reports.type = 1 AND reports.user_id != ${decoded} AND reports.approved = 1 `;
                        where_query = "";
                        groupby = "";
                        limit  = ' LIMIT 1 OFFSET ';
                        ordering = " ORDER BY -LOG(1-RAND()) ";
                    }

                    await connection.query(query + where_query + groupby + ordering + limit + offset + ';', function(err, results){
                        if(err)
                            return;
                        else {
                            if(!mod_type && where == 'mod') {
                                if(results[0])
                                    connection.query(
                                        ` SELECT tag FROM cat
                                            LEFT JOIN post_cat_tag ON cat.id = post_cat_tag.cat_id
                                            LEFT JOIN tags ON tags.id = post_cat_tag.tag_id
                                            WHERE cat.cat_name = ?;`, [results[0].iframe], async (error, results1) => {
                                        if(!results1 || error) {
                                        } else {
                                            resolve({results, results1});
                                        }
                                    });
                            }
                            else 
                                resolve(addAndRemove(results, decoded));
                        }
                    });
                });
            } else {
                await connection.query(query + where_query + groupby + ordering + limit + offset + ';', function(err, results){
                    if(err)
                        console.log(err);
                    else if(where == 'mod1')
                            resolve(results);
                    else 
                        resolve(addAndRemove(results, decoded));
                });
            }
        }
    });
    return res;
}

exports.topics = async (offset, sort, where) => {

    if(!offset){
        offset = 0;
    }

    // dodaj where ban = 0
    var query = ` SELECT t1.cat_name, t1.description, t1.members, t1.posts, t1.user_file, t1.cat_blurred,
    MATCH(t1.cat_name, t1.description) AGAINST('*${where}*' IN BOOLEAN MODE) AS relevance FROM cat t1
    LEFT JOIN joined_cat on t1.id = joined_cat.topic_id
    LEFT JOIN posts ON t1.id = posts.cat_id
    LEFT JOIN reports ON t1.id = reports.post_id
    WHERE t1.id IS NOT NULL `;
    var ordering = ' '; 
    var where_query = ' ';
    var groupby = ' GROUP BY t1.cat_name ';
    var limit  = ' LIMIT 4 OFFSET ';

    where = where.substring(where.indexOf("sact/") + 5).replace('/', '');
    where_query = ` AND MATCH(t1.cat_name, t1.description) AGAINST('*${where}*' IN BOOLEAN MODE) 
    AND t1.id NOT IN (SELECT reports.post_id FROM reports WHERE reports.post_id = t1.id AND reports.type = 1 AND reports.approved IN (3))`;

    switch(sort) {
        case "0":
            ordering = " ORDER BY t1.posts DESC, t1.id DESC ";
            break;
        case "1":
            ordering = " ORDER BY TIME DESC, t1.id DESC ";
            break;
        case "2":
            ordering = " ORDER BY TIME ASC, t1.id DESC ";
            break;
        case "3":
            ordering = " ORDER BY t1.members DESC, t1.id DESC ";
            break
        default:
            ordering = ' ORDER BY relevance DESC ';
            break;
    } 

    // console.log(query + where_query + groupby + ordering + limit + offset + ';')
    const res = await new Promise((resolve, reject) => {
        // console.log(query + where_query + groupby + ordering + limit + offset + ';');
        connection.query(query + where_query + groupby + ordering + limit + offset + ';', [], function(err, results){
            if(err){
                return [];
            }
            else {
                resolve(results);
            }  
        });
    });
    return res;
}

exports.recommendTopic = async (offset, sort, where, decoded) => {

    if(!offset)
        offset = 0;

    var query = ` ( SELECT cat.id AS id, cat_name, 'false' AS joined FROM cat 
    LEFT JOIN joined_cat ON cat.id = joined_cat.topic_id
    JOIN post_cat_tag ON post_cat_tag.cat_id = cat.id
    JOIN tags ON tags.id = post_cat_tag.tag_id
    JOIN reports ON reports.post_id = cat.id
    WHERE cat.id NOT IN (
        SELECT joined_cat.topic_id FROM joined_cat 
        LEFT JOIN post_cat_tag ON post_cat_tag.cat_id = joined_cat.topic_id
        WHERE joined_cat.user_id = ${decoded}
    )AND post_cat_tag.tag_id IN (
        SELECT post_cat_tag.tag_id FROM post_cat_tag 
        JOIN joined_cat ON joined_cat.topic_id = post_cat_tag.cat_id 
        WHERE joined_cat.user_id = ${decoded}
    ) AND reports.approved IN (1,2)`;

    /* 
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    +   -------------------------------------------------------------  +
    +   |                                                           |  +
    +   |              !!! NAPREJ NISM NČ GLEDOV !!!                |  +
    +   |                                                           |  +
    +   -------------------------------------------------------------  +
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    */
   
    var ordering = ' ORDER BY -LOG(1-RAND()) ';
    /*var where_query = ' ';
    var groupby = ' ';*/
    var limit  = ' LIMIT 8 OFFSET ';

    var beforeQuery = `( SELECT cat.id AS id, cat_name, 'true' AS joined FROM cat
                        LEFT JOIN joined_cat ON cat.id = joined_cat.topic_id
                        WHERE joined_cat.user_id = ${decoded}
                        ORDER BY joined_cat.id DESC 
                        LIMIT 4 ) UNION `;
    if(offset > 1)
        beforeQuery = '';

    var backup = `SELECT * FROM ((SELECT cat.id AS id, cat_name, 'false' AS joined FROM cat 
    LEFT JOIN joined_cat ON cat.id = joined_cat.topic_id
    JOIN post_cat_tag ON post_cat_tag.cat_id = cat.id
    JOIN tags ON tags.id = post_cat_tag.tag_id
    ORDER BY cat.date DESC LIMIT 4 OFFSET ${recommendOffset2}) UNION
    (SELECT cat.id AS id, cat_name, 'false' AS joined FROM cat 
    LEFT JOIN joined_cat ON cat.id = joined_cat.topic_id
    JOIN post_cat_tag ON post_cat_tag.cat_id = cat.id
    JOIN tags ON tags.id = post_cat_tag.tag_id
    ORDER BY cat.members DESC LIMIT 4 OFFSET ${recommendOffset2})) a
    WHERE a.id NOT IN (
        SELECT joined_cat.topic_id FROM joined_cat 
        LEFT JOIN post_cat_tag ON post_cat_tag.cat_id = joined_cat.topic_id
        WHERE joined_cat.user_id = ${decoded}
    )`;

    const res = await new Promise((resolve, reject) => {
        connection.query( beforeQuery + query + ordering + limit + offset + ');', function(err, results){
            if(err){
                throw err;
            } else if(results.length < 1) {
                
                connection.query(backup, function(err, results){
                    if(err){
                        throw err;
                    } else {
                        recommendOffset2 = recommendOffset2 + results.length;
                        resolve(results);
                    }
                });
            }
            else {
                // console.log(beforeQuery + query + ordering + limit + offset + ');');
                resolve(results);
            }  
        });
    });
    return res;
}

exports.act = async (post_id, decoded) => { //deleted topic param

    var def_query = ` SELECT t1.id, t1.username, t1.time, cat.cat_name, user.id AS user_id,
    t1.title, t1.content, t1.user_file, t1.audio, (SELECT COUNT(s1.id) AS counter FROM social s1 WHERE s1.user_id = ${decoded} AND s1.post_id = t1.id AND s1.likes != (SELECT likes FROM social WHERE id = (s1.id-1)) ORDER BY id DESC) AS polarity,
    social.views, social.likes, COALESCE(t2.b, 0 ) AS replies, 
    LOG10(UNIX_TIMESTAMP(TIME)/100000000) FROM posts t1
    LEFT JOIN user on t1.user_id = user.id 
    LEFT JOIN cat ON t1.cat_id = cat.id
    LEFT JOIN social ON t1.id = social.post_id
    LEFT JOIN
    (
        SELECT a.id, count(b.reply) AS b
        FROM posts a
        LEFT JOIN posts b
        ON a.id=b.reply
        GROUP BY a.id, a.user_id
        HAVING b != 0
    ) t2
   ON t1.id = t2.id
   WHERE social.id IN (SELECT MAX(social.id) 
   FROM social GROUP BY post_id) `;
    var where = ` AND t1.id = ${post_id} `;
    var limit  = " LIMIT 1 ";

    const res = await new Promise(async (resolve, reject) => {
        connection.getConnection(function(err, conn) {
            try {
                conn.beginTransaction(async function(err) {
                    if (err) { 
                        throw err
                    }
                    await conn.query('UPDATE social SET views = views + 1 WHERE post_id = ? AND user_id = ?;', [post_id, decoded], async (error, results) => {
                        if(error) {
                            throw error
                        }
                        await conn.commit(async function(err) {
                            if (err) {
                                throw err;
                            }
                            await conn.destroy();

                            await connection.query(def_query + where + limit, function(error, results){
                                if(!results || results[0] == null || error) {
                                    return;
                                }
                    
                                resolve(addAndRemove(results, decoded));
                            });
                        });
                    });
                })
            } catch {
                return conn.rollback(function() {
                    resolve([]);
                    conn.destroy();
                });
            }
        });
    });
    return res;
}

exports.topic = async (topic, decoded) => {

    if(decoded){
        var def_query = `
            SELECT *, IF(
                (SELECT cat.id FROM cat
                LEFT JOIN joined_cat ON cat.id = joined_cat.topic_id
                JOIN user ON cat.user_id = user.id
                WHERE cat_name = '${topic}' AND joined_cat.user_id = ${decoded}
                ORDER BY joined_cat.id DESC 
                LIMIT 1) IS NOT NULL, "true", "false"
            ) AS joined FROM (SELECT cat.id AS id, cat_name, description, members, posts, user_file, user.id AS user_id, cat_blurred FROM cat
            LEFT JOIN joined_cat ON cat.id = joined_cat.topic_id
            JOIN user ON cat.user_id = user.id
            WHERE cat_name = '${topic}'
            ORDER BY joined_cat.id DESC
            LIMIT 1) a; `;
    } else {
        var def_query = `
            SELECT cat_name, description, members, posts, user_file 
            FROM cat WHERE cat_name = "${topic}" 
            LIMIT 1; `;
    }

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query, function(error, results){
            if(error){
                resolve([]);
            }

            if(decoded && results[0].user_id) {
                if(decoded == results[0].user_id) {
                    results[0].edit = true;
                } else {
                    results[0].edit = false;
                }
            }

            delete results.user_id;
            resolve(results);
        });
    });
    return res;
}

exports.replies = async (id, replyOffset) => {
    // fixi
    var def_query = ` SELECT t1.id, t1.title, t1.content, t1.username, 
    t1.time, cat.cat_name, t1.reply, COALESCE(t2.b, 0 ) AS replies, 
    social.views, social.likes,
    LOG10(UNIX_TIMESTAMP(TIME)/100000000) FROM posts t1
    LEFT JOIN user on t1.user_id = user.id 
    LEFT JOIN cat ON t1.cat_id = cat.id
    LEFT JOIN social ON t1.id = social.post_id
    LEFT JOIN
    (
        SELECT a.id, count(b.reply) AS b
        FROM posts a
        LEFT JOIN posts b
        ON a.id=b.reply
        GROUP BY a.id, a.user_id
        HAVING b != 0
    ) t2
   ON t1.id = t2.id `;

    var where = ` WHERE reply = ${await id} AND social.id IN (SELECT MAX(social.id) FROM social GROUP BY post_id) `;
    var group = ` `;
    var orderby = ` ORDER BY time `;
    var limit = " LIMIT 12 OFFSET ";

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query + where + group + orderby + limit + replyOffset, function(error, results){
            if(error){
                resolve([]);
            }
            resolve(results);
        });
    });
    return res;
}

exports.records = async (tableOffset) => {

    var def_query = "SELECT date, users, posts, replies, views, likes, shares, banned, blocked FROM records";
    var limit = "";
    var order = " ORDER BY id DESC "

    if(!tableOffset || tableOffset == 0)
        limit  = " LIMIT 1 OFFSET ";
    else
        limit  = " LIMIT 6 OFFSET ";

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query + order + limit + tableOffset, function(err, results){
            if(err){
                resolve([]);
            }
            resolve(results);
        });
    });
    return res;
}

exports.search = async (data, decoded) => {
    var def_query = "", limit = "", order = "";

    if(decoded) {
        if(data == 0 || data == "" ) {
            def_query = ` SELECT cat_name, user.id
                    FROM cat INNER JOIN joined_cat ON
                    joined_cat.topic_id = cat.id 
                    INNER JOIN user ON 
                    user.id = joined_cat.user_id
                    WHERE user.id = ${decoded} `;
            order = "";
        } else {
            def_query = ` SELECT cat_name, user.id, MATCH(cat_name, description) 
            AGAINST('*${data}*' IN BOOLEAN MODE) AS orders 
            FROM cat INNER JOIN joined_cat ON
            joined_cat.topic_id = cat.id 
            INNER JOIN user ON 
            user.id = joined_cat.user_id
            HAVING orders > 0 AND user.id = ${decoded} `;
            order = " ORDER BY orders DESC  ";
        }
        limit = " ";
    } else {
        def_query = ` SELECT cat_name, MATCH(cat_name, description) AGAINST('*${data}*' IN BOOLEAN MODE) AS orders 
        FROM cat HAVING orders > 0 `; //cat_name LIKE '${data}%'
        limit = " LIMIT 6 ";
        order = " ORDER BY orders DESC  ";
    }

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query + order + limit, function(error, results){
            if(error)
                resolve([]);
            resolve(results);
        });
    });
    return res;
}

exports.searchTags = async (data) => {
    var def_query = `SELECT tag, MATCH(tag) AGAINST('*${data}*' IN BOOLEAN MODE) AS orders 
                    FROM tags HAVING orders > 0 `; //cat_name LIKE '${data}%'
    var limit = " LIMIT 6 ";
    var order = " ORDER BY orders DESC  "

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query + order + limit, function(error, results){
            if(error)
                resolve([]);
            resolve(results);
        });
    });
    return res;
}

exports.keywords = async (type, where) => {

    var def_query = ` SELECT tag FROM post_cat_tag
                    JOIN cat ON cat.id = post_cat_tag.cat_id 
                    JOIN tags ON post_cat_tag.tag_id = tags.id
                    WHERE cat.cat_name =  '${where}' `;
    var groupby = ' GROUP BY tag '
    var limit = "LIMIT 10";

    if (type == 'act')
        def_query = ` SELECT tag FROM post_cat_tag
                    JOIN posts ON posts.id = post_cat_tag.post_id 
                    JOIN tags ON post_cat_tag.tag_id = tags.id
                    WHERE posts.id = ${where} `;

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query + groupby + limit, function(error, results){
            if(error)
                resolve([]);
            resolve(results);
        });
    });
    return res;
}

exports.username = async (req, res) => {
    var name = "";
    const rez = await new Promise((resolve, reject) => {
        connection.query(
            ` (SELECT adjective AS name FROM username_generator
              ORDER BY -LOG(1-RAND())
              LIMIT 1) UNION ALL
              (SELECT adjective AS name FROM username_generator
              ORDER BY -LOG(1-RAND())
              LIMIT 1) UNION ALL 
              (SELECT noun AS name FROM username_generator
              ORDER BY -LOG(1-RAND())
              LIMIT 1);`, async (error1, results1) => {
              if(!results1 || results1.length < 1) {
                resolve("");
              } else {
                var length = results1.length, i = 0;
                if(Math.random() < 0.6)
                    i++;
                if (Math.random() < 0.3)
                  for (; i < length; i++) {
                    if(i != length-1)
                      name += (results1[i].name).toLowerCase() + "_";
                    else 
                      name += (results1[i].name).toLowerCase();
                } else {
                  for (; i < length; i++) {
                    name += results1[i].name;
                  }
                }
                resolve(name.substr(0, 35));
              }
          });
    });
    return rez;
}

exports.notifications = async (decoded, offset) => {
    var def_query = "", limit = "", order = "";
    def_query = ` SELECT notifications.id AS id, type, notification, 
    notifications.date, href, \`read\` FROM notifications
    WHERE user_id = ${decoded} OR type = 3`;
    order = " ORDER BY \`date\` DESC, id DESC  ";
    limit = " LIMIT 8 OFFSET ";

    def_query2 = ` SELECT COUNT(notifications.id) AS \`read\` FROM notifications
    WHERE user_id = ${decoded} OR type = 3 AND notifications.read = 0;`;

    const res = await new Promise((resolve, reject) => {
        connection.query(def_query + order + limit + offset, function(error, results){
            if(error)
                resolve();
            connection.query(def_query2, function(error, results1){
                if(error)
                    resolve([]);
                resolve({results, results1});
            });
        });
    });
    return res;
}

exports.editTopic = async (decoded, topic_id) => {
    const rez = await new Promise((resolve, reject) => {
        connection.query(
            ` SELECT tag FROM cat
                LEFT JOIN post_cat_tag ON cat.id = post_cat_tag.cat_id
                LEFT JOIN tags ON tags.id = post_cat_tag.tag_id
                WHERE cat.user_id = ? AND cat.id = ?;`, [decoded, topic_id], async (error, results) => {
              if(!results) {
                resolve();
              } else {
                connection.query(
                    ` SELECT description FROM cat
                        WHERE cat.user_id = ? AND cat.id = ?;`, [decoded, topic_id], async (error1, results1) => {
                      if(!results1) {
                        resolve();
                      } else {
                        resolve({results, results1});
                      }
                });
              }
        });
    });
    return rez;
}

exports.proposals = async (offset) => {
    const rez = await new Promise((resolve, reject) => {
        var query = ` SELECT proposal, approved FROM proposals `;
        var limit = ` LIMIT 12  OFFSET `;

        connection.query(
            query + limit + offset, async (error, results) => {
                if(!results)
                    reject();
                else
                    resolve(results);
        });
    });
    return rez;
}

exports.pd = async (id) => {

    var query1 = ` SELECT username, email, \`password\`, \`date\`, last_payment FROM user WHERE id = ${id}; `;
    var query2 = ` SELECT (SELECT COUNT(id) FROM posts WHERE user_id = ${id} AND reply = "") \`posts\`,
                    (SELECT COUNT(id) FROM posts WHERE user_id = ${id} AND reply != "") \`replies\`,
                    (SELECT COUNT(*) FROM (SELECT id FROM social WHERE user_id = ${id} GROUP BY post_id) a) \`likes\`,
                    (SELECT COUNT(id) FROM reports WHERE user_id = ${id}) \`reports made\`,
                    (SELECT SUM(reports.count) FROM reports 
                        JOIN posts ON posts.id = reports.post_id
                        WHERE posts.user_id = ${id}) \`reports recived\`,
                    (SELECT COUNT(reports.id) FROM reports 
                        JOIN posts ON posts.id = reports.post_id
                        WHERE posts.user_id = ${id} AND reports.approved IN (0,2)) \`ban strikes recived\`; `;
    var query3 = ` SELECT tag AS \`tag\` FROM tags 
                    JOIN post_cat_tag ON post_cat_tag.tag_id = tags.id
                    JOIN posts ON posts.id = post_cat_tag.post_id
                    WHERE posts.user_id = ${id}
                    GROUP BY tag; `;
    var query4 = ` SELECT proposals.proposal AS \`proposal\` FROM proposals 
                    WHERE proposals.user_id = ${id}; `;
    var query5 = ` SELECT cat.cat_name AS \`name\` FROM cat 
                    WHERE cat.user_id = ${id}; `;
    var query6 = ` SELECT cat_name AS \`name\` FROM cat
                    JOIN posts ON cat.id = posts.cat_id
                    WHERE posts.user_id = ${id}
                    GROUP BY cat_name; `;
    var query7 = ` SELECT posts.id AS \`id\`, posts.title AS \`title\`, posts.reply AS \`reply\` FROM posts 
                    JOIN social ON social.post_id = posts.id
                    WHERE social.user_id = ${id}
                    GROUP BY posts.id; `;
    
    const rez = await new Promise((resolve, reject) => {
        connection.query(
            query1, async (error, results1) => {
                if(results1)
                    connection.query(
                        query2, async (error, results2) => {
                            if(results2)
                            connection.query(
                                query3, async (error, results3) => {
                                    if(results3)
                                        connection.query(
                                            query4, async (error, results4) => {
                                                if(results4)
                                                    connection.query(
                                                        query5, async (error, results5) => {
                                                            if(results5)
                                                                connection.query(
                                                                    query6, async (error, results6) => {
                                                                        if(results6)
                                                                            connection.query(
                                                                                query7, async (error, results7) => {
                                                                                    if(results7)
                                                                                        resolve({results1, results2, results3, results4, results5, results6, results7});
                                                                            });
                                                                });
                                                    });  
                                        });
                                });
                    });
        });
    });
    return rez;
}