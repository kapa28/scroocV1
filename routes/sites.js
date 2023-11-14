const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authController = require('../controllers/auth');
const db = require('../db.js');
const DbInstance = db.getDbInstance();
const connection = DbInstance.getConnection();
const dotenv = require('dotenv');
const fetch = require('axios');
const baseURL = "https://scrooc.com";
dotenv.config({ path: './.env'});
router.use(express.json());

const cookieoptions = {
  expires: new Date(
      Date.now() + process.env.jwtcookieexpiresin * 24 * 60 * 60
  ),
  domain: ".scrooc.com",
  sameSite: "lax",
  httpOnly: true,
  secure: true
}

// Search
router.get('/search/:data/:joined?', authController.isLoggedIn, async (req, res, next) => {
  req.check('data', 'error')
    .trim()
    .escape();
  req.check('joined', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  var decoded = 0;
  if(req.params.joined) {
      if(req.user){
        var decoded = req.user.id;
      } else {
        req.flash("flash", 'Your login has expired. Please log in again.');
        return res.redirect('/register');
      }
  }
  const promise = authController.search(req.params.data, decoded);
  promise.then((results) => res.json(results));
});
router.get('/searchTags/:data', async (req, res, next) => {
  req.check('data', 'error')
    .exists()
    .isLength({min: 2})
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  const promise = authController.searchTags(req.params.data);
  promise.then((results) => res.json(results));
});
router.get('/sact/:where', authController.isLoggedIn, async (req, res, next) => {
  req.check('where', 'error')
    .exists()
    .isLength({min: 2})
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  res.render('search', {
    user: req.user, message1: `Searching for`, message: req.params.where + '...'
  });
});

// Notifications
router.get('/notifications/:offset', authController.isLoggedIn, async (req, res, next) => {
  req.check('offset', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  if(req.user){
    const promise = authController.notifications(req.user.id, req.params.offset);
    return promise.then((results) => res.json(results));
  } else {
    const promise = new Promise((resolve, reject) => { resolve([])});
    return promise.then((results) => res.json(results));
  }
});

// Email
router.get('/confirm/:token', async (req, res) => {
  req.check('token', 'error')
    .exists()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'Confirmation failed. Try again.');
    return res.redirect('/register');
  }
  try {
    jwt.verify(req.params.token, process.env.gmail_secret, function(err, decoded) {
      if (err) {
        throw err;
      }
    });
    if (!req.session.verify) {
      throw err;
    }
    const id = req.session.verify;
    //const token = jwt.sign({id}, process.env.jwtsecret);

    connection.query('SELECT confirmed FROM user WHERE id = ?', [id], async (error, results) =>{
      if(!results || results.length < 1 || error) {
        req.flash("flash", 'A server error has occurred.');
        res.redirect('/register');
      } else if(results[0].confirmed == 0) {
        connection.getConnection(function(err, conn) {
          try {
              conn.beginTransaction(async function(err) {
                  if (err) { 
                      throw err;
                  }
                  conn.query('UPDATE user SET confirmed = 1 WHERE id = ?', [id], async (error, results) => {
                    if(error) {
                      throw error;
                    }
                    await conn.commit(async function(err) {
                      if (err) {
                          throw err;
                      }
                      await conn.destroy();
                      //res.cookie('scrooc', token, cookieoptions);
                      req.session.uid = id;
                      req.flash("flash", 'Logged in successfully.');
                      return res.redirect("back");
                    });
                  });
              });
          } catch {
            conn.rollback(function() {
              conn.destroy();
              req.flash("flash", 'Confirmation failed. Try again.');
              return res.redirect('/register');
            });
          }
        });
      } else if(results[0].confirmed == 1) {
        req.flash("flash", 'Email was already confirmed.');
        res.redirect('/register');
      } else {
        req.flash("flash", 'Confirmation failed. Try again.');
        res.redirect('/register');
      }
    });
  } catch (error){
    req.flash("flash", 'A server error has occurred.');
    res.redirect('/register');
  }
})
router.get('/reset/pass/:token', async (req, res) => {
  req.check('token', 'error')
    .exists()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'A server error has occurred. Link might be expired.');
    res.redirect('/register');
  }
  try {
    jwt.verify(req.params.token, process.env.gmail_secret, function(err, decoded) {
      if (err) {
        throw err;
      }
    });
    if (!req.session.verify) {
      throw err;
    }
    /*const id = req.session.verify;
    const {id} = jwt.verify(req.params.token, process.env.gmail_secret).id;*/
    req.flash("flash", 'You can now reset your password.');
    res.render('passReset', {
      id: req.params.token
    });
  } catch (error){
    req.flash("flash", 'A server error has occurred. Link might be expired.');
    res.redirect('/register');
  }
})
router.get('/reset/email/:token', async (req, res) => {
  req.check('token', 'error')
    .exists()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'A server error has occurred.');
    res.redirect('/register');
  }
  try {
    jwt.verify(req.params.token, process.env.gmail_secret, function(err, decoded) {
      if (err) {
        throw err;
      }
    });
    if (!req.session.verify || !req.session.email) {
      throw err;
    }
    const {id} = req.session.verify;
    const {email} = req.session.email;

    connection.getConnection(function(err, conn) {
      try {
          conn.beginTransaction(async function(err) {
              if (err) { 
                  throw err
              }

              conn.query(`UPDATE user SET email = ? WHERE id = ?`, [email, id], async (error, results) => {
                if(error) {
                  throw error
                }
                await conn.commit(async function(err) {
                  if (err) {
                      throw err;
                  }
                  await conn.destroy();
                  // res.cookie('scrooc', token, cookieoptions);
                  req.session.uid = req.session.verify;
                  req.flash("flash", 'Email successfully reset.');
                  res.redirect('/');
                });
              });
          })
      } catch {
        return conn.rollback(function() {
          conn.destroy();
          req.flash("flash", 'A server error has occurred.');
          res.redirect('/register');
        });
      }
    });
  } catch (error){
    req.flash("flash", 'A server error has occurred.');
    res.redirect('/register');
  }
})
router.get('/reset/user/:token', async (req, res) => {
  req.check('token', 'error')
    .exists()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'A server error has occurred. Link might be expired.');
    res.redirect('/register');
  }
  try {
    jwt.verify(req.params.token, process.env.gmail_secret, function(err, decoded) {
      if (err) {
        throw err;
      }
    });
    if (!req.session.verify) {
      throw err;
    }

    req.flash("flash", 'You can now reset your username.');
    res.render('userReset', {
      id: req.params.token
    });
  } catch (error){
    req.flash("flash", 'A server error has occurred. Link might be expired.');
    res.redirect('/register');
  }
})

