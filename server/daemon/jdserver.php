<?php

if (!function_exists("swoole_version")) {
	echo("*** error: require swoole env!\n");
	exit(1);
}

$opt = getopt("p:a");
$addr = isset($opt["a"]) ? "0.0.0.0": "127.0.0.1";
$port = @$opt["p"] ?: 8081;

$workerNum = 1; // 由于使用了全局变量来共享信息，这里只能为1。

// 记录websocket收发日志
$conf_jdserver_log_ws = 0;

// 开启协程!!!
Co::set(['hook_flags'=> SWOOLE_HOOK_ALL]);

$server = new Swoole\WebSocket\Server($addr, $port);
$server->set([
	'worker_num'=>$workerNum,
]);
writeLog("=== jdserver on $addr:$port, workers=$workerNum");

// 用于websocket用户；允许一个用户多次出现，都能收到消息。
$clientMap = []; // fd => {app, user, isHttp?, tmr?}

$server->on('Open', function ($ws, $req) {
//	echo("onOpen: fd=" . $req->fd . "\n");
//	print_r($req);
});

$server->on('Message', function ($ws, $frame) {
//	echo("onMessage(websocket): fd=" . $frame->fd . ", data=" . $frame->data . "\n");
	$req = json_decode($frame->data, true);
	$fd = $frame->fd;
	if (! is_array($req)) {
		writeLog("*** require json message. recv from #fd: {$frame->data}");
		$ws->push($fd, '*** require json data. but recv: ' . $frame->data);
		// 1007: 格式不符
		$ws->disconnect($fd, 1007, "bad data format");
		return;
	}
	$ac = @$req["ac"];
	$ret = 'OK';
	$app = null;
	$cli = null;
	global $clientMap;
	if ($ac == "init") {
		if (getConf("conf_jdserver_log_ws"))
			writeLog("recv init from #{$fd}: {$frame->data}");
		@$app = $req["app"];
		if (is_null($app)) {
			$ws->push($fd, '*** error: require param `app`');
			return;
		}
		@$user = $req["user"];
		if (is_null($user)) {
			$ws->push($fd, '*** error: require param `user`');
			return;
		}
		writeLog("[app $app] add user: $user #$fd");
		$cli = $clientMap[$fd] = ["app"=>$app, "user"=>$user];
	}
	else {
		@$cli = $clientMap[$fd];
		if (is_null($cli)) {
			writeLog("*** require init message. recv from #{$fd}: {$frame->data}");
			$ws->push($fd, '*** error: require init');
			return;
		}
		$app = $cli["app"];
		if (getConf("conf_jdserver_log_ws"))
			writeLog("[app $app] recv from {$cli['user']} #{$fd}: {$frame->data}");
	}

	if ($ac == "push") {
		@$app = $req["app"];
		if (is_null($app)) {
			$ws->push($fd, '*** error: require param `app`');
			return;
		}
		@$user = $req["user"];
		if (is_null($user)) {
			$ws->push($fd, '*** error: require param `user`');
			return;
		}
		@$msg = $req["msg"];
		if (is_null($msg)) {
			$ws->push($fd, '*** error: require param `msg`');
			return;
		}
		$ret = pushMsg($app, $user, $msg);
	}
	$frame->req = $req;
	$GLOBALS["jdserver_event"]->trigger("message.$app", [$ws, $frame]);

	$ws->push($fd, $ret);
});

$server->on('WorkerStart', function ($server, $workerId) {
	swoole_ignore_error(1004); // send but session is closed
	swoole_ignore_error(1005); // end but session is closed
	writeLog("=== worker $workerId starts. master_pid={$server->master_pid}, manager_pid={$server->manager_pid}, worker_pid={$server->worker_pid}");
	// TODO: quit server if exception or fatal error. now write to stdout/jdserver.log
	require("api.php");
});

$server->on('Request', function ($req, $res) {
	$ac = $req->server['path_info'];
	if ($ac == "/getMsg") {
		global $clientMap;
		@$app = $req->get["app"];
		if (is_null($app)) {
			$res->end('*** error: require param `app`');
			return;
		}
		@$user = $req->get["user"];
		if (is_null($user)) {
			$res->end('*** error: require param `user`');
			return;
		}
		$fd = $res->fd;

		@$timeout = $req->get["timeout"];
		$tmr = null;
		if ($timeout > 0) {
			// 如果收到消息则clearTimeout
			$tmr = swoole_timer_after($timeout*1000, function () use ($fd) {
				$res = Swoole\Http\Response::create($fd);
				$res->end();
			});
		}
		writeLog("[app $app] add http user: $user #$fd");
		$clientMap[$fd] = ["app"=>$app, "user"=>$user, "isHttp"=>true, "tmr"=>$tmr];

		$res->detach();
		return;
	}

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
		writeLog("[app {$cli['app']}] del user: {$cli['user']} #{$fd}");
		unset($clientMap[$fd]);
	}
});

function writeLog($s)
{
	if (is_array($s))
		$s = var_export($s, true);
	$s = "=== REQ at [".strftime("%Y/%m/%d %H:%M:%S",time())."] " . $s . "\n";
	echo($s);
}

function pushMsg($app, $userSpec, $msg)
{
	global $server;
	global $clientMap;

	if (is_array($msg))
		$msg = jsonEncode($msg);
	if (getConf("conf_jdserver_log_ws"))
		writeLog("[app $app] push to $userSpec: $msg");

	$n = 0;
	$arr = explode(',', $userSpec);
	foreach ($clientMap as $fd => $cli) {
		foreach ($arr as $user) {
			if ($app == $cli['app'] && fnmatch($user, $cli['user'])) {
				++ $n;
				if (! @$cli["isHttp"]) { // websocket client
					$server->push($fd, $msg);
				}
				else { // http长轮询
					if ($cli["tmr"]) {
						swoole_timer_clear($cli["tmr"]);
					}
					$res = Swoole\Http\Response::create($fd);
					$res->end($msg);
				}
			}
		}
	}
	$GLOBALS["jdserver_event"]->trigger("push.$app", [$userSpec, $msg]);
	return $n;
}

$server->start();
