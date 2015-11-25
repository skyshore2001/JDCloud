<?php
require_once('WebAPI.php');

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

function addLog($str)
{
	$LOG_FILE = "rtest.log";
	file_put_contents($LOG_FILE, $str, FILE_APPEND);
}

function addStepLog($dscr)
{
	addLog("=== Step: $dscr ===\n");
}
function addCaseLog($dscr)
{
	addLog("=== Case: $dscr ===\n\n");
}

class WebAPITest extends PHPUnit_Framework_TestCase
{
	static protected $obj;

	# !!! dont use __construct to prepare the fixture in test case class !!!
# 	function __construct()
	static function setUpBeforeClass()
	{
		putenv("P_TEST=2"); // rtest mode
		self::$obj = new WebAPI();
		if (! getenv("P_SHARE_COOKIE") && file_exists(self::$obj->cookieFile))
			unlink(self::$obj->cookieFile);
#		self::$obj->markInitDB();
	}

	### skip all if critical case fails; skip integration cases if any sanity case fails {{{
	static private $isIT =false;
	static private $skipIT = false;
	static private $skipAll = false;
	private $isCritical = false; # auto reset by phpunit after each test
	function setUp()
	{
		addLog("\n\n====== Testcase: " . $this->getName() . " ======\n\n");
		if (self::$skipAll) {
			$this->markTestSkipped('Skip all as critical case fails.');
		}
		if (self::$isIT && self::$skipIT) {
			$this->markTestSkipped('Skip scenario test as sanity case fails.');
		}
	}
    protected function onNotSuccessfulTest(Exception $e)
    {
		if ($this->getStatus() != PHPUnit_Runner_BaseTestRunner::STATUS_SKIPPED)
		{
			if ($this->isCritical)
				self::$skipAll = true;
			if (! self::$isIT) {
				self::$skipIT = true;
			}
		}
        parent::onNotSuccessfulTest($e);
    }
	#}}}

###### generic functions {{{
	protected function errCode($eno)
	{
	}
	# for "SELECT", return recordset (array of objects); for other SQLs, return affectedRows
	protected function execSql($sql, $wantArrOrId = null)
	{
		$fmt = null;
		$wantId = false;
		if ($wantArrOrId) {
			$fmt = "array";
			$wantId = true;
		}
		$res = self::$obj->execSql($sql, $fmt, $wantId);
		$data = $this->validateRet($res);
		return $data;
	}
	// $name = queryOne("SELECT name FROM ..."); // $name === false means no record.
	// $row = queryOne("SELECT name, balance FROM ..."); // $row===false means no record; 
	// list($name, $balance) = $row;
	// list($name, $balance) = queryOne("SELECT name, balance FROM ..."); // is_null($name) means no record.
	protected function queryOne($sql)
	{
		$data = $this->execSql($sql, true);
		if (count($data) == 0)
			return false;
		// 只有一列，直接返回首行首列
		if (count($data[0]) == 1)
			return $data[0][0];
		// 多列，返回首行
		return $data[0];
	}

	protected function table2ObjArray($tbl)
	{
		$ret = [];
		if (count($tbl->d) == 0)
			return $ret;
		foreach ($tbl->d as $d) {
			$ret[] = (object)array_combine($tbl->h, $d);
		}
		return $ret;
	}

