const express = require('express');
const mongodb = require('mongodb').MongoClient;
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const multer = require('multer');
const methodOverride = require('method-override');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');
require('dotenv').config();

// const mysqldb = mysql.createConnection({
//     user     : 'root',
//     password : '1111',
//     database : 'AWS'
// });

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(express.static('views'));
app.use('/public', express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(session({secret : 'secretCode', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

// 첨부파일 설정
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

// mongoDB 설정
let db;
const dbName = 'gallery';
mongodb.connect('mongodb+srv://admin:qwer1234@cluster0.xukw2sd.mongodb.net/?retryWrites=true&w=majority', (err, client) => {
    if(err) return console.log(err);

    db = client.db(dbName);

    app.listen(8888, () => {
        console.log('run at 8888');
    })
})

//메인화면
app.get('/', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log(err);
        res.sendFile(__dirname + "/public/image" + filename);
        res.render('index.ejs', {posts : result });
    })
});

//글쓰기화면
app.get('/write', chk_Login, (req, res) => {
    res.render("write.ejs");
})
//리스트화면
app.get('/list', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log(err);
        res.sendFile(__dirname + '/public/image' + filename);
        res.render('list.ejs', { posts : result});
    });
});

//상세화면
app.get('/detail/:id', (req, res) => {
    db.collection('post').findOne({_id: parseInt(req.params.id)}, (err, result) => {
        if (err) return console.log(err);
        res.sendFile(__dirname + 'public/image' + filename);
        res.render('detail.ejs', {post : result});
    });
});

//수정화면
app.get('/update/:id', chk_Login, (req, res) => {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, (err, result) => {
        if (err) return console.log(err);
        res.sendFile(__dirname + '/public/image' + filename);
        res.render('update.ejs', { post : result});
    });
});

//로그인 화면
app.get('/login', (req, res) => {
    res.render('login.ejs');
})

//마이페이지 화면
app.get('/mypage', chk_Login, (req, res) => {
    res.render('mypage.ejs', { user : req.user });
});



//신규저장
app.post('/add', upload.single('imgFile'), (req, res) => {
    db.collection('counter').findOne({name: '게시물갯수'}, (err, result) => {
        // 카운터 불러오기
        let totalCnt = result.totalPost;
        // DB저장
        db.collection('post').insertOne({ 
            _id : totalCnt, title : req.body.title, 
            content : req.body.content, 
            img : req.file.filename
        }, (err, result) => {
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

// 업데이트
app.put('/update', (req, res) => {
    db.collection('post').updateOne({ _id : parseInt(req.body.id)}, { $set : { title : req.body.title, content : req.body.content }}, (err, result) => {
        if(err) return console.log(err);
        res.redirect('/list');
    });
});

//삭제요청
app.delete('/delete', (req, res) => {
    req.body._id = parseInt(req.body._id);
    db.collection('post').deleteOne(req.body, (err, result) => {
        if(err) return console.log(err);
        console.log('삭제완료');
        })
        //res.status(200).send({ message : '삭제완료'});
    res.redirect('/list');
});

//로그인 체크
app.post('/login', passport.authenticate('local', { 
    failureRedirect : '/fail' 
}), (req, res) => {
    res.redirect('/');
});

passport.use(new localStrategy({
    usernameField : 'id',
    passwordField : 'pw',
    session : true,
    passReqToCallback : false,
}, (input_id, input_pw, done) => {
    db.collection('login').findOne({
        id : input_id
    }, (err, result) => {
        if(err) return done(err);
        if(!result) return done(null, false, {message : '존재하지 않는 아이디입니다.'});
        if(input_pw == result.pw){
            return done(null, result); 
        }else{
            return done(null, false, {message : '비밀번호를 확인해 주세요.'});
        }
    });
}));
// 세션에 id 저장
passport.serializeUser((user, done) => {
    done(null, user.id);
});
// 세션 정보를 DB에서 검색
passport.deserializeUser((id, done) => {
    db.collection('login').findOne({ id : id }, (err, result) => {
        done(null, result);
    });
});

//로그인 유무 체크
function chk_Login(req, res, next){
    if(req.user){
        next();
    }else{
        //res.send('로그인 해 주세요.');
        res.render('login.ejs');
    }
};