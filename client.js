const express = require('express');
const request = require('request');
const Utils = require("./utils");
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const adaro = require('adaro');
const path = require('path');
const md5 = require('md5');
const xml2js = require("xml2js");
const _ = require('lodash');
const eachAsync = require('each-async');
const pinyin = require("pinyin");
var exec = require('child_process').exec;
const async = require('async');
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
var app = express();
app.engine('dust', adaro.dust({
    helpers: ['dustjs-helpers']
}));
app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'dust');
app.use(bodyParser.text({limit: '10mb'}));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
var xmlParser = new xml2js.Parser({explicitArray : false, mergeAttrs : true});
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
// 获得access_token
const API_KEY = "DOUGGvwuB7wEe0Nu6jygFdeV";
const SECRET_KEY = "yiaiTekE8QFXlGG0jy8YP0s6qgQIhGkH";
var access_token = '';
https.get({
        hostname: 'aip.baidubce.com',
        path: '/oauth/2.0/token?grant_type=client_credentials&client_id=' + API_KEY + "&client_secret=" + SECRET_KEY,
        agent: false
    }, function (res) {
        var body = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            var data = JSON.parse(Buffer.concat(body).toString());
            access_token = data['access_token'];
            console.log("access_token=" + access_token);
        });
    }
);
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
// 如果没有/var/bigbluebutton/published/presentation/test目录，则创建之
if (!fs.existsSync("/var/bigbluebutton/published/presentation/test")) {
    fs.mkdirSync("/var/bigbluebutton/published/presentation/test");
}
/*if (!fs.existsSync("C:\\Users\\dongyt\\Desktop\\test")) {
    fs.mkdirSync("C:\\Users\\dongyt\\Desktop\\test");
}*/
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
// 创建bbb回调钩子
const CALLBACK_URL = "http://meeting.ruoben.com:8008/notify";
const SHARED_SECRET = "Hgdhxsy3OBhGwS4BKn5Bq8Ow0GHvwkZ32VthJ9RnXs";
app.get("/create", function (req, res) {
    var reqURL = "https://www.eadiu.com/bigbluebutton/api/hooks/create?callbackURL=" + CALLBACK_URL;
    var checksum = Utils.checksumAPI(reqURL, SHARED_SECRET);
    request.get(reqURL + "&checksum=" + checksum, function (err, res1, body) {
        if (err) {
            console.error(err);
            res.status(500).end(err.toString());
        } else {
            if (res1.statusCode === 200) {
                res.header("Content-Type", "text/xml");
                res.status(200).end(res1.body);
            } else {
                console.error(err);
                res.status(res1.statusCode).end(body);
            }
        }
    });
});
// 销毁bbb回调钩子
app.get("/destroy/:hookID", function (req, res) {
    var reqURL = "https://www.eadiu.com/bigbluebutton/api/hooks/destroy?hookID=" + req.params.hookID;
    var checksum = Utils.checksumAPI(reqURL, SHARED_SECRET);
    request.get(reqURL + "&checksum=" + checksum, function (err, res1, body) {
        if (err) {
            console.error(err);
            res.status(500).end(err.toString());
        } else {
            if (res1.statusCode === 200) {
                res.header("Content-Type", "text/xml");
                res.status(200).end(res1.body);
            } else {
                console.error(err);
                res.status(res1.statusCode).end(body);
            }
        }
    });
});
// 列出bbb回调钩子
app.get("/list", function (req, res) {
    var reqURL = "https://www.eadiu.com/bigbluebutton/api/hooks/list";
    var checksum = Utils.checksumAPI(reqURL, SHARED_SECRET);
    request.get(reqURL + "?checksum=" + checksum, function (err, res1, body) {
        if (err) {
            console.error(err);
            res.status(500).end(err.toString());
        } else {
            if (res1.statusCode === 200) {
                res.header("Content-Type", "text/xml");
                res.status(200).end(res1.body);
            } else {
                console.error(err);
                res.status(res1.statusCode).end(body);
            }
        }
    });
});
// bbb回调钩子
app.post("/notify", function (req, res) {
    var data = JSON.parse(req.body.event)[0].data;
    if (data.id === "rap-post-publish-ended") {
        var meetingId = data.attributes.meeting['internal-meeting-id'];
        var videoFile = "/var/bigbluebutton/published/presentation/" + meetingId + "/video/webcams.webm";
        var exist = fs.existsSync(videoFile);
        if (exist) {
            var cmd = "sudo ffmpeg -i /var/bigbluebutton/published/presentation/" + meetingId + "/video/webcams.webm -vn -f mp3 /var/bigbluebutton/published/presentation/" + meetingId + "/video/webcams.mp3";
            exec(cmd, function (err, stdout, stderr) {
                if (err) {
                    console.error(err);
                    res.status(500).end(err.toString());
                } else {
                    cmd = "sudo ffmpeg -i /var/bigbluebutton/published/presentation/" + meetingId + "/video/webcams.webm -vn -f wav /var/bigbluebutton/published/presentation/" + meetingId + "/video/webcams.wav";
                    exec(cmd, function (err, stdout, stderr) {
                        if (err) {
                            console.error(err);
                            res.status(500).end(err.toString());
                        } else {
                            res.status(200).end();
                            /*request({
                                url: 'http://180.76.243.191:5000/api/exec_weblf_asr',
                                method: 'POST',
                                headers: {
                                    "content-type": "application/json"
                                },
                                json: true,
                                body: {
                                    params: {'record_id': meetingId}
                                }
                            }, function (err1, res1, body) {
                                if (err1) {
                                    console.error(err1);
                                    res.status(500).end(err1.toString());
                                } else {
                                    if (res1.statusCode === 200) {
                                        console.log(meetingId + "录制id已上传到语音识别系统");
                                        res.status(200).end();
                                    } else {
                                        console.error(err1);
                                        res.status(res1.statusCode).end(body.toString());
                                    }
                                }
                            });*/
                        }
                    });
                }
            });
        } else {
            res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end(meetingId + "录制文件不存在");
        }
    } else {
        res.status(200).end();
    }
});
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
// bbb管理员界面操作，手动发送record_id
app.get("/send_record_id/:recordId", function (req, res) {
    if (req.query.username === 'dongyt' && req.query.password === 'helloworld') {
        request({
            url: 'http://180.76.243.191:5000/api/exec_weblf_asr',
            method: 'POST',
            headers: {
                "content-type": "application/json"
            },
            json: true,
            body: {
                params: {'record_id': req.params.recordId}
            }
        }, function (err1, res1, body) {
            if (err1) {
                console.error(err1);
                res.header('Content-Type', 'text/plain; charset=utf-8').status(500).end(err1.toString());
            } else {
                if (res1.statusCode === 200) {
                    console.log(req.params.recordId + "录制id已上传到语音识别系统");
                    res.header('Content-Type', 'text/plain; charset=utf-8').status(200).end(req.params.recordId + "录制id已上传到语音识别系统");
                } else {
                    console.error(err1);
                    res.header('Content-Type', 'text/plain; charset=utf-8').status(res1.statusCode).end(body.toString());
                }
            }
        });
    } else {
        res.header('Content-Type', 'text/plain; charset=utf-8').status(401).end('没有提供正确的用户名或密码');
    }
});
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
// 获取audio，txt，summary文件，或打开思维导图
app.get("/resource/:recordId", function (req, res) {
    if (req.query.username === 'dongyt' && req.query.password === 'helloworld') {
        var type = req.query.type;
        if (!type) {
            console.log("没有提供类型");
            res.header('Content-Type', 'text/plain; charset=utf-8').status(202).end("没有提供类型");
        } else {
            if (type === 'mp3' || type === 'wav') {
                var videoFile = "/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams." + type;
                // var videoFile = "C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams." + type;
                var exist = fs.existsSync(videoFile);
                if (exist) {
                    res.writeHead(200, {
                        'Content-Type': 'audio/' + type,
                        'Content-Disposition': 'attachment; filename=' + req.params.recordId + "." + type,
                        'Content-Length': fs.statSync(videoFile).size
                    });
                    fs.createReadStream(videoFile).pipe(res);
                } else {
                    res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end(type + "文件不存在");
                }
            } else if (type === 'txt' || type === 'sum') {
                var filenames = getFilenamesByExt("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video", type);
                // var filenames = getFilenamesByExt("C:\\Users\\dongyt\\Desktop\\新建文件夹", type);
                if (filenames.length === 0) {
                    res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end(type + "文件不存在");
                } else {
                    var content = '';
                    for (var i=0; i<filenames.length; i++) {
                        var a = filenames[i].split('.');
                        if (a.length === 3) {
                            content += '[' + a[1] + ']\n' + fs.readFileSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/" + filenames[i]) + '\n\n';
                            // content += '[' + a[1] + ']\n' + fs.readFileSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\" + filenames[i]) + '\n\n';
                        }
                    }
                    res.writeHead(200, {
                        'Content-Type': 'audio/' + type,
                        'Content-Disposition': 'attachment; filename=' + req.params.recordId + "." + type,
                        'Content-Length': Buffer.byteLength(content)
                    });
                    res.end(content);
                }
            } else if (type === 'mnd') {
                var files = getFilenamesByExt("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video", 'mnd');
                // var files = getFilenamesByExt("C:\\Users\\dongyt\\Desktop\\新建文件夹", 'mnd');
                if (files.length === 0) {
                    res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end("脑图文件不存在");
                } else {
                    var speakers = [];
                    for (var i=0; i<files.length; i++) {
                        var mind = JSON.parse(('' + fs.readFileSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/" + files[i])).replace(/%/g, '%25'));
                        // var mind = JSON.parse(('' + fs.readFileSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\" + files[i])).replace(/%/g, '%25'));
                        speakers.push({record: req.params.recordId, speaker: mind.speaker, sum_obj: JSON.stringify(mind['sum_obj']).replace(/%25/g, '%')});
                    }
                    res.render('mind', {speakers: speakers});
                }
            } else {
                console.log("没有提供正确的类型，类型必须是mp3,wav,txt,sum,mnd");
                res.header('Content-Type', 'text/plain; charset=utf-8').status(202).end("没有提供正确的类型，类型必须是mp3,wav,txt,sum,mnd");
            }
        }
    } else {
        res.header('Content-Type', 'text/plain; charset=utf-8').status(401).end('没有提供正确的用户名或密码');
    }
});
function getFilenamesByExt(dir, ext) {
    var wenjian = [];
    var files = fs.readdirSync(dir);
    for (var i=0; i<files.length; i++) {
        var statInfo = fs.lstatSync(path.join(dir, files[i]));
        if(statInfo.isFile() && path.extname(files[i]) === "." + ext) {
            wenjian.push(files[i]);
        }
    }
    return wenjian;
}
function isEqualByPinyin(text1, text2) {  // text1是摘要ner的拼音，text2是原文ner的拼音
    var arr1 = text1.split('|');
    var arr2 = text2.split('|');
    var arr_inter = _.intersection(arr1, arr2);
    var avg_len = (arr1.length + arr2.length) / 2.0;
    if ((arr_inter.length / avg_len) > 0.6) {
        return true;
    }
    var eq = 0;
    arr1 = _.reverse(arr1);
    arr2 = _.reverse(arr2);
    for (var i = 0; i < arr1.length && i < arr2.length; i++) {
        if (arr1[i] === arr2[i]) {
            eq++;
        } else {
            var charArr1 = arr1[i].split('');
            var charArr2 = arr2[i].split('');
            var a_inter = _.intersection(charArr1, charArr2);
            var a_len = (charArr1.length + charArr2.length) / 2.0;
            if ((a_inter.length / a_len) > 0.7) {
                eq++;
            }
        }
    }
    return (eq / avg_len) > 0.6;
}
function uniq(arr, field) {
    var s = {};
    for(var i=0; i<arr.length; i++){
        s[arr[i][field]] = arr[i];
    }
    return Object.values(s);
}
// 取speaker的讲话原文
app.get("/gettext/:recordId/:speakerId", function (req, res) {
    fs.readFile("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams." + req.params.speakerId + ".txt", function (err, text) {
    // fs.readFile("C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams." + req.params.speakerId + ".txt", function (err, text) {
        if (err) {
            console.error(err);
            res.status(500).end(err.toString());
        } else {
            res.header('Content-Type', 'text/plain; charset=utf-8').status(200).end('' + text);
        }
    });
});
// 取摘要任务
var speaker_summary_task = function(callback, results) {
    request.post({
        url: "http://partition-svc.nlp:8080",  //"http://summary.ruoben.com:8008",
        json: true,
        body: {speaker: results.speaker_text_task[1], text: results.speaker_text_task[2]},
        timeout: 600000
    }, function (err, res, summary) {
        if (err) {
            callback(err.toString());
        } else {
            if (res.statusCode === 200) {
                console.log('speaker=' + results.speaker_text_task[1] + ', summary=' + summary);  /////////////////
                var sum_obj = {};
                var lines = summary.split('\n');
                for(var i=0; i<lines.length; i++) {
                    sum_obj['' + i] = lines[i];
                }
                fs.writeFile("/var/bigbluebutton/published/presentation/" +  results.speaker_text_task[0] + "/video/webcams." + results.speaker_text_task[1] + ".sum", summary, function (err2) {
                // fs.writeFile("C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams." + results.speaker_text_task[1] + ".sum", summary, function (err2) {
                    if (err2) {
                        callback('写' + results.speaker_text_task[1] + ' speaker sum文件报错');
                    } else {
                        callback(null, sum_obj);
                    }
                });
            } else {
                callback("调用summary接口报错");
            }
        }
    });
};
// 取标题任务
var speaker_title_task = function(callback, results) {
    var options = {
        hostname: 'aip.baidubce.com',
        path: '/rpc/2.0/nlp/v1/news_summary?charset=UTF-8&access_token=' + access_token,  // news_summary
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const req = https.request(options, function (res) {
        var body = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            var data = JSON.parse(Buffer.concat(body).toString());
            var title = data['summary'];  // 标题
            console.log('speaker=' + results.speaker_text_task[1] + ', title=' + title);  /////////////////
            callback(null, title);
        });
    });
    req.on('error', function(err) {
        callback(err.toString());
    });
    var len = Math.round(results.speaker_text_task[2].length * 0.15);
    if (len < 50) {
        len = 50;
    } else if (len > 100) {
        len = 100;
    }
    var param = JSON.stringify({
        'content': results.speaker_text_task[2],
        'max_summary_len': len
    });
    req.write(param);
    req.end();
};
// 取原文中的ner任务
var speaker_ner_task = function(callback, results) {
    request.post({
        url: "http://dd-ner-4in1-svc.nlp",   //"http://dd-ner-4in1.ruoben.com:8008",
        body: results.speaker_text_task[2]
    }, function (err, res, body) {
        if (err) {
            callback(err.toString());
        } else {
            if (res.statusCode === 200) {
                var json = JSON.parse(body);
                var ner = [];
                for(var i = 0; i < json['sentences'].length; i++) {
                    for(var j = 0; j < json['sentences'][i]['tokens'].length; j++) {
                        var n = json['sentences'][i]['tokens'][j].ner;
                        if (n === 'PERSON' || n === 'FOREIGN' || n === 'ORG' || n === 'FOREIGN_ORG' || n === 'PLACE' || n === 'FOREIGN_PLACE') {
                            ner.push(json['sentences'][i]['tokens'][j].word);
                        }
                    }
                }
                ner = _.uniq(ner);
                ner = _.filter(ner, function(word) {
                    return word.length > 1;
                });
                console.log('speaker=' + results.speaker_text_task[1] + ', ner=' + JSON.stringify(ner));  ///////////////////
                callback(null, ner);
            } else {
                callback("调用ner接口报错");
            }
        }
    });
};
// 取关系任务
var speaker_spo_task = function(callback, results) {
    request.post({
        url: "http://ltp-svc.nlp:12345/ltp",   //"http://ltp.ruoben.com:8008/ltp",
        form: {
            s: results.speaker_text_task[2]
        }
    }, function (err, res, body) {
        if (err) {
            callback(err.toString());
        } else {
            if (res.statusCode === 200) {
                xmlParser.parseString(body, function (err, obj) {
                    if (err) {
                        callback(err.toString());
                    } else {
                        var spo = [];
                        var paras = obj.xml4nlp.doc.para;
                        if (!(paras instanceof Array)) {
                            paras = [paras];
                        }
                        for(var para_idx = 0; para_idx < paras.length; para_idx++) {
                            var sents = paras[para_idx].sent;
                            if (!(sents instanceof Array)) {
                                sents = [sents];
                            }
                            for(var sent_idx = 0; sent_idx < sents.length; sent_idx++) {
                                var words = sents[sent_idx].word;
                                if (!(words instanceof Array)) {
                                    words = [words];
                                }
                                for(var word_idx = 0; word_idx < words.length; word_idx++) {
                                    var word = words[word_idx];
                                    if (word.pos === 'v' && word.arg && word.arg instanceof Array) {
                                        var args = word.arg;
                                        var A0 = [], A1 = [], A2 = [], LOC = [], ADV = [], CMP = [];
                                        for(var arg_idx = 0; arg_idx < args.length; arg_idx++) {
                                            var arg = args[arg_idx];
                                            if (arg.type === 'A0') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    if (words[a].pos === 'ws') {
                                                        str += words[a].cont + ' ';
                                                    } else if (words[a].pos === 'm' && a === parseInt(arg.end) && a < words.length - 1 && words[a+1].pos === 'q') {
                                                        str += words[a].cont + words[a+1].cont;
                                                    } else {
                                                        str += words[a].cont;
                                                    }
                                                }
                                                A0.push(str.trim());
                                            } else if (arg.type === 'A1') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    if (words[a].pos === 'ws') {
                                                        str += words[a].cont + ' ';
                                                    } else if (words[a].pos === 'm' && a === parseInt(arg.end) && a < words.length - 1 && words[a+1].pos === 'q') {
                                                        str += words[a].cont + words[a+1].cont;
                                                    } else {
                                                        str += words[a].cont;
                                                    }
                                                }
                                                A1.push(str.trim());
                                            } else if (arg.type === 'A2') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    str += words[a].cont;
                                                }
                                                A2.push(str);
                                            } else if (arg.type === 'LOC') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    str += words[a].cont;
                                                }
                                                LOC.push(str);
                                            }
                                        }
                                        var f = false;
                                        if (word_idx > 0) {
                                            for(var ii = word_idx - 1; ii >= 0; ii--) {
                                                if ((words[ii].relate === 'ADV' || words[ii].relate === 'RAD' || words[ii].relate === 'LAD') && !f) {
                                                    ADV.unshift(words[ii].cont);
                                                } else if (!f) {
                                                    f = true;
                                                } else if ((words[ii].relate === 'ADV' || words[ii].relate === 'RAD' || words[ii].relate === 'LAD') && words[ii].pos === 'd' && words[ii].parent === "" + word_idx) {
                                                    ADV.unshift(words[ii].cont);
                                                }
                                            }
                                        }
                                        for(var iii = word_idx + 1; iii <= words.length; iii++) {
                                            if (words[iii].relate === 'CMP' || words[iii].relate === 'RAD') {
                                                CMP.push(words[iii].cont);
                                            } else {
                                                break;
                                            }
                                        }
                                        if (A0.length > 0 && A1.length > 0) {  // 主谓 + 动宾
                                            if (A2.length > 0 && ['使', '让'].indexOf(word.cont) >= 0) {
                                                spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + word.cont + CMP.join(''), A1.join('，').replace(/，|,$/, '') + A2.join('，').replace(/，|,$/, '')]);
                                            } else if (A2.length > 0 && (A2.join('').indexOf('以') === 0 || A2.join('').indexOf('从') === 0 || A2.join('').indexOf('为') === 0 || A2.join('').indexOf('对') === 0)) {
                                                spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + A2.join('').replace(/，|,$/, '') + word.cont + CMP.join(''), A1.join('，').replace(/，|,$/, '')]);
                                            } else {
                                                spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + word.cont + CMP.join(''), A1.join('，').replace(/，|,$/, '')]);
                                            }
                                        } else if (A0.length > 0 && LOC.length > 0) {  // 主谓 + 介宾
                                            spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + word.cont + CMP.join(''), LOC.join('，').replace(/，|,$/, '')]);
                                        } else if (A1.length > 0 && A2.length > 0) {  // 宾语前置
                                            spo.push(['' + para_idx, A1.join('，').replace(/，|,$/, ''), ADV.join('') + "被" + word.cont + CMP.join(''), A2.join('，').replace(/，|,$/, '')]);
                                        }
                                    }
                                }
                            }
                        }
                        var retain = [];
                        for(var b = 0; b < spo.length; b++) {
                            var contain = false;
                            if (spo[b][3].length > 1) {
                                L: for(var c = 0; c < results.ner_task.length; c++) {
                                    if (spo[b][1].indexOf(results.ner_task[c]) >= 0) {
                                        contain = true;
                                        break L;
                                    }
                                }
                            }
                            if (contain) {
                                retain.push(spo[b]);
                            }
                        }
                        console.log('speaker=' + results.speaker_text_task[1] + ', spo=' + JSON.stringify(retain));  //////////////////
                        fs.writeFile("/var/bigbluebutton/published/presentation/" + results.speaker_text_task[0] + "/video/webcams." + results.speaker_text_task[1] + ".mnd", JSON.stringify({'speaker': results.speaker_text_task[1], 'sum_obj': results.summary_task, 'title': results.title_task, 'spo': retain}), function (err3) {
                        // fs.writeFile("C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams." + results.speaker_text_task[0] + ".mnd", JSON.stringify({'speaker': results.speaker_text_task[0], 'sum_obj': results.summary_task, 'title': results.title_task, 'spo': retain}), function (err3) {
                            if (err3) {
                                callback("写" + results.speaker_text_task[1] + " speaker mnd文件报错");
                            } else {
                                callback(null);
                            }
                        });
                    }
                });
            } else {
                callback("调用ltp接口报错");
            }
        }
    });
};
// 接收语音识别得到的文本并生成摘要和脑图
app.post("/text/:recordId", function (req, response) {
    console.log('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------');
    // 删除所有相关文件
    var files = getFilenamesByExt("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video", 'txt');
    // var files = getFilenamesByExt("C:\\Users\\dongyt\\Desktop\\新建文件夹\\", 'txt');
    for(var i = 0; i < files.length; i++) {
        fs.unlinkSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/" + files[i]);
        // fs.unlinkSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\" + files[i]);
    }
    files = getFilenamesByExt("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video", 'sum');
    // files = getFilenamesByExt("C:\\Users\\dongyt\\Desktop\\新建文件夹\\", 'sum');
    for(var i = 0; i < files.length; i++) {
        fs.unlinkSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/" + files[i]);
        // fs.unlinkSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\" + files[i]);
    }
    files = getFilenamesByExt("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video", 'mnd');
    // files = getFilenamesByExt("C:\\Users\\dongyt\\Desktop\\新建文件夹\\", 'mnd');
    for(var i = 0; i < files.length; i++) {
        fs.unlinkSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/" + files[i]);
        // fs.unlinkSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\" + files[i]);
    }

    var obj = req.body;
    console.log('json=' + JSON.stringify(obj));  //////////////////////
    // 写webcams.txt文件
    fs.writeFileSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams.txt", JSON.stringify(obj));
    // fs.writeFileSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams.txt", JSON.stringify(obj));

    var array = obj.asr;
    var speakers = [];
    for(var index = 0; index < array.length; index++) {
        speakers.push(array[index]['speaker']);
        var content = array[index]['content'];
        if (content.slice(-1) !== '。') {
            content += '。';
        }
        // 追加到speaker txt文件
        fs.appendFileSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams." + array[index]['speaker'] + ".txt", content + '\n');
        // fs.appendFileSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams." + array[index]['speaker'] + ".txt", content + '\n');
    }
    speakers = _.uniq(speakers);

    eachAsync(speakers, function(speaker, index, done) {
        var text = '' + fs.readFileSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams." + speaker + ".txt");
        // var text = '' + fs.readFileSync("C:\\Users\\dongyt\\Desktop\\新建文件夹\\webcams." + speaker + ".txt");
        console.log('speaker=' + speaker + ', text=' + text);  //////////////////////
        async.auto({
            speaker_text_task: function(callback) {
                callback(null, req.params.recordId, speaker, text);
            },
            summary_task: ['speaker_text_task', speaker_summary_task],
            title_task: ['speaker_text_task', speaker_title_task],
            ner_task: ['speaker_text_task', speaker_ner_task],
            spo_task: ['summary_task', 'title_task', 'ner_task', speaker_spo_task]
        }, function(err) {
            if (err) {
                done(err.toString())
            } else {
                done();
            }
        });
    }, function(error) {
        if (error) {
            console.error(error);
            response.header('Content-Type', 'text/plain; charset=utf-8').status(500).end(error);
        } else {
            response.header('Content-Type', 'text/plain; charset=utf-8').status(200).end("成功");
        }
    });
});
/** ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- **/
// 测试页
app.get("/", function (req, res) {
    res.status(200).render('test');
});
// 取摘要任务
var summary_task = function(callback, results) {
    request.post({
        url: "http://partition-svc.nlp:8080",   //"http://summary.ruoben.com:8008",
        json: true,
        body: {text: results.text_task},
        timeout: 600000
    }, function (err, res, summary) {
        if (err) {
            callback(err.toString());
        } else {
            if (res.statusCode === 200) {
                console.log('summary=' + summary);  /////////////////
                var sum_obj = {};
                var lines = summary.split('\n');
                for(var i=0; i<lines.length; i++) {
                    sum_obj['' + i] = lines[i];
                }
                fs.writeFile("/var/bigbluebutton/published/presentation/test/webcams.sum", summary, function (err2) {
                // fs.writeFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.sum", summary, function (err2) {
                    if (err2) {
                        callback("写sum文件报错");
                    } else {
                        callback(null, sum_obj);
                    }
                });
            } else {
               callback("调用summary接口报错");
            }
        }
    });
};
// 取标题任务
var title_task = function(callback, results) {
    var options = {
        hostname: 'aip.baidubce.com',
        path: '/rpc/2.0/nlp/v1/news_summary?charset=UTF-8&access_token=' + access_token,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const req = https.request(options, function (res) {
        var body = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            var data = JSON.parse(Buffer.concat(body).toString());
            var title = data['summary'];  // 标题
            console.log('title=' + title);  /////////////////
            callback(null, title);
        });
    });
    req.on('error', function(err) {
        callback(err.toString());
    });
    var len = Math.round(results.text_task.length * 0.15);
    if (len < 50) {
        len = 50;
    } else if (len > 100) {
        len = 100;
    }
    var param = JSON.stringify({
        'content': results.text_task,
        'max_summary_len': len
    });
    req.write(param);
    req.end();
};
// 取原文中的ner任务
var ner_task = function(callback, results) {
    request.post({
        url: "http://dd-ner-4in1-svc.nlp",   //"http://dd-ner-4in1.ruoben.com:8008",
        body: results.text_task
    }, function (err, res, body) {
        if (err) {
            callback(err.toString());
        } else {
            if (res.statusCode === 200) {
                var json = JSON.parse(body);
                var ner = [];
                for(var i = 0; i < json['sentences'].length; i++) {
                    for(var j = 0; j < json['sentences'][i]['tokens'].length; j++) {
                        var n = json['sentences'][i]['tokens'][j].ner;
                        if (n === 'PERSON' || n === 'FOREIGN' || n === 'ORG' || n === 'FOREIGN_ORG' || n === 'PLACE' || n === 'FOREIGN_PLACE') {
                            ner.push(json['sentences'][i]['tokens'][j].word);
                        }
                    }
                }
                ner = _.uniq(ner);
                ner = _.filter(ner, function(word) {
                    return word.length > 1;
                });
                console.log('ner=' + JSON.stringify(ner));  ///////////////////
                callback(null, ner);
            } else {
                callback("调用ner接口报错");
            }
        }
    });
};
// 取关系任务
var spo_task = function(callback, results) {
    request.post({
        url: "http://ltp-svc.nlp:12345/ltp",  //"http://ltp.ruoben.com:8008/ltp",
        form: {
            s: results.text_task
        },
        timeout: 600000
    }, function (err, res, body) {
        if (err) {
            callback(err.toString());
        } else {
            if (res.statusCode === 200) {
                xmlParser.parseString(body, function (err, obj) {
                    if (err) {
                        callback(err.toString());
                    } else {
                        var spo = [];
                        var paras = obj.xml4nlp.doc.para;
                        if (!(paras instanceof Array)) {
                            paras = [paras];
                        }
                        for(var para_idx = 0; para_idx < paras.length; para_idx++) {
                            var sents = paras[para_idx].sent;
                            if (!(sents instanceof Array)) {
                                sents = [sents];
                            }
                            for(var sent_idx = 0; sent_idx < sents.length; sent_idx++) {
                                var words = sents[sent_idx].word;
                                if (!(words instanceof Array)) {
                                    words = [words];
                                }
                                for(var word_idx = 0; word_idx < words.length; word_idx++) {
                                    var word = words[word_idx];
                                    if (word.pos === 'v' && word.arg && word.arg instanceof Array) {
                                        var args = word.arg;
                                        var A0 = [], A1 = [], A2 = [], LOC = [], ADV = [], CMP = [];
                                        for(var arg_idx = 0; arg_idx < args.length; arg_idx++) {
                                            var arg = args[arg_idx];
                                            if (arg.type === 'A0') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    if (words[a].pos === 'ws') {
                                                        str += words[a].cont + ' ';
                                                    } else if (words[a].pos === 'm' && a === parseInt(arg.end) && a < words.length - 1 && words[a+1].pos === 'q') {
                                                        str += words[a].cont + words[a+1].cont;
                                                    } else {
                                                        str += words[a].cont;
                                                    }
                                                }
                                                A0.push(str.trim());
                                            } else if (arg.type === 'A1') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    if (words[a].pos === 'ws') {
                                                        str += words[a].cont + ' ';
                                                    } else if (words[a].pos === 'm' && a === parseInt(arg.end) && a < words.length - 1 && words[a+1].pos === 'q') {
                                                        str += words[a].cont + words[a+1].cont;
                                                    } else {
                                                        str += words[a].cont;
                                                    }
                                                }
                                                A1.push(str.trim());
                                            } else if (arg.type === 'A2') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    str += words[a].cont;
                                                }
                                                A2.push(str);
                                            } else if (arg.type === 'LOC') {
                                                var str = "";
                                                for(var a = parseInt(arg.beg); a <= parseInt(arg.end); a++) {
                                                    str += words[a].cont;
                                                }
                                                LOC.push(str);
                                            }
                                        }
                                        var f = false;
                                        if (word_idx > 0) {
                                            for(var ii = word_idx - 1; ii >= 0; ii--) {
                                                if ((words[ii].relate === 'ADV' || words[ii].relate === 'RAD' || words[ii].relate === 'LAD') && !f) {
                                                    ADV.unshift(words[ii].cont);
                                                } else if (!f) {
                                                    f = true;
                                                } else if ((words[ii].relate === 'ADV' || words[ii].relate === 'RAD' || words[ii].relate === 'LAD') && words[ii].pos === 'd' && words[ii].parent === "" + word_idx) {
                                                    ADV.unshift(words[ii].cont);
                                                }
                                            }
                                        }
                                        for(var iii = word_idx + 1; iii <= words.length; iii++) {
                                            if (words[iii].relate === 'CMP' || words[iii].relate === 'RAD') {
                                                CMP.push(words[iii].cont);
                                            } else {
                                                break;
                                            }
                                        }
                                        if (A0.length > 0 && A1.length > 0) {  // 主谓 + 动宾
                                            if (A2.length > 0 && ['使', '让'].indexOf(word.cont) >= 0) {
                                                spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + word.cont + CMP.join(''), A1.join('，').replace(/，|,$/, '') + A2.join('，').replace(/，|,$/, '')]);
                                            } else if (A2.length > 0 && (A2.join('').indexOf('以') === 0 || A2.join('').indexOf('从') === 0 || A2.join('').indexOf('为') === 0 || A2.join('').indexOf('对') === 0)) {
                                                spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + A2.join('').replace(/，|,$/, '') + word.cont + CMP.join(''), A1.join('，').replace(/，|,$/, '')]);
                                            } else {
                                                spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + word.cont + CMP.join(''), A1.join('，').replace(/，|,$/, '')]);
                                            }
                                        } else if (A0.length > 0 && LOC.length > 0) {  // 主谓 + 介宾
                                            spo.push(['' + para_idx, A0.join('，').replace(/，|,$/, ''), ADV.join('') + word.cont + CMP.join(''), LOC.join('，').replace(/，|,$/, '')]);
                                        } else if (A1.length > 0 && A2.length > 0) {  // 宾语前置
                                            spo.push(['' + para_idx, A1.join('，').replace(/，|,$/, ''), ADV.join('') + "被" + word.cont + CMP.join(''), A2.join('，').replace(/，|,$/, '')]);
                                        }
                                    }
                                }
                            }
                        }
                        var retain = [];
                        for(var b = 0; b < spo.length; b++) {
                            var contain = false;
                            if (spo[b][3].length > 1) {
                                L: for(var c = 0; c < results.ner_task.length; c++) {
                                    if (spo[b][1].indexOf(results.ner_task[c]) >= 0) {
                                        contain = true;
                                        break L;
                                    }
                                }
                            }
                            if (contain) {
                                retain.push(spo[b]);
                            }
                        }
                        console.log("spo=" + JSON.stringify(retain));  //////////////////
                        fs.writeFile("/var/bigbluebutton/published/presentation/test/webcams.mnd", JSON.stringify({'speaker': '测试用户', 'sum_obj': results.summary_task, 'title': results.title_task, 'spo': retain}), function (err3) {
                        // fs.writeFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd", JSON.stringify({'speaker': '测试用户', 'sum_obj': results.summary_task, 'title': results.title_task, 'spo': retain}), function (err3) {
                            if (err3) {
                                callback("写mnd文件报错");
                            } else {
                                callback(null);
                            }
                        });
                    }
                });
            } else {
                callback("调用ltp接口报错");
            }
        }
    });
};
// 接收语音识别得到的文本并生成摘要和脑图
app.post("/test-text", function (req, response) {
    console.log('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------');
    var text = '' + req.body;  // 原文
    console.log('text=' + text);  //////////////////////
    fs.writeFile("/var/bigbluebutton/published/presentation/test/webcams.txt", text, function (error) {
        // fs.writeFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.txt", text, function (error) {
        if (error) {
            console.error('写txt文件报错');
            response.header('Content-Type', 'text/plain; charset=utf-8').status(500).end("写txt文件报错");
        } else {
            async.auto({
                text_task: function (callback) {
                    callback(null, text);
                },
                summary_task: ['text_task', summary_task],
                title_task: ['text_task', title_task],
                ner_task: ['text_task', ner_task],
                spo_task: ['summary_task', 'title_task', 'ner_task', spo_task]
            }, function(err) {
                if (err) {
                    console.error(err);
                    response.header('Content-Type', 'text/plain; charset=utf-8').status(500).end(err);
                } else {
                    response.header('Content-Type', 'text/plain; charset=utf-8').status(200).end("success");
                }
            });
        }
    });
});
// 取摘要和思维导图，用于test
app.get("/test-resource", function (req, res) {
    var exist = fs.existsSync("/var/bigbluebutton/published/presentation/test/webcams.mnd");
    // var exist = fs.existsSync("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd");
    if (exist) {
        fs.readFile("/var/bigbluebutton/published/presentation/test/webcams.sum", function (err, summary) {
        // fs.readFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.sum", function (err, summary) {
            if (err) {
                console.error(err);
                res.status(500).end(err.toString());
            } else {
                fs.readFile("/var/bigbluebutton/published/presentation/test/webcams.mnd", function (err, mnd) {
                // fs.readFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd", function (err, mnd) {
                    if (err) {
                        console.error(err);
                        res.status(500).end(err.toString());
                    } else {
                        var mind = JSON.parse(mnd.toString().replace(/%/g, '%25'));
                        var sum_obj = mind['sum_obj'];
                        res.status(200).json({'sum': summary.toString(), 'sum_obj': JSON.stringify(sum_obj).replace(/%25/g, '%')});
                    }
                });
            }
        });
    } else {
        res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end("文件不存在");
    }
});
// 取speaker的思维导图
app.get("/getmind/:recordId/:speakerId", function (req, res) {
    if (req.params.recordId === 'test') {
        var exist = fs.existsSync("/var/bigbluebutton/published/presentation/test/webcams.mnd");
        // var exist = fs.existsSync("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd");
        if (exist) {
            fs.readFile("/var/bigbluebutton/published/presentation/test/webcams.mnd", function (err, mnd) {
            // fs.readFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd", function (err, mnd) {
                if (err) {
                    console.error(err);
                    res.status(500).end(err.toString());
                } else {
                    var mind = JSON.parse(mnd.toString().replace(/%/g, '%25'));
                    mind['record'] = 'test';
                    res.status(200).json(mind);
                }
            });
        } else {
            res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end("文件不存在");
        }
    } else {
        var exist = fs.existsSync("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams." + req.params.speakerId + ".mnd");
        // var exist = fs.existsSync("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd");
        if (exist) {
            fs.readFile("/var/bigbluebutton/published/presentation/" + req.params.recordId + "/video/webcams." + req.params.speakerId + ".mnd", function (err, mnd) {
            // fs.readFile("C:\\Users\\dongyt\\Desktop\\test\\webcams.mnd", function (err, mnd) {
                if (err) {
                    console.error(err);
                    res.status(500).end(err.toString());
                } else {
                    var mind = JSON.parse(mnd.toString().replace(/%/g, '%25'));
                    mind['record'] = req.params.recordId;
                    res.status(200).json(mind);
                }
            });
        } else {
            res.header('Content-Type', 'text/plain; charset=utf-8').status(404).end("文件不存在");
        }
    }
});

app.listen(1080, '0.0.0.0');
