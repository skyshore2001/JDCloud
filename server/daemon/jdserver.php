<?php

$port = 8081;
$workerNum = 2;

$server = new Swoole\WebSocket\Server("0.0.0.0", $port);
$server->set([
	'worker_num'=>$workerNum,
]);
echo("=== jdserver: port=$port, workers=$workerNum\n");

$clientMap = []; // $id => fd
$clientMapR = []; // $fd => id

$server->on('open', function ($ws, $req) {
//	logit("open: fd=" . $req->fd);
});

$server->on('message', function ($ws, $frame) {
	// logit("onmessage: fd=" . $frame->fd);
	$req = json_decode($frame->data, true);
	if (@$req["ac"] == "init") {
		global $clientMap, $clientMapR;
		$id = $req["id"];
		$clientMap[$id] = $frame->fd;
		$clientMapR[$frame->fd] = $id;
	}
	$ws->push($frame->fd, 'OK');
});
$server->on('WorkerStart', function ($server, $workerId) {
	echo("=== worker $workerId starts. master_pid={$server->master_pid}, manager_pid={$server->manager_pid}, worker_pid={$server->worker_pid}\n");
	require("api.php");
});

$server->on('request', function ($req, $res) {
	$env = new SwooleEnv($req, $res);
	$GLOBALS["X_APP"][Swoole\Coroutine::getcid()] = $env;
	$env->callSvcSafe();
	$res->end();
});

$server->on('close', function ($ws, $fd) {
	// NOTE: http request comes here too
/*
	logit("close: fd=" . $fd);
	global $clientMap, $clientMapR;
	$id = $clientMapR[$fd];
	unset($clientMap[$id]);
	unset($clientMapR[$fd]);
*/
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
