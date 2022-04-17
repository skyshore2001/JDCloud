# jdserver守护进程 - 消息推送与任务调度服务

默认提供以下通用功能：

- 消息推送：作为websocket服务器，某应用前端通过websocket连接jdserver, 接收应用后端推送的消息;
- 任务调度：某应用后端在N秒后执行一个操作，可以把这个操作封装为1个后端接口，让jdserver定时调用。

须安装swoole。推荐版本: 4.8.8 (编译选项全部yes)。
启动：

	php jdserver.php

默认使用`127.0.0.1:8081`地址和端口，只允许本机内部访问。

用-p指定端口：

	php jdserver.php -p 8800

用-a指定允许外部连接，即监听0.0.0.0地址：

	php jdserver.php -p 8800 -a

一般jdserver服务只供内部调用，不建议开放出去。

测试：

- test.html包含一个支持重连的websocket客户端，也可测试HTTP接口。
- test.sh用curl命令行调用各HTTP接口。

注意：

- 未提供验证机制
- 使用全局变量存储会话，因而只能开1个worker进程。产品级可通过文件（同一主机多进程）或redis（多主机）存取会话。

## 部署

安装swoole。CentOS7可下载我编译过的版本：
https://oliveche.com/app/tool/swoole-4.8.8-php74-centos7-lj.xz

	tar axf swoole-4.8.8-php74-centos7-lj.xz -C /opt
	cd /opt/php74
	./install.sh

ubuntu20.04上可以用apt安装默认的php74后，下载swoole.so模块并配置cli版本的`extention=swoole.so`：
https://oliveche.com/app/tool/swoole-4.8.8-ubuntu20-php74.tgz

安装为服务，默认8081端口，只监听127.0.0.1；使用builder用户：

	sudo ./jdserver.service.sh

若要修改端口等，可修改该文件，示例：

	ExecStart=/bin/sh -c "swoole $svc.php -p 8401 >> $svc.log 2>&1"

服务名默认为文件名中的jdserver. 日志文件为该目录下的jdserver.log。

启动、停止：

	sudo systemctl start jdserver
	sudo systemctl stop jdserver

一般在Apache上配置代理。请确保已打开wstunnel模块且允许htaccess文件。
jdserver同时支持http和websocket，建议设置为：（注意顺序）

	rewriterule ^jdserver/(.+) http://127.0.0.1:8081/$1 [P,L]
	rewriterule ^jdserver ws://127.0.0.1:8081/ [P,L]

## 使用

jdcloud前端使用jdPush函数连接jdserver并接收推送消息；
也可以直接调用push/getUsers/stat等接口，如：

	callSvr("/jdserver/push", ...)

jdcloud后端通过jdPush函数调用jdserver的push接口，通过callSvcAsync函数调用jdserver的setTimeout接口实现延迟调用。
它们都需要在conf.user.php中配置 conf_jdserverUrl，如：

	conf_jdserverUrl='http://127.0.0.1:8081/';
	// 或 conf_jdserverUrl='/jdserver';

打开test.html，可测试websocket和http接口。

## jdserver与jdcloud

jdcloud指传统的筋斗云后端接口框架，擅长CRUD，成熟稳定。生产环境运行于apache web服务器，易于修改和调试。

理论上jdserver也可以替代jdcloud+apache，但意义不大，不是它的方向。

jdserver定位于编写TCP/UDP/Websocket/MQTT等驻留服务（daemon/守护进程），功能越简单越好。复杂的业务应由jdcloud来完成。

jdserver共享了jdcloud框架的基础库，获得以下主要特性：

- common中的通用函数，如logit, jdRet, arrayCmp, httpCall等。
- app_fw中的参数操作如param/mparam等，以及数据库操作如queryOne/dbInsert等。支持协程式并发。（关键在于使用request级变量而不是全局变量）
- api_fw中的API接口框架，如函数型接口(api_xxx)和对象型接口(AC_Xxx，继承自JDApiBase). 支持自动记录ApiLog。
包括各种通用参数，如`_raw`, `_jsonp`等。
- 支持batch接口；支持RESTFul风格的对象接口；支持接口适配机制（X_RET_FN）
- 共用conf.user.php中的数据库、调试选项等设置；但默认不包含Conf.php中的配置，可在daemon/api.php中自行包含。

尽管jdserver中也包含了**AccessControl（CRUD框架）以及各种jdcloud插件，但只能用于单用户演示，不可用于生产！**。
原因是这些业务代码大量使用了$_POST/$_GET/$_SESSION等全局变量，目前支持jdserver的意义并不大。
jdserver用于构建中间件，它不是业务组件，它需要尽可能简单。

jdserver与jdcloud的区别：

- 默认不开启session。需要显式调用session_start()；session不过期，除非调用session_destory或手工删除session文件。
- 支持使用AC类接口对象接口，但只能继承自JDApiBase，不能继承AccessControl，因而不具备自动CRUD功能，所有数据库操作需要自行实现。
- 没有内置的身份验证机制，默认不支持AUTH_USER/AUTH_EMP/AUTH_ADMIN这些权限检查。但可以使用checkAuth/hasPerm函数。

## 消息推送或即时通讯

应用前端（websocket客户端）在连接jdserver后，须发出一个init消息:

	{"ac": "init", "app": "wms", "user": "100"}

- ac: 必须为"init"
- app: 指定一个应用。因此该服务可供多个应用共用。
- user: 用户标识。数字编号或字符串均可。

