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
	$rv["jdserver_timer_cnt"] = AC_Timer::count();
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
	$app = $env->mparam("app");
	$ret = [];
	foreach ($clientMap as $fd => $cli) {
		if ($cli['app'] == $app) {
			$ret[] = $cli['user'];
		}
	}
	return $ret;
}

class AC_Timer extends JDApiBase
{
	protected static $list;
	protected static $nextId = 1;
	protected static $map; // $id=>$tmrId

	static function init() {
		self::$list = [];
		self::$nextId = 1;
		$rv = jsonDecode(@file_get_contents('timer.json'));
		if ($rv && is_array($rv['list']) && is_int($rv['nextId'])) {
			self::$list = $rv['list'];
			self::$nextId = $rv['nextId'];
		}
		foreach (self::$list as $timer) {
			if ($timer['disabled'])
				continue;
			self::setup($timer);
		}
		if (count(self::$list) > 0)
			writeLog("=== load " . count(self::$list) . " timer(s)");
	}
	static function save() {
		$rv = jsonEncode(['nextId'=>self::$nextId, 'list'=>self::$list], true);
		file_put_contents('timer.json', $rv);
	}

	// 根据unix风格cron，计算下一次执行时间离当前时间的毫秒数
	protected static function getNextWait($cron) {
		// TODO
		return 100*1000;
	}

	static function count() {
		return count(self::$list);
	}
	static function setup($timer) {
		$tmrstr = null;
		$fn = function () use ($timer, &$tmrstr) {
			logit("$tmrstr exec: httpCall({$timer['url']}, {$timer['data']})");
			try {
				$opt = [
					'headers' => $timer['headers'],
					'useJson' => $timer['useJson']
				];
				$rv = httpCall($timer['url'], $timer['data'], $opt);
				logit("$tmrstr ret: $rv");
			}
			catch (Exception $ex) {
				logit("$tmrstr fails: $ex");
			}
		};

		$tmrId = null;
		$wait = intval($timer['wait']);
		$cron = $timer['cron'];
		if ($cron) {
			$id = $timer['id'];
			if (! $id) {
				$id = self::$nextId ++;
				$timer['id'] = $id;
				self::$list[] = $timer;
				self::save();
			}
			if ($cron == 1) {
				$tmrId = swoole_timer_tick($wait, $fn);
				self::$map[$id] = $tmrId;
				$tmrstr = "timer#$id-$tmrId";
				go($fn);
			}
			else {
				$fn1 = null;
				$n = 0;
				$fn1 = function () use ($fn, $id, $cron, &$fn1, &$n, &$tmrstr) {
					// 首次只设置不执行
					if ($n++ > 0)
						$fn();
					$wait = self::getNextWait($cron);
					$tmrId = swoole_timer_after($wait, $fn1);
					$tmrstr = "timer#$id-$tmrId";
					self::$map[$id] = $tmrId;
				};
				go($fn1);
			}
		}
		else {
			if ($wait > 0) {
				$tmrId = swoole_timer_after($wait, $fn);
				$tmrstr = "timer-$tmrId";
				logit("$tmrstr: wait {$wait}ms.");
				$id= -$tmrId;
			}
			else {
				$tmrstr = "timer";
				go($fn);
				$id = null;
			}
		}
		return $id;
	}

	static function add($one) {
		$one["id"] = self::$nextId ++;
		self::$list[] = $one;
		self::save();
		return $one["id"];
	}
	function set($fn) {
		$id = $this->env->mparam("id");
		$one = arrFind(self::$list, function ($e) use ($id) {
			return $e['id'] == $id;
		}, $idx);
		if ($one === false)
			jdRet(E_PARAM, "bad timer $id");
		$fn($id, $idx);
		self::save();
	}

	function api_query() {
		return self::$list;
	}
	function api_del() {
		$this->set(function ($id, $idx) {
			swoole_timer_clear(self::$map[$id]);
			array_splice(self::$list, $idx, 1);
		});
	}
	function api_clear() {
//		Swoole\Timer::clearAll(); // 不要清除所有；可能有用于别的用途的timer
		foreach ($map as $id=>$tmrId) {
			swoole_timer_clear($tmrId);
		}
		// 并不清除nextId，它会永远增长。
		self::$list = [];
		self::save();
	}
	function api_disable() {
		$this->set(function ($id, $idx) {
			if (self::$list[$idx]["disabled"])
				return;
			swoole_timer_clear(self::$map[$id]);
			self::$list[$idx]["disabled"] = true;
		});
	}
	function api_enable() {
		$this->set(function ($id, $idx) {
			if (!self::$list[$idx]["disabled"])
				return;
			self::$list[$idx]["disabled"] = false;
			self::setup(self::$list[$idx]);
		});
	}
}

function api_setTimeout($env)
{
	$env->mparam("url");
	return AC_Timer::setup($env->_POST);
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

