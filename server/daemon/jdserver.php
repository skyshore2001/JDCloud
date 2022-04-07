<?php

$port = 8081;
$workerNum = 1; // 由于使用了全局变量来共享信息，这里只能为1。

$server = new Swoole\WebSocket\Server("0.0.0.0", $port);
$server->set([
	'worker_num'=>$workerNum,
]);
echo("=== jdserver: port=$port, workers=$workerNum\n");

// 用于websocket用户；允许一个用户多次出现，都能收到消息。
$clientMap = []; // fd => {app, user}

$server->on('Open', function ($ws, $req) {
//	echo("onOpen: fd=" . $req->fd . "\n");
//	print_r($req);
});

$server->on('Message', function ($ws, $frame) {
//	echo("onMessage(websocket): fd=" . $frame->fd . ", data=" . $frame->data . "\n");
	$req = json_decode($frame->data, true);
	if (@$req["ac"] == "init") {
		global $clientMap;
		@$app = $req["app"];
		if (is_null($app)) {
			$ws->push($frame->fd, '*** error: require param `app`');
			return;
		}
		@$user = $req["user"];
		if (is_null($user)) {
			$ws->push($frame->fd, '*** error: require param `user`');
			return;
		}
		echo("[app $app] add user=$user, fd={$frame->fd}\n");
		$clientMap[$frame->fd] = ["app"=>$app, "user"=>$user];
	}
	$ws->push($frame->fd, 'OK');
});

$server->on('WorkerStart', function ($server, $workerId) {
	echo("=== worker $workerId starts. master_pid={$server->master_pid}, manager_pid={$server->manager_pid}, worker_pid={$server->worker_pid}\n");
	require("api.php");
});

$server->on('Request', function ($req, $res) {
	$env = new SwooleEnv($req, $res);
	$GLOBALS["X_APP"][Swoole\Coroutine::getcid()] = $env;
	$env->callSvcSafe();
	$res->end();
});

$server->on('Close', function ($ws, $fd) {
	// NOTE: http request comes here too
//	echo("onClose: fd=" . $fd . "\n");

	global $clientMap;
	if (array_key_exists($fd, $clientMap)) {
		$cli = $clientMap[$fd];
		echo("[app {$cli['app']}] del user={$cli['user']}, fd=$fd\n");
		unset($clientMap[$fd]);
	}
});

/*
Swoole\Timer::after(13, function () {
	echo(">>2000<<\n\n");
});
swoole_timer_after(4000, function () {
	logit("4000");
});
*/
$server->start();