// Load keywords
router.get('/loadKeywords/:type/:where', async (req, res, next) => {
  req.check('type', 'error')
    .exists()
    .trim()
    .escape();
  req.check('where', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  const promise = authController.keywords(req.params.type, req.params.where);
  promise.then(results => res.json(results));
});

// Topic page
router.get('/topic/:topic', authController.isLoggedIn, async (req, res, next) => {
  req.check('topic', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'A server error has occurred.');
    res.redirect('/');
  }
  try {
    if(req.user) {
      const promise = authController.topic(req.params.topic, req.user.id);
      promise.then((results) => {
          res.render('topic', {
            user: req.user, message: results[0].cat_name, message1: `Take a look around ${req.user.username}!<i class="report-topic-icon" tabindex="1" onclick="reportTopic(${results[0].id})"></i>`, results: results,
          });
      });
    } else {
      const promise = authController.topic(req.params.topic, null);
      promise.then((results) => {
        res.render('topic', {
          user: req.user, message: results[0].cat_name, message1: `Take a look around!`, results: results,
        });
      });
    }
  } catch (error) {
    req.flash("flash", 'A server error has occurred.');
    res.redirect('/topic/' + req.params.topic);
  }
});

// Single post page
router.get('/act/:topic/:id/:title?', authController.isLoggedIn, async (req, res, next) => {
  req.check('topic', 'error')
    .exists()
    .trim()
    .escape();
  req.check('id', 'error')
    .exists()
    .trim()
    .escape();
  req.check('title', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'A server error has occurred.');
    res.redirect('back');
  }

  var decoded;
  if(req.user != null)
    decoded = req.user.id;
  else 
    decoded = 1;

  try {
    const promise = authController.act(req.params.id, decoded);
    var usern = "";
    promise.then(async (results) => {
      try {
        usern = await authController.username();
      } catch (error) {
      }
      res.render('act', {
        user: req.user, message: 'What are your thoughts?', message1: '', results: results, username: await usern, url: encodeURIComponent(baseURL + `/act/${req.params.topic}/${req.params.id}/${req.params.title}`)
      });
    });
  } catch (error) {
    req.flash("flash", 'A server error has occured.');
    res.redirect('back');
  }
});
router.get('/loadReplies/:id/:replyOffset', authController.isLoggedIn, (req, res, next) => {
  req.check('id', 'error')
    .exists()
    .trim()
    .escape();
  req.check('replyOffset', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  try {
    const promise = authController.replies(req.params.id, req.params.replyOffset);
    promise.then(results => res.json(results));
  } catch (error) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
});

// Load posts
router.get('/load/:offset/:sort/:where?', authController.isLoggedIn, async (req, res, next) => { 
  req.check('offset', 'error')
    .exists()
    .trim()
    .escape();
  req.check('sort', 'error')
    .exists()
    .trim()
    .escape();
  req.check('where', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  
  var where1 = null;
  if(typeof(req.params.where) == "undefined")
    where1 = '';
  else
    where1 = req.params.where; 

  var decoded;
  if(req.user != null)
    decoded = req.user.id;
  else 
    decoded = 1;

  try {
    const promise = authController.posts(req.params.offset, req.params.sort, where1, decoded);
    promise.then(results => res.json(results));
  } catch (error) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
});
router.get('/loadTopic/:offset/:sort/:where?', authController.isLoggedIn, async (req, res, next) => { 
  req.check('offset', 'error')
    .exists()
    .trim()
    .escape();
  req.check('sort', 'error')
    .exists()
    .trim()
    .escape();
  req.check('where', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  
  var where1 = null;
  if(typeof(req.params.where) == "undefined")
    where1 = '';
  else
    where1 = req.params.where; 

  try {
    const promise = authController.topics(req.params.offset, req.params.sort, where1);
    promise.then(results => res.json(results));
  } catch (error) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
});
router.get('/loadExplore/:offset/:sort/:where?', authController.isLoggedIn, async (req, res, next) => { 
  req.check('offset', 'error')
    .exists()
    .trim()
    .escape();
  req.check('sort', 'error')
    .exists()
    .trim()
    .escape();
  req.check('where', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }

  var where1 = null;
  if(typeof(req.params.where) == "undefined")
    where1 = '';
  else
    where1 = req.params.where; 
  
  try {
    const promise = authController.recommendTopic(req.params.offset, req.params.sort, where1, req.user.id);
    promise.then(results => res.json(results));
  } catch (error) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
});
router.get('/loadProposals/:offset', async (req, res, next) => { 
  req.check('offset', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  try {
    const promise = authController.proposals(req.params.offset);
    promise.then(results => res.json(results));
  } catch (error) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
});

// Load stats table
router.get('/loadTable/:tableOffset', authController.isLoggedIn, (req, res, next) => {
  req.check('tableOffset', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  try {
    const promise = authController.records(req.params.tableOffset);
    promise.then(results => res.json(results));
  } catch (error) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
});

// Like a post
router.get('/like/:post_id', authController.isLoggedIn, async (req, res, next) => {
  req.check('post_id', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(1)});
    return promise.then((results) => res.json(results));
  }
  var decoded;
  if(req.user != null) {
    decoded = req.user.id;
    try {
      await authController.like(req.params.post_id, decoded);
      const promise = new Promise((resolve, reject) => { resolve(0)});
      return promise.then((results) => res.json(results));
    } catch (error) {
      const promise = new Promise((resolve, reject) => { resolve(1)});
      return promise.then((results) => res.json(results));
    }
  } else {
      const promise = new Promise((resolve, reject) => { resolve(2)});
      return promise.then((results) => res.json(results));
  }
});

// Join a topic
router.get('/topicJoin/:topic_id/:topic_name?', authController.isLoggedIn, async (req, res, next) => {
  req.check('topic_id', 'error')
    .exists()
    .trim()
    .escape();
  req.check('topic_name', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'Something went wrong while joining. Try again.');
    return res.redirect(req.get('referer'));
  }
  var decoded;
  if(req.user != null) {
    decoded = req.user.id;
    try {
      const promise = authController.joinTopic(req.params.topic_id, decoded);
      promise.then(async results => {
        var cat_name;
        connection.query(`  SELECT cat_name FROM cat 
                            WHERE id = ?`, [req.params.topic_id], 
                            (error, results1) => {
          if(error)
              throw error;
          else {
            if(req.params.topic_name) {
              switch(results){
                case 0:
                  req.flash("flash", `You've left ` + results1[0].cat_name);
                  return res.redirect('../../../../topic/' + req.params.topic_name);
                case 1:
                  req.flash("flash", `You've joined ` + results1[0].cat_name);
                  return res.redirect('../../../../topic/' + req.params.topic_name);
              }
            } else {
              switch(results){
                case 0:
                  req.flash("flash", `You've left ` + results1[0].cat_name);
                  return res.redirect('../../../../explore');
                case 1:
                  req.flash("flash", `You've joined ` + results1[0].cat_name);
                  return res.redirect('../../../../explore');
              }
            }
          }
        });
      });
    } catch (error) {
      req.flash("flash", 'Something went wrong while joining. Try again.');
      return res.redirect(req.get('referer'));
    }
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    return res.redirect(req.get('referer'));
  }
});

// Save notes
router.get('/notes/:note', authController.isLoggedIn, async (req, res) => {
  req.check('note', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'Something went wrong while saving. Try again.');
    return res.redirect("/profile");
  }
  var decoded;
  if(req.user) {
    decoded = req.user.id;
    try {
      connection.getConnection(function(err, conn) {
        conn.beginTransaction(async function(err) {
            if (err) { 
                return conn.rollback(function() {
                  req.flash("flash", 'Something went wrong while saving. Try again.');
                  return res.redirect("/profile");
                });
            }
            
            conn.query(` UPDATE user SET notes = ? WHERE id = ?; `, [req.params.note, decoded], async (error, results) => {
              if(error){
                return conn.rollback(function() {
                  req.flash("flash", 'Something went wrong while saving. Try again.');
                  return res.redirect("/profile");
                });
              }

              await conn.commit(async function(err) {
                if (err) {
                    return conn.rollback(function() {
                        conn.destroy();
                        req.flash("flash", 'Something went wrong while saving. Try again.');
                        return res.redirect("/profile");
                    });
                }
                await conn.destroy();
                req.flash("flash", 'Notes saved successfully.');
                return res.redirect("/profile");
              });
          });
        })
      });
    } catch (error) {
      req.flash("flash", 'Something went wrong while saving. Try again.');
      return res.redirect("/profile");
    }
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    return res.redirect('/register');
  }
});

// Delete user activities
router.get('/deleteActivity', authController.isLoggedIn, async (req, res) => {
  var decoded;
  if(req.user != null) {
    decoded = req.user.id;
    try {
      connection.getConnection(function(err, conn) {
        try {
            conn.beginTransaction(async function(err) {
                if (err) { 
                    throw err
                }
                await conn.query(` UPDATE posts SET user_id = 1, username ='x _ x' WHERE posts.user_id= ? ; `, [decoded], async (error, results) => {
                  if(error) {
                    throw error
                  }
                  await conn.commit(async function(err) {
                    if (err) {
                        throw err;
                    }
                    await conn.destroy();
                    req.flash("flash", 'Deleted successfully.');
                    return res.redirect('back');
                  });
                });
              })
        } catch {
          return conn.rollback(function() {
            conn.destroy();
          });
        }
      });
    } catch (error) {
      req.flash("flash", 'Something went wrong while deleting. Try again.');
      res.redirect('back');
    }
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    res.redirect('back');
  }
});

// Delete a post
router.get('/deletePost/:post_id', authController.isLoggedIn, async (req, res) => {
  req.check('post_id', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'Something went wrong while deleting. Try again.');
    return res.redirect('back');
  }
  var decoded;
  if(req.user != null) {
    decoded = req.user.id;
    try {
      connection.getConnection(function(err, conn) {
        try {
          conn.beginTransaction(async function(err) {
            if (err) { 
                throw err
            }
            conn.query(` UPDATE posts SET user_id = 1, username ='x _ x' WHERE posts.user_id = ? AND posts.id = ?; `, [decoded, req.params.post_id], async (error, results) => {
              if(error) {
                throw error
              }
              await conn.commit(async function(err) {
                if (err) {
                    throw err;
                }
                await conn.destroy();
                req.flash("flash", 'Deleted successfully.');
                return res.redirect('back');
              });
            });
          });
        } catch {
          return conn.rollback(function() {
            conn.destroy();
          });
        }
      });
    } catch (error) {
      req.flash("flash", 'Something went wrong while deleting. Try again.');
      return res.redirect('back');
    }
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    return res.redirect('back');
  }
});
// Read notificaiton
router.get('/read/:notification_id', authController.isLoggedIn, async (req, res) => {
  req.check('notification_id', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(0)});
    return promise.then((results) => res.json(results));
  }
  const promise = new Promise((resolve, reject) => { 
    if(req.user != null) {
      try {
        connection.getConnection(function(err, conn) {
          try {
            conn.beginTransaction(async function(err) {
              if (err)
                  throw err
              conn.query(` UPDATE notifications SET \`read\` = 1 WHERE id = ? AND user_id; `, [req.params.notification_id, req.user.id], async (error, results) => {
                if(error)
                  throw error;
                await conn.commit(async function(err) {
                  if (err) {
                      throw err;
                  }
                  conn.destroy();
                  return resolve(1);
                  
                });
              });
            });
          } catch {
            return conn.rollback(function() {
              conn.destroy();
              return resolve(0);
            });
          }
        });
      } catch (error) {
        return resolve(0);
      }
    }
  });
  return promise.then((results) => res.json(results));
});
// Save theme
router.get('/saveTheme/:theme', authController.isLoggedIn, async (req, res) => {
  req.check('theme', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(false)});
    return promise.then((results) => res.json(results));
  }
  const promise = new Promise((resolve, reject) => { 
    if(req.user != null) {
      var date = new Date();
      date.setMonth(date.getMonth() - 3);
      if(+req.user.last_payment < +date) {
        try {
          connection.getConnection(function(err, conn) {
            try {
              conn.beginTransaction(async function(err) {
                if (err)
                    throw err
                conn.query(` UPDATE user SET theme = ? WHERE id = ?; `, [req.params.theme, req.user.id], async (error, results) => {
                  if(error)
                    throw error;
                  await conn.commit(async function(err) {
                    if (err) {
                        throw err;
                    }
                    conn.destroy();
                    console.log("success")
                    return resolve(true);
                  });
                });
              });
            } catch {
              return conn.rollback(function() {
                conn.destroy();
                return resolve(false);
              });
            }
          });
        } catch (error) {;
          return resolve(false);
        }
      } else 
        return resolve(false);
    } else 
      return resolve(false);
  });
  return promise.then((results) => res.json(results));
});

