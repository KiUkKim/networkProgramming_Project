// Express 기본 모듈 불러오기
var express = require('express'),
    http = require('http'),
    path = require('path');

// Express의 미들웨어 불러오기
var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    static = require('serve-static'),
    errorHandler = require('errorhandler');

// 오류 핸들러 모듈 사용
var expressErrorHandler = require('express-error-handler');

// Session 미들웨어 불러오기
var expressSession = require('express-session');
const { urlencoded } = require('body-parser');
const { Router } = require('express');

// 익스프레스 객체 생성
var app = express();

// 라우터 설정
var router = express.Router();

// config 파일 불러오기
var config = require('./config');

// 모듈로 분리한 데이터베이스 파일 불러오기
var database = require('./database/database');

// route_loader : 어떤 라우팅 모듈들이 있는지 확인한 후, 해당 모듈 파일들을 읽어서 실행
var route_loader = require('./routes/route_loader');

// ################# PassPort 사용 ######################//
var passport = require('passport');
var flash = require('connect-flash');
var LocalStrategy = require('passport-local').Strategy; // 인증방식 스트래지를 Local로 설정함.[해당 프로젝트에서 Local만 사용할 예정.]

// 기본 속성 설정 (포트 설정) [config파일의 정보를 불러옴. port : 3000]
console.log('config.server_port : %d', config.server_port);
app.set('port', process.env.PORT || config.server_port);


// body-Parser 미들웨어 사용하여서 application/x-www-form-urlencoded 파싱
app.use(bodyParser.urlencoded({ extended: false }));

// body-Parser를 사용해 application/json 파싱
app.use(bodyParser.json());

// path 모듈을 사용하여서 public 폴더를 static으로 오픈
app.use('/public', static(path.join(__dirname, 'public')));

// cookie-parser 설정
app.use(cookieParser());

// session-parser 설정
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

// ################## Passport 사용 설정 ####################### //
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// 뷰 엔진 설정
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
console.log('뷰 엔진이 ejs로 설정되었습니다.');

// 패스트포트 로그인 설정
passport.use('local-login', new LocalStrategy({
    usernameField: 'id',
    passwordField: 'password',
    passReqToCallback: true
}, function (req, id, password, done) {
    console.log('passport의 local-login 호출됨 : ' + id + ', ' + password);

    var database = app.get('database');
    database.UserModel.findOne({ 'id': id }, function (err, user) {
        if (err) { return done(err); }

        // 등록된 사용자가 없는 경우
        if (!user) {
            console.log('등록된 계정이 없거나 일치하는 계정이 없습니다.');
            return done(null, false, req.flash('loginMessage', '등록된 계정이 없거나 일치하는 계정이 없습니다.'));
        }

        var authenticated = user.authenticate(password, user._doc.salt, user._doc.hashed_password);

        if (!authenticated) {
            console.log('비밀번호가 일치하지 않습니다.');
            return done(null, false, req.flash('loginMessage', '비밀번호가 일치하지 않습니다.'));
        }

        // 계정아이디와 비밀번호가 일치하는 경우
        console.log('계정과 비밀번호가 일치함.');
        return done(null, user, req.flash('loginMEssage', '로그인에 성공했습니다! 잠시 후 페이지가 이동합니다.'));
    });
}));

// 패스포트 회원가입 설정
passport.use('local-signup', new LocalStrategy({
    usernameField: 'id',
    passwordField: 'password',
    passReqToCallback: true
}, function (req, id, password, done) {
    console.log('passport의 local-signup 호출됨 : ' + id + ', ' + password);

    // 요청 파라미터 중 해당 스키마의 name, age, phoneNum, job확인 
    var paramName = req.body.name || req.query.name;
    var paramAge = req.body.age || req.query.age;
    var paramphoneNum = req.body.phoneNum || req.query.phoneNum;
    var paramJob = req.body.job || req.query.job;
    console.log('passport의 local-signup 호출됨' + id + ', ' + password + ', ' + paramName + ', ' + paramAge + ',' + paramphoneNum + ', ' + paramJob);

    // User.findOne이 blocking되므로 async 방식으로 변경할 수도 있음
    process.nextTick(function () {
        var database = app.get('database');
        // id 중복일어났는지 확인, 중복이면 오류메세지 중복이 아니면 정상적으로 회원가입 진행
        database.UserModel.findOne({ 'id': id }, function (err, usr) {
            // 오류 발생
            if (err) {
                return done(err);
            }

            // 기존에 아이디 있다면
            if (user) {
                console.log('기존에 계정이 존재합니다.');
                return done(null, false, req.flash('signupMessage', '기존에 계정이 존재합니다.'));
            }

            // 기존에 아이디가 없음
            else {
                // 모델 인스턴스 객체 만들어 저장
                var user = new database.UserModel({ 'id': id, 'password': password, 'age': paramAge, 'name': paramName, 'phoneNum': paramphoneNum, 'job': paramJob });

                user.save(function (err) {
                    if (err) { throw err; }

                    console.log('사용자 데이터가 추가되었습니다.');
                    return done(null, user, req.flash('signupMessage', '회원가입을 축하드립니다!!'));
                });
            }

        });
    });
}));


