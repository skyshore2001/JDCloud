<?php
$GLOBALS["conf_swoole_env"] = 1;
require_once('../php/jdcloud-php/api_fw.php');
require_once('api.user.php');

// ====== config {{{
const AUTH_GUEST = 0;
// 登陆类型
const AUTH_USER = 0x01;
const AUTH_EMP = 0x02;
const AUTH_ADMIN = 0x04;
const AUTH_LOGIN = 0xff;

// 权限类型
const PERM_MGR = 0x100;
const PERM_TEST_MODE = 0x1000;
const PERM_MOCK_MODE = 0x2000;

global $PERMS;
$PERMS = [
	AUTH_GUEST => "guest",
	AUTH_USER => "user",
	AUTH_EMP => "employee",
	AUTH_ADMIN => "admin",

	PERM_MGR => "manager",

	PERM_TEST_MODE => "testmode",
	PERM_MOCK_MODE => "mockmode",
];
//}}}

/*
@fn onGetPerms()

生成权限，由框架调用。
 */
function onGetPerms()
{
	if (@$GLOBALS["TEST_MODE"]) {
		$perms |= PERM_TEST_MODE;
	}
	if (@$GLOBALS["MOCK_MODE"]) {
		$perms |= PERM_MOCK_MODE;
	}

	return $perms;
}

/*
@fn onCreateAC($obj)

@param $obj 对象名或主表名

根据对象名，返回权限控制类名，如 AC1_{$obj}。
如果返回null, 则默认为 AC_{obj}

 */
function onCreateAC($tbl)
{
	return null;
}

class Conf extends ConfBase
{
	static $enableAutoSession = false;
}

// override trait JDEnvBase
// refer: https://wiki.swoole.com/#/http_server?id=httprequest
class SwooleEnv extends JDEnv
{
	public $req, $res;

	function __construct($req, $res) {
		$this->req = $req;
		$this->res = $res;
		if ($this->req->get === null)
			$this->req->get = [];
		if ($this->req->post === null)
			$this->req->post = [];
		$this->_GET = &$this->req->get;
		$this->_POST = &$this->req->post;
		$this->_SESSION = [];
		parent::__construct();
	}
	function _SERVER($key) {
		// _SERVER("HTTP_MY_HEADER") -> header("MY-HEADER")
		assert(is_string($key));
		if (startsWith($key, "HTTP_")) {
			$key = str_replace('_', '-', substr($key, 5));
			return $this->header($key);
		}
		$key = strtolower($key);
		return $this->req->server[$key];
	}
	function header($key=null, $val=null) {
		$argc = func_num_args();
		if ($argc == 0) {
			return $this->req->header;
		}
		if ($argc == 1) {
			$key = strtolower($key);
			return $this->req->header[$key];
		}
		$this->res->header($key, $val);
	}
	function rawContent() {
		return $this->req->rawContent();
	}
	function write($data) {
		if ($data === null || $data === "")
			return;
		$this->res->write($data);
	}


	protected function setupSession() {
		/*
		// normal: "userid"
		$sesName = $this->appName . "id";
		$sesId = $this->req->cookie[$sesName];
		*/
	}

	protected $sesId, $sesFile, $sesArr;
	protected $sesH;
	function session_start() {
		// TODO: check session timeout
		if ($this->sesH == null) {
			$sesName = $this->appType . "id";
			$this->sesId = $this->req->cookie[$sesName];
			if ($this->sesId) {
				// $mode = "r+";
				$mode = "c+"; // 如果指定session不存在则自动创建，不报错
			}
			else {
				$this->sesId = strtolower(randChr(26));
				$this->res->cookie($sesName, $this->sesId);
				$mode = "w";
			}

			$path = getenv("P_SESSION_DIR") ?: $GLOBALS["BASE_DIR"] . "/session";
			if (!  is_dir($path)) {
				if (! mkdir($path, 0777, true))
					jdRet(E_SERVER, "fail to create session folder: $path");
			}
			if (! is_writeable($path))
				jdRet(E_SERVER, "session folder is NOT writeable: $path");

			$this->sesFile = "$path/jdsess_" . $this->sesId;
			@$fp = fopen($this->sesFile, $mode);
			if (!$fp) 
				jdRet(E_SERVER, "cannot open session {$this->sesFile}", "Session错误");
			flock($fp, LOCK_EX);
			$this->sesH = $fp;
			if ($mode == "w") { // new session
				$this->sesArr = [];
			}
			else {
				$str  = stream_get_contents($fp);
				$this->sesArr = $str? jsonDecode($str): [];
			}
		}
		$this->_SESSION = $this->sesArr;
	}
	function session_write_close() {
//		var_export(["session" => $this->_SESSION, "sesId"=>$this->sesId, "sesFile"=>$this->sesFile]);
		if ($this->sesH == null) {
			// logit("ignore session_write_close");
			return;
		}
		$str = empty($this->_SESSION)? '': jsonEncode($this->_SESSION);
		fseek($this->sesH, 0);
		fwrite($this->sesH, $str);
		flock($this->sesH, LOCK_UN);
		fclose($this->sesH);
		$this->sesH = null;
	}
	function session_destroy() {
		if ($this->sesH == null) {
			logit("ignore session_destroy");
			return;
		}
		ftruncate($this->sesH, 0);
		flock($this->sesH, LOCK_UN);
		fclose($this->sesH);
		@unlink($this->sesFile);
		$this->sesH = null;
	}
}

