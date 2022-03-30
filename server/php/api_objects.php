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

	protected function onInit() {
		$this->vcolDefs[] = [ "res" => tmCols("t0.createTm") ];
	}

	protected function onValidate()
	{
		if (issetval("pwd")) {
			$_POST["pwd"] = hashPwd($_POST["pwd"]);
		}
	}
	protected function onQuery()
	{
		$this->qsearch(["id", "name", "uname", "phone"], param("q"));
	}
}

class AC1_User extends AC0_User
{
	protected $allowedAc = ["get", "set"];
	protected $readonlyFields = ["pwd"];

	protected function onValidateId()
	{
		$uid = $_SESSION["uid"];
		$this->id = $uid;
	}
}

class AC2_User extends AC0_User
{
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

	protected function onInit()
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
			$this->id = $_SESSION["empId"];
		}
	}

	protected function onQuery()
	{
		if ($this->ac == "get" && $GLOBALS["P_initClient"]["enableRole"]) {
			AC0_Role::handleRole($this);
		}
		$this->qsearch(["id", "name", "phone"], param("q"));
	}
}

//}}}

// ====== Ordr {{{
class AC0_OrderLog extends AccessControl
{
	protected $defaultSort = "t0.id DESC";
	protected $vcolDefs = [
		[
			"res" => ["emp.name empName", "emp.phone empPhone"],
			"join" => "LEFT JOIN Employee emp ON emp.id=t0.empId",
			"default" => true
		]
	];
}

class AC2_OrderLog extends AC0_OrderLog
{
}

class AC0_Ordr extends AccessControl
{
	protected $subobj = [
		"orderLog" => ["obj"=>"OrderLog", "cond"=>"orderId={id}"],
		"atts" => ["obj"=>"OrderAtt", "cond"=>"orderId={id}", "AC"=>"AccessControl", "res"=>"id,attId"]
	];

	protected $vcolDefs = [
		[
			"res" => ["u.name userName", "u.phone userPhone"],
			"join" => "LEFT JOIN User u ON u.id=t0.userId",
			"default" => true
		]
	];

	protected function onInit() {
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
		$this->addCond("userId={$userId}");
	}

	protected function onValidate()
	{
		$status = null;
		if ($this->ac == "add") {
			$userId = $_SESSION["uid"];
			$_POST["userId"] = $userId;
			$_POST["status"] = "CR";
			$_POST["createTm"] = date(FMT_DT);
			$status = "CR";
		}
		else {
			if (issetval("status")) {
				// TODO: validate status
				$status = $_POST["status"];
			}
		}

		if ($status) {
			$this->onAfterActions[] = function () use ($status) {
				dbInsert("OrderLog", [
					"orderId" => $this->id,
					"action" => $status,
					"tm" => date(FMT_DT)
				]);
			};
		}
	}
}

class AC2_Ordr extends AC0_Ordr
{
	//protected $allowedAc = ["get", "query", "set"];
	//protected $readonlyFields = ["userId"];

	protected function onQuery()
	{
		$this->qsearch(["id", "userPhone"], param("q"));
	}

	protected function onValidate()
	{
		$status = null;
		if ($this->ac == "add") {
			$_POST["status"] = "CR";
			$_POST["createTm"] = date(FMT_DT);
			$status = "CR";
		}
		else if ($this->ac == "set") {
			if (issetval("status")) {
				$status = $_POST["status"];
				/* 示例：检查旧状态->新状态是否允许
				if ($status == "RE" || $status == "CA") {
					$oldStatus = queryOne("SELECT status FROM Ordr WHERE id={$this->id}");
					if ($oldStatus != "CR") {
						jdRet(E_FORBIDDEN, "forbidden to change status to $status");
					}
				}
				else {
					jdRet(E_FORBIDDEN, "forbidden to change status to {$_POST['status']}");
				}
				*/
			}
		}
		if ($status) {
			$this->onAfterActions[] = function () use ($status) {
				dbInsert("OrderLog", [
					"orderId" => $this->id,
					"action" => $status,
					"tm" => date(FMT_DT),
					"empId" => $_SESSION["empId"]
				]);
			};
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

// vi: foldmethod=marker