// 사용자 인증에 성공했을 때 호출
// serializeUser의 콜백 함수는 전달받은 user 객체의 정보를 콘솔창에 출력 후 done() 메소드 호출
passport.serializeUser(function (user, done) {
    console.log('serializeUser() 호출됨.');
    console.dir(user);

    done(null, user);
});

// 사용자 인증 이후 사용자 요청이 있을 때 마다 호출 (로그인 상태인 경우)
passport.deserializeUser(function (user, done) {
    console.log('desrializeUser() 호출됨.');
    console.dir(user);

    done(null, user);
})


// 사용자 관련, 라우팅 관련 등 개발과 유지 보수를 위해 모듈화되어있음

// 라우팅 정보를 읽어들여 라우팅 설정
route_loader.init(app, router);

// 홈화면 - main 화면
router.route('/').get(function (req, res) {
    console.log('/패스 요청됨. -> 메인 화면을 요청합니다.');
    res.render('main.ejs');
});

// 로그인 화면
app.get('/login', function (req, res) {
    console.log('/login 패스 요청됨.');
    res.render('login.ejs', { message: req.flash('loginMessage') });
})

app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/library',
    failureRedirect: '/login',
    failureFlash: true
}));

// 회원가입 화면
app.get('/signup', function (req, res) {
    console.log('/signup 패스 요청됨.');
    res.render('signup.ejs', { message: req.flash('signupMessage') });
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/login',
    failureRedirect: '/signup',
    failureFlash: true
}));

// 도서메인 화면 - 로그인 여부를 확인할 수 있도록 먼저 isLoggedIn 미들웨어 실행
// 로그인이 되었다면 해당 정보 가지고 main창으로 이동.
router.route('/library').get(function (req, res) {
    console.log('/library 패스 요청됨.');

    // 인증된 경우에는 req.user 객체에 사용자 정보가 담겨있다.
    console.log('req.user 객체의 값');
    console.dir(req.user);

    // 인증 안된 경우
    if (!req.user) {
        console.log('사용자가 로그인이 되어 있지 않는 상태입니다.');
        res.redirect('/');
        return;
    }

    // 인증 된 경우
    console.log('사용자 계정이 로그인 되어 있습니다.');
    // 배열 객체인지 판별
    if (Array.isArray(req.user)) {
        res.render('library.ejs', { user: req.user[0]._doc });
    }
    else {
        res.render('library.ejs', { user: req.user });
    }
})

// 로그아웃 라우팅 코드
app.get('/logout', function (req, res) {
    console.log('./logout 패스가 요청되어 로그아웃을 진행합니다.');

    req.logout();
    res.redirect('/');
});

// 대여 라우팅 코드
// app.get('/rent', function (req, res) {
//     console.log('./rent 패스가 요청되어 로그아웃을 진행합니다.');

//     var paramId = req.user.id;

//     user.update({ "id": req.user.id }, { '$inc': { 'ava_book': -1 } });

//     res.redirect('/library');
// });


// =============== 404 오류 페이지 처리 ================= //
var errorHandler = expressErrorHandler({
    static: {
        '404': './public/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

//================ 서버 시작 ===================//
// 프로세스 종료 시에 데이터베이스 연결 해제
process.on('SIGTERM', function () {
    console.log("프로세스가 종료됩니다.");
    app.close();
});

app.on('close', function () {
    console.log("Express 서버 객체가 종료됩니다.");
    if (database.db) {
        database.db.close();
    }
});


http.createServer(app).listen(app.get('port'), function () {
    console.log('서버가 시작되었습니다. PORT : ' + app.get('port'));

    // 데이터베이스 초기화
    database.init(app, config);
});
