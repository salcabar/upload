(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery#1.8.1',
            'jquery.iframe-transport',
            'jquery.fileupload',
            'jquery.fileupload-image',
            'canvas-to-blob',
            'jquery.ui.widget'
        ], factory);
    }  else {
        // Browser globals:
        factory(window.jQuery);
    }
}(function($) {
    'use strict';

    var pluginName = 'upload';
    var ImageLoopCount = 10;

    var defaults = {
        'sid': "6E124738B82DD0972225A8C396F992B8salcabar",
        'getId': "http://ugc.ifeng.com/index.php/user/getid",
        'upload': "http://transmission.ifeng.com/upload",
        //upload:"http://10.32.28.95/upload",
        'rinfo': "http://ugc.ifeng.com/index.php/user/info",
        'imageServer': "http://d.ifengimg.com/",
        successCallback:function(){},
        errorCallback:function(){},
        getUgcInfoErrorCallback:function(){}

    };


    var Upload = function(element, options) {
        
        this.element = $(element);

        this.settings = $.extend({}, defaults, options);

        this.init();

        return true;
    };

    Upload.prototype.init = function() {
        var _this = this;
        this.element.fileupload({
            dataType: 'json',
            add: function(e, data) {
                console.log(arguments)
                var $this = $(this);
                _this.getUgcTaskInfo(function(ugcInfo) {
                        data.url = _this.settings.upload;
                        var s = uuid(32, 16);
                        data.formData = {
                            "fileId": s + "_1",
                            "appId": "testapp",
                            "blockIndex": "1",
                            "blockId": s,
                            "blockCount": "1"
                        };
                        var callback = ugcInfo.callback;
                        data.formData.successCb = callback;
                        data.formData.failCb = callback;
                        data.formData.storePath = ugcInfo.dir;
                        data.formData.bizId = ugcInfo.rid;
                        console.log(data)
                    
                        data.submit()
                            .success(function (result, textStatus, jqXHR) {
                                console.log("upload complete" , result);
                                console.log(ugcInfo)
                                _this.loopResource(ugcInfo , ImageLoopCount);
                            })
                            .error(function (jqXHR, textStatus, errorThrown) {
                                console.log("upload error ",textStatus);
                                $('.loader').hide();
                                alert("上传文件错误，请重新上传！");
                            })
                            .complete(function (result, textStatus, jqXHR) {});
                        
                    });
            },
            progressall: function(e, data) {

            },
            done: function(e, data) {}
        });
    }

    Upload.prototype.getUgcTaskInfo = function(callback) {
        var _this = this;
        $.ajax({
            url: this.settings.getId,
            data: {
                "sid": this.settings.sid,
                "utype": 0, //普通用户
                "pl": 3, //pc浏览器
                "rtype": 3, //资源类型3图片
                "title": "环保举报", //资源标题
                "desc": "",
                "tags": "",
                "addr": "",
                "x": "",
                "y": "",
                "pid": "801", //业务类型801 环保举报
                "ip": "",
                "ctype": 0, //原创
                "rt": "jsonp"
            },
            dataType: 'jsonp',
            //jsonp: "callbackparam",//传递给请求处理程序或页面的，用以获得jsonp回调函数名的参数名(默认为:callback)
            jsonpCallback: "ugcCallback" //自定义的jsonp回调函数名称，默认为jQuery自动生成的随机函数名
        })
        .done(function(ugcResult) {
            console.log("getUgcTaskInfo ok", ugcResult);
            if (ugcResult.code == 0) {
                callback(ugcResult.data);
            } else {
                _this.settings.getUgcInfoErrorCallback.call(_this.element,msg);
            }
        })
        .fail(function(msg) {
            console.log(msg);
        })
    }

    Upload.prototype.loopResource = function (ugcInfo , loopcount){
        var _this = this;
        // console.log("enter loopImage");
        if(loopcount <= 0){ //轮寻计数
            return;
        }
        loopcount--;
        setTimeout(function(){
            // console.log("enter loopImage 1");
            var rid = ugcInfo.rid;
            $.ajax({
                url : _this.settings.rinfo, //查询资源状态
                data: {
                     "sid":_this.settings.sid
                    ,"rid":rid
                    ,"rtype":3  //资源类型3图片
                    ,"rt":"jsonp"
                },
                dataType: 'jsonp',
                jsonpCallback:"loopImageCallback",//自定义的jsonp回调函数名称，默认为jQuery自动生成的随机函数名
                success : function(result){
                    console.log("loopImage ok" , result);
                    if(result.code == 0){
                        if(result.data.status != 0){
                            _this.loopResource(ugcInfo,loopcount);
                        }else{
                            console.log(result)
                            var url = _this.settings.imageServer + "q_10/" +  result.data.url.replace(/http[s]?:\/\// , '');
                            
                            _this.settings.successCallback.call(_this.element,url,rid,result);
                        }
                    }else{
                        _this.settings.errorCallback.call(_this.element,result);                    }
                },complete: function(){}
                ,error:function(XMLHttpRequest, textStatus, errorThrown){}
            })
        } , 1000);
    }

    $.fn.upload = function(options) {
        return this.each(function() {

            if (!$.data(this, pluginName)) {

                $.data(this, pluginName, new Upload(this, options));

            }
        });
    };

    function uuid(len, radix) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [],
            i;
        radix = radix || chars.length;
        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            // rfc4122, version 4 form
            var r;
            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';
            // Fill in random data.  At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }
        return uuid.join('');
    }
}))
