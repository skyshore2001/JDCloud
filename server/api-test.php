<?php

require_once('app.php');
require_once('php/api_fw.php');

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

// ====== global {{{

//}}}

//====== function {{{
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
	if (@$GLOBALS["TEST_MODE"]) {
		$perms |= PERM_TEST_MODE;
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
	return $cls;
}

//}}}

// ====== plugin integration {{{
class PluginCore extends PluginBase
{
}

// }}}

function api_fn()
{
	$ret = null;
	$f = mparam("f");
	if ($f == "param") {
		$ret = param(mparam("name"), param("defVal"), param("coll"));
	}
	else if ($f == "mparam") {
		$ret = mparam(mparam("name"), param("coll"));
	}
	else if ($f == "queryAll") {
		$sql = mparam("sql", null, false);
		$assoc = param("assoc/b", false);
		$ret = queryAll($sql, $assoc);
	}
	else if ($f == "queryOne") {
		$sql = mparam("sql", null, false);
		$assoc = param("assoc/b", false);
		$ret = queryOne($sql, $assoc);	
	}
	else if ($f == "execOne") {
		$sql = mparam("sql", null, false);
		$getNewId = param("getNewId/b", false);
		$ret = execOne($sql, $getNewId);	
	}
	else
		throw new MyException(E_SERVER, "not implemented");
	return $ret;
}

function api_login()
{
	$uname = mparam("uname");
	$pwd = mparam("pwd");

	$sql = sprintf("SELECT id FROM User WHERE uname=%s", Q($uname));
	$id = queryOne($sql);
	if ($id === false)
		throw new MyException(E_AUTHFAIL, "bad uname or pwd");
	$_SESSION["uid"] = $id;
	return ["id" => $id];
}

function api_whoami()
{
	checkAuth(AUTH_USER);
	$uid = $_SESSION["uid"];
	return ["id"=> $uid];
}

function api_logout()
{
	session_destroy();
}

function api_hello()
{
	return [
		"id" => 100,
		"name" => "hello"
	];
}

class AC_ApiLog extends AccessControl
{
	protected $requiredFields = ["ac"];
	protected $readonlyFields = ["ac", "tm"];
	protected $hiddenFields = ["ua"];

	protected function onValidate()
	{
		if ($this->ac == "add")
		{
			$_POST["tm"] = date(FMT_DT);
		}
	}

	public function api_hello()
	{
		return [
			"id" => 100,
			"name" => "hello"
		];
	}
}

class AC1_UserApiLog extends AC_ApiLog
{
	protected $table = "ApiLog";
	protected $defaultSort = "id DESC";
	protected $allowedAc = [ "get", "query", "add", "del" ];
	protected $vcolDefs = [
		[
			"res" => ["u.name userName"],
			"join" => "INNER JOIN User u ON u.id=t0.userId",
			"default" => true
		]
	];

	private $uid;

	protected function onInit()
	{
		$this->uid = $_SESSION["uid"];


		$this->vcolDefs[] = [
			"res" => ["(SELECT group_concat(concat(id, ':', ac))
FROM (
SELECT id, ac
FROM ApiLog 
WHERE userId={$this->uid} ORDER BY id DESC LIMIT 3) t
) last3LogAc"]
		];

		$this->subobj = [
			"user" => [ "sql" => "SELECT id,name FROM User u WHERE id={$this->uid}", "wantOne" => true ],
			"last3Log" => [ "sql" => "SELECT id,ac FROM ApiLog log WHERE userId={$this->uid} ORDER BY id DESC LIMIT 3" ]
		];
	}

	protected function onValidate()
	{
		parent::onValidate();
		if ($this->ac == "add")
		{
			$_POST["userId"] = $this->uid;
		}
	}

	protected function onValidateId()
	{
		if ($this.ac == "del")
		{
			$id = mparam("id");
			$rv = queryOne("SELECT id FROM ApiLog WHERE id={$id} AND userId={$this->uid}");
			if ($rv === false)
				throw new MyException(E_FORBIDDEN, "not your log");
		}
	}

	protected function onQuery()
	{
		parent::onQuery();
		$this->addCond("userId=" . $this->uid);
	}

	public function api_listByAc()
	{
		$ac = mparam("ac");
		$param = [
			"_fmt" => "list",
			"cond" => "ac=" . Q($ac)
		];
		/*
		callSvc("UserApiLog.query", $param);
		throw new DirectReturn();
		*/
		setParam($param);
		return callSvcInt("UserApiLog.query");
	}
}


// ====== main {{{

// 确保在api.php的最后
apiMain();

//}}}

// vi: foldmethod=marker
