module.exports = {
    server_port: 3000,
    db_url: 'mongodb://localhost:27017/Library',

    db_schemas: [
        { file: './user_schema', collection: 'member', schemaName: 'UserSchema', modelName: 'UserModel' }
    ],

    route_info: [

    ],
}

// route_info: [
//     { file: './user', path: '/process/login', method: 'login', type: 'post' },
//     { file: './user', path: '/process/adduser', method: 'adduser', type: 'post' },
//     { file: './user', path: '/process/listuser', method: 'listuser', type: 'post' },
// ],