<?php
require_once('WebAPITestBase.php');

// TODO: output case name and result to log before and after the test;
// TODO: add app constant into a shared file
### copy from api.php
const E_AUTHFAIL=-1;
const E_OK=0;
const E_PARAM=1;
const E_NOAUTH=2;
const E_DB=3;
const E_SERVER=4;
const E_FORBIDDEN=5;
const E_SMS=6;

const T_HOUR = 3600;
define("T_DAY", T_HOUR*24);

$ERR_CODE = [
	E_AUTHFAIL => "E_AUTHFAIL",
	E_OK => "E_OK",
	E_PARAM => "E_PARAM",
	E_NOAUTH => "E_NOAUTH",
	E_DB => "E_DB",
	E_SERVER => "E_SERVER",
	E_FORBIDDEN => "E_FORBIDDEN",
	E_SMS => "E_SMS",
];

function retCode($code)
{
	global $ERR_CODE;
	$str = $ERR_CODE[$code];
	if ($str) {
		return $code . "($str)";
	}
	return $code;
}

class WebAPITest extends WebAPITestBase
{
	const USER = "19900000001";
	const PWD = "1234";

	const EMP_USER = "13700000001";

	const ADMIN_USER = "liang";
	const ADMIN_PWD = "liang123";


	###### shared functions {{{

	function delUser($phone)
	{
		$data = $this->execSql("DELETE FROM User WHERE phone='$phone'");
	}

	// return: loginData, e.g. [id, _token, ...]
	function userLogin()
	{
		$this->setApp("");
		if (isset(self::$ut_data->userLoginData))
			return self::$ut_data->userLoginData;
		$this->isCritical = true;

		// 如果失败，请执行 testReg 先创建测试用户。
		$res = self::$obj->login(self::USER, self::PWD);
		$data = $this->validateRetAsObj($res, ["id", "_token", "_expire"]);
		$this->assertTrue((int)$data->id > 0, "*** id should be an integer");

		self::$ut_data->userLoginData = $data;
		return $data;
	}

	function userLogout()
	{
		if (isset(self::$ut_data->userLoginData))
			return self::$ut_data->userLoginData;
		$res = self::$obj->logout();
		$data = $this->validateRet($res);
		unset(self::$ut_data->userLoginData);
	}

	// return: loginData, e.g. ["id", ...]
	function empLogin()
	{
		$this->setApp("emp");
		if (isset(self::$ut_data->empLoginData))
			return self::$ut_data->empLoginData;
		$this->isCritical = true;

		// create emp user if not exist
		$empId = $this->queryOne("SELECT id FROM Employee WHERE phone='" . self::EMP_USER . "'");
		if ($empId === false) {
			$sql = sprintf("INSERT INTO Employee (phone, name, pwd, perms) VALUES ('%s', 'test emp user', '%s', 'mgr')", self::EMP_USER, md5(self::PWD));
			$this->execSql($sql);
		}
		
		$res = self::$obj->login(self::EMP_USER, self::PWD);
		$data = $this->validateRetAsObj($res, ["id", "_token", "_expire"]);
		$this->assertTrue((int)$data->id > 0, "*** id should be an integer");

		self::$ut_data->empLoginData = $data;
		return $data;
	}

	function empLogout()
	{
		if (! isset(self::$ut_data->empLoginData))
			return;
		$res = self::$obj->logout();
		$data = $this->validateRet($res);
		unset(self::$ut_data->empLoginData);
	}

	function genCode($phone)
	{
		$res = self::$obj->callSvr("genCode", ["phone"=>$phone, "type"=>"d6", "debug"=>1]);
		$data = $this->validateRetAsObj($res, ["code"]);
		$this->assertTrue(preg_match('/^\d{6}$/', $data->code) != 0);
		return $data->code;
	}

	function adminLogin()
	{
		$this->setApp("admin");
		if (isset(self::$ut_data->adminLoginData))
			return self::$ut_data->adminLoginData;

		$this->isCritical = true;
		$res = self::$obj->login(self::ADMIN_USER, self::ADMIN_PWD);
		$data = $this->validateRetAsObj($res, ["id", "_token", "_expire"]);
		self::$ut_data->adminLoginData = $data;
		return $data;
	}

