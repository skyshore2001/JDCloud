<?php
error_reporting(E_ALL & ~(E_NOTICE|E_WARNING));

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
//	'enable_static_handler' => true,
//	'document_root' => '.'
]);
writeLog("=== jdserver on $addr:$port, workers=$workerNum");

// 应用逻辑将在其它文件中实现，以便修改源码后可调用reload接口生效（onWorkerStart中重新加载），无须重启服务。

$server->on('Open', function ($ws, $req) {
	JDServer::onOpen($ws, $req);
//	echo("onOpen: fd=" . $req->fd . "\n");
//	print_r($req);
});

$server->on('Message', function ($ws, $frame) {
	JDServer::onMessage($ws, $frame);
});

$server->on('WorkerStart', function ($server, $workerId) {
	swoole_ignore_error(1004); // send but session is closed
	swoole_ignore_error(1005); // end but session is closed
	writeLog("=== worker $workerId starts. master_pid={$server->master_pid}, manager_pid={$server->manager_pid}, worker_pid={$server->worker_pid}");

	// 初始化失败立即退出避免死循环
	$initDone = false;
	register_shutdown_function(function () use (&$initDone, $server) {
		// echo("*** Worker shutdown by error\n");
		if (!$initDone)
			$server->shutdown();
	});

	require("api.php");
	$initDone = true;
});

$server->on('Request', function ($req, $res) {
	JDServer::onRequest($req, $res);
});

$server->on('Close', function ($ws, $fd) {
	JDServer::onClose($ws, $fd);
});

$server->on("WorkerExit", function ($server, $workerId) {
	JDServer::onWorkerExit($server, $workerId);
});

function writeLog($s)
{
	if (is_array($s))
		$s = var_export($s, true);
	$s = "=== REQ at [".date("Y-m-d H:i:s")."] " . $s . "\n";
	echo($s);
}

$server->start();
