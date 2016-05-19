<?php

require_once(dirname(__FILE__) . "/../server/app.php");

###### config {{{
$METAFILE = getenv("P_METAFILE") ?: dirname(__FILE__) . '/../DESIGN.wiki';
$LOGF = "upgrade.log";

$CHAR_SZ = [
	's' => 20,
	'm' => 50,
	'l' => 255 
];

$SQLDIFF = [
	"NTEXT" => $USE_MYSQL? "TEXT CHARACTER SET utf8": "NTEXT",
	"AUTO_INCREMENT" => $USE_MYSQL? 'AUTO_INCREMENT': 'AUTOINCREMENT',
	"MONEY" => $USE_MYSQL? "DECIMAL(19,4)": "MONEY",
	"CREATE_OPT" => $USE_MYSQL? "DEFAULT CHARSET=utf8": ""
];
#}}}

###### functions {{{
function tableExists($dbh, $tbl)
{
	global $USE_MYSQL;
	# SQLITE: select count(*) from sqlite_master where type='table' and name=?
	# MYSQL: show tables like '{name}'
	if ($USE_MYSQL) {
		$sth = $dbh->query("show tables like '$tbl'");
		return $sth->fetch() !== false;
	}
	else {
		$sth = $dbh->query("select count(*) from sqlite_master where type='table' and name like '$tbl'"); # use "like" rather than "=" to ignore case
		$n = $sth->fetchColumn();
		return $n > 0;
	}
	return false;
}

function genColSql($fieldDef)
{
	global $CHAR_SZ, $SQLDIFF;
	$f = $fieldDef;
	$def = '';
	if ($f == 'id') {
		$def = "INTEGER PRIMARY KEY " . $SQLDIFF['AUTO_INCREMENT'];
	}
	elseif (preg_match('/\((\w+)\)$/', $f, $ms)) {
		$tag = $ms[1];
		$f = preg_replace('/\((\w+)\)$/', '', $f);
		if ($tag == 't') {
			$def = $SQLDIFF["NTEXT"];
		}
		elseif ($tag == 's' || $tag == 'm' || $tag == 'l') {
			$def = "NVARCHAR(" . $CHAR_SZ[$tag] . ")";
		}
		elseif (is_numeric($tag)) {
			$def = "NVARCHAR($tag)";
		}
		else {
			die("unknown type of string fields");
		}
	}
	elseif (preg_match('/@$/', $f, $ms)) {
		$f = substr_replace($f, "", -1);
		$def = $SQLDIFF["MONEY"];
	}
	elseif (preg_match('/(Price|Qty|Total|Amount)$/', $f, $ms) || ($f == "price" || $f == "qty" || $f == "total" || $f == "amount")) {
		$def = $SQLDIFF["MONEY"];
	}
	elseif (preg_match('/(&|Id)$/', $f, $ms)) {
		if ($ms[1] == '&') {
			$f = substr_replace($f, "", -1);
		}
		$def = "INTEGER";
	}
	elseif (preg_match('/#$/', $f)) {
		$f = substr_replace($f, "", -1);
		$def = "REAL";
	}
	elseif (preg_match('/Tm$/', $f) || $f == "tm") {
		$def = "DATETIME";
	}
	elseif (preg_match('/Flag$/', $f)) {
		$def = "TINYINT UNSIGNED NOT NULL DEFAULT 0";
	}
	elseif (preg_match('/^\w+$/', $f)) { # default
		$def = "NVARCHAR(" . $CHAR_SZ['m'] . ")";
	}
	else {
		die("unknown type of fields");
	}

# 		# !!! fix some name that conflicts with reserved words
# 		if ($f == 'desc') {
# 			$f .= '1';
# 		}
	return "$f $def";
}