	function adminLogout()
	{
		if (! isset(self::$ut_data->adminLoginData))
			return;

		$res = self::$obj->logout();
		$data = $this->validateRet($res);
		unset(self::$ut_data->adminLoginData);
	}

	// return: orderId
	function genOrder()
	{
		$app = $this->getApp();
		$loginData = $this->userLogin(); // change app to 'user'
		$order = [
			"dscr" => "上门洗车",
			"cmt" => "rtest-order",
			];
		$res = self::$obj->callSvr("Ordr.add", null, $order);
		$data = $this->validateRet($res);
		$orderId = $data;
		if ($app != $this->getApp())
			$this->setApp($app);
		return $orderId;
	}
	#}}}

###### unit test cases (sanity test) {{{

	#### APP user {{{

	# as the first test
	function testErrorProc()
	{
		$this->isCritical = true;

		# check login in the first case. ignore all others if failed.
		if (getenv("P_SHARE_COOKIE")) {
			$this->userLogin();
		}
		# param error: invalid functon
		$res = self::$obj->callSvr("methodxx", ["storeId" => 100]);
		$data = $this->validateRet($res, E_PARAM);
	}

	function testGenCode()
	{
		// =======================
		addCaseLog("type=d6"); 
		$phone = self::USER;
		$this->genCode($phone);

		// =======================
		addCaseLog("type=w4"); 
		$res = self::$obj->callSvr("genCode", ["phone"=>$phone, "type"=>"w4", "debug"=>1]);
		$data = $this->validateRetAsObj($res, ["code"]);
		$this->assertTrue(preg_match('/^\w{4}$/', $data->code) != 0);
	}
	
	// return: userId
	function testReg()
	{
		if ($this->skipForShareCookie())
			return;

		$this->isCritical = true;

		$phone = self::USER;
		$this->delUser($phone);

		$code = $this->genCode($phone);
		$res = self::$obj->callSvr("login", ["uname"=> self::USER, "code"=>$code, "wantAll"=>1]);
		$data = $this->validateRetAsObj($res, ["id", "_token", "_expire", "_isNew", "createTm", "name"]); // wantAll返回多字段

		$this->assertInternalType('int', $data->id);
		$this->assertEquals(1, $data->_isNew);

		$this->assertNotNull($data->_token);
		$this->assertNotNull($data->_expire);

		$this->assertNotNull($data->createTm);
		$this->assertNotNull($data->name);

		return $data->id;
	}

	/**
	 * @depends testReg
	 */
	function testChpwdAfterReg($userId)
	{
		// =======================
		addCaseLog("新用户修改密码"); 
		$res = self::$obj->callSvr("chpwd", ["oldpwd"=> "_none", "pwd"=> self::PWD]);
		$data = $this->validateRet($res);

		// =======================
		addCaseLog("超过1小时不能直接修改密码"); 
		$dt = date('c', time()-T_HOUR-10);
		$this->execSql("UPDATE User SET createTm='{$dt}' WHERE id={$userId}");
		$res = self::$obj->callSvr("chpwd", ["oldpwd"=> "_none", "pwd"=> self::PWD]);
		$data = $this->validateRet($res, E_AUTHFAIL);
	}
	
	function testLogin()
	{
		// =======================
		addCaseLog("用户名密码登录"); 
		$data = $this->userLogin();
		$token = $data->_token;
		$this->userLogout();

		// ========================
		addCaseLog("使用token登录"); 
		$res = self::$obj->callSvr("login", ["token"=>$token]);
		$data = $this->validateRetAsObj($res, ["id"]);
		$this->userLogout();
	}

