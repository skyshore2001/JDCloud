<?php

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
			"fmt" => "list",
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

