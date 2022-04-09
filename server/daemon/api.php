<?php
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
	$perms = 0;
	if (isset($_SESSION["uid"])) {
		$perms |= AUTH_USER;
	}
	else if (isset($_SESSION["adminId"])) {
		$perms |= AUTH_ADMIN;
	}
	else if (isset($_SESSION["empId"])) {
		$perms |= AUTH_EMP;

		$p = @$_SESSION["perms"];
		if (inSet("mgr", $p)) {
			$perms |= PERM_MGR;
		}
	}

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
	$cls = null;
	if (hasPerm(AUTH_USER))
	{
		$cls = "AC1_$tbl";
		if (! class_exists($cls))
			$cls = "AC_$tbl";
	}
	else if (hasPerm(AUTH_EMP))
	{
		$cls = "AC2_$tbl";
	}
	return $cls;
}

// override trait JDServer
// refer: https://wiki.swoole.com/#/http_server?id=httprequest
class SwooleEnv extends JDEnv
{
	public $req, $res;

	function __construct($req, $res) {
		$this->req = $req;
		$this->res = $res;
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
			logit("ignore session_write_close");
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

// vi: foldmethod=marker