	// change pwd twice to keep the old pwd
	function testChpwd()
	{
		if ($this->skipForShareCookie())
			return;
		$this->userLogin();

		// ========================
		addCaseLog("使用错误的oldpwd"); 
		$res = self::$obj->callSvr("chpwd", ["oldpwd"=>"????", "pwd"=>self::PWD]);
		$data = $this->validateRet($res, E_AUTHFAIL);

		// ========================
		addCaseLog("使用oldpwd"); 
		$res = self::$obj->callSvr("chpwd", ["oldpwd"=>self::PWD, "pwd"=>self::PWD]);
		$data = $this->validateRetAsObj($res, ["_token", "_expire"]);

		// ========================
		addCaseLog("使用code"); 
		$code = $this->genCode(self::USER);
		$res = self::$obj->callSvr("chpwd", ["code"=>$code, "pwd"=>self::PWD]);
		$data = $this->validateRet($res);
	}

	// return: {id, thumbId} for photo attachment
	function uploadPic()
	{
		if (! @self::$ut_data->uploadPic_)
		{
			$file = "testdata/1.jpg";
			$res = self::$obj->upload($file, null, "user", true);
			$data = $this->validateRetAsObjArray($res, ["id", "thumbId"]);
			$this->assertCount(1, $data);

			self::$ut_data->uploadPic_ = $data[0];
		}

		return self::$ut_data->uploadPic_;
	}

	function testUpload()
	{
		$this->userLogin();

		$file1 = "testdata/1.txt";
		$file2 = "testdata/1.jpg";
		$file3 = "testdata/1.jpg.b64";

		// ========================
		addCaseLog("上传一张图片");
		$this->uploadPic();

		// ========================
		addCaseLog("上传两个文件");
		$res = self::$obj->upload($file1, $file2);
		$data = $this->validateRetAsObjArray($res, ["id"]);
		$this->assertCount(2, $data, "*** upload 2 files should return array of 2 elements");

		// ========================
		addCaseLog("upload raw");
		$res = self::$obj->callSvr("upload", ["fmt"=>"raw", "f"=>$file1], "@" . $file1);
		$data = $this->validateRetAsObjArray($res, ["id"]);
		$this->assertCount(1, $data);

		// ========================
		addCaseLog("upload raw_b64");
		$exif = sprintf('{"test":1, "date":"%s"}', date('c'));
		$res = self::$obj->callSvr("upload", ["fmt"=>"raw_b64", "f"=>'xxx.jpg', "type"=>"user", "genThumb"=>true, "exif"=>$exif], "@" . $file3);
		$data = $this->validateRetAsObjArray($res, ["id", "thumbId"]);
		$this->assertCount(1, $data);
	}

	function testAtt()
	{
		$this->userLogin();
		$picInfo = $this->uploadPic();

		@mkdir("tmp");
		list($f1, $f2, $f3) = ["tmp/1.jpg", "tmp/2.jpg", "tmp/3.jpg"];

		// ========================
		addCaseLog("get non-existent pic");
		$res = self::$obj->att(9999999, null, $f1);
		$this->assertEquals(404, $res->code);

		// ========================
		addCaseLog("get original pic");
		$res = self::$obj->att($picInfo->id, null, $f1);
		$this->assertEquals(200, $res->code);
		$this->assertEquals("image/jpeg", $res->getHeader("Content-Type"));

		// ========================
		addCaseLog("get thumb pic");
		$res = self::$obj->att($picInfo->thumbId, null, $f2);
		$this->assertEquals(200, $res->code);
		$this->assertEquals("image/jpeg", $res->getHeader("Content-Type"));

		// ========================
		addCaseLog("get orignal pic via thumbId");
		$res = self::$obj->att(null, $picInfo->thumbId, $f3);
		$this->assertEquals(200, $res->code);
		$this->assertEquals("image/jpeg", $res->getHeader("Content-Type"));

		$this->assertEquals(filesize($f1), filesize($f3), "*** orignal pic ($f1) != att(thumbId) ($f3)");
	}

