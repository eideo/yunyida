/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
    login: function (req, res) {
        var userName = req.body.userName || req.query.userName;
        var password = req.body.password || req.query.password;
        User.find({
                //where: {password: EncryptService.Encrypt(password)},
                or: [{userName: userName}, {phoneNumber: userName}]
            })
            .exec(function (err, users) {
                if (err) res.badRequest(err);
                if (users && users.length > 0) {
                    var user = users[0];
                    if (user.password == EncryptService.Encrypt(password)) {
                        res.ok(user);
                    }
                    else {
                        res.serverError({msg: '您输入的密码不正确!'});
                    }
                }
                else {
                    res.serverError({msg: '您的用户名或手机号码不存在!'});
                }
            });
    },
    update: function (req, res) {
        var data_from = req.params.all();
        User.update({userId: data_from.userId}, data_from)
            .exec(function (err, user) {
                if (err) res.badRequest(err);
                res.ok(user[0]);
            });
    },
    checkIsExist: function (req, res) {
        var userName = req.body.userName || req.query.userName;
        User.find({
                or: [{userName: userName}, {phoneNumber: userName}]
            })
            .exec(function (err, users) {
                if (err) res.badRequest(err);
                if (users && users.length > 0) {
                    res.serverError({msg: '用户或手机号码已存在!'});
                }
                else {
                    res.ok({msg: 'ok'});
                }
            });
    },
    register: function (req, res) {
        var data_from = req.params.all();
        User.create(data_from).exec(function (err, user) {
            if (err) res.badRequest(err);
            res.ok(user);
        })
    },
    restPwd: function (req, res) {
        var data_from = req.params.all();
        User.findOne({phoneNumber: data_from.phoneNumber})
            .exec(function (err, user) {
                if (err) res.badRequest(err);
                user.password = EncryptService.Encrypt(data_from.password);
                user.save(function (err, user) {
                    if (err) res.badRequest(err);
                    res.ok(user);
                })
            });
    },
    changePwd: function (req, res) {
        var data_from = req.params.all();
        User.findOne({userId: data_from.userId})
            .exec(function (err, user) {
                if (err) res.badRequest(err);
                if (user.password == EncryptService.Encrypt(data_from.oldPassword)) {
                    user.password = EncryptService.Encrypt(data_from.newPassword);
                    user.save(function (err, user) {
                        if (err) res.badRequest(err);
                        res.ok(user);
                    })
                }
                else {
                    res.badRequest('您输入的原始密码不正确');
                }
            });
    },
    getValidCode: function (req, res) {
        var phoneNumber = req.body.phoneNumber || req.query.phoneNumber;
        SMSService.Send(phoneNumber, function (code) {
            if (code) {
                req.session.validCode = code;
                res.ok({validCode: code});
            }
        });
    },
    checkValidCode: function (req, res) {
        var phoneNumber = req.body.phoneNumber || req.query.phoneNumber;
        var validCode = req.body.validCode || req.query.validCode;
        if (req.session.validCode == validCode) {
            res.ok({msg: 'ok'});
        }
        else {
            res.serverError({msg: 'no'});
        }
    },
    /**
     * 上传头像
     *
     * (POST /user/uploadAvatar)
     */
    uploadAvatar: function (req, res) {
        req.file('avatar').upload({
            dirname: sails.config.appPath + '/assets/images',
            maxBytes: 10000000            // 允许最大上传的文件大小为10MB
        }, function whenDone(err, uploadedFiles) {
            if (err) {
                return res.negotiate(err);
            }

            // 如果文件上传不成功,返回一个错误.003
            if (uploadedFiles.length === 0) {
                return res.badRequest('文件上传失败');
            }

            var avatarId = uploadedFiles[0].fd.replace(sails.config.appPath + '/assets/images/', '').replace('.jpg', '');

            return res.send(avatarId);
        });
    },
    /**
     * 通过头像资源Id获取图片
     *
     * (GET /user/avatar/:id)
     */
    avatar: function (req, res) {
        req.validate({
            id: 'string'
        });

        var avatarFd = sails.config.appPath + '/assets/images/' + req.param('id') + '.jpg';
        var skipperDisk = require('skipper-disk');
        var fileAdapter = skipperDisk(/* optional opts */);

        // Stream the file down
        fileAdapter.read(avatarFd)
            .on('error', function (err) {
                return res.serverError(err);
            })
            .pipe(res);
    }
};
