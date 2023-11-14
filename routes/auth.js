// Imports
const express = require('express');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/auth');
const router = express.Router();
const multer  = require('multer');
const fs = require('fs');
const fsPromises = fs.promises;
const sharp = require('sharp');
const path = require('path');
const db = require('../db.js');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config({ path: './.env'});
const Lame = require("node-lame").Lame;
// const { promisify } = require('util');
// const { check, validationResult } = require('express-validator/check');

// DB init
const DbInstance = db.getDbInstance();
const connection = DbInstance.getConnection();
var cat_id = 0;

// Mail
const baseURL = "https://scrooc.com";
const style = `
        <meta http-equiv="X-UA-Compatible" content="IE=edge"><link rel="manifest" href="../../../manifest.json">
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="import" href="//fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;600&display=swap" async>
		<style>
            @media screen and (max-width: 740px) {
                * {
                    scrollbar-width: none
                }
                li {
                    font-size: 0.95em;
                    padding: 0 5px
                }
                button {
                    margin: auto
                }
                .side-menu {
                    width: 100%
                }
                .menu {
                    height: 4em
                }
                .container {
                    margin: 9em 0 2em
                }
                .post {
                    margin: 1em auto;
                    width: 88vw
                }
                .load-container {
                    margin: 0 0 -6em 0;
                    padding-bottom: 6em
                }
            }

            @media screen and (max-width: 580px ) {
                .side-menu {
                    margin-right: 4em
                }
                .post-title {
                    font-size: 1.2em
                }
                .load {
                    font-size: 0.9em
                }
            }

            @media screen and (max-width: 540px ) {
                .user-input {
                    margin: 5em 15vw
                }
                .post {
                    margin-left: auto;
                    margin-right: auto
                }
            }

            @media (max-width: 430px) {
                .post {
                    padding: 0.5em 0.5em 2em 0
                }
                .post-title {
                    font-size: 1em
                }
                .logo_bottom a {
                    display: inline-table;
                    margin: 0.4em 0;
                }
            }
        </style>`;

// Shortcut za spam limite -1
const limit_post = 4;
const limit_topic = 2;
const limit_reply = 7;
const limit_report = 4;
const limit_judge = 4;

// Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.gmail_host,
    port: process.env.gmail_port,
    secure: true,
    auth: {
        user: process.env.gmail_user,
        pass: process.env.gmail_pass,
    }
});

// Maybe prestav par delov code v controllers module? alpa tud ne

// Multer (file upload) setup
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null,'./public/user_uploads/')
    },
    fileFilter: function(req, file, cb){
        const filetypes = /jpeg|jpg|png|mp3|ogg|acc|wav|gif/;
        const smaller = /mp3|ogg|acc|wav|gif/;
        if (req.fileValidationError) {
            return res.send(fileValidationError);
        }
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if(mimetype && extname && fileSize < 13000000){
            if(smaller.test(file.originalname) && fileSize < 3800000){
                return cb(null,false);
            }
            else {
                return cb(null,true);
            }
        } 
        else {
            cb('Format not allowed!');
        }
    },
    filename: function (req, file, cb) {
        var ext = file.originalname.substring(file.originalname.lastIndexOf('.'), file.originalname.length);
        cb(null, Date.now() + (file.originalname.split('.')[0].substring(0,  37)).split(' ').join('_') + ext)
    }
});
const upload = multer( { storage: storage }).single('user_file');

