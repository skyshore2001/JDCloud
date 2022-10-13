<?php

require_once('php/autoload.php');
require_once('php/jdcloud-php/api_fw.php');
require_once('php/api_functions.php');
require_once('php/api_objects.php');

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

//}}}

// ====== main {{{

// 确保在api.php的最后
if (!isCLI() && endWith($_SERVER["SCRIPT_NAME"], "/api.php"))
	callSvc();

//}}}

// vi: foldmethod=marker
