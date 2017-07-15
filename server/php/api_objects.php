<?php

// ====== globals {{{
function getTmVcol($fieldName = "t0.tm")
{
	return [
		"res" => ["year({$fieldName}) y", "month({$fieldName}) m", "week({$fieldName}) w", "day({$fieldName}) d", "weekday({$fieldName})+1 wd", "hour({$fieldName}) h"],
	];
}
//}}}

// ====== User {{{
class AC0_User extends AccessControl
{
	// 为演示统计表，增加两个虚拟字段sex,addr
	protected $vcolDefs = [
		[
			"res" => ["if(t0.id mod 3=1, 'F', 'M') sex", "if(t0.id mod 3=1, '女', '男') sexName", "if(t0.id mod 3=2, '北京', '上海') region"],
		],
	];

	function __construct() {
		array_push($this->vcolDefs, getTmVcol("t0.createTm"));
	}

	protected function onValidate()
	{
		if (issetval("pwd")) {
			$_POST["pwd"] = hashPwd($_POST["pwd"]);
		}
	}
}

class AC1_User extends AccessControl
{
	protected $allowedAc = ["get", "set"];
	protected $readonlyFields = ["pwd"];
	protected $hiddenFields = ["pwd"];

	protected function onValidateId()
	{
		$uid = $_SESSION["uid"];
		setParam("id", $uid);
	}
}

class AC2_User extends AccessControl
{
	protected $allowedAc = ["query", "get"];
}
#}}}

// ====== Employee {{{

class AC0_Employee extends AccessControl
{
	protected function onValidate()
	{
		if ($this->ac == "add" && !issetval("perms")) {
			$_POST["perms"] = "emp";
		}

		if (issetval("pwd")) {
			$_POST["pwd"] = hashPwd($_POST["pwd"]);
		}
	}
}

class AC2_Employee extends AC0_Employee
{
	protected $requiredFields = ["uname", "pwd"];
	protected $allowedAc = ["query", "get", "set"];
	protected $allowedAc2 = ["query", "get", "set", "add", "del"];

	function __construct()
	{
		if (hasPerm(AUTH_MGR)) {
			$this->allowedAc = $this->allowedAc2;
		}
	}

	protected function onValidateId()
	{
		$id = param("id");
		if (!hasPerm(AUTH_MGR) || is_null(param("id"))) {
			setParam("id", $_SESSION["empId"]);
		}
	}
}

//}}}

// ====== Ordr {{{
class AC0_Ordr extends AccessControl
{
	protected $subobj = [
		"orderLog" => ["sql"=>"SELECT ol.*, e.uname AS empPhone, e.name AS empName FROM OrderLog ol LEFT JOIN Employee e ON ol.empId=e.id WHERE orderId=%d", "wantOne"=>false],
		"atts" => ["sql"=>"SELECT id, attId FROM OrderAtt WHERE orderId=%d", "wantOne"=>false],
	];

	protected $vcolDefs = [
		[
			"res" => ["u.name AS userName", "u.phone AS userPhone"],
			"join" => "INNER JOIN User u ON u.id=t0.userId",
		],
		[
			"res" => ["log_cr.tm AS createTm"],
			"join" => "LEFT JOIN OrderLog log_cr ON log_cr.action='CR' AND log_cr.orderId=t0.id",
		]
	];

	function __construct() {
		$vcol = getTmVcol("log_cr.tm");
		$vcol["require"] = "createTm";
		array_push($this->vcolDefs, $vcol);
	}
}

class AC1_Ordr extends AC0_Ordr
{
	protected $allowedAc = ["get", "query", "add", "set"];
	protected $readonlyFields = ["userId"];

	protected function onQuery()
	{
		$userId = $_SESSION["uid"];
		$this->addCond("t0.userId={$userId}");
	}

	protected function onValidate()
	{
		$logAction = null;
		if ($this->ac == "add") {
			$userId = $_SESSION["uid"];
			$_POST["userId"] = $userId;
			$_POST["status"] = "CR";
			$logAction = "CR";
		}
		else {
			if (issetval("status")) {
				// TODO: validate status
				$logAction = $_POST["status"];
			}
		}

		if ($logAction) {
			$this->onAfterActions[] = function () use ($logAction) {
				$orderId = $this->id;
				$sql = sprintf("INSERT INTO OrderLog (orderId, action, tm) VALUES ({$orderId},%s,'%s')", Q($logAction), date(FMT_DT));
				execOne($sql);
			};
		}
	}
}

class AC2_Ordr extends AC0_Ordr
{
	protected $allowedAc = ["get", "query", "set"];
	protected $readonlyFields = ["userId"];

	protected function onValidate()
	{
		if ($this->ac == "set") {
			if (issetval("status")) {
				$status = $_POST["status"];
				if ($status == "RE" || $status == "CA") {
					$oldStatus = queryOne("SELECT status FROM Ordr WHERE id={$this->id}");
					if ($oldStatus != "CR") {
						throw new MyException(E_FORBIDDEN, "forbidden to change status to $status");
					}
					$this->onAfterActions[] = function () use ($status) {
						$orderId = $this->id;
						$empId = $_SESSION["empId"];
						$sql = sprintf("INSERT INTO OrderLog (orderId, action, tm, empId) VALUES ($orderId,'$status','%s', $empId)", date(FMT_DT));
						execOne($sql);
					};
				}
				else {
					throw new MyException(E_FORBIDDEN, "forbidden to change status to {$_POST['status']}");
				}
			}
		}
	}
}
// }}}

class AC0_ApiLog extends AccessControl
{
	function __construct() {
		array_push($this->vcolDefs, getTmVcol());
	}
}

// vi: foldmethod=marker