// Login, logout, register
router.post('/register', async (req, res, next) => {
    const { username, email, password, passwordconfirm, honey } = req.body;
    var date = new Date();
    date.setMonth(date.getMonth() - 3);
    var date2 = new Date();

    req.check('username', 'This username is invalid.')
        .exists()
        .isLength({min: 3, max: 75})
        .trim()
        .escape(); 

    req.check('email', 'Make sure your email is formatted properly.')
        .trim()
        .escape()
        .normalizeEmail();

    req.check('password', 'This password is too short or too long.')
        .exists()
        .isLength({min: 3, max: 75})
        .trim()
        .escape();

    req.check('password', 'Passwords don\'t match')
        .custom(value => {
            if(value == passwordconfirm)
                return true;
            return false;
        });
    req.check('honey', 'This password is too short or too long.')
        .trim()
        .escape();

    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/register');
    } else {
        connection.query("SELECT id FROM user WHERE username = ?", [username], async function(err, results) {
            if (results[0] || err) {
                req.flash("flash", "This username is already taken.");
                return res.redirect('/register');
            }
            else {
                if(honey === ' ') {
                    var hashedEmail = await bcrypt.hash(email, parseInt(process.env.hash_length));
                    var hashedPassword = await bcrypt.hash(password, parseInt(process.env.hash_length));

                    connection.getConnection(async function(err, conn) {
                        try {
                            conn.beginTransaction(async function(err) {
                                if (err) { 
                                    throw err
                                }
                                conn.query(`INSERT INTO USER SET username = ?, email = ?, password = ?, date = ?, last_payment = ? ; SELECT LAST_INSERT_ID();`, [username, hashedEmail, hashedPassword, date2, date2], async (error, results1) => {
                                    if(error){
                                        throw error
                                    } else {
                                        req.session.verify = await results1[0].insertId;
                                        jwt.sign(
                                            {},
                                            process.env.gmail_secret,
                                            {
                                                expiresIn: '1d',
                                            },
                                            (err, emailToken) => {
                                                const url = baseURL + `/confirm/${emailToken}`;
            
                                                transporter.sendMail({
                                                    from: `"Scrooc" <${process.env.gmail_user}>`,
                                                    to: `${email}`,
                                                    subject: 'Confirm your email address.',
                                                    html: ` <!DOCTYPE html>
                                                    <html lang="en">
                                                        <head>
                                                            <title>Scrooc: Finnish your verification</title>
                                                            ${style}
                                                        </head>
                                                        <body style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            <table style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;table-layout: fixed;border-collapse: collapse;height: 100vh;width: 100%;">
                                                                <tbody style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                        <td class="header" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: top;display: table-cell;">
                                                                            <h1 class="logo" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;">
                                                                                <a class="full-width" href="https://scrooc.com/" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;display: block;width: 100%;height: 100%;text-align: center;">
                                                                                    scrooc
                                                                                </a>
                                                                            </h1>
                                                                        </td>
                                                                    </tr>
                                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                        <td class="maintd" style="font-family: 'Titillium Web', sans-serif;padding: 2em;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;background: radial-gradient(white, transparent);">
                                                                            <div class="main" style="color=: ;font-family: 'Titillium Web', sans-serif;padding: 0;margin: auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;max-width: 64em;" #333"">
                                                                                <h1 style="font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">Finnish your verification</h1>
                                                                                <div style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    Please click the link below to finnish your account verification: <br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><li class="line-left" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.1em;text-decoration: underline;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;font-weight: bold;margin-left: 1em;"><a href="${url}" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;">${url}</a></li><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    Best regards,<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    Scrooc dev team.
                                                                                </div><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                <div id="info" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 0.85em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;margin-top: 1em;background-color: #aeaeae4b;border-radius: 12px;border: 3px solid #707070;position: relative;box-shadow: 0px 6px 35px #aaa;">
                                                                                    If you hadn't made an account with us than this email was sent by mistake.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"> Feel free to delete it.
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                        <td class="footer" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: bottom;display: table-cell;">
                                                                            <h1 class="logo logo_bottom" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 0.6em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;display: inline-grid;">
                                                                                <div class="center_menu" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 2em auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    <a href="https://scrooc.com/policies" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);padding-left: 2em;">Privacy policy &amp; ToS</a>
                                                                                    <a href="https://scrooc.com/about" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">About</a>
                                                                                    <a href="https://scrooc.com/payment" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">Spare us a few coins</a>
                                                                                </div>
                                                                            </h1>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </body>
                                                    </html>`,
                                                    attachments:[{
                                                        filename : 'bg.jpg',
                                                        path: __dirname + '/../public/img/bg.png',
                                                        cid : 'bg@scrooc.com'
                                                    }],
                                                });
            
                                                transporter.sendMail({
                                                    from: `"Scrooc" <${process.env.gmail_user}>`,
                                                    to: email,
                                                    subject: 'Scrooc.com special access code.',
                                                    html: ` <!DOCTYPE html>
                                                    <html lang="en">
                                                        <head>
                                                            <title>Scrooc: Save your special access code</title>
                                                            ${style}
                                                        </head>
                                                        <body style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            <table style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;table-layout: fixed;border-collapse: collapse;height: 100vh;width: 100%;">
                                                                <tbody style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                        <td class="header" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: top;display: table-cell;">
                                                                            <h1 class="logo" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;">
                                                                                <a class="full-width" href="https://scrooc.com/" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;display: block;width: 100%;height: 100%;text-align: center;">
                                                                                    scrooc
                                                                                </a>
                                                                            </h1>
                                                                        </td>
                                                                    </tr>
                                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                        <td class="maintd" style="font-family: 'Titillium Web', sans-serif;padding: 2em;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;background: radial-gradient(white, transparent);">
                                                                            <div class="main" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;max-width: 64em;">
                                                                                <h1 style="font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">Save your special access code</h1>
                                                                                <div style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    We are sending you this special access code that will allow you to 
                                                                                    reset your username if you want to change it for safety reasons or if you 
                                                                                    forget it. The best practice is to write it down somewhere safe (eg. piece of paper)
                                                                                    and to delete this mail so it can't get compromised.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                            
                                                                                    <div style="text-align: center;font-size: 1.5em;background: lightGray;padding: 1em 2em;margin: 1em;color: #333;font-family: 'Titillium Web', sans-serif;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">${results1[0].insertId}</div>
                            
                                                                                    Best regards,<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    Scrooc dev team.
                                                                                </div><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                <div id="info" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 0.85em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;margin-top: 1em;background-color: #aeaeae4b;border-radius: 12px;border: 3px solid #707070;position: relative;box-shadow: 0px 6px 35px #aaa;">
                                                                                    If you hadn't made an account with us than this email was sent by mistake.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"> Feel free to delete it.
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                        <td class="footer" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: bottom;display: table-cell;">
                                                                            <h1 class="logo logo_bottom" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 0.6em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;display: inline-grid;">
                                                                                <div class="center_menu" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 2em auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                                    <a href="https://scrooc.com/policies" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);padding-left: 2em;">Privacy policy &amp; ToS</a>
                                                                                    <a href="https://scrooc.com/about" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">About</a>
                                                                                    <a href="https://scrooc.com/payment" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">Spare us a few coins</a>
                                                                                </div>
                                                                            </h1>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </body>
                                                    </html>`,
                                                    attachments:[{
                                                        filename : 'bg.jpg',
                                                        path: __dirname + '/../public/img/bg.png',
                                                        cid : 'bg@scrooc.com'
                                                    }],
                                                });

                                                conn.commit(async function(err) {
                                                    if (err) {
                                                        throw err;
                                                    }
                                                    await conn.destroy();
                                                    req.flash("flash", "You have successfully created an account. The last step is to confirm your email so we know you are legit =].");
                                                    return res.redirect('/register');
                                                });
                                            }
                                        )
                                    }
                                }) 
                            })
                        } catch {
                            return conn.rollback(async function() {
                                conn.destroy();
                                req.flash("flash", 'A server error has occurred.');
                                res.redirect('/register');
                            });
                        }
                    });  
                } else {
                    req.flash("flash", "Stop being a bot. Boop beep");
                    return res.redirect('/register');
                }
            }
        });
    }
});
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Email post
router.post('/resend', async (req, res, next) => {
    const { email } = req.body;
    req.check('email', 'Make sure your email is formatted properly.')
        .trim()
        .escape()
        .normalizeEmail();

    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/register');
    } else {
        if(req.session.verify) {
            try {
                jwt.sign(
                    {},
                    process.env.gmail_secret,
                    {
                        expiresIn: '1d',
                    },
                    (err, emailToken) => {
                        const url = baseURL + `/confirm/${emailToken}`;
            
                        transporter.sendMail({
                            from: `"Scrooc" <${process.env.gmail_user}>`,
                            to: email,
                            subject: 'Confirm your email address.',
                            html: ` <!DOCTYPE html>
                            <html lang="en">
                                <head>
                                    <title>Scrooc: Finnish your verification</title>
                                    ${style}
                                </head>
                                <body style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                    <table style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;table-layout: fixed;border-collapse: collapse;height: 100vh;width: 100%;">
                                        <tbody style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                            <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <td class="header" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: top;display: table-cell;">
                                                    <h1 class="logo" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;">
                                                        <a class="full-width" href="https://scrooc.com/" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;display: block;width: 100%;height: 100%;text-align: center;">
                                                            scrooc
                                                        </a>
                                                    </h1>
                                                </td>
                                            </tr>
                                            <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <td class="maintd" style="font-family: 'Titillium Web', sans-serif;padding: 2em;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;background: radial-gradient(white, transparent);">
                                                    <div class="main" style="color=: ;font-family: 'Titillium Web', sans-serif;padding: 0;margin: auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;max-width: 64em;" #333"">
                                                        <h1 style="font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">Finnish your verification</h1>
                                                        <div style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            Please click the link below to finnish your account verification: <br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><li class="line-left" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.1em;text-decoration: underline;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;font-weight: bold;margin-left: 1em;"><a href="${url}" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;">${url}</a></li><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            Best regards,<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            Scrooc dev team.
                                                        </div><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                        <div id="info" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 0.85em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;margin-top: 1em;background-color: #aeaeae4b;border-radius: 12px;border: 3px solid #707070;position: relative;box-shadow: 0px 6px 35px #aaa;">
                                                            If you hadn't made an account with us than this email was sent by mistake.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"> Feel free to delete it.
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <td class="footer" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: bottom;display: table-cell;">
                                                    <h1 class="logo logo_bottom" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 0.6em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;display: inline-grid;">
                                                        <div class="center_menu" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 2em auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            <a href="https://scrooc.com/policies" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);padding-left: 2em;">Privacy policy &amp; ToS</a>
                                                            <a href="https://scrooc.com/about" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">About</a>
                                                            <a href="https://scrooc.com/payment" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">Spare us a few coins</a>
                                                        </div>
                                                    </h1>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </body>
                            </html>`,
                            attachments:[{
                                filename : 'bg.jpg',
                                path: __dirname + '/../public/img/bg.png',
                                cid : 'bg@scrooc.com'
                            }],
                        });

                        req.flash("flash", "Confirmation email sent. Now it's up to you to confirm it =].");
                        return res.redirect('/register');
                    }
                )
            } 
            catch (error) {
                req.flash("flash", "A server error has occurred.");
                return res.redirect('/register');
            }
        } else {
            req.flash("flash", "Attempt to login first.");
            return res.redirect('/register');
        }
    }
});
router.post('/passReset', async (req, res) => {
    var error = null;
    var email = req.body.email;

    req.check('email', 'Make sure your email is formatted properly.')
        .trim()
        .escape()
        .normalizeEmail();
    error = req.validationErrors();
    
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/reset');
    } else {
        if(req.session.verify) {
            try {
                const decoded = req.session.verify;
                connection.query(`SELECT email FROM user WHERE id = ?;`, [decoded], async (error, results) => {
                    if(error){
                        req.flash("flash", "Error while updating your password. Try again.");
                        return res.redirect('/reset');
                    } else if(!results || results.length < 1) {
                        req.flash("flash", "Error while updating your password. Try again.");
                        return res.redirect('/reset');
                    } else if(await bcrypt.compare(email, results[0].email)) {
                        jwt.sign(
                            {},
                            process.env.gmail_secret,
                            {
                                expiresIn: '1d',
                            },
                            (err, emailToken) => {
                                const url = baseURL + `/reset/pass/${emailToken}`;
                                transporter.sendMail({
                                    from: `"Scrooc" <${process.env.gmail_user}>`,
                                    to: email,
                                    subject: 'Reset your password.',
                                    html: ` <!DOCTYPE html>
                                    <html lang="en">
                                        <head>
                                            <title>Scrooc: Finnish resetting your password</title>
                                            ${style}
                                        </head>
                                        <body style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                            <table style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;table-layout: fixed;border-collapse: collapse;height: 100vh;width: 100%;">
                                                <tbody style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                        <td class="header" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: top;display: table-cell;">
                                                            <h1 class="logo" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;">
                                                                <a class="full-width" href="https://scrooc.com/" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;display: block;width: 100%;height: 100%;text-align: center;">
                                                                    scrooc
                                                                </a>
                                                            </h1>
                                                        </td>
                                                    </tr>
                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                        <td class="maintd" style="font-family: 'Titillium Web', sans-serif;padding: 2em;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;background: radial-gradient(white, transparent);">
                                                            <div class="main" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;max-width: 64em;">
                                                                <h1 style="font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">Finnish resetting your password</h1>
                                                                <div style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                    Please click the link below to finnish resetting your password: 
                                                                        <br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><li class="line-left" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.1em;text-decoration: underline;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;font-weight: bold;margin-left: 1em;"><a href="${url}" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;">${url}</a></li><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                    Best regards,<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                    Scrooc dev team.
                                                                </div><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                <div id="info" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 0.85em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;margin-top: 1em;background-color: #aeaeae4b;border-radius: 12px;border: 3px solid #707070;position: relative;box-shadow: 0px 6px 35px #aaa;">
                                                                    If you hadn't made any requests to do so reset your password as your account might be compromised.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                        <td class="footer" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: bottom;display: table-cell;">
                                                            <h1 class="logo logo_bottom" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 0.6em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;display: inline-grid;">
                                                                <div class="center_menu" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 2em auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                    <a href="https://scrooc.com/policies" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);padding-left: 2em;">Privacy policy &amp; ToS</a>
                                                                    <a href="https://scrooc.com/about" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">About</a>
                                                                    <a href="https://scrooc.com/payment" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">Spare us a few coins</a>
                                                                </div>
                                                            </h1>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </body>
                                    </html>`,
                                    attachments:[{
                                        filename : 'bg.jpg',
                                        path: __dirname + '/../public/img/bg.png',
                                        cid : 'bg@scrooc.com'
                                    }],
                                });

                                req.flash("flash", "Reset email sent. Now it's up to you to confirm it =].");
                                return res.redirect('/register');
                            }
                        )
                    } else {
                        req.flash("flash", "Error while updating your password. Try again.");
                        return res.redirect('/reset');
                    }
                });
            } catch {
                req.flash("flash", "Attempt to login before you try to reset.");
                return res.redirect('/register');
            }
        } else {
            req.flash("flash", "Attempt to login before you try to reset.");
            return res.redirect('/register');
        }
    }
});
router.post('/userReset', async (req, res) => {
    var error = null;
    var { secret, email, password } = req.body;

    req.check('email', 'Make sure your email is formatted properly.')
        .trim()
        .escape()
        .normalizeEmail();
    req.check('secret', 'Carefully enter the secret.')
        .trim()
        .escape()
        .normalizeEmail();
    req.check('password', 'This password is too short or too long.')
        .exists()
        .isLength({min: 3, max: 75})
        .trim()
        .escape();
    error = req.validationErrors();
    
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/reset');
    } else {
        try {
            connection.query(`SELECT email, password FROM user WHERE id = ?;`, [secret], async (error, results) => {
                if(error || !results){
                    req.flash("flash", "Your secret or email is wrong.");
                    return res.redirect('/reset');
                } else if (await bcrypt.compare(email, results[0].email) && await bcrypt.compare(password, results[0].password)) {
                    jwt.sign(
                        {},
                        process.env.gmail_secret,
                        {
                            expiresIn: '1d',
                        },
                        (err, emailToken) => {
                            const url = baseURL + `/reset/user/${emailToken}`;
                            transporter.sendMail({
                                from: `"Scrooc" <${process.env.gmail_user}>`,
                                to: email,
                                subject: 'Reset your username.',
                                html: ` <!DOCTYPE html>
                                <html lang="en">
                                    <head>
                                        <title>Scrooc: Finnish resetting your username</title>
                                        ${style}
                                    </head>
                                    <body style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                        <table style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;table-layout: fixed;border-collapse: collapse;height: 100vh;width: 100%;">
                                            <tbody style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                    <td class="header" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: top;display: table-cell;">
                                                        <h1 class="logo" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;">
                                                            <a class="full-width" href="https://scrooc.com/" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;display: block;width: 100%;height: 100%;text-align: center;">
                                                                scrooc
                                                            </a>
                                                        </h1>
                                                    </td>
                                                </tr>
                                                <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                    <td class="maintd" style="font-family: 'Titillium Web', sans-serif;padding: 2em;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;background: radial-gradient(white, transparent);">
                                                        <div class="main" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;max-width: 64em;">
                                                            <h1 style="font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">Finnish resetting your username</h1>
                                                            <div style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                Please click the link below to finnish resetting your username: <br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><li class="line-left" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.1em;text-decoration: underline;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;font-weight: bold;margin-left: 1em;"><a href="${url}" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;">${url}</a></li><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                Best regards,<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                Scrooc dev team.
                                                            </div><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            <div id="info" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 0.85em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;margin-top: 1em;background-color: #aeaeae4b;border-radius: 12px;border: 3px solid #707070;position: relative;box-shadow: 0px 6px 35px #aaa;">
                                                            If you hadn't made any requests to do so reset your password as your account might be compromised.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                    <td class="footer" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: bottom;display: table-cell;">
                                                        <h1 class="logo logo_bottom" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 0.6em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;display: inline-grid;">
                                                            <div class="center_menu" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 2em auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                                <a href="https://scrooc.com/policies" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);padding-left: 2em;">Privacy policy &amp; ToS</a>
                                                                <a href="https://scrooc.com/about" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">About</a>
                                                                <a href="https://scrooc.com/payment" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">Spare us a few coins</a>
                                                            </div>
                                                        </h1>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </body>
                                </html>`,
                                attachments:[{
                                    filename : 'bg.jpg',
                                    path: __dirname + '/../public/img/bg.png',
                                    cid : 'bg@scrooc.com'
                                }],
                            });
        
                            req.flash("flash", "Reset email sent. Now it's up to you to confirm it =].");
                            return res.redirect('/register');
                        }
                    )
                } else {
                    req.flash("flash", "Your secret or email is wrong.");
                    return res.redirect('/reset');
                }
                
            });
        } catch {
            req.flash("flash", "Your secret or email is wrong.");
            return res.redirect('/reset');
        }
    }
});
router.post('/emailReset', authController.isLoggedIn, async (req, res) => {
    var error = null;
    var { email } = req.body;

    req.check('email', 'Make sure your email is formatted properly.')
        .trim()
        .escape()
        .normalizeEmail();
    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/reset');
    } else {
        if(req.user != null) {
            var decoded = req.user.id;

            try {
                req.session.email = await bcrypt.hash(email, parseInt(process.env.hash_length));
                jwt.sign(
                    {},
                    process.env.gmail_secret,
                    {
                        expiresIn: '1d',
                    },
                    (err, emailToken) => {
                        const url = baseURL + `/reset/email/${emailToken}`;
                        transporter.sendMail({
                            from: `"Scrooc" <${process.env.gmail_user}>`,
                            to: email,
                            subject: 'Reset your email.',
                            html: ` <!DOCTYPE html>
                            <html lang="en">
                                <head>
                                    <title>Scrooc: Finnish resetting your email</title>
                                    ${style}
                                </head>
                                <body style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                    <table style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;table-layout: fixed;border-collapse: collapse;height: 100vh;width: 100%;">
                                        <tbody style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                            <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <td class="header" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: top;display: table-cell;">
                                                    <h1 class="logo" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;">
                                                        <a class="full-width" href="https://scrooc.com/" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;display: block;width: 100%;height: 100%;text-align: center;">
                                                            scrooc
                                                        </a>
                                                    </h1>
                                                </td>
                                            </tr>
                                            <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <td class="maintd" style="font-family: 'Titillium Web', sans-serif;padding: 2em;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;background: radial-gradient(white, transparent);">
                                                    <div class="main" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;max-width: 64em;">
                                                        <h1 style="font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 1.4em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">Finnish resetting your email</h1>
                                                        <div style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            Please click the link below to finnish resetting your email: <br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><li class="line-left" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 1.1em;text-decoration: underline;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;font-weight: bold;margin-left: 1em;"><a href="${url}" style="color: #333;font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;">${url}</a></li><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;"><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            Best regards,<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            Scrooc dev team.
                                                        </div><br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                        <div id="info" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 0.85em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;margin-top: 1em;background-color: #aeaeae4b;border-radius: 12px;border: 3px solid #707070;position: relative;box-shadow: 0px 6px 35px #aaa;">
                                                            If you hadn't made any requests to do so reset your password as your account might be compromised.<br style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                <td class="footer" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 0;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;vertical-align: bottom;display: table-cell;">
                                                    <h1 class="logo logo_bottom" style="background-image: url('cid:bg@scrooc.com');font-family: 'Titillium Web', sans-serif;padding: 0.5em 0;margin: 0;font-size: 0.6em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;width: 100%;height: 100%;color: #333;display: inline-grid;">
                                                        <div class="center_menu" style="font-family: 'Titillium Web', sans-serif;padding: 0;margin: 2em auto;font-size: 0.99em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;">
                                                            <a href="https://scrooc.com/policies" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);padding-left: 2em;">Privacy policy &amp; ToS</a>
                                                            <a href="https://scrooc.com/about" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">About</a>
                                                            <a href="https://scrooc.com/payment" style="font-family: 'Titillium Web', sans-serif;padding: 1em;margin: 0;font-size: 1.75em;text-decoration: none;list-style: none;scrollbar-width: thin;scrollbar-color: #d0d0d0 transparent;scroll-behavior: smooth;overflow-wrap: break-word;hyphens: auto;cursor: pointer;color: #333;width: 100%;text-align: center;background: radial-gradient(white 5%, transparent);">Spare us a few coins</a>
                                                        </div>
                                                    </h1>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </body>
                            </html>`,
                            attachments:[{
                                filename : 'bg.jpg',
                                path: __dirname + '/../public/img/bg.png',
                                cid : 'bg@scrooc.com'
                            }],
                        });
                    }
                );
                req.flash("flash", "Reset email sent. Now it's up to you to confirm it =].");
                return res.redirect('/register');
            } catch(error) {
                req.flash("flash", "Attempt to login before you try to reset.");
                return res.redirect('/register');
            }
        } else {
            req.flash("flash", "Attempt to login before you try to reset.");
            return res.redirect('/register');
        }
    }
});

