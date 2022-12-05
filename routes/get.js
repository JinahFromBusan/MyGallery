let router = require('express').Router();


//메인화면
router.get('/', (req, res) => {
    db.collection('post').find().toArray((err, result) => {
        if (err) return console.log("메인화면 : " + err);
        res.sendFile(__dirname + "/public/image/" + filename);
        res.render('index.ejs', {posts : result });
    })
});

module.exports = router;