支持单个发或群体：

	push(user, app, msg) -> pushCnt

- app: 指定应用
- user: 用户标识字符串. 

		给一个人发: 100
		给多个人发: 100,101
		给所有人发: *
	
	支持用户组，比如可将用户标识定义为"group1/1", "group2/1"这样，如果要给"group1"所有人发送，可以设置user="group1/*"。

- msg: 如果是数组、字符串等标量类型，直接发送；如果是JS数组、对象等，则序列化为JSON发送。

返回推送的次数。

后端调用示例：

	httpCall("localhost:8081/push", [
		"app" => "wms",
		"user" => "*",
		"msg" => ["id"=>1, "text"=>"订单10待审批"]
	]);

## 查询在线用户

	getUsers(app) -> [ user ]

- app: 指定应用

后端调用示例：

	httpCall("localhost:8081/getUsers?app=wms");

## 延时执行和定时执行

注意：参数主要使用POST内容传

	setTimeout()(url, data?, wait?, @headers?, cron?, code?) -> timerId

- url: 回调URL地址
- data: 如果指定，则使用POST方式提交数据。默认使用"application/www-urlencoded-data"格式。
其它格式应在headers中指定ContentType。
- headers: 指定HTTP头。
- wait: 毫秒。等待指定时间后执行。不指定则为0，立即执行。
- cron: 定时任务配置。一旦指定，该任务将成为周期性任务，并会保存下来。可以通过返回的id或直接code来后续控制任务，比如暂停、删除等。
- code: 惟一标识，仅当指定cron时该字段有意义。为防止重复，格式要求为`{app/应用代码}-{obj/应用中对象代码}-{objCode/对象惟一标识}`，比如`asyncTask-task-1`。

示例：

	httpCall("localhost:8081/setTimeout", [
		"url" => "http://oliveche.com/echo.php?a=1&b=2"
	]);

实际请求为：

	GET http://oliveche.com/echo.php?a=1&b=2

在trace.log中查看执行结果。

示例：

	httpCall("localhost:8081/setTimeout", [
		"url" => makeUrl("http://oliveche.com/echo.php", ["a"=>1, "b"=>2]),
		"data" => ["c"=>3, "d"=>4]
	]);

实际请求为：

	POST http://oliveche.com/echo.php?a=1&b=2
	Content-Type: application/x-www-form-urlencoded

	c=3&d=4

如果使用JSON格式，应指定选项`useJson:1`；还可以指定使用headers数组指定HTTP头：

	httpCall("localhost:8081/setTimeout", [
		"url" => makeUrl("http://oliveche.com/echo.php", [a=>1, b=>2]),
		"data" => ["c"=>3, "d"=>4],
		"useJson" => 1,
		"headers" => [
			// "Content-Type: application/json; charset=gb2312", // 默认会添加"Content-Type: application/json"，也可明确指定。
			"Authorization: Basic dGVzdDp0ZXN0MTIz",
		]
	]);

实际请求为：

	POST http://oliveche.com/echo.php?a=1&b=2
	Content-Type: application/json
	Authorization: Basic dGVzdDp0ZXN0MTIz

	{"c":3, "d":4}

### 定时任务

使用cron参数指定定时任务。有两种指定格式。

第一种语法，cron=1，表示每隔{wait}毫秒执行一次，相当于js setInterval的功能，比如`4000`表示每4秒执行一次；
注意在设定后，它会立即执行一次。

第二种语法，cron是一个5元组，指定精确的执行时间，分别表示分，时，日，月，年。
语法与unix系统的crontab兼容，精确到分钟。

	# 每5分钟, 实际上是当前时间每逢 *:00,*:05,*:10,*:15等时间执行
	*/5 * * * *
	# 每小时，实际上是当前时间每逢 *:10 时间执行
	10 * * * *

注意：

cron一旦设置，会保存到文件里。当jdserver重启后可再加载。文件为daemon/timer.json。

### 修改、暂停或取消任务

修改：

	Timer.set(id/code)(cron, disabled, ...)

注意：当调用setTimeout并指定code时，如果相同code的timer已存在，则不会新增，而是覆盖已有的timer，相当于调用Timer.set接口。

暂停、恢复

	Timer.disable(id/code)
	Timer.enable(id/code)
	(相当于)
	Timer.set(id/code)(disabled:true/false)

取消(删除)

	Timer.del(id/code)

- id: setTimeout返回的timerId。
- code: 调用setTimeout时指定的惟一代码。

注意：1次性任务返回的id是负数，且不保存，如果重启服务则丢失。定时任务返回的id是正数，任务会保存在文件中。

## HTTP长轮询(comit server)

连接并等待消息：

	getMsg(app, user, timeout?)

- app: 应用名
- user: 用户标识
- timeout: 指定最长等待时间，单位: 秒

给它发送消息也是使用push接口。

## 服务器运行信息统计

	stat

返回信息中有：

- jdserver_tm: （扩展）服务器当前时间
- jdserver_start_time: （扩展）服务启动时间
- jdserver_timer_cnt: （扩展）通过setTimeout添加的周期性任务数量（包括disabled）
- connection_num: 当前连接的数量
- accept_count: 接受了多少个连接
- request_count: Server 收到的请求次数
- worker_request_count: 当前 Worker 进程收到的请求次数
- total_recv_bytes/total_send_bytes: 收到和发送的字节数

更多返回内容参考：https://wiki.swoole.com/#/server/methods?id=stats