// Finnish the job
router.post('/reset/pass/:token', async (req, res) => {
    var error = null;
    var { password, passwordconfirm, honey } = req.body;

    req.check('token', 'Check your url and try again.')
        .exists()
        .trim()
        .escape();
    req.check('password', 'This password is too short or too long.')
        .exists()
        .isLength({min: 3, max: 63})
        .trim()
        .escape();
    req.check('password', 'Passwords don\'t match')
        .custom(value => {
            if(value == passwordconfirm)
                return true;
            return false;
        });
    req.check('honey', 'This password is too short or too long.')
        .trim()
        .escape();

    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/reset');
    } else {
        if(req.params.token != null) {
            jwt.verify(req.params.token, process.env.gmail_secret, function(err, decoded) {
                if (err) {
                    req.flash("flash", 'A server error has occurred.');
                    return res.redirect('/reset');
                }
            });
            var hashedPassword = await bcrypt.hash(password, parseInt(process.env.hash_length));
            
            connection.getConnection(function(err, conn) {
                try {
                    conn.beginTransaction(async function(err) {
                        if (err) { 
                            throw err
                        }
                        conn.query(`UPDATE user SET password = ? WHERE id = ?;`, [hashedPassword, req.session.uid], async (error, results) =>{ //or email = \''+[usernameoremail]+
                            if(error) { //if no result or password incorrect
                                throw error
                            } else {
                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                    req.flash("flash", 'You have successfully reset your password.');
                                    return res.redirect('/');
                                });
                            }
                        });
                    })
                } catch {
                    return conn.rollback(function() {
                        conn.destroy();
                        req.flash("flash", 'A server error has occurred.');
                        return res.redirect('/reset');
                    });
                }
            })
        } else {
            req.flash("flash", 'A server error has occurred.');
            return res.redirect('/reset');
        }
    }
});
router.post('/reset/user/:token', async (req, res) => {
    var error = null;
    var { username, usernameconfirm, honey } = req.body;

    req.check('token', 'Check your url and try again.')
        .exists()
        .trim()
        .escape();
    req.check('username', 'This username is too short or too long.')
        .exists()
        .isLength({min: 3, max: 63})
        .trim()
        .escape();
    req.check('username', 'Usernames don\'t match')
        .custom(value => {
            if(value == usernameconfirm)
                return true;
            return false;
        });
    req.check('honey', 'This username is too short or too long.')
        .trim()
        .escape();

    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('/reset');
    } else {
        if(req.params.token != null) {
            jwt.verify(req.params.token, process.env.gmail_secret, function(err, decoded) {
                if (err) {
                    req.flash("flash", 'A server error has occurred.');
                    return res.redirect('/reset');
                }
            });
            
            connection.getConnection(function(err, conn) {
                try {
                    conn.beginTransaction(async function(err) {
                        if (err) { 
                            throw err;
                        }

                        conn.query(`UPDATE user SET username = ? WHERE id = ?;`, [username, req.session.uid], async (error, results) =>{ //or email = \''+[usernameoremail]+
                            if(error) { //if no result or password incorrect
                                throw error;
                            } else {
                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                    req.flash("flash", 'You have successfully reset your username.');
                                    return res.redirect('/');
                                });
                            }
                        });
                    })
                } catch {
                  return conn.rollback(function() {
                    conn.destroy();
                    req.flash("flash", 'A server error has occurred.');
                    return res.redirect('/reset');
                  });
                }
            });
        } else {
            req.flash("flash", 'A server error has occurred.');
            return res.redirect('/reset');
        }
    }
});