	# ret: the data
	protected function validateRet($res, $retcode = 0)
	{
		$this->assertEquals(200, $res->code);
 		$ret = json_decode($res->body);
#		$ret = json_decode("hehe\r\n" . $res->body);
		$this->assertTrue(is_array($ret) && count($ret)>=2, '*** Ret should be [code, data, ...]');
		$this->assertTrue(is_int($ret[0]), '*** require integer retcode');

		$this->assertEquals($retcode, $ret[0], '*** unexpected retcode: get ' . retCode($ret[0]) . ', expect ' . retCode($retcode));
		return $ret[1];
	}
	protected function validateRetAsTable($res, $tableHeader)
	{
		$data = $this->validateRet($res);
		$this->assertTrue(is_object($data) && property_exists($data, 'h') && property_exists($data, 'd'), '*** Invalid table format');
		$this->assertTrue(is_array($data->h) && is_array($data->d));
		if (count($data->d) > 0) {
			foreach ($tableHeader as $col) {
				$this->assertContains($col, $data->h, "*** missing column $col");
			}
			$colCnt = count($data->h);
			foreach ($data->d as $row) {
				$this->assertCount($colCnt, $row);
			}
		}
		return $this->table2ObjArray($data);
	}
	protected function validateRetAsNull($res)
	{
		$data = $this->validateRet($res);
		$this->assertTrue($data === false);
	}
	protected function validateRetAsObj($res, $props)
	{
		$data = $this->validateRet($res);
		$this->assertTrue(is_object($data));
		foreach ($props as $prop) {
			$this->assertTrue(property_exists($data, $prop), "*** missing property '$prop'");
		}
		return $data;
	}
	protected function assertObj($obj, $props)
	{
		$this->assertTrue(is_object($obj), "*** require is_object");
		foreach ($props as $prop) {
			$this->assertTrue(property_exists($obj, $prop), "*** missing property '$prop'");
		}
	}
	protected function assertObjArray($data, $props)
	{
		$this->assertTrue(is_array($data), "*** require an object array");
		foreach ($data as $row) {
			$this->assertObj($row, $props);
		}
	}
	protected function validateRetAsObjArray($res, $props)
	{
		$data = $this->validateRet($res);
		$this->assertObjArray($data, $props);
		return $data;
	}

	protected function setApp($app)
	{
		putenv("P_APP=" . $app);
	}

	protected function validateForbiddenAc($acList, $obj)
	{
		foreach ($acList as $ac) {
			$res = self::$obj->callSvr("$obj.$ac");
			$data = $this->validateRet($res, E_FORBIDDEN);
		}
	}
#}}}

	###### shared functions {{{
	#}}}

###### unit test cases (sanity test) {{{

	#### No login {{{

	# used for basic UT cases
	# !!! use static data, or else be reset after each case !!!
	static private $ut_data = [];

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
		$res = self::$obj->callSvr("methodxx", ["store_id" => 100]);
		$data = $this->validateRet($res, E_PARAM);

