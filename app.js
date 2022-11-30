const express = require('express');
const mongodb = require('mongodb').MongoClient;
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');

const mysqldb = mysql.createConnection({
    user     : 'root',
    password : '1111',
    database : 'AWS'
});

let db;
const dbName = 'gallery';
mongodb.connect('mongodb+srv://admin:qwer1234@cluster0.xukw2sd.mongodb.net/?retryWrites=true&w=majority', (err, client) => {
    if(err) return console.log(err);

    db = client.db(dbName);

    app.listen('8888', () => {
        console.log('run at 8888');
    })
})

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(express.static('views'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.get('/add', (req, res) => {
    res.sendFile(__dirname + "/write.html");
})
app.get('/list', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        console.log(result);
        res.render('list.ejs', { posts : result});
    });
    
});


app.post('/add', (req, res) => {
    db.collection('post').insertOne({ title : req.body.title, content : req.body.content}, (err, result) => {
        console.log('저장완료');
    });
});