// Submit new posts, topics and replies (in middleware because of multer)
router.post('/post', authController.isLoggedIn, upload, async (req, res) => {
    var error = null; 
    if(req.user != null) {
        var id = req.user.id;
        var { username, title, cat, con, user_file, tags, tra, check } = req.body;
        req.check('username', 'This username is invalid. It must be longer than 3 characters and shorter than 22.')
            .exists()
            .isLength({min: 3, max: 22})
            .trim()
            .escape();
        req.check('title', 'Your title should be between 3 and 90 characters.')
            .exists()
            .isLength({min: 3, max: 90})
            .trim()
            .escape();
        req.check('con', 'Your content is to short.')
            .exists()
            .isLength({min: 14, max: 4200})
            .trim()
            .escape();
        req.check('cat', 'This topic is invalid.')
            .exists()
            .isLength({min: 3, max: 75})
            .trim()
            .escape();
        req.check('tags', 'Tags are invalid.')
            .custom(value => {
                if(tags.includes(','))
                    return true;
                return false;
            })
            .exists()
            .trim()
            .escape();
        req.check('tra', 'This topic is invalid.')
            .trim()
            .escape();
        req.check('check', '18 check is invalid.')
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            try {
                fs.access(req.file.path, async () => {
                    await fsPromises.unlink(req.file.path);
                });
            } catch (error) {
            }
            req.flash("flash", error);
            return res.redirect('/post');
        } else if(tra.length < 2) {
            var check1 = 0;
            if(check)
                check1 = 1;

            if(await authController.isBanned(req.user.id) == false) {
                await connection.query(`SELECT COUNT(id) AS count FROM posts WHERE user_id = ? AND time > (NOW() - INTERVAL 1 DAY) AND reply = 0; `, [id], async (err, results) => { 
                    if(!results || results[0].count < limit_post) {
                        await connection.query(`SELECT id FROM cat WHERE cat_name = ?`, [cat], async (err, results) => {
                            if(results[0] == null){
                                try {
                                    fs.access(req.file.path, async () => {
                                        await fsPromises.unlink(req.file.path);
                                    });
                                } catch (error) {
                                }
                                req.flash("flash", 'This topic does not exist or is misspelled.');
                                return res.redirect('/post');
                            } else {
                                var cat_id = results[0].id;
                                // make filepath usable in HTML
                                if(req.file)
                                {
                                    user_file = req.file.path.replace(/\\/g, "/").substring("public".length);
                                }
                            
                                // prepare REGEX checks for filetype compatibility
                                const img = /jpeg|jpg|png|gif|webp/;
                                const aud = /mp3|ogg|aac|wav/;
                                const gif = /gif/;
                                // set default post type 
                                var audio = 2;

                                //supporter check
                                var date = req.user.last_payment;
                                try {
                                    date.setMonth(date.getMonth() - 3);
                                } catch (error) {
                                    date = new Date();
                                }
                    
                                // do the checks
                                if(img.test(user_file)) {
                                    if(!(gif.test(user_file))) {
                                        // compress and convert images with sharp
                                        await sharp(req.file.path)
                                            .resize(500)
                                            .webp({ quality: 78})
                                            .toBuffer()
                                            .then( async data => {
                                                await fsPromises.writeFile(req.file.path + '.webp', data);
                                                await fsPromises.unlink(req.file.path);
                                                user_file = user_file + '.webp';
                                            })
                                            .catch( async err => {
                                                await fsPromises.unlink(req.file.path);
                                                req.flash("flash", "This image can't be uploaded.");
                                                return res.redirect('/post');
                                            });
                                    } else if (+req.user.last_payment < +date) {
                                        await fsPromises.unlink(req.file.path);
                                        req.flash("flash", 'Gifs are expensive to host. We decided that you have to be a supporter to post gifs. Sorry.');
                                        return res.redirect('/post');
                                    } 
                                    audio = 0;
                                } if (aud.test(user_file)) {
                                    // compress and convert audio files with LAME software (LINUX)
                                    
                                    audio = 1;                    
                                    try {
                                        var user_file = req.file.path.replace('.mp3','') + '0.mp3';

                                        const encoder = new Lame({ 
                                            output: user_file,
                                            bitrate: 80,
                                            sfreq: 32
                                        }).setFile(req.file.path);
                                            await encoder.encode();
                                            await fsPromises.unlink(req.file.path);
                                    } catch (encodingError) {
                                        console.error(encodingError);
                                        await fsPromises.unlink(req.file.path);
                                        audio = 2;
                                    }
                                }

                                // Les gooo!
                                connection.getConnection(async function(err, conn) {
                                    await conn.beginTransaction(async function(err) {
                                        try {
                                            await conn.query(`INSERT INTO posts SET user_id = ?, cat_id = ?, time = ?, username = ?, title = ?, content = ?, user_file = ?, reply = ?, audio =  ?, blurred = ? ; SELECT LAST_INSERT_ID();`, [id, cat_id, new Date(), username, title, con, user_file.replace("public/", ""), 0, audio, check1], async (error, results1) => {
                                                if(error){
                                                    throw error;
                                                } 
                                                var post_id = results1[0].insertId;
                                                // INSERT it with the social table with default value
                                                await conn.query(`INSERT INTO social VALUES (null, ?, ?, 1, 1); UPDATE cat SET cat.posts = cat.posts + 1 WHERE id = ?;`, [post_id, id, cat_id], async (error, results) => {
                                                    if(error){
                                                        throw error;
                                                    }
                                                    var tags_arr = tags.split(',').map(function(item) {
                                                        return item.trim();
                                                    });
                                                    var tags1 = tags_arr.map(i => `${i}`);
                                                    for (var i = 0; i < tags1.length; i++) {
                                                        if(i == 0)
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' AS temp UNION `;
                                                        else if(i != tags1.length-1)
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' UNION `;
                                                        else
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' `;
                                                    }                       
                                                    tags1 = tags1.join('');
                        
                                                    await conn.query(`INSERT INTO tags(tag) SELECT * FROM (${tags1}) AS temp WHERE NOT EXISTS ( SELECT id FROM tags WHERE tag = temp );`, async (error, results) => {
                                                        if(error){
                                                            throw error;
                                                        } 
                                                        await conn.query(`INSERT INTO \`post_cat_tag\`(post_id, tag_id)
                                                        (SELECT ?, id FROM tags
                                                        WHERE tag IN (?));`, [post_id, tags_arr], async (error, results) => {
                                                            if(error){
                                                                throw error;
                                                            }
                                                            await conn.commit(async function(err) {
                                                                if (err) {
                                                                    throw err;
                                                                }
                                                                await conn.destroy();
                                                                req.flash("flash", "It's live!");
                                                                return res.status(200).redirect(`/act/${cat}/${post_id}`);
                                                            });
                                                        })
                                                    })
                                                });
                                            }); 
                                        } catch (error) {
                                            return conn.rollback(async function() {
                                                try {
                                                    fs.access(req.file.path, async () => {
                                                        await fsPromises.unlink(req.file.path);
                                                    });
                                                } catch (error) {
                                                }
                                                conn.destroy();
                                                req.flash("flash", "There was an error while posting.");
                                                return res.redirect('/post');
                                            });
                                        }
                                    })
                                });
                            }  
                        }
                    )}
                    else {
                        try {
                            fs.access(req.file.path, async () => {
                                await fsPromises.unlink(req.file.path);
                            });
                        } catch (error) {
                        }
                        req.flash("flash", "You have reached the daily post limit. You can make more tomorrow.");
                        return res.redirect('back');
                    }
                })
            } else {
                try {
                    fs.access(req.file.path, async () => {
                        await fsPromises.unlink(req.file.path);
                    });
                } catch (error) {
                }
                req.flash("flash", "You have been banned. You can still browse around but can't post.");
                return res.redirect('back');
            }
        }
    } else {
        try {
            fs.access(req.file.path, async () => {
                await fsPromises.unlink(req.file.path);
            });
        } catch (error) {
        }
        req.flash("flash", 'Your login has expired. Please log in again.');
        return res.redirect('/register');
    }
});