// ====== JDServer {{{
class JDServer
{
	// 用于websocket用户；允许一个用户多次出现，都能收到消息。
	static $clientMap = []; // fd => {app, user, isHttp?, tmr?}

	// reload时置true, 死循环协程应自觉退出
	static $reloadFlag = false;

	static $fileTypes = [
		'html' => 'text/html; charset=utf-8',
		'json' => 'application/json; charset=utf-8',
		'js' => 'application/javascript; charset=utf-8',
		'css' => 'text/css',
		'jpg'=>'image/jpeg',
		'jpeg'=>'image/jpeg',
		'png'=>'image/png',
		'gif'=>'image/gif',
		'ico' => 'image/x-icon',
		'txt'=>'text/plain',
		'pdf' => 'application/pdf',
		'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'doc' => 'application/msword',
		'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'xls' => 'application/vnd.ms-excel',
		'zip' => 'application/zip',
		'rar' => 'application/x-rar-compressed',
		'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'ppt' => 'application/vnd.ms-powerpoint',
		'mp3' => 'audio/mpeg',
		'm4a' => 'audio/mp4',
		'mp4' => 'video/mp4',
	];
	// websocket message
	static function onMessage($ws, $frame) {
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
			$cli = self::$clientMap[$fd] = ["app"=>$app, "user"=>$user];
		}
		else {
			@$cli = self::$clientMap[$fd];
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
			$from = "{$cli['user']} #{$fd}";
			$ret = self::pushMsg($app, $user, $msg, $from);
		}
		$frame->req = $req;
		$GLOBALS["jdserver_event"]->trigger("message.$app", [$ws, $frame]);

		$ws->push($fd, $ret);
	}

	// http request
	static function onRequest($req, $res) {
		$ac = $req->server['path_info']; // 即url
		if ($ac == '/')
			$ac = '/index.html';
		if (preg_match('/\.(\w+)$/', $ac, $ms) && array_key_exists($ms[1], self::$fileTypes)) {
			$res->header("cache-control", "no-cache");
			$f = substr($ac, 1);
			if (! file_exists($f)) {
				$res->status(404);
				$res->end();
				return;
			}
			$ct = self::$fileTypes[$ms[1]];
			$res->header('Content-Type', $ct);
			$res->sendfile($f);
			return;
		}
		if ($ac == "/getMsg") {
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
			self::$clientMap[$fd] = ["app"=>$app, "user"=>$user, "isHttp"=>true, "tmr"=>$tmr];

			$res->detach();
			return;
		}

		$env = new SwooleEnv($req, $res);
		$GLOBALS["X_APP"][Swoole\Coroutine::getcid()] = $env;
		$env->callSvcSafe();
		$res->end();
	}

	static function onClose($ws, $fd) {
	// NOTE: http request comes here too
	//	echo("onClose: fd=" . $fd . "\n");

		if (array_key_exists($fd, self::$clientMap)) {
			$cli = self::$clientMap[$fd];
			writeLog("[app {$cli['app']}] del user: {$cli['user']} #{$fd}");
			unset(self::$clientMap[$fd]);
		}
	}

	static function pushMsg($app, $userSpec, $msg, $from = null)
	{
		global $server;

		if (is_array($msg))
			$msg = jsonEncode($msg);
		if (getConf("conf_jdserver_log_ws")) {
			if ($from) {
				$s = "[app $app] push to $userSpec by $from: $msg";
			}
			else {
				$s = "[app $app] push to $userSpec: $msg";
			}
			writeLog($s);
		}

		$n = 0;
		$arr = explode(',', $userSpec);
		foreach (self::$clientMap as $fd => $cli) {
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

	static function onWorkerExit($server, $workerId) {
		JDServer::$reloadFlag = true;
	}
}

// go()一旦异常,会导致整个进程所有协程退出, 所以应使用safeGo替代go, 失败时只影响当前协程
function safeGo($fn)
{
	go(function () use ($fn) {
		try {
			$fn();
		}
		catch (Exception $ex) {
			logit($ex);
		}
	});
}

class JDServerEvent
{
	use JDEvent;

	/// @event message($arg1, $arg2)
}
$GLOBALS["jdserver_event"] = new JDServerEvent();
foreach (glob(__DIR__ ."/jdserver.d/*.php") as $f) {
	include($f);
}

// }}}

AC_Timer::init();

// vi: foldmethod=marker