# ret: $sql
function genSql($meta)
{
	global $SQLDIFF;
	$sql = "CREATE TABLE {$meta['name']} (";
	$n = 0;
	foreach ($meta["fields"] as $f) {
		if (++$n > 1) {
			$sql .= ", ";
		}
		$sql .= genColSql($f);
	}
	$sql .= ") " . $SQLDIFF["CREATE_OPT"] . ";\n";
	return $sql;
}

function logstr($s, $show=true)
{
	if ($show) {
		echo $s;
	}
	global $LOGF;
	$fp = fopen($LOGF, "a");
	fputs($fp, $s);
	fclose($fp);
}

function sval($v)
{
	if (is_null($v))
		return "null";
	else if (is_bool($v))
		return $v? "true": "false";
	return $v;
}

function showMethod($m, $keyword=null)
{
	$name = strtolower($m->getName());
	if ($keyword && strstr($name, $keyword) === false) {
		return;
	}
	print("  $name(");
	$first = true;
	foreach ($m->getParameters() as $param) {
		if ($first)
			$first = false;
		else
			echo(", ");
		if ($param->isOptional())
			printf("%s=%s", $param->getName(), sval($param->getDefaultValue()));
		else
			printf("%s", $param->getName());
	}
	print ")\n";
}

function showMethods($cls, $keyword = null)
{
	if ($keyword) {
		$keyword = strtolower($keyword);
	}
	echo "Available method: \n";
	$cls = new ReflectionClass($cls);
	foreach ($cls->getMethods() as $m) {
		$doc = $m->getDocComment();
		if ($doc !== false && strstr($doc, "@api") !== false) {
			showMethod($m, $keyword);
		}
	}
}

function print_rs($rs)
{
	if (count($rs) == 0) {
		echo "!!! Empty recordset !!!\n";
		return;
	}
	$n = 1;
	echo("[0] |");
	foreach (array_keys($rs[0]) as $e) {
		echo " $n:$e |";
		++$n;
	}
	echo "\n=====================\n";
	$n = 1;
	foreach ($rs as $row) {
		print("[$n] | ");
		++ $n;
		$i = 1;
		foreach ($row as $e) {
			if (is_null($e))
				$e = "(null)";
			elseif (! (is_int($e) || is_float($e)))
				$e = "'$e'";
			echo(" $i:$e |");
			++ $i;
		}
		echo("\n");
	}
}
#}}}

class UpgHelper
{
	private $tableMeta = []; # {name, fields}
	private $ver = 0;
	private $dbver = 0;
	private $dbh = null;
	private $forRtest = null;

	function __construct ($forRtest=false) {
		$this->forRtest = $forRtest;
		$this->_init();
	}
	function __destruct () {
		global $LOGF;
		logstr("=== [" . date('c') . "] done\n", false);
		if (! $this->forRtest)
			echo "=== Done! Find log in $LOGF\n";
	}

	# init meta and DB conn
	private function _initMeta()
	{
		global $METAFILE;
		$file = $METAFILE;
		//$file = iconv("utf-8", "gbk", $METAFILE); // for OS windows
		$fd = fopen($file, "r");
		if ($fd === false)
			throw new Exception("*** cannot read meta file $METAFILE");

		while (($s = fgets($fd)) !== false) {
			if (preg_match('/^@(\w+):\s+(\w.*?)\s*$/', $s, $ms)) {
				$this->tableMeta[] = ["name"=>$ms[1], "fields"=>preg_split('/\s*,\s*/', $ms[2])];
	# 			print "-- $_";
	# 			print genSql($tbl, $fields) . "\n";
			}
			elseif (preg_match('/^\@ver=(\d+)/', $s, $ms))
			{
				$this->ver = $ms[1];
			}
		}
		fclose($fd);
	}

	private function _init()
	{
		$this->_initMeta();
		$fnConfirm = null;
		if (!$this->forRtest) {
			$fnConfirm = function ($connstr) {
				echo "=== connect to $connstr (enter to cont, ctrl-c to break) ";
				fgets(STDIN);
				logstr("=== [" . date('c') . "] connect to $connstr\n", false);
				return true;
			};
		}
		$this->dbh = dbconn($fnConfirm);
		try {
			$sth = $this->dbh->query('SELECT ver FROM cinf');
			$this->dbver = $sth->fetchColumn();
		}
		catch (PDOException $e) {
			$this->dbver = 0;
		}
	}