router.post('/topic', authController.isLoggedIn, upload, async (req, res) => {
    if(req.user != null) {
        var id = req.user.id;
        var error = null; 
        var { name, about, tags, user_file, tra, check } = req.body;
        req.check('name', 'This topic name is invalid.')
            .exists()
            .isLength({min: 3, max: 75})
            .trim()
            .escape();
        req.check('about', 'Your description should be between 3 and 150 characters.')
            .exists()
            .isLength({min: 3, max: 150})
            .trim()
            .escape();
        req.check('tags', 'Tags are invalid.')
            .custom(value => {
                if(tags.includes(','))
                    return true;
                return false;
            })
            .exists()
            .trim()
            .escape();
        req.check('tra', 'Write up a valid reply.')
            .trim()
            .escape();
        req.check('check', '18 check is invalid.')
            .trim()
            .escape();

        error = req.validationErrors();

        if(error != false || null) {
            try {
                fs.access(req.file.path, async () => {
                    await fsPromises.unlink(req.file.path);
                });
            } catch (error) {
            }
            req.flash("flash", error);
            res.redirect('/createTopic');
        } else {
            if(await authController.isBanned(req.user.id) == false) {
                connection.query(`SELECT COUNT(id) AS count FROM cat WHERE user_id = ? AND date > (NOW() - INTERVAL 1 DAY); `, [id], async (err, results) => { 
                    if(!results || results[0].count < limit_topic) {
                        connection.query("SELECT id FROM cat WHERE cat_name = ?", [name], async function(err, results) {
                            if(results[0] != null) {
                                try {
                                    fs.access(req.file.path, async () => {
                                        await fsPromises.unlink(req.file.path);
                                    });
                                } catch (error) {
                                }
                                req.flash("flash", 'This topic already exists!');
                                return res.redirect('/createTopic');
                            }
                            else if(tra.length < 2) {
                                // make filepath usable in HTML
                                if(req.file)
                                {
                                    var check1 = 0;
                                    if(check)
                                        check1 = 1;
                                    // get the current time
                                    const time = new Date();
                                    user_file = req.file.path.replace(/\\/g, "/").substring("public".length);

                                    // prepare REGEX checks for filetype compatibility
                                    const img = /jpeg|jpg|png|gif|webp/;

                                    // set default post type 
                                    var audio = 2;

                                    // do the checks
                                    if(img.test(user_file)) {
                                        // compress and convert images with sharp
                                        await sharp(req.file.path)
                                            .resize(500)
                                            .webp({ quality: 78})
                                            .toBuffer()
                                            .then( async data => {
                                                await fsPromises.writeFile(req.file.path + '.webp', data);
                                                await fsPromises.unlink(req.file.path);
                                                user_file = user_file + '.webp';
                                            })
                                            .catch( async err => {
                                                await fsPromises.unlink(req.file.path);
                                                req.flash("flash", "This image can't be uploaded.");
                                                res.redirect('/createTopic');
                                            }
                                        );
                                        // set post type to img/gif
                                        audio = 0;
                                    } 
                                    else {
                                        await fsPromises.unlink(req.file.path);
                                        req.flash("flash", "This image can't be uploaded.");
                                        res.redirect('/createTopic');
                                    }

                                    // TEST ZA ^[a-zA-Z0-9_-]*$ REGX
                                    name = name.replace(/[^a-zA-Z0-9_-]/gi, '')

                                    // check if the topic already exists
                                    connection.getConnection(async function(err, conn) {
                                        try {
                                            conn.beginTransaction(async function(err) {
                                                if (err) { 
                                                    throw err;
                                                }
                                                conn.query(`INSERT INTO cat SET user_id = ?, cat_name = ?, date = ?, members = ?, posts = ?, description = ?, user_file = ?, cat_blurred = ? ; SELECT LAST_INSERT_ID();`, [req.user.id, name, new Date(), 1, 0, about, user_file, check1], async (error, results) => {
                                                    if(error) {
                                                        throw error;
                                                    }
                                                    var topic_id = results[0].insertId;
                                                    var tags_arr = tags.split(',').map(function(item) {
                                                        return item.trim();
                                                    });
                                                    var tags1 = tags_arr.map(i => `${i}`);
                                                    for (var i = 0; i < tags1.length; i++) {
                                                        if(i == 0)
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' AS temp UNION `;
                                                        else if(i != tags1.length-1)
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' UNION `;
                                                        else
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' `;
                                                    }                       
                                                    tags1 = tags1.join('');

                                                    await conn.query(`INSERT INTO tags(tag) SELECT * FROM (${tags1}) AS temp WHERE NOT EXISTS ( SELECT id FROM tags WHERE tag = temp );`, async (error, results) => {
                                                        if(error){
                                                            throw error;
                                                        }
                                                        await conn.query(`INSERT INTO \`post_cat_tag\`(cat_id, tag_id)
                                                        SELECT ?, id FROM tags
                                                        WHERE tag IN (?)`, [topic_id, tags_arr], async (error, results) => {
                                                            if(error){
                                                                throw error;
                                                            }
                                                            await conn.commit(async function(err) {
                                                                if (err) {
                                                                    throw err;
                                                                }
                                                                await conn.destroy();
                                                                req.flash("flash", "It's live!");
                                                                return res.status(200).redirect(`../topic/${name}/`);
                                                            });
                                                        })
                                                    })
                                                })
                                            })
                                        } catch {
                                            fs.access(req.file.path, async () => {
                                                await fsPromises.unlink(req.file.path);
                                            });
                                            return conn.rollback(function() {
                                                conn.destroy();
                                                req.flash("flash", "There was an error while creating your topic.");
                                                return res.redirect('/createTopic');
                                            });
                                        }
                                    });
                                } else {
                                    req.flash("flash", "You must add an image.");
                                    return res.redirect('/createTopic');
                                }
                            }
                        })
                    } else {
                        try {
                            fs.access(req.file.path, async () => {
                                await fsPromises.unlink(req.file.path);
                            });
                        } catch (error) {
                        }
                        req.flash("flash", "You have reached the daily topic creation limit. You can create more tomorrow.");
                        return res.redirect('back');
                    }
                })
            } else {
                try {
                    fs.access(req.file.path, async () => {
                        await fsPromises.unlink(req.file.path);
                    });
                } catch (error) {
                }
                req.flash("flash", "You have been banned. You can still browse around but can't post.");
                return res.redirect('back');
            }
        }
    } else {
        try {
            fs.access(req.file.path, async () => {
                await fsPromises.unlink(req.file.path);
            });
        } catch (error) {
        }
        req.flash("flash", 'Your login has expired. Please log in again.');
        return res.redirect('/register');
    }
});

