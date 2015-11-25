<?php

// ====== User {{{
class AC0_User extends AccessControl
{
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

class AC2_Employee extends AccessControl
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
		if (is_null(param("id"))) {
			setParam("id", $_SESSION["empId"]);
		}
	}

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

//}}}

// vim: set foldmethod=marker :