	/** @api */
	function getVer()
	{
		return $this->ver;
	}

	/** @api */
	function getDBVer()
	{
		return $this->dbver;
	}

	/** @api */
	function initDB()
	{
		return $this->updateDB();
	}

	/** @api */
	function updateDB()
	{
		print "=== update DB\n"; 
		foreach ($this->tableMeta as $e) {
			$this->_addTableByMeta($e);
		}
	}

	/** @api */
	function showTable($tbl)
	{
		$found = false;
		foreach ($this->tableMeta as $meta) {
			if (strcasecmp($meta["name"], $tbl) != 0)
				continue;
			echo("-- {$meta['name']}: " . join(',', $meta['fields']) . "\n");
			$sql = genSql($meta);
			echo("$sql\n");
			$found = true;
			break;
		}
		if (!$found) {
			logstr("!!! cannot find table $tbl\n");
		}
	}

	private function _addColByMeta($tableName, $fieldMeta)
	{
		$sql = "ALTER TABLE $tableName ADD " . genColSql($fieldMeta);
		logstr("-- $sql\n");
		$rv = $this->dbh->exec($sql);
	}

	private function _addTableByMeta($tableMeta, $force = false)
	{
		$tbl = $tableMeta['name'];
		if (tableExists($this->dbh, $tbl))
		{
			if (!$force)
			{
				# check whether to add missing fields
				$rs = $this->execSql("SELECT * FROM (SELECT 1 AS id) t0 LEFT JOIN $tbl ON 1<>1", true);
				$row = $rs[0];
				$found = false;

				foreach ($tableMeta["fields"] as $f) {
					if (preg_match('/\w+/', $f, $ms)) {
						$fieldName = $ms[0];
						if (! array_key_exists($fieldName, $row)) {
							$found = true;
							$this->_addColByMeta($tbl, $f);
						}
					}
				}
				return $found;
			}
			$this->execSql("DROP TABLE $tbl");
		}
		logstr("-- {$tbl}: " . join(',', $tableMeta['fields']) . "\n");
		$sql = genSql($tableMeta);
		logstr("$sql\n");
		$this->dbh->exec($sql);
		return true;
	}

	/** @api */
	function addTable($tbl, $force = false)
	{
		$found = false;
		foreach ($this->tableMeta as $e) {
			if (strcasecmp($e["name"], $tbl) != 0)
				continue;
			if ($this->_addTableByMeta($e, $force) === false) {
				logstr("!!! ignore table $tbl\n");
			}
			$found = true;
			break;
		}
		if (!$found) {
			logstr("!!! cannot find table $tbl\n");
		}
	}

	/** @api */
	function execSql($s, $silent = false)
	{
		$rv = null;
		if (preg_match('/^\s*select/i', $s)) {
			$sth = $this->dbh->query($s);
			$rv = $sth->fetchAll(\PDO::FETCH_ASSOC);
			if (!$silent)
				print_rs($rv);
		}
		else {
			$rv = $this->dbh->exec($s);
			if (!$silent)
				echo "=== $rv records Affected.\n";
		}
		return $rv;
	}

	/** @api */
	function help($name = "")
	{
		showMethods(__CLASS__, $name);
	}

	/** @api */
	function quit()
	{
		exit;
	}

	/** @api */
	function clearTimerDBCache()
	{
		$this->execSql("DELETE FROM CarBrand2");
		$this->execSql("DELETE FROM CarSeries2");
		$this->execSql("DELETE FROM CarModel2");
	}