// Load pages
router.get('/', authController.isLoggedIn, (req, res, next) => {
  res.render('index', {
    user: req.user, message: 'Enjoy your scrooc.com visit :D', message1: ''
  });
});
router.get('/logout', authController.isLoggedIn, (req, res, next) => {
  res.render('index', {
    user: req.user, message: 'Enjoy your scrooc.com visit :D', message1: '', logout: true
  });
});

// Basic sitemap + robots
router.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/html');
  res.render('robots')
});
router.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'text/xml');
  res.render('sitemap');
});

// Pages
router.get('/stats', authController.isLoggedIn, (req, res) => {
  res.render('stats', {
    user: req.user, message: 'Have some stats:', message1: 'statistics and such'
  });
});
router.get('/explore', authController.isLoggedIn, (req, res) => {
  if(req.user) 
    res.render('explore', {
      user: req.user, message: 'Try to find something new!', message1:  'Here are some topics and posts you might like...'
    }) 
  else
    res.redirect('/register');
});
router.get('/about', authController.isLoggedIn, (req, res) => {
    res.render('about', {
      user: req.user, message: 'About us'
    });
});
router.get('/policies', authController.isLoggedIn, (req, res) => {
    res.render('policies', {
      user: req.user, message: 'Privacy policy', message1: 'Last updated: <div id="PPupdate"></div>'
    });
});
router.get('/data', authController.isLoggedIn, async (req, res) => {
  if(req.user) {
    const pd = await authController.pd(req.user.id);
    return res.render('data', {
      user: req.user, message: 'See what we collect about you:', message1: 'Le GDPR', pd: pd
    });
  } else {
    return res.redirect('/register');
  }
});
// zaakaj ni sporocila ??
router.get('/register/:verify?', authController.isLoggedIn, (req, res) => {
  req.check('verify', 'error')
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    res.render('register', {
      user: req.user
    });
  }
  if(req.params.verify)
    res.render('register', {
      resend: true, user: req.user
    });
  else
    res.render('register', {
      user: req.user
    });
});
router.get('/reset', authController.isLoggedIn, (req, res) => {
  res.render('reset', {
    user: req.user
  });
});
router.get('/profile', authController.isLoggedIn, async (req, res) => {
  if(req.user) {
    res.render('profile', {
      user: req.user, message1: 'Your very own profile.', message: `hOW it Do ${req.user.username}`, notes: req.user.notes, moderation: req.user.moderation
    });
  } else {
    res.redirect('/register');
  }
});
router.get('/mod', authController.isLoggedIn, async (req, res) => {
  if(req.user) {
    if(req.user.moderation == 1 || req.user.moderation == 2) {
      res.render('postMod', {
        user: req.user, /*message1: 'You will be assigned random reported pages,',*/ message: 'judge carefully...'
      });
    } else {
      req.flash("flash", 'You are not a moderator =[.');
      res.redirect('back');
    }
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    res.redirect('/register');
  }
});
router.get('/1n2o3t4i5f6M7o8d9', authController.isLoggedIn, async (req, res) => {
  if(req.user) {
    if(req.user.moderation == 2) {
      res.render('notificationMod', {
        user: req.user, message: '-_-'
      });
    } else {
      req.flash("flash", 'You are not a moderator =[.');
      res.redirect('back');
    }
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    res.redirect('/register');
  }
});
router.get('/proposals', authController.isLoggedIn, async (req, res) => {
  if(req.user) {
    res.render('proposals', {
      user: req.user, message: 'Suggest changes to the system', message1: 'How it works, what it lacks...'
    });
  } else {
    res.render('proposals', {
      message: 'Suggest changes to the system', message1: 'How it works, what it lacks...'
    });
  }
});
router.get('/payment', authController.isLoggedIn, async (req, res) => {
  if(req.user) {
    res.render('payment', {
      user: req.user, message: 'Support Scrooc.com', message1: 'and get additional benefits'
    });
  } else {
    res.redirect("/register");
  }
});
// nared axios calle namest cross fetch
router.get('/payment_invoice/:payment_id', authController.isLoggedIn, async (req, res) => {
  req.check('payment_id', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    req.flash("flash", 'A network error has occurred.');
    res.redirect("/");
  }
  if(req.user) {
    var requestOptions = {
      headers: { "x-api-key": "2J8N0CE-B4A4MW0-K4PGY4T-H8KF6JM" },
      redirect: 'follow'
    };
    fetch.get("https://api.nowpayments.io/v1/payment/" + req.params.payment_id, requestOptions)
      .then(result => {
        result = result.data;
        if(req.user.id == result.order_id) {
          if((result.payment_status == "confirmed" || result.payment_status == "finished") && result.price_amount > 10) {
            connection.getConnection(function(err, conn) {
                try {
                  conn.beginTransaction(async function(err) {
                    if (err) { 
                        throw err;
                    }
                    conn.query(`UPDATE user SET last_payment = ? WHERE id = ?;`, [result.updated_at, req.user.id], async (error, results) => {
                      if(error) {
                          throw err;
                      } else {
                        await conn.commit(async function(err) {
                          if (err) {
                              throw err;
                          } else {
                            await conn.destroy();
                            req.flash("flash", "You now how supporter features for the next 3 months. Thank you =]");
                            return res.redirect('/');
                          }
                        });
                      }
                    })
                  })
                } catch {
                    conn.destroy();
                    req.flash("flash", "Updating subscription failed :(.");
                    return res.redirect('/');
                }
            })
          }
          res.render('payment_invoice', {
            user: req.user, message: 'Payment status: ' + result.payment_status, message1: 'Info on payment  <b class="copy-crypto" onclick="copy(\''+ baseURL + '/payment_invoice/' + result.payment_id + '\')">' + result.payment_id + '</b>', 
            invoice_address: result.pay_address, invoice_currency: result.pay_currency.toUpperCase(), payment_amount: result.pay_amount,
            invoice_estimation: result.price_amount.toFixed(2), price_currency: result.price_currency.toUpperCase(), payment_id: result.payment_id
          });
        } else {
          req.flash("flash", 'A network error has occurred.');
          res.redirect("/");
        }
      })
      .catch(error => console.log(error)); 
  } else {
    req.flash("flash", 'Your login has expired. Please log in again.');
    res.redirect("/register");
  }
});

