var crypto = require('crypto');

var Schema = {};

Schema.createSchema = function (mongoose) {
    // 스키마 정의

    UserSchema = mongoose.Schema({
        id: { type: String, required: true, unique: true, 'default': ' ' },
        name: { type: String, index: 'hashed', 'default': ' ' },
        hashed_password: { type: String, required: true, 'default': ' ' },
        salt: { type: String, required: true },
        age: { type: Number, 'default': -1 },
        phoneNum: { type: String, required: true },
        job: { type: String, 'default': "무직" },
        ava_book: { type: Number, 'default': 2 },
        create_at: { type: Date, index: { unique: false }, 'default': Date.now },
        update_at: { type: Date, index: { unique: false }, 'default': Date.now }
    });

    // password를 virtual 메소드로 정의 : MongoDB에 저장되지 않는 편리함 속성임. 특정 속성을 지정하고 setm get 메소드를 정의함.
    UserSchema
        .virtual('password')
        .set(function (password) {
            this._password = password;
            this.salt = this.makeSalt();
            this.hashed_password = this.encryptPassword(password);
            console.log('virtual password 호출됨 : ' + this.hashed_password);
        })
        .get(function () { return this._password });


    // 스키마에 모델 인스턴스에서 사용할 수 있는 메소드 추가
    // 비밀번호 암호화 메소드
    UserSchema.method('encryptPassword', function (plainText, inSalt) {
        if (inSalt) {
            return crypto.createHmac('sha1', inSalt).update(plainText).digest('hex');
        }
        else {
            return crypto.createHmac('sha1', this.salt).update(plainText).digest('hex');
        }
    });

    // salt 값 만들기 메소드
    UserSchema.method('makeSalt', function () {
        return Math.round((new Date().valueOf() * Math.random())) + '';
    });

    // 인증 메소드 - 입력된 비밀번호와 비교 (true/false 리턴)
    UserSchema.method('authenticate', function (plainText, inSalt, hashed_password) {
        if (inSalt) {
            console.log('authenticate 호출됨 : %s -> %s : %s', plainText, this.encryptPassword(plainText, inSalt), hashed_password);
            return this.encryptPassword(plainText, inSalt) == hashed_password;
        }
        else {
            console.log('authenticate 호출됨 : %s -> %s : %s', plainText, this.encryptPassword(plainText), this.hashed_password);
            return this.encryptPassword(plainText, inSalt) == this.hashed_password
        }
    });

    // 필수 속성에 대한 유효성 확인(길이 값 체크) [아이디, 비밀번호 ,이름에 대해서]
    UserSchema.path('id').validate(function (id) {
        return id.length;
    }, 'id 칼럼의 값이 없습니다.');

    UserSchema.path('name').validate(function (name) {
        return name.length;
    }, 'name 칼럼의 값이 없습니다.')

    UserSchema.path('hashed_password').validate(function (hashed_password) {
        return hashed_password.length;
    }, 'hashed_password 칼럼의 값이 없습니다.')


    UserSchema.static('findById', function (id, callback) {
        return this.find({ id: id }, callback);
    });


    UserSchema.static('findAll', function (callback) {
        return this.find({}, callback);
    });

    console.log('UserSchema 정의함.');

    return UserSchema;
}

module.exports = Schema;