// Update topic 
router.post('/updateTopic/:topic_id', authController.isLoggedIn, upload, async (req, res) => {
    req.check('topic_id', 'Check your url and try again.')
        .exists()   
        .trim()
        .escape();

    var error = req.validationErrors();
    if(error != false || null) {
        try {
            fs.access(req.file.path, async () => {
                await fsPromises.unlink(req.file.path);
            });
        } catch (error) {
        }
        req.flash("flash", error);
        res.redirect('/reset');
    }
    else if(req.user != null) {
        var { about, tags, user_file, tra } = req.body;
        var topic_id = req.params.topic_id;
        var id = req.user.id;
        connection.query(`SELECT cat_name, user_file FROM cat WHERE id = ? ;`, [topic_id], async (err, results) => { 
            if(!results) {
                try {
                    fs.access(req.file.path, async () => {
                        await fsPromises.unlink(req.file.path);
                    });
                } catch (error) {
                }
                req.flash("flash", "There was an error while updating your topic.");
                res.redirect('back');
            } else {
                var name = results[0].cat_name;
                error = null; 
                
                req.check('about', 'Your description should be between 3 and 150 characters.')
                    .exists()
                    .isLength({min: 3, max: 150})
                    .trim()
                    .escape();
                req.check('tags', 'Tags are invalid. You must have at least 2.')
                    .custom(value => {
                        if(tags.includes(','))
                            return true;
                        return false;
                    })
                    .exists()
                    .trim()
                    .escape();
                req.check('tra', 'Write up a valid reply.')
                    .trim()
                    .escape();

                error = req.validationErrors();

                if(error != false || null) {
                    fs.access(req.file.path, async () => {
                        await fsPromises.unlink(req.file.path);
                    });
                    req.flash("flash", error);
                    return res.redirect(`../../topic/${name}/`);
                } else {
                    if(await authController.isBanned(req.user.id) == false) {
                        connection.query(`SELECT COUNT(id) AS count FROM cat WHERE user_id = ? AND date > (NOW() - INTERVAL 1 DAY); `, [id], async (err, results) => { 
                            if(!results || results[0].count < limit_topic) {
                                // get the current time
                                const time = new Date();

                                if(req.file) {
                                    // make filepath usable in HTML
                                    user_file = req.file.path.replace(/\\/g, "/").substring("public".length);

                                    // prepare REGEX checks for filetype compatibility
                                    const img = /jpeg|jpg|png|gif|webp/;

                                    // set default post type 
                                    var audio = 2;

                                    // do the checks
                                    if(img.test(user_file)) {
                                        // compress and convert images with sharp
                                        await sharp(req.file.path)
                                            .resize(500)
                                            .webp({ quality: 78})
                                            .toBuffer()
                                            .then( async data => {
                                                await fsPromises.writeFile(req.file.path + '.webp', data);
                                                await fsPromises.unlink(req.file.path);
                                                user_file = user_file + '.webp';
                                            })
                                            .catch( async err => {
                                                await fsPromises.unlink(req.file.path);
                                                req.flash("flash", "This image can't be uploaded.");
                                                res.redirect('/createTopic');
                                            }
                                        );
                                        // set post type to img/gif
                                        audio = 0;

                                        connection.getConnection(function(err, conn) {
                                            try {
                                                conn.beginTransaction(async function(err) {
                                                    if (err) { 
                                                        throw err;
                                                    }
                                                    await conn.query(`UPDATE cat SET description = ?, user_file = ? WHERE id = ? AND user_id = ?;`, [about, user_file, topic_id, id], async (error, results) => {
                                                        if(error) {
                                                            throw error;
                                                        }
                                                        var tags_arr = tags.split(',').map(function(item) {
                                                            return item.trim();
                                                        });
                                                        var tags1 = tags_arr.map(i => `${i}`);
                                                        for (var i = 0; i < tags1.length; i++) {
                                                            if(i == 0)
                                                                tags1[i] = `SELECT '${tags1[i].replace(',', '')}' AS temp UNION `;
                                                            else if(i != tags1.length-1)
                                                                tags1[i] = `SELECT '${tags1[i].replace(',', '')}' UNION `;
                                                            else
                                                                tags1[i] = `SELECT '${tags1[i].replace(',', '')}' `;
                                                        }                       
                                                        tags1 = tags1.join('');
                
                                                        await conn.query(` DELETE p FROM post_cat_tag p
                                                        LEFT JOIN cat c ON c.id = p.cat_id
                                                        LEFT JOIN tags t ON t.id = p.tag_id
                                                        WHERE c.user_id = ? AND c.id = ?;`, [id, topic_id], async (error, results) => {
                                                            if(!results) {
                                                                throw error;
                                                            } else {
                                                                await conn.query(`INSERT INTO tags(tag) SELECT * FROM (${tags1}) AS temp WHERE NOT EXISTS ( SELECT id FROM tags WHERE tag = temp );`, async (error, results) => {
                                                                    if(error) {
                                                                        throw error;
                                                                    } else {
                                                                        await conn.query(`INSERT INTO \`post_cat_tag\`(cat_id, tag_id)
                                                                        SELECT ?, id FROM tags
                                                                        WHERE tag IN (?);`, [topic_id, tags_arr], async (error, results) => {
                                                                            if(error) {
                                                                                throw error;
                                                                            } else {
                                                                                await conn.commit(async function(err) {
                                                                                    if (err) {
                                                                                        throw err;
                                                                                    }
                                                                                    await conn.destroy();
                                                                                    req.flash("flash", "It's live!");
                                                                                    return res.status(200).redirect(`../../topic/${name}/`);
                                                                                });
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        });
                                                    })  
                                                })
                                            } catch {
                                              return conn.rollback(async function() {
                                                fs.access(req.file.path, async () => {
                                                    await fsPromises.unlink(req.file.path);
                                                });
                                                conn.destroy();
                                                req.flash("flash", "There was an error while updating your topic.");
                                                return res.redirect(`../../topic/${name}/`);
                                              });
                                            }
                                        });
                                    } else {
                                        fs.access(req.file.path, async () => {
                                            await fsPromises.unlink(req.file.path);
                                        });
                                        req.flash("flash", "This image can't be uploaded.");
                                        return res.redirect(`../../topic/${name}/`);
                                    }
                                } else {
                                    connection.getConnection(async function(err, conn) {
                                        try {
                                            conn.beginTransaction(async function(err) {
                                                if (err) { 
                                                    throw err;
                                                }
                                                conn.query(`UPDATE cat SET description = ? WHERE id = ? AND user_id = ?;`, [about, topic_id, id], async (error, results) => {
                                                    if(error) {
                                                        throw error;
                                                    }
                                                    var tags_arr = tags.split(',').map(function(item) {
                                                        return item.trim();
                                                    });
                                                    var tags1 = tags_arr.map(i => `${i}`);
                                                    for (var i = 0; i < tags1.length; i++) {
                                                        if(i == 0)
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' AS temp UNION `;
                                                        else if(i != tags1.length-1)
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' UNION `;
                                                        else
                                                            tags1[i] = `SELECT '${tags1[i].replace(',', '')}' `;
                                                    }                       
                                                    tags1 = tags1.join('');
            
                                                    await conn.query(` DELETE p FROM post_cat_tag p
                                                    LEFT JOIN cat c ON c.id = p.cat_id
                                                    LEFT JOIN tags t ON t.id = p.tag_id
                                                    WHERE c.user_id = ? AND c.id = ?;`, [id, topic_id], async (error, results) => {
                                                        if(!results) {
                                                            throw "error";
                                                        }
                                                        await conn.query(`INSERT INTO tags(tag) SELECT * FROM (${tags1}) AS temp WHERE NOT EXISTS ( SELECT id FROM tags WHERE tag = temp );`, (error, results) => {
                                                            if(error) {
                                                                throw error;
                                                            }
                                                            conn.query(`INSERT INTO \`post_cat_tag\`(cat_id, tag_id)
                                                            SELECT ?, id FROM tags
                                                            WHERE tag IN (?);`, [topic_id, tags_arr], async (error, results) => {
                                                                if(error) {
                                                                    throw error;
                                                                }
                                                                await conn.commit(async function(err) {
                                                                    if (err) {
                                                                        throw err;
                                                                    }
                                                                    await conn.destroy();
                                                                    req.flash("flash", "It's live!");
                                                                    return res.status(200).redirect(`../../topic/${name}/`);
                                                                });
                                                            })
                                                        })
                                                    });
                                                })  
                                            })
                                        } catch {
                                          return conn.rollback(async function() {
                                            try {
                                                fs.access(req.file.path, async () => {
                                                    await fsPromises.unlink(req.file.path);
                                                });
                                            } catch (error) {
                                            }
                                            conn.destroy();
                                            req.flash("flash", "There was an error while updating your topic.");
                                            return res.redirect(`../../topic/${name}/`);
                                          });
                                        }
                                    });
                                }        
                            } else {
                                try {
                                    fs.access(req.file.path, async () => {
                                        await fsPromises.unlink(req.file.path);
                                    });
                                } catch (error) {
                                }
                                req.flash("flash", "You have reached the daily topic creation limit. You can create more tomorrow.");
                                return res.redirect(`../../topic/${name}/`);
                            }
                        })
                    } else {
                        try {
                            fs.access(req.file.path, async () => {
                                await fsPromises.unlink(req.file.path);
                            });
                        } catch (error) {
                        }
                        req.flash("flash", "You have been banned. You can still browse around but can't post.");
                        return res.redirect(`../../topic/${name}/`);
                    }
                }
            }
        });
    } else {
        try {
            fs.access(req.file.path, async () => {
                await fsPromises.unlink(req.file.path);
            });
        } catch (error) {
        }
        req.flash("flash", 'Your login has expired. Please log in again.');
        return res.redirect('/register');
    }
});

// Make a reply
router.post('/reply/:post_id/:url', authController.isLoggedIn, async (req, res) => {
    var error = null;
    req.check('post_id', 'Check your url and try again.')
        .exists()
        .trim()
        .escape();
    req.check('username', 'Username is invalid. Keep it under 22 characters.')
        .exists()
        .isLength({min: 3, max: 22})
        .trim()
        .escape();
    req.check('tag', 'Enter a valid tag or keep it empty.')
        .isLength({min: 0, max: 23})
        .trim()
        .escape();
    req.check('content', 'Write up a valid reply.')
        .trim()
        .escape();
    req.check('tra', 'Write up a valid reply.')
        .trim()
        .escape();
        
    error = req.validationErrors();
    if(error != false || null) {
        req.flash("flash", error);
        res.redirect('back');
    } else {
        var url = connection.escape(decodeURIComponent(req.params.url)).slice(1,-1);
        if(req.user) {
            var id = req.user.id;
            if(await await authController.isBanned(id) == false) {
                connection.query(`SELECT COUNT(id) AS count FROM posts WHERE user_id = ? AND time > (NOW() - INTERVAL 1 DAY) AND reply = 1; `, [id], async (err, results) => { 
                    if(!results || results[0].count < limit_reply) {
                        // pull info from form
                        var { username, tag, con, tra } = req.body;
            
                        // INSERT new topic to topics
                        if(tra.length < 2){
                            connection.getConnection(function(err, conn) {
                                try {
                                    conn.beginTransaction(async function(err) {
                                        if (err) { 
                                            throw err;
                                        }
                                        conn.query(`INSERT INTO posts SET user_id = ?, cat_id = ?, time = ?, username = ?, title = ?, content = ?, user_file = ?, reply = ?, audio = ? ; SELECT LAST_INSERT_ID(); `, [id, 1, new Date(), username, tag, con, '', req.params.post_id, 2], async (error, results1) => {
                                            if(error)
                                                throw error;
                                            var post_id = results1[0].insertId;
                                            // INSERT new topic to social
                                            await conn.query(`INSERT INTO social VALUES (null, ?, ?, 1, 1);`, [post_id, id], async (error, results2) => {
                                                if(error){
                                                    throw error;
                                                }
                                                if (tag) {
                                                    await conn.query(`SELECT user_id FROM posts WHERE title = ? AND reply = ?; `, [tag, req.params.post_id], async (error, results2) => {
                                                        if(error){
                                                            throw error;
                                                        } else {
                                                            var error = false;
                                                            for (let i = 0; i < results2.length; i++) {
                                                                await conn.query(`INSERT INTO notifications SET user_id = ?, \`type\` = ?, href = ?, notification = ?, date = ?, \`read\` = ?; `, [results2[i].user_id, 0, ("/act/null/" + req.params.post_id), (con.substring(0, 73) + "..."), new Date(), 0], (error, results1) => {
                                                                    if(error)
                                                                        throw error;
                                                                });
                                                            }
                                                            await conn.commit(async function(err) {
                                                                if (err) {
                                                                    throw err;
                                                                }
                                                                await conn.destroy();
                                                                req.flash("flash", "Comment submitted successfully.");
                                                                return res.redirect(url);
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    await conn.commit(async function(err) {
                                                        if (err) {
                                                            throw err;
                                                        }
                                                        await conn.destroy();
                                                        req.flash("flash", "Comment submitted successfully.");
                                                        return res.redirect(url);
                                                    });
                                                }
                                            });
                                        });
                                    })
                                } catch {
                                  return conn.rollback(function() {
                                    conn.destroy();
                                    req.flash("flash", "Submitting the comment failed.");
                                    return res.redirect(url);
                                  });
                                }
                              });
                        } else {
                            req.flash("flash", "Submitting the comment failed.");
                            return res.redirect(url);
                        }

                    } else {
                        req.flash("flash", "You have reached the daily reply limit. You can chat more tomorrow.");
                        return res.redirect(url);
                    }
                });
            } else{
                req.flash("flash", "You have been banned. You can still browse around but can't post.");
                return res.redirect(url);
            }
        } else {
            req.flash("flash", "Your login has expired. Please log in again.");
            return res.redirect('/register');
        }
    }
});

// Report a post
router.post('/report/:post_id/:url', authController.isLoggedIn, async (req, res, next) => {
    if(req.user != null) {
        var error = null;
        var decoded = req.user.id;
        const { message, tra } = req.body;
        req.check('post_id', 'Check your url and try again.')
            .exists()
            .trim()
            .escape();
        req.check('message', 'Message is invalid. You have to have at least 15 characters and not over 300.')
            .exists()
            .isLength({min: 15, max: 300})
            .trim()
            .escape();
        req.check('tra', 'Write up a valid message.')
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            req.flash("flash", error);
            res.redirect('back');
        } else if(tra.length < 2) {
            var url = connection.escape(decodeURIComponent(req.params.url)).slice(1,-1);
            if(await authController.isBanned(req.user.id) == false) {
                connection.query(`SELECT COUNT(id) AS count FROM reports WHERE user_id = ? AND date > (NOW() - INTERVAL 1 DAY) AND approved = 1; `, [decoded], async (err, results) => { 
                    if(!results || results[0].count < limit_report) {
                        const promise = authController.report(req.params.post_id, message, decoded, 0);
                        promise.then(results => 'window.location.href');
                        req.flash("flash", 'Post reported.');
                        return res.redirect(url);
                    } else {
                        req.flash("flash", "You have reached the report limit. You can report more tomorrow.");
                        res.redirect(url);
                    }
                })
            } else {
                req.flash("flash", "You have been banned. You can still browse around but can't post.");
                return res.redirect(url);
            }
        } else {
            req.flash("flash", 'Something went wrong while reporting. Try again.');
            return res.redirect(url);
        }
    } else {
      req.flash("flash", 'Your login has expired. Please log in again.');
      return res.redirect('/register');
    }
});

// Report a post - nared da bo delov
router.post('/reportTopic/:topic_id/:url', authController.isLoggedIn, async (req, res, next) => {
    var url = connection.escape(decodeURIComponent(req.params.url)).slice(1,-1);
    if(req.user != null) {
      var decoded = req.user.id;
        const { message, tra } = req.body;
        req.check('message', 'Message is invalid. You have to have at least 15 characters and not over 300.')
            .exists()
            .isLength({min: 15, max: 300})
            .trim()
            .escape();
        req.check('tra', 'Write up a valid message.')
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            req.flash("flash", error);
            return res.redirect('back');
        } else if(tra.length < 2) {
            if(await authController.isBanned(req.user.id) == false) {
                connection.query(`SELECT COUNT(id) AS count FROM reports WHERE user_id = ? AND date > (NOW() - INTERVAL 1 DAY) AND approved = 1; `, [decoded], async (err, results) => { 
                    if(!results || results[0].count < limit_report) {
                        const promise = authController.report(req.params.topic_id, message, decoded, 1);
                        promise.then(results => 'window.location.href');
                        req.flash("flash", 'Topic reported.');
                        return res.redirect(url);
                    } else {
                        req.flash("flash", "You have reached the report limit. You can report more tomorrow.");
                        return res.redirect(url);
                    }
                })
            } else {
                req.flash("flash", "You have been banned. You can still browse around but can't post.");
                return res.redirect(url);
            }
        } else {
            req.flash("flash", 'Something went wrong while reporting. Try again.');
            return res.redirect(url);
        }
    } else {
      req.flash("flash", 'Your login has expired. Please log in again.');
      return res.redirect('/register');
    }
});

// Mod posts
router.post('/judge/:post_id/:type?', authController.isLoggedIn, async (req, res, next) => {
    var decoded;
    if(req.user != null) {
        decoded = req.user.id;
        const { mod, message, tra } = req.body;
        req.check('type', 'Check your url and try again.')
            .trim()
            .escape();
        req.check('post_id', 'Check your url and try again.')
            .exists()
            .trim()
            .escape();
        req.check('message', 'Message is invalid.')
            .exists()
            .isLength({min: 10, max: 76})
            .trim()
            .escape();
        req.check('mod', 'Message is invalid.')
            .exists()
            .trim()
            .escape();
        req.check('tra', 'Message is invalid.')
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            req.flash("flash", error);
            res.redirect('back');
        } else if(tra.length < 2) {
            if(await authController.isBanned(req.user.id) == false && (req.user.moderation == 1 || req.user.moderation == 2)) {
                connection.query(`SELECT COUNT(id) AS count FROM reports WHERE user_id = ? AND date > (NOW() - INTERVAL 1 DAY) AND approved != 1; `, [decoded], async (err, results) => { 
                    if(!results || results[0].count < limit_judge) {
                        if(req.params.type == "1") {
                            const promise = authController.judgeTopic(req.params.post_id, mod, message);
                            promise.then(results => 'window.location.href');
                            req.flash("flash", 'Topic verdict submitted. You can have another go at it or do something else.');
                            return res.redirect('../../mod');
                        } else {
                            const promise = authController.judge(req.params.post_id, mod, message);
                            promise.then(results => 'window.location.href');
                            req.flash("flash", 'Post verdict submitted. You can have another go at it or do something else.');
                            return res.redirect('../../mod');
                        }
                    } else {
                        req.flash("flash", "You have reached the daily judging limit. You can judge more tomorrow.");
                        return res.redirect('back');
                    }
                });
            } else {
                req.flash("flash", 'Something went wrong while reporting. Try again.');
                return res.redirect('../../mod');
            }
        }
    } else {
      req.flash("flash", 'Your login has expired. Please log in again.');
      return res.redirect('/register');
    }
});

// 9d8o7M6f5i4t3o2n1
router.post('/9d8o7M6f5i4t3o2n1', authController.isLoggedIn, async (req, res, next) => {
    if(req.user != null) {
        var decoded = req.user.id;
        const { link, message, tra } = req.body;

        req.check('link', 'Message is invalid.')
            .exists()
            .isLength({max: 60})
            .trim()
            .escape();
        req.check('message', 'Message is invalid.')
            .exists()
            .trim()
            .isLength({max: 76})
            .escape();
        req.check('tra', 'Message is invalid.')
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            req.flash("flash", error);
            res.redirect('/');
        } else if(tra.length < 2) {
            
            if(await authController.isBanned(req.user.id) == false && await req.user.moderation == 2) {
                connection.getConnection(function(err, conn) {
                    try {
                        
                        conn.beginTransaction(async function(err) {
                            if (err) { 
                                throw err;
                            }
                            
                            conn.query(`INSERT INTO notifications SET user_id = 1, type = 3, date = ?, href = ?, notification = ?, \`read\` = 0 ; `, [new Date(), link, message], async (error, results1) => {
                                if(error)
                                    throw error;
                                await conn.commit(async function(err) {
                                    if (err) {
                                        throw err;
                                    }
                                    await conn.destroy();
                                    req.flash("flash", "Notification submitted successfully.");
                                    return res.redirect('/1n2o3t4i5f6M7o8d9');
                                });
                            })
                        })
                    } catch {
                        return conn.rollback(function() {
                            conn.destroy();
                            req.flash("flash", "Submitting the notification failed.");
                            return res.redirect('/1n2o3t4i5f6M7o8d9');
                        });
                    }
                });
            } else {
                req.flash("flash", 'Submitting the notification failed.');
                return res.redirect('/');
            }
        }
    } else {
      req.flash("flash", 'Your login has expired. Please log in again.');
      return res.redirect('/register');
    }
});

router.post('/propose', authController.isLoggedIn, async (req, res, next) => {
    if(req.user != null) {
        var decoded = req.user.id;
        const { proposal } = req.body;

        req.check('proposal', 'Proposal is invalid. Max number of characters is 75.')
            .exists()
            .isLength({max: 75})
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            req.flash("flash", error);
            res.redirect('/proposals');
        } else {
            connection.getConnection(function(err, conn) {
                try {
                    conn.beginTransaction(async function(err) {
                        if (err) { 
                            throw err;
                        }
                        conn.query(`SELECT COUNT(id) AS count FROM proposals WHERE user_id = ?;`, [decoded], async (error, results) => {
                            if(error) {
                                conn.destroy();
                                req.flash("flash", "Submitting the proposal failed.");
                                return res.redirect('/proposals');
                            } if(results[0].count < 2) {
                                conn.query(`INSERT INTO proposals SET proposal = ?, approved = ?, user_id = ?; `, [proposal, 0, decoded], async (error, results1) => {
                                    if(error)
                                        throw error;
                                    await conn.commit(async function(err) {
                                        if (err) {
                                            throw err;
                                        }
                                        await conn.destroy();
                                        req.flash("flash", "Proposal submitted successfully.");
                                        return res.redirect('/proposals');
                                    });
                                })
                            } else {
                                await conn.destroy();
                                req.flash("flash", "You posted too much.");
                                return res.redirect('/proposals');
                            }
                        })
                    })
                } catch {
                    return conn.rollback(function() {
                        conn.destroy();
                        req.flash("flash", "Submitting the proposal failed.");
                        return res.redirect('/proposals');
                    });
                }
            });
        }
    } else {
      req.flash("flash", 'Your login has expired. Please log in again.');
      return res.redirect('/register');
    }
});
router.get('/payment_notification/:payment_id', async (req, res) => {
    if(req.user != null) {
        var decoded = req.user.id;

        req.check('payment_id', 'Check your url and try again.')
            .exists()
            .trim()
            .escape();

        error = req.validationErrors();
        if(error != false || null) {
            req.flash("flash", error);
            res.redirect('/profile');
        } else {
            const { sign } = req.header;
            const { payment_status, order_id, updated_at } = req.body;

            // console.log("Order id --> " + order_id);
            // console.log("User id --> " + decoded);

            if((payment_status == "confirmed" || payment_status == "finished") && order_id == decoded && sign == process.env.now_payment_ipn && result.price_amount > 10) {
                connection.getConnection(function(err, conn) {
                    try {
                        conn.beginTransaction(async function(err) {
                            if (err) { 
                                throw err;
                            }
                            conn.query(`UPDATE user SET last_payment = ? WHERE id = ?;`, [updated_at, order_id], async (error, results) => {
                                if(error) {
                                    throw err;
                                } else {
                                    await conn.commit(async function(err) {
                                        if (err) {
                                            throw err;
                                        }
                                        await conn.destroy();
                                        req.flash("flash", "You now how supporter features for the next 3 months. Thank you =]");
                                        return res.redirect('/');
                                    })
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
        }  
    }  
});

module.exports = router;