<?php

spl_autoload_register(function ($cls) {
	$path = __DIR__ . '/class/' . $cls . '.php';
	if (is_file($path))
		include_once($path);
});

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
		try {
			foreach (self::$list as $timer) {
				if ($timer['disabled'])
					continue;
				self::setup($timer);
			}
		}
		catch (Exception $e) {
			logit('AC_Timer::init fail: ' . $e);
			self::$list = [];
			self::$nextId = 1;
		}
		if (count(self::$list) > 0)
			writeLog("=== load " . count(self::$list) . " timer(s)");
	}
	static function save() {
		$rv = jsonEncode(['nextId'=>self::$nextId, 'list'=>self::$list], true);
		file_put_contents('timer.json', $rv);
	}

	static function count() {
		return count(self::$list);
	}
	// 带cron的timer, 若无id则自动添加
	static function setup($timer) {
		checkParams($timer, ['url']);
		// code须符合格式`{app}-{obj}-{id}`
		if ($timer['code'] && ! preg_match('/^\w+-\w+-/u', $timer['code']))
			jdRet(E_PARAM, 'bad code for timer: ' . $timer['code'], 'code参数格式错误');

		$tmrstr = null;
		$filter = null; // 返回true才执行
		$fn = function () use ($timer, &$tmrstr, &$filter) {
			if ($filter && !$filter())
				return;
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

		$id = null;
		$tmrId = null;
		$wait = intval($timer['wait']);
		$cron = $timer['cron'];
		if ($cron) {
			if ($wait && $wait < 100)
				jdRet(E_PARAM, 'min wait time>100ms', '间隔时间(wait)太小不允许');
			if ($cron != 1) {
				if (($cronfn = Cron::parseCron($cron)) === false)
					jdRet(E_PARAM, 'bad cron format', '时间设置(cron)不正确');
				$filter = function () use ($fn, $cronfn) {
					return $cronfn();
				};
				// 不指定wait，则按crontab时间执行；否则按wait时间轮询但须同时符合crontab时间
				if ($wait <= 0)
					$wait = 60000; // 1分钟1次
			}
			$id = $timer['id'];
			if (! $id) {
				$id = self::$nextId ++;
				$timer['id'] = $id;
				self::$list[] = $timer;
				self::save();
			}
			if ($timer['disabled'])
				return $id;
			$tmrId = swoole_timer_tick($wait, $fn);
			self::$map[$id] = $tmrId;
			$tmrstr = "timer#$id-$tmrId";
			go($fn);
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
		if ($id > 0)
			writeLog("=== set timer#$id cron=`$cron`");
		return $id;
	}

	function set($fn) {
		list($id, $code) = $this->env->mparam(['id', 'code']);
		$one = arrFind(self::$list, function ($e) use ($id, $code) {
			return ($id && $e['id'] == $id) || ($code && $e['code'] == $code);
		}, $idx);
		if ($one === false)
			jdRet(E_PARAM, 'bad timer ' . ($id?:$code));
		$fn($id, $idx);
		self::save();
	}

	function api_query() {
		return self::$list;
	}
	function api_set() {
		$this->set(function ($id, $idx) {
			swoole_timer_clear(self::$map[$id]);
			$timer = &self::$list[$idx];
			unset($this->env->_POST['id']); // 除了id, 其它都能改
			arrCopy($timer, $this->env->_POST);
			self::setup($timer);
		});
	}
	function api_del() {
		$this->set(function ($id, $idx) {
			swoole_timer_clear(self::$map[$id]);
			array_splice(self::$list, $idx, 1);
		});
	}
	function api_clear() {
//		Swoole\Timer::clearAll(); // 不要清除所有；可能有用于别的用途的timer
		foreach (self::$map as $id=>$tmrId) {
			swoole_timer_clear($tmrId);
		}
		// 并不清除nextId，它会永远增长。
		self::$list = [];
		self::save();
	}
	function api_disable() {
		$this->env->_POST['disabled'] = true;
		return $this->api_set();
	}
	function api_enable() {
		$this->env->_POST['disabled'] = false;
		return $this->api_set();
	}
}

function api_setTimeout($env)
{
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