		# param error: missing param 'brand_id'
		$res = self::$obj->callSvr("queryseries"); 
		$data = $this->validateRet($res, E_PARAM);
	}
	# }}}

	#### APP admin {{{
	function testAdminLogin()
	{
		$this->isCritical = true;

		$this->setApp("admin");
		addCaseLog("wrong login");
		$res = self::$obj->login("xxx", self::PWD);
		$data = $this->validateRet($res, E_AUTHFAIL);

		addCaseLog("correct login");
		$res = self::$obj->login(self::ADMIN_USER, self::ADMIN_PWD);
		$data = $this->validateRetAsObj($res, ["adminId"]);
		$adminId = $data->adminId;

		$res = self::$obj->whoami();
		$data = $this->validateRetAsObj($res, ["adminId"]);
		$this->assertEquals($adminId, $data->adminId);

		$res = self::$obj->logout();
		$data = $this->validateRet($res, 0);
	}
	#}}}

	#}}}

	#### After user login {{{
	function userLogin()
	{
		$this->setApp("");
		if (isset(self::$uid))
			return;
		$this->isCritical = true;

		if (getenv("P_SHARE_COOKIE")) {
			$res = self::$obj->whoami();
			$data = $this->validateRetAsObj($res, ["uid"]);
			self::$uid = $data->uid;
			return;
		}
		# find a test phone
		if (is_null(self::$phone))
		{
			$sql = "SELECT phone FROM User WHERE phone like '199%' and pwd='" . md5(self::PWD) . "' LIMIT 1";
			$data = $this->execSql($sql, true);
			$this->assertTrue(count($data) > 0, "*** no test user, run testRegAndLogin to create use reg");
			self::$phone = $data[0][0];
		}

		$res = self::$obj->login(self::$phone, self::PWD);
		$data = $this->validateRetAsObj($res, ["uid"]);
		self::$uid = $data->uid;
	}
	function userLogout()
	{
		if (! isset(self::$userId))
			return;
		$res = self::$obj->logout();
		$data = $this->validateRet($res);
		self::$userId = null;
	}

	// change pwd twice to keep the old pwd
	function testChpwd()
	{
		if ($this->skipForShareCookie())
			return;
		$this->userLogin();
		$newpwd = "1234567xx";

		addCaseLog("bad chpwd: require `oldpwd` or `code`");
		$res = self::$obj->chpwd($newpwd);
		$data = $this->validateRet($res, E_PARAM);

		addCaseLog("chpwd using oldpwd");
		$res = self::$obj->chpwd($newpwd, self::PWD);
		$data = $this->validateRet($res);
		$res = self::$obj->login(self::$phone, $newpwd);
		$data = $this->validateRetAsObj($res, ["uid"]);

		addCaseLog("bad oldpwd");
		$res = self::$obj->chpwd(self::PWD, "xxxxx");
		$data = $this->validateRet($res, E_AUTHFAIL);

		addCaseLog("chpwd again (restore original) using code");
		$res = self::$obj->genCode(self::$phone, null, 'debug');
		$data = $this->validateRetAsObj($res, ["code"]);
		$code = $data->code;

		$res = self::$obj->chpwd(self::PWD, null, $code);
		$data = $this->validateRet($res);

		$res = self::$obj->login(self::$phone, self::PWD);
		$data = $this->validateRetAsObj($res, ["uid"]);

		addCaseLog("chpwd using bad code (code expires)");
		$res = self::$obj->chpwd(self::PWD, null, $code);
		$data = $this->validateRet($res, E_FORBIDDEN);

		addCaseLog("chpwd using special code to skip validation ");
		$res = self::$obj->chpwd(self::PWD, null, '080909');
		$data = $this->validateRet($res);
	}

	# return {id, thumbId} for photo attachment
	function testUpload()
	{
		$this->userLogin();

		$file1 = "testdata/1.txt";
		$file2 = "testdata/1.jpg";
		$file3 = "testdata/1.jpg.b64";

		addCaseLog("upload 2 files with different type");
		$res = self::$obj->upload($file1, $file2);
		$data = $this->validateRetAsObjArray($res, ["id"]);
		$this->assertCount(2, $data, "*** upload 2 files should return array of 2 elements");
		$ret[] = $data[0]->id;

		addCaseLog("upload user photo");
		$res = self::$obj->upload($file2, null, "user", true);
		$data = $this->validateRetAsObjArray($res, ["id", "thumbId"]);
		$this->assertCount(1, $data);

		$ret = $data[0];

		addCaseLog("upload raw");
		$res = self::$obj->callSvr("upload", ["fmt"=>"raw", "f"=>$file1], "@" . $file1);
		$data = $this->validateRetAsObjArray($res, ["id"]);
		$this->assertCount(1, $data);

		addCaseLog("upload raw_b64");
		$exif = sprintf('{"test":1, "date":"%s"}', date('c'));
		$res = self::$obj->callSvr("upload", ["fmt"=>"raw_b64", "f"=>'xxx.jpg', "type"=>"user", "genThumb"=>true, "exif"=>$exif], "@" . $file3);
		$data = $this->validateRetAsObjArray($res, ["id", "thumbId"]);
		$this->assertCount(1, $data);

		return $ret;
	}

	/**
	 * @depends testUpload
	 */
	function testAtt($picInfo)
	{
		@mkdir("tmp");
		list($f1, $f2, $f3) = ["tmp/1.jpg", "tmp/2.jpg", "tmp/3.jpg"];

		addCaseLog("get non-existent pic");
		$res = self::$obj->att(9999999, null, $f1);
		$this->assertEquals(404, $res->code);

		addCaseLog("get orignal pic");
		$res = self::$obj->att($picInfo->id, null, $f1);
		$this->assertEquals(200, $res->code);
		$this->assertEquals("image/jpeg", $res->getHeader("Content-Type"));

		addCaseLog("get thumb pic");
		$res = self::$obj->att($picInfo->thumbId, null, $f2);
		$this->assertEquals(200, $res->code);
		$this->assertEquals("image/jpeg", $res->getHeader("Content-Type"));

		addCaseLog("get orignal pic via thumbId");
		$res = self::$obj->att(null, $picInfo->thumbId, $f3);
		$this->assertEquals(200, $res->code);
		$this->assertEquals("image/jpeg", $res->getHeader("Content-Type"));

		$this->assertEquals(filesize($f1), filesize($f3), "*** orignal pic ($f1) != att(thumbId) ($f3)");
	}

	function testUserObj()
	{
		$this->userLogin();

		$obj = "User";
		addCaseLog("add/del");
		$this->validateForbiddenAc(["add", "del"], $obj);

		addCaseLog("get");
		$res = self::$obj->callSvr("User.get");
		$data = $this->validateRetAsObj($res, ["name", "phone", "credit", "picId"]);
		$this->assertTrue(isset($data->id));
		$this->assertFalse(isset($data->pwd), "pwd shall NOT be returned");
		$orgCredit = $data->credit;
		$orgPicId = $data->picId;

		addCaseLog("set");
		$newCredit = ($orgCredit?:0) + 100;
		$newPicId = 1000000 + ($orgPicId?:0);
		$newPwd = "9999";
		$res = self::$obj->callSvr("User.set", null, ["picId"=>$newPicId, "credit"=>$newCredit, "pwd"=>$newPwd]);
		$data = $this->validateRet($res, 0);

		$data = $this->execSql("SELECT credit, pwd, picId FROM User WHERE Id=" . self::$uid);
		$this->assertEquals($orgCredit, $data[0]->credit, "*** credit should NOT been set");
		$this->assertTrue($newPwd != $data[0]->pwd, "*** pwd should NOT been set");
		$this->assertEquals($data[0]->picId, $newPicId);

		# restore picId
		$res = self::$obj->callSvr("User.set", null, ["picId"=> (isset($orgPicId)? $orgPicId: "null") ]);
		$data = $this->execSql("SELECT picId FROM User WHERE Id=" . self::$uid);
		$this->assertEquals($orgPicId, $data[0]->picId, "*** picId should be set to null");
	}
	#}}}

	#### After admin login {{{

	function adminLogin()
	{
		$this->setApp("admin");
		if (isset(self::$adminId))
			return;
		$this->isCritical = true;
		$res = self::$obj->login(self::ADMIN_USER, self::ADMIN_PWD, 'admin');
		$data = $this->validateRetAsObj($res, ["adminId"]);
		self::$adminId = $data->adminId;
	}

	function adminLogout()
	{
		if (! isset(self::$adminId))
			return;
		$res = self::$obj->logout('admin');
		$data = $this->validateRet($res);
		self::$adminId = null;
	}

	function testCRUD()
	{
		$this->adminLogin();
		$obj = "Store";
		$fields = ["name" => "华莹汽车(张江店)", "addr" => "金科路88号", "tel" => "021-12345678"];
		$fields1 = ["name" => "华莹汽车(张江高科店)", "dscr" => "新店开张, 优惠多多!"];

		# add: use HTTP POST
		$res = self::$obj->callSvr("$obj.add", null, $fields);
		$data = $this->validateRet($res);
		$this->assertTrue(is_int($data), "*** require id returned");
		$id = $data;

		# get
		$res = self::$obj->callSvr("$obj.get", ["id"=>$id]);
		$data = $this->validateRetAsObj($res, array_merge(["id"], array_keys($fields)));
		$this->assertEquals($id, $data->id);
		$this->assertEquals($fields["name"], $data->name);

		# set
		$res = self::$obj->callSvr("$obj.set", ["id"=>$id], $fields1);
		$data = $this->validateRet($res);

		# get 
		$res = self::$obj->callSvr("$obj.get", ["id"=>$id]);
		$data = $this->validateRetAsObj($res, array_merge(["id"], array_keys($fields), array_keys($fields1)));
		$this->assertEquals($id, $data->id);
		$this->assertEquals($fields1["name"], $data->name);
		$this->assertEquals($fields1["dscr"], $data->dscr);

		# query
		$res = self::$obj->callSvr("$obj.query", null, ["res"=>"id,name,addr", "cond"=>"id=$id and addr like '%金科路%'"]);
		$data = $this->validateRetAsTable($res, ["id", "name", "addr"]);
		$this->assertCount(1, $data);
		$this->assertEquals($id, $data[0]->id);
		$this->assertEquals($fields1["name"], $data[0]->name);

		# del
		$res = self::$obj->callSvr("$obj.del", ["id"=>$id]);
		$data = $this->validateRet($res);

		# get/set/del after del
		foreach (["get", "del"] as $ac) {
			$res = self::$obj->callSvr("$obj.$ac", ["id"=>$id]);
			$data = $this->validateRet($res, E_PARAM);
		}

 		# dont affect other tests
		$this->adminLogout();
	}
	#}}}

	#### After emp login {{{

	// 自营店登录
	function storeLogin()
	{
		$this->setApp("store");
		if (isset(self::$storeId))
			return;
		$this->isCritical = true;

		$empId = $this->getEmpId(); // create emp if necessary.
		$res = self::$obj->login(self::EMP_USER, self::PWD, 'store');
		$data = $this->validateRetAsObj($res, ["empId", "storeId"], "*** Store login fail!");
		$this->assertEquals($empId, $data->empId);
		$this->assertEquals(self::ASTORE_ID, $data->storeId);
		self::$storeId = $data->storeId;
	}

	function storeLogout()
	{
		if (! isset(self::$storeId))
			return;
		$res = self::$obj->logout('store');
		$data = $this->validateRet($res);
		self::$storeId = null;
	}

	function testStore()
	{
		$this->storeLogin();
		$obj = "Store";

		addCaseLog("forbidden actions");
		$this->validateForbiddenAc(["del"], $obj);

		// TODO: check add/set/query/get
# 		addCaseLog("query");
# 		$res = self::$obj->callSvr("$obj.query");
# 		$data = $this->validateRetAsTable($res, ["id", "name", "uname"]);
# 		$this->assertCount(1, $data);
# 		$this->assertEquals(self::$storeId, $data[0]->id);
# 		$this->assertTrue(!property_exists($data[0], "pwd"), "*** return should NOT contain 'pwd'");
# 
# 		addCaseLog("get and check previous set action");
# 		$res = self::$obj->callSvr("$obj.get");
# 		$data = $this->validateRetAsObj($res, ["id", "name", "uname"]);
# 		$this->assertEquals($tel, $data->tel);
# 		$this->assertEquals(self::$storeId, $data->id);
# 		$this->assertEquals(self::STORE_USER, $data->uname);
	}

	#}}}

	#### other pages {{{
	function testHotline()
	{
		addCaseLog("query");
		$res = self::$obj->callSvr("info/hotline.php", ["q"=>"大众"]);
		$data = $this->validateRet($res);
		$this->assertTrue(is_array($data) && count($data) > 0);

		# info/hotline.php?q={brandName} -> [品牌, 客服电话, 道路救援电话]
		$this->assertTrue(is_array($data[0]) && count($data[0]) == 3);

		addCaseLog("get page");
		$res = self::$obj->callSvr("info/hotline.php", null, null, ["outputFile"=>"1.html"]);
		$this->assertEquals(200, $res->code);
	}

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
