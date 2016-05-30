<?php
require_once('WebAPI.php');

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

class WebAPITestBase extends PHPUnit_Framework_TestCase
{
	# used for basic UT cases
	# !!! use static data, or else be reset after each case !!!
	static protected $obj;
	static protected $ut_data;

	static protected $isIT =false;
	protected $isCritical = false; # auto reset by phpunit after each test

	# !!! dont use __construct to prepare the fixture in test case class !!!
# 	function __construct()
	static function setUpBeforeClass()
	{
		putenv("P_TEST=2"); // rtest mode
		self::$obj = new WebAPI();
		self::$ut_data = new stdclass();
		if (! getenv("P_SHARE_COOKIE") && file_exists(self::$obj->cookieFile))
			unlink(self::$obj->cookieFile);
#		self::$obj->markInitDB();
	}

	### skip all if critical case fails; skip integration cases if any sanity case fails {{{
	static private $skipIT = false;
	static private $skipAll = false;
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
		$this->assertTrue(is_array($ret) && count($ret)>=2, '*** Ret format should be [code, data, ...]');
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

	protected function getApp()
	{
		return getenv("P_APP") ?: "";
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
	protected function skipForShareCookie()
	{
		if (getenv("P_SHARE_COOKIE"))
		{
			$this->markTestSkipped('Skip test for P_SHARE_COOKIE mode');
			return true;
		}
		return false;
	}
#}}}
}

// vim: set foldmethod=marker :
?>