// Render for post
router.get('/post', authController.isLoggedIn, async (req, res, next) => {
  if( req.user ) {
    res.render('post', {
      user: req.user, username: await authController.username()
    });
  } else {
    res.redirect('/register');
  }
});
router.get('/createTopic', authController.isLoggedIn, (req, res, next) => {
  if( req.user ) {
      res.render('createTopic', {
        user: req.user
      });
    }
  else {
    res.redirect('/register');
  }
});
router.get('/username', authController.isLoggedIn, (req, res, next) => {
  if(req.user != null) {
    try {
      const promise = authController.username();
      promise.then(results => res.json(results));
    } catch (error) {
      res.json('error');
    }
  } else {
    res.json('login');
  }
});
router.get('/editTopic/:topic_id', authController.isLoggedIn, (req, res, next) => {
  req.check('topic_id', 'error')
    .exists()
    .trim()
    .escape();
  error = req.validationErrors();
  if(error != false || null) {
    const promise = new Promise((resolve, reject) => { resolve(null)});
    return promise.then((results) => res.json(results));
  }
  if(req.user) {
    const promise = authController.editTopic(req.user.id, req.params.topic_id);
    promise.then(results => res.json(results));
  }
}); 

// Fetch response for logged in / not logged in
router.get('/fetchLogin', authController.isLoggedIn, (req, res, next) => {
  if(req.user != null) {
    res.json('true');
  } else {
    res.json('false');
  }
}); 
router.get('/generateId', authController.isLoggedIn, (req, res, next) => {
  if(req.user) {
    const promise = new Promise((resolve, reject) => { resolve(req.user.id)});
    return promise.then((results) => res.json(results));
  }
}); 

module.exports = router;