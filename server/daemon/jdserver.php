<?php

require("../api.php");
//require_once("../php/jdcloud-php/api_fw.php");

$port = 8081;
$workerNum = 2;

$server = new Swoole\WebSocket\Server("0.0.0.0", $port);
$server->set([
	'worker_num'=>$workerNum,
]);
logit("=== ws_server: port=$port, workers=$workerNum");

$clientMap = []; // $id => fd
$clientMapR = []; // $fd => id

$server->on('open', function ($ws, $req) {
//	logit("open: fd=" . $req->fd);
});

$server->on('message', function ($ws, $frame) {
	logit("onmessage: fd=" . $frame->fd);
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
	/*
	require_once('api.php');
	require_once("../php/jdcloud-php/api_fw.php");
	require_once("../php/api_functions.php");
	*/
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

$server->on('request', 'handleRequest');

// override trait JDServer
// refer: https://wiki.swoole.com/#/http_server?id=httprequest
class SwooleEnv extends JDEnv
{
	public $req, $res;

	function __construct($req, $res) {
		$this->req = $req;
		$this->res = $res;
		parent::__construct();
	}
	function _GET($key=null, $val=null) {
		return arrayOp($key, $val, $this->req->get, func_num_args());
	}
	function _POST($key=null, $val=null) {
		return arrayOp($key, $val, $this->req->post, func_num_args());
	}
	function _SESSION($key, $val=null) {
		return $this->value($key, null, $this->_SESSION);
	}
	function _SERVER($key) {
		// _SERVER("HTTP_MY_HEADER") -> header("MY-HEADER")
		assert(is_string($key));
		if (startsWith($key, "HTTP_")) {
			$key = str_replace('_', '-', substr($key, 5));
			return $this->header($key);
		}
		$key = strtolower($key);
		return arrayOp($key, null, $this->req->server, func_num_args());
	}
	function header($key=null, $val=null) {
		$argc = func_num_args();
		if ($argc <= 1) {
			if (is_string($key))
				$key = strtolower($key);
			return arrayOp($key, $val, $this->req->header, $argc);
		}
		$this->res->header($key, $val);
	}
	function rawContent() {
		return $this->req->rawContent();
	}
	function write($data) {
		$this->res->write($data);
	}


	protected function setupSession() {
		/*
		// normal: "userid"
		$sesName = $this->appName . "id";
		$sesId = $this->req->cookie[$sesName];
		*/
	}
}

function handleRequest($req, $res)
{
	$env = new SwooleEnv($req, $res);
	$GLOBALS["X_APP"][Swoole\Coroutine::getcid()] = $env;
	$env->callSvcSafe();
	$res->end();
}

/*
Swoole\Timer::after(13, function () {
	echo(">>2000<<\n\n");
});
swoole_timer_after(4000, function () {
	logit("4000");
});
*/
$server->start();
