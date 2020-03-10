<?php

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
		$this->vcolDefs[] = [ "res" => tmCols("t0.createTm") ];
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
		if ($this->ac == "set" && issetval("perms?")) {
			$params = $_POST;
			injectSession($this->id, "emp", function () use ($params) {
				$_SESSION["perms"] = $params["perms"];
			});
		}

		if (issetval("pwd")) {
			$_POST["pwd"] = hashPwd($_POST["pwd"]);
		}
	}
}

class AC2_Employee extends AC0_Employee
{
	protected $requiredFields = [["phone", "uname"], "pwd"];
	protected $allowedAc = ["query", "get", "set"];

	function __construct()
	{
		if (hasPerm(PERM_MGR)) {
			$this->allowedAc = null; // all ac
		}
		else {
			$this->readonlyFields = ["perms", "pwd", "phone", "uname"];
		}
	}

	protected function onValidateId()
	{
		$id = param("id");
		if (!hasPerm(PERM_MGR) || is_null($id)) {
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
		// "atts" => ["sql"=>"SELECT id, attId FROM OrderAtt WHERE orderId=%d", "wantOne"=>false],
		"atts" => ["obj"=>"OrderAtt", "cond"=>"orderId=%d", "AC"=>"AccessControl", "res"=>"id,attId"]
	];

	protected $vcolDefs = [
		[
			"res" => ["u.name AS userName", "u.phone AS userPhone"],
			"join" => "INNER JOIN User u ON u.id=t0.userId"
		]
	];

	function __construct() {
		$this->vcolDefs[] = [ "res" => tmCols("t0.createTm") ];
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
			$_POST["createTm"] = date(FMT_DT);
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
				dbInsert("OrderLog", [
					"orderId" => $this->id,
					"action" => $logAction,
					"tm" => date(FMT_DT)
				]);
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
						dbInsert("OrderLog", [
							"orderId" => $this->id,
							"action" => $status,
							"tm" => date(FMT_DT),
							"empId" => $_SESSION["empId"]
						]);
					};
				}
				else {
					throw new MyException(E_FORBIDDEN, "forbidden to change status to {$_POST['status']}");
				}
			}
		}
	}

/* 批量更新/批量删除接口示例

	function api_setIf()
	{
		checkAuth(PERM_MGR);
		$this->checkSetFields(["dscr", "cmt"]);
		return parent::api_setIf();
	}

	function api_delIf()
	{
		checkAuth(PERM_MGR);
		$empId = $_SESSION["empId"];
		return parent::api_delIf();
	}
*/
}
// }}}

class AC0_ApiLog extends AccessControl
{
	function __construct() {
		$this->vcolDefs[] = [ "res" => tmCols() ];
	}
}

// vi: foldmethod=marker
