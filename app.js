const express = require('express');
const mongodb = require('mongodb').MongoClient;
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const multer = require('multer');

const mysqldb = mysql.createConnection({
    user     : 'root',
    password : '1111',
    database : 'AWS'
});
let filename;
let storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, './public/image')
    },
    filename : function(req, file, cb){
        cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'))
    },
    filefilter : function(req, file, cb){
        filename = path.extname(file.originalname);
        if(filename !== '.png' && filename !== '.jpg' && filename !== '.jpeg'){
            return callback(new Error('PNG, JPG만 업로드하세요.'));
        }
        callback(null, true);
    },
    limits:{
        filesize: 1024 * 1024
    }
});

let upload = multer({ storage : storage });
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
app.use('/public', express.static(__dirname + '/public'));

//메인화면 불러오기 설정
app.get('/', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log(err);
        res.sendFile(__dirname + "/public/image" + filename);
        res.render('index.ejs', {posts : result });
    })
});

//글쓰기화면 불러오기 설정
app.get('/write', (req, res) => {
    res.render("write.ejs");
})
//리스트화면 불러오기 설정
app.get('/list', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log(err);
        res.sendFile(__dirname + '/public/image' + filename);
        res.render('list.ejs', { posts : result});
    });
});


app.post('/add', upload.single('imgFile'), (req, res) => {
    db.collection('counter').findOne({name: '게시물갯수'}, (err, result) => {
        // 카운터 불러오기
        let totalCnt = result.totalPost;
        // DB저장
        db.collection('post').insertOne({ _id : totalCnt, title : req.body.title, content : req.body.content, img : req.file.filename}, (err, result) => {
            if(err) return console.log(err);

            console.log('저장완료');
            //카운터 업데이트
            db.collection('counter').updateOne({name : '게시물갯수'},{ $inc : {totalPost : 1}}, (err, result) => {
                if(err) return console.log(err);
            });
            res.redirect('/list');
        });
    });
});
