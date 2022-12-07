const express = require('express');
const mongodb = require('mongodb').MongoClient;
const ejs = require('ejs');
const fs = require('fs');
const multer = require('multer');
const methodOverride = require('method-override');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(express.static('views'));
app.use('/public', express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(session({
    secret : 'secretCode', 
    resave : true, 
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());

// 첨부파일 설정
let filename;
let storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, __dirname + '/public/image/')
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
mongodb.connect(process.env.DB_URL, (err, client) => {
    if(err) return console.log("DB연결 : " + err);

    db = client.db(dbName);

    app.listen(parseInt(process.env.PORT), () => {
        console.log('run at ' + process.env.PORT);
    })
})

//로그인 체크
app.post('/login', passport.authenticate('local', { 
    failureRedirect : '/login',
    failureMessage : true
}), (req, res) => {
    res.redirect('/mypage');
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

        bcrypt.compare(input_pw, result.pw, (err, same) => {
            if(err) return done(null, false, {message : '비밀번호를 확인해 주세요.'});
            if(same) return done(null, result);
        })
    });
}));
// 세션에 id 저장
passport.serializeUser((user, done) => {
    done(null, user.id);
});
// 세션에 저장된 id를 DB에서 검색
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
        res.render('login.ejs');
    }
};

//메인화면
app.get('/', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log("메인화면 : " + err);
        // res.sendFile(__dirname + '/public/image/' + filename);
        res.render('index.ejs', {posts : result });
    });
});

//글쓰기화면
app.get('/write', chk_Login, (req, res) => {
    res.render("write.ejs");
});

//리스트화면
app.get('/list', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log("리스트화면 : " + err);
        // res.sendFile(__dirname + '/public/image/' + filename);
        res.render('list.ejs', { posts : result});
    });
});

//상세화면
app.get('/detail/:id', (req, res) => {
    db.collection('post').findOne({_id: parseInt(req.params.id)}, (err, result) => {
        if (err) return console.log("상세화면 : " + err);
        // res.sendFile(__dirname + '/public/image/' + filename);
        res.render('detail.ejs', {post : result});
    });
});

//수정화면
app.get('/update/:id', chk_Login, (req, res) => {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, (err, result) => {
        if (err) return console.log("수정화면 : " + err);
        // res.sendFile(__dirname + '/public/image/' + filename);
        res.render('update.ejs', { post : result});
    });
});

//로그인 화면
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

//마이페이지 화면
app.get('/mypage', chk_Login, (req, res) => {
    res.render('mypage.ejs', { user : req.user });
});

// 검색
app.get('/search', (req, res) => {
    let search_Conditions = [
        {
            $search : {
                index : 'titleSearch',
                text : {
                    query : req.query.value,
                    path : 'title'
                }
            }
        },
        // { $sort : { _id : 1 }},
        // { $limit : 10 },
        // { $project : { 제목 : 1, _id : 0, score : { $meta : "searchScore"}}}
        // { $project : { title : 1, _id : 0 }}
    ]
    db.collection('post').find({ title : req.query.value }).toArray((err, result) => {
    //db.collection('post').aggregate(search_Conditions).toArray((err, result) => {
        if (err) return console.log("리스트화면 에러 : " + err);
        res.render('list.ejs', { posts : result});
    });
});


//신규저장
app.post('/add', upload.single('imgFile'), (req, res) => {
    db.collection('counter').findOne({name: '게시물갯수'}, (err, result) => {
        // 게시물 카운터 불러오기
        let totalCnt = result.totalPost;
        let insertData = { 
            _id : totalCnt, 
            title : req.body.title, 
            content : req.body.content, 
            img : req.file.filename,
            writer : req.user.id
        };
        // DB저장
        db.collection('post').insertOne(insertData, (err, result) => {
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
app.put('/update', chk_Login, (req, res) => {
    let updateData = { 
        title : req.body.title, 
        content : req.body.content, 
        writer : req.user.id 
    };
    db.collection('post').updateOne({_id : parseInt(req.body.id)}, { $set : updateData}, (err, result) => {
        if(err) return console.log(err);
        res.redirect('/list');
    });
});

//삭제요청
app.delete('/delete', chk_Login, (req, res) => {
    req.body._id = parseInt(req.body._id);
    let deleteData = { 
        _id : req.body._id, 
        writer : req.user.id 
    }
    db.collection('post').deleteOne(deleteData, (err, result) => {
        if(err) return console.log(err);
        if(result.deletedCount > 0){
            // 이미지파일 삭제
            if(fs.existsSync(__dirname + '/public/image/' + req.body.img)){
                try{
                    fs.unlinkSync(__dirname + '/public/image/' + req.body.img);
                    console.log(req.body.img + '이미지파일 삭제 完');
                }catch(error){
                    console.log(error);
                }
            }else{
                console.log("이미지 파일 삭제 실패 : " + __dirname + '/public/image/' + req.body.img);
            }
            res.send({'msg' : '삭제완료'});  
        }else{
            res.send({'msg' : '삭제실패'});
        }
    });
});

// 회원가입
app.post('/register', (req, res) => {
    db.collection('login').findOne({ id : req.body.id }, (err, result) => {
        if(!result){
            const encryptedPassword = bcrypt.hashSync(req.body.pw, 10);
            db.collection('login').insertOne({ id : req.body.id, pw : encryptedPassword }, (err, result) => {
                res.redirect('/');
            });
        }else{
            res.writeHead(200, {'Content-type' : 'text/html; charset=UTF-8'});
            res.write("<script>alert('중복된 아이디 입니다.')</script>")
            res.write("<script>window.location='/login'</script>")
        }
    });
});