	# check main or sub table, return the function to add data.
	# return @fnAddData(arr)
	/*
	data like these:
	1. simple (main table)
		id	name
		1	小保养
	2. complex (with related table, but use ID)
		id	name	Svc_ItemType(ittId,svcId)
		1	小保养	1,2,6
	3. complex+ (with related table, but use non-ID)
		id	name	Svc_ItemType(ittId,svcId,ItemType.name)
		1	小保养	机油,机滤,小保养工时
	 */
	# extOpt: {curFieldIndex, extTable, extField, justCheck}
	private function checkTableByMeta ($table, $fields, $opt = null)
	{
		$justCheck = @$opt->justCheck;
		if (! preg_match('/^[a-z]\w*$/i', $fields[0])) {
			print("*** unknown fields `$fields[0]` for table `$table`!\n");
			return false;
		}
		# check table
		$foundTable = false;
		foreach ($this->tableMeta as $meta) {
			if ($meta["name"] == $table)
			{
				$foundTable = true;
				break;
			}
		}
		if (! $foundTable) {
			print("*** unknown table $table\n");
			return false;
		}

		if (! $justCheck)
		{
			# force to create table
			$this->addTable($table, true);
		}

		$fnList = [];
		# check fields in meta
		$mainFields = [];
		$fieldList = "";
		$ques = ""; # ?,?,?
		$N = -1;
		$hasExtField = false;
		foreach ($fields as $f) {
			++ $N;
			#e.g. "Svc_ItemType(ittId,svcId)" or "Svc_ItemType(ittId,svcId,ItemType.name)"
			if (is_null($opt) && preg_match('/^(\w+)\((\w+),(\w+)(?:,(\w+)\.(\w+))?\)$/', $f, $ms)) {
				array_shift($ms);
				@list($relTable, $relF1, $relF2, $extTable, $extField) = $ms;
				$hasExtField = true;
				$opt1 = new stdClass;
				$opt1->curFieldIndex = $N;
				if (isset($extTable)) {
					$opt1->extTable = $extTable;
					$opt1->extField = $extField;

					# check "ItemType.name"
					$opt2 = new stdClass;
					$opt2->justCheck = true;
					if ($this->checkTableByMeta($extTable, [$extField], $opt2) === false)
						return false;
				}
				# check "Svc_ItemType(ittId,svcId)"
				$fn = $this->checkTableByMeta($relTable, [$relF1, $relF2], $opt1);
				if ($fn === false)
					return false;
				$fnList[] = $fn;
				continue;
			}
			# skip fields that begin with "-". e.g. "-picId"
			if (preg_match('/^-/', $f))
				continue;
			$foundField = false;
			foreach ($meta['fields'] as $f1) {
				if (preg_match("/^$f(\W.*)?$/", $f1)) {
					$foundField = true;
					break;
				}
			}
			if (! $foundField) {
				print("*** unknown field `$f` for table `$table`\n");
				return false;
			}
			if (strlen($fieldList) == 0) {
				$fieldList = $f;
				$ques = "?";
			}
			else {
				$ques .= ",?";
				$fieldList .= ",$f";
			}
			$mainFields[] = $N;
		}
		if ($justCheck)
			return true;

		# generate insert SQL
		$sth = $this->dbh->prepare("INSERT INTO $table ($fieldList) VALUES ($ques)");

		# for main table, add using "$id=$fn($arr)"
		# for sub table, add using "$fn($arr, $id)"
		if (is_null($opt)) {
			return function ($arr) use ($hasExtField, $sth, $fnList, &$mainFields) {
				if (!$hasExtField) {
					$sth->execute($arr);
					return;
				}
				$dataArr = [];
				foreach ($mainFields as $i) {
					$dataArr[] = $arr[$i];
				}
				$sth->execute($dataArr);
				$mainTableId = $this->dbh->lastInsertId();
				foreach ($fnList as $fn) {
					$fn($arr, $mainTableId);
				}
			};
		}
		# for related sub table
		else {
			$sth2 = null;
			if (@$opt->extField)
				$sth2 = $this->dbh->prepare("SELECT id FROM $opt->extTable WHERE $opt->extField=?");
			return function ($arr, $mainTableId) use ($opt, $sth, $sth2) {
				if ($arr[$opt->curFieldIndex] == null)
					return;
				$valList = explode(',', $arr[$opt->curFieldIndex]);
				foreach ($valList as $val) {
					if (strlen($val) == 0)
						continue;
					if (@$opt->extField) {
						$sth2->execute([$val]);
						$r = $sth2->fetchColumn();
						if ($r === false) {
							echo ("!!! warning: cannot find {$opt->extTable}.id for `$val`\n");
						}
						$val = $r;
					}
					$sth->execute([$val, $mainTableId]);
				}
			};
		}
	}