	function testUser()
	{
		$this->userLogin();

		$obj = "User";
		// ========================
		addCaseLog("add/del/query");
		$this->validateForbiddenAc(["add", "del", "query"], $obj);

		// ========================
		addCaseLog("set");
		$name = "testuser " . rand();
		$pwd = "newPwd";
		$res = self::$obj->callSvr("User.set", null, ["name"=>$name, "pwd"=>$pwd]);
		$data = $this->validateRet($res);

		// ========================
		addCaseLog("get and validate");
		$res = self::$obj->callSvr("User.get");
		$data = $this->validateRetAsObj($res, ["id", "name", "phone"]);
		$this->assertFalse(isset($data->pwd), "pwd shall NOT be returned");
		$this->assertEquals($name, $data->name);

		try {
			$this->userLogin();
		}
		catch (Exception $e) {
			$this->assertFalse("*** pwd should NOT been set");
		}
	}

	function testOrder()
	{
		$loginData = $this->userLogin(); // change app to 'user'
		$orderId = $this->genOrder();

		$res = self::$obj->callSvr("Ordr.get", ["id"=>$orderId]);
		$data = $this->validateRetAsObj($res, ["id", "userId", "orderLog", "atts"]);
		$this->assertEquals($loginData->id, $data->userId);
		$this->assertEquals('CR', $data->status);
		$this->assertCount(1, $data->orderLog, "应有1条日志: CR");
		$this->assertEquals('CR', $data->orderLog[0]->action);
	}
	#}}}

	#### APP emp {{{

	function testOrder_emp()
	{
		$this->empLogin();
		$obj = "Ordr";

		addCaseLog("forbidden actions");
		$this->validateForbiddenAc(["add", "del"], $obj);


		$orderId = $this->genOrder();
		$res = self::$obj->callSvr("Ordr.get", ["id"=>$orderId]);
		$data = $this->validateRetAsObj($res, ["id", "userId", "orderLog", "atts"]);

		// 修改订单状态为完成
		$res = self::$obj->callSvr("Ordr.set", ["id"=>$orderId], ["status"=>"RE"]);
		$data = $this->validateRet($res);
		// 检查订单状态
		$res = self::$obj->callSvr("Ordr.get", ["id"=>$orderId, "res"=>"status, orderLog"]);
		$data = $this->validateRetAsObj($res, ["status"]);
		$this->assertEquals("RE", $data->status);
		$this->assertCount(2, $data->orderLog, "应有2条日志: CR, RE");
		$this->assertEquals('RE', $data->orderLog[1]->action);
	}

	#}}}

	#### APP admin {{{

	function testCRUD()
	{
		$this->adminLogin();
		# $this->markTestSkipped('TODO: general CRUD');

		# 对Employee对象的CRUD
		# @Employee: id, uname, phone(s), pwd, name(s), perms
		$uname = "rtest-1";
		$phone = "13799999999";
		$name = "rtest name 1";

		// =======================
		addStepLog("admin: add"); 
		$res = self::$obj->callSvr("Employee.add", null, ["uname"=>$uname, "phone"=>$phone]);
		$empId = $this->validateRet($res);

		// =======================
		addStepLog("admin: query"); 
		$res = self::$obj->callSvr("Employee.query", ["cond" => "id={$empId} and uname='$uname'"]);
		$data = $this->validateRetAsTable($res, ["id", "uname", "phone"]);
		$this->assertCount(1, $data);
		$this->assertEquals($phone, $data[0]->phone);

		// =======================
		addStepLog("admin: set"); 
		$res = self::$obj->callSvr("Employee.set", ["id" => $empId], ["name"=>$name]);
		$data = $this->validateRet($res);

		// =======================
		addStepLog("admin: get"); 
		$res = self::$obj->callSvr("Employee.get", ["id" => $empId, "res"=>"name"]);
		$data = $this->validateRetAsObj($res, ["name"]);
		$this->assertEquals($name, $data->name);

		// =======================
		addStepLog("admin: del"); 
		$res = self::$obj->callSvr("Employee.del", ["id" => $empId]);
		$data = $this->validateRet($res);

		$res = self::$obj->callSvr("Employee.get", ["id" => $empId]);
		$data = $this->validateRet($res, E_PARAM, "用户应已被删除");
	}
	#}}}

	#### other pages {{{

	#}}}
#}}}

###### scenario test cases {{{
	function testBeginIT()
	{
		self::$isIT = true;
	}

#}}}
}

// vim: set foldmethod=marker :
?>
