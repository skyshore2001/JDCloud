# jdserver守护进程

默认提供以下通用功能：

- 某应用前端通过websocket连接jdserver, 接收应用后端推送的消息;
- 某应用后端在N秒后执行一个操作，可以把这个操作封装为1个后端接口，让jdserver定时调用。

须安装swoole。启动：

	php jdserver.php

测试：

- test.html包含一个支持重连的websocket客户端，也可测试HTTP接口。
- test.sh用curl命令行调用各HTTP接口。

注意：

- 未提供验证机制
- 使用全局变量存储会话，因而只能开1个worker进程。产品级可通过文件（同一主机多进程）或redis（多主机）存取会话。

## 消息推送或即时通讯

应用前端（websocket客户端）在连接jdserver后，须发出一个init消息:

	{"ac": "init", "app": "wms", "user": "100"}

- ac: 必须为"init"
- app: 指定一个应用。因此该服务可供多个应用共用。
- user: 用户标识。数字编号或字符串均可。

支持单个发或群体：

	push(user, app, msg)

- app: 指定应用
- user: 用户标识字符串. 

		给一个人发: 100
		给多个人发: 100,101
		给所有人发: *
	
	支持用户组，比如可将用户标识定义为"group1/1", "group2/1"这样，如果要给"group1"所有人发送，可以设置user="group1/*"。

- msg: 如果是数组、字符串等标量类型，直接发送；如果是JS数组、对象等，则序列化为JSON发送。

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

## 延时执行

	setTimeout(url, data?, timeout?, @headers?) -> timerId

- url: 回调URL地址
- data: 如果指定，则使用POST方式提交数据。默认使用"application/www-urlencoded-data"格式。
其它格式应在headers中指定ContentType。
- headers: 指定HTTP头。
- timeout: 毫秒。不指定则为0，立即执行.

示例：

	httpCall("localhost:8081/setTimeout", [
		"url" => "http://oliveche.com/echo.php?a=1&b=2"
	]);

实际请求为：

	GET http://oliveche.com/echo.php?a=1&b=2

在trace.log中查看调用结果。

示例：

	httpCall("localhost:8081/setTimeout", [
		"url" => makeUrl("http://oliveche.com/echo.php", ["a"=>1, "b"=>2]),
		"data" => ["c"=>3, "d"=>4]
	]);

实际请求为：

	POST http://oliveche.com/echo.php?a=1&b=2
	Content-Type: application/x-www-form-urlencoded

	c=3&d=4

如果使用JSON：

	httpCall("localhost:8081/setTimeout", [
		"url" => makeUrl("http://oliveche.com/echo.php", [a=>1, b=>2]),
		"data" => ["c"=>3, "d"=>4],
		"headers" => [
			"Content-Type: application/json",
			"Authorization: Basic dGVzdDp0ZXN0MTIz",
		]
	]);

实际请求为：

	POST http://oliveche.com/echo.php?a=1&b=2
	Content-Type: application/json
	Authorization: Basic dGVzdDp0ZXN0MTIz

	{"c":3, "d":4}

## HTTP长轮询(comit server)

连接并等待消息：

	getMsg(app, user, timeout?)

- app: 应用名
- user: 用户标识
- timeout: 指定最长等待时间，单位: 秒

给它发送消息也是使用push接口。