	/** @api */
	function import($file, $noPrompt = false, $enc = 'utf8')
	{
		$fd = @fopen($file, "r");
		if ($fd === false) {
			echo("*** cannot open file $file\n");
			return;
		}

		$table = null;
		$fields = [];
		$step = 0; # 1: table line; 2: hdr line; 3: data line; 0: none
		$n = 0;
		$recCnt = 0;
		$fn = null;
		$tmStart = null;
		while (($ln = fgets($fd)) !== false) {
			++ $n;
			$ln = preg_replace('/[ \r\n]+/', '', $ln);
			if (strlen($ln) == 0)
				continue;
			if ($ln[0] == "#") {
				if (preg_match('/table\s*\[(\w+)\]/i', $ln, $ms)) {
					# show last table
					if ($table && $recCnt>0) {
						$iv = time() - $tmStart;
						echo("=== import $recCnt records to table `$table` in {$iv} sec!\n\n");
						$recCnt = 0;
					}

					$table = $ms[1];
					if (! $noPrompt) {
						while (true) {
							print("import table `$table`? (y/n)");
							$s = fgets(STDIN);
							$s = strtolower(trim($s));
							if ($s == "y") {
								$step = 1;
								break;
							}
							else if ($s == "n") {
								$step = 0;
								break;
							}
						}
					}
					else {
						$step = 1;
					}
					$tmStart = time();
				}
				continue;
			}

			if ($step == 1) { # read header line
				$fields = explode("\t", $ln);
				$fn = $this->checkTableByMeta($table, $fields);
				if ($fn === false)
					return;
				$step = 2;
				continue;
			}
			if ($step == 2) {
				$data = explode("\t", $ln);
				if (count($data) != count($fields)) {
					echo("*** Line $n: expect " . count($fields) . " records for table `$table`, actual " . count($data). " fields!\n");
					echo(">>>$ln<<<\n");
					break;
				}
				# change "null" to null
				foreach ($data as &$one) {
					if ($one === '' || strcasecmp($one, "null") == 0) {
						$one = null;
					}
				}
				try {
					$fn($data);
					++$recCnt;
				}
				catch (Exception $e) {
					echo("*** Error on line $n, insert data: \n");
					print_r($data);
					throw $e;
				}
			}
		}
		if ($table && $recCnt>0) {
			$iv = time() - $tmStart;
			echo("=== import $recCnt records to table `$table` in {$iv} sec!\n\n");
			$recCnt = 0;
		}
		fclose($fd);
	}

	/** @api */
	function addCol($table, $col)
	{
		$found = false;
		foreach ($this->tableMeta as $e) {
			if (strcasecmp($e["name"], $table) != 0)
				continue;
			$n = strlen($col);
			foreach ($e["fields"] as $f) {
				if (strncasecmp($f, $col, $n) != 0)
					continue;
				if (strlen($f) > $n) {
					if (! preg_match('/^\W$/', $f[$n]))
						continue;
				}
				$this->_addColByMeta($e["name"], $f);
				$found = true;
				break;
			}
		}
		if (!$found) {
			logstr("!!! cannot find table and col: `{$table}.$col`\n");
		}
		else {
			logstr("=== done\n");
		}
	}
}

# vim: set foldmethod=marker :
?>
