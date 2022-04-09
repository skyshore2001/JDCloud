<?php

function api_hello($env)
{
	$env->session_start();
	addLog([
		"get" => $env->_GET,
		"post" => $env->_POST,
		"header" => $env->header(),
		"session" => $env->_SESSION,
	]);
	// return ["id"=>100, "hello"=>"world"];
	$id = $env->param("id");
	$hello = $env->queryOne("SELECT * FROM ApiLog ORDER BY id DESC LIMIT 1", true);

	$cnt = ++ $env->_SESSION["cnt"];
	return ["id"=>$id, "hello"=>$hello, "cnt"=>$cnt];
}

function api_stat($env)
{
	global $server;
	$rv = $server->stats();
	$rv["jdserver_start_time"] = date(FMT_DT, $rv["start_time"]);
	$rv["jdserver_tm"] = date(FMT_DT);
	return $rv;
}

function api_push($env)
{
	global $server;
	global $clientMap;

	$app = $env->mparam("app");
	$userSpec = $env->mparam("user");
	$msg = $env->mparam("msg");
	if (is_array($msg))
		$msg = jsonEncode($msg);

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
	return $n;
}

function api_getUsers($env)
{
	global $clientMap;
	$user = $env->param("user");
	if (is_null($user)) {
		return array_values($clientMap);
	}
	$ret = [];
	foreach (explode(',', $user) as $one) {
		foreach ($clientMap as $fd => $user) {
			if (fnmatch($one, $user)) {
				$ret[] = $user;
			}
		}
	}
	return $ret;
}

function api_setTimeout($env)
{
	$url = $env->mparam("url");
	$data = $env->param("data");
	$wait = $env->param("wait/i");
	$headers = $env->param("headers");
	$tmr = 0;
	$fn = function () use ($url, $data, $headers, &$tmr) {
		logit("timer $tmr exec: httpCall($url, $data)");
		try {
			$opt = null;
			if ($headers) {
				$opt = [
					"headers" => $headers
				];
			}
			$rv = httpCall($url, $data, $opt);
			logit("timer $tmr ret: $rv");
		}
		catch (Exception $ex) {
			logit("timer $tmr fails: $ex");
		}
	};
	if ($wait > 0) {
		$tmr = swoole_timer_after($wait, $fn);
		logit("timer $tmr: wait {$wait}ms.");
	}
	else {
		go($fn);
	}
	return $tmr;
}

class AC_Test extends JDApiBase
{
	function api_hello() {
		return callSvcInt("hello");
	}
}

// NOTE: 继承AccessControl的类不可用于生产环境，只用于单用户演示。生产环境下AC类应继承JDApiBase。
class AC_ApiLog extends AccessControl
{
	protected $allowedAc = ["query", "get"];
}

