<?php

###### config {{{
global $LOGF, $CHAR_SZ, $SQLDIFF;

$LOGF = "upgrade.log";

$CHAR_SZ = [
	's' => 20,
	'm' => 50,
	'l' => 255 
];
#}}}

###### db adapter {{{
class SqlDiff
{
	protected $dbh;

	public $ntext = "NTEXT";
	public $autoInc = 'AUTOINCREMENT';
	public $money = "MONEY";
	public $createOpt = "";

	public static function create($dbh) {
		global $DBTYPE;
		$cls = "SqlDiff_{$DBTYPE}";
		if (! class_exists($cls))
			throw new Exception("*** unsupported dbtype=`$DBTYPE`");
		$inst = new $cls;
		$inst->dbh = $dbh;
		return $inst;
	}

	public function tableExists($tbl) {
		return false;
	}

	public function safeName($name) {
		return $name;
	}
}

class SqlDiff_sqlite extends SqlDiff
{
	public function tableExists($tbl) {
		$sth = $this->dbh->query("select count(*) from sqlite_master where type='table' and name like '$tbl'"); # use "like" rather than "=" to ignore case
		$n = $sth->fetchColumn();
		return $n > 0;
	}
}

class SqlDiff_mysql extends SqlDiff
{
	public $ntext = "TEXT CHARACTER SET utf8";
	public $autoInc = 'AUTO_INCREMENT';
	public $money = "DECIMAL(19,2)";
	public $createOpt = "DEFAULT CHARSET=utf8";

	public function tableExists($tbl) {
		$sth = $this->dbh->query("show tables like '$tbl'");
		return $sth->fetch() !== false;
	}
}

class SqlDiff_mssql extends SqlDiff
{
	public $ntext = "NTEXT";
	public $autoInc = 'IDENTITY(1,1)';
	public $money = "DECIMAL(19,2)";
	public $createOpt = ""; // "DEFAULT CHARSET=utf8";

	public function tableExists($tbl) {
		$sth = $this->dbh->query("select object_id('$tbl')");
		$val = $sth->fetchColumn();
		return !is_null($val);
	}

	public function safeName($name) {
		if (preg_match('/^(user|order)$/i', $name))
			return "\"$name\"";
		return $name;
	}
}

$SQLDIFF = null;
#}}}

###### functions {{{
// 注意：die返回0，请调用die1返回1标识出错。
function die1($msg)
{
	echo($msg);
	exit(1);
}

/*

@return: ["name", "dscr", "def", "type", "len"]

@key: FIELD_META_TYPE

- name: 字段名，如"cmt".
- dscr: 原始定义，如"cmt(l)"。
- def: 字段生成的SQL语句
- type: Enum("id", "nvarchar", "ntext", "int", "real", "decimal", "date", "datetime", "flag")
- len: 仅当type="nvarchar"时有意义，表示字串长。

e.g.

	"cmt(l)" => ["name"=>"cmt", "def"=>"cmt(l)", "type=>"nvarchar", "len"=>250];
*/
function parseFieldDef($fieldDef)
{
	global $CHAR_SZ, $SQLDIFF;
	$f = $fieldDef;
	$f1 = ucfirst(preg_replace('/(\d|\W)*$/', '', $f));

	$ret = [
		"name" => null,
		"dscr" => $fieldDef,
		"type" => "nvarchar",
		"len" => null,
		"def" => null
	];
	if ($f == 'id') {
		$ret["type"] = "id";
		$def = "INTEGER PRIMARY KEY " . $SQLDIFF->autoInc;
	}
	elseif (preg_match('/\((\w+)\)$/', $f, $ms)) {
		$tag = $ms[1];
		$f = preg_replace('/\((\w+)\)$/', '', $f);
		if ($tag == 't') {
			$ret["type"] = "ntext";
			$def = $SQLDIFF->ntext;
		}
		elseif ($tag == 's' || $tag == 'm' || $tag == 'l') {
			$ret["len"] = $CHAR_SZ[$tag];
			$def = "NVARCHAR(" . $CHAR_SZ[$tag] . ")";
		}
		elseif (is_numeric($tag)) {
			$ret["len"] = $tag;
			$def = "NVARCHAR($tag)";
		}
		else {
			die1("unknown type of string fields");
		}
	}
	elseif (preg_match('/(@|&|#)$/', $f, $ms)) {
		$f = substr_replace($f, "", -1);
		if ($ms[1] == '@') {
			$ret["type"] = "decimal";
			$ret["len"] = "19,2";
			$def = $SQLDIFF->money;
		}
		else if ($ms[1] == '&') {
			$ret["type"] = "int";
			$def = "INTEGER";
		}
		else if ($ms[1] == '#') {
			$ret["type"] = "real";
			$def = "REAL";
		}
	}
	elseif (preg_match('/(Price|Qty|Total|Amount)$/', $f1)) {
		$ret["type"] = "decimal";
		$ret["len"] = "19,2";
		$def = $SQLDIFF->money;
	}
	elseif (preg_match('/Id$/', $f1)) {
		$ret["type"] = "int";
		$def = "INTEGER";
	}
	elseif (preg_match('/Tm$/', $f1)) {
		$ret["type"] = "datetime";
		$def = "DATETIME";
	}
	elseif (preg_match('/Dt$/', $f1)) {
		$ret["type"] = "date";
		$def = "DATE";
	}
	elseif (preg_match('/Flag$/', $f1)) {
		$ret["type"] = "flag";
		$def = "TINYINT UNSIGNED NOT NULL DEFAULT 0";
	}
	elseif (preg_match('/^\w+$/', $f)) { # default
		$ret["len"] = $CHAR_SZ['m'];
		$def = "NVARCHAR(" . $CHAR_SZ['m'] . ")";
	}
	else {
		die1("unknown type of fields");
	}

# 		# !!! fix some name that conflicts with reserved words
# 		if ($f == 'desc') {
# 			$f .= '1';
# 		}
	$ret["def"] = $def;
	$ret["name"] = $f;
	//return "$f $def";
	return $ret;
}

// $fieldDef: ref to FIELD_META_TYPE
function genColSql($fieldDef)
{
	return $fieldDef["name"] . " " . $fieldDef["def"];
}

# ret: $sql
function genSql($meta)
{
	global $SQLDIFF;
	$table = $SQLDIFF->safeName($meta['name']);
	$sql = "CREATE TABLE $table (";
	$n = 0;
	foreach ($meta["fieldsMeta"] as $f) {
		if (++$n > 1) {
			$sql .= ", ";
		}
		$sql .= genColSql($f);
	}
	$sql .= ") " . $SQLDIFF->createOpt . ";\n";
	return $sql;
}

function prompt($s)
{
	echo sprintf("%s", $s);
}

function logstr($s, $show=true)
{
	if ($show) {
		prompt($s);
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
	else if (is_string($v))
		return '"'.$v.'"';
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

function getMetaFile()
{
	if ($a = getenv("P_METAFILE"))
		return $a;
}

#}}}

class UpgHelper
{
	private $tableMeta = []; # {name, fields, fieldsMeta, file, tableDef}
	# fields: 字段数组，含有类型信息，如["id","name(s)"]
	# file: 定义所在的文件
	# fieldMeta: ["name", "dscr", "def", "type", "len"] (@see FIELD_META_TYPE)
	# tableDef: 原始定义，如"@Ordr: id, name"

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
			prompt("=== Done!\n");
	}

	// 添加文件到$files集合。
	private function includeFile($f, &$files) {
		if (strpos($f, "*") === false) {
			if (! file_exists($f)) {
				logstr("!!! cannot read included file $f\n");
				return;
			}
			$fi = new SplFileInfo($f);
			$f1 = $fi->getRealPath();
			if (array_search($f1, $files) === false)
				$files[] = $f1;
		}
		else {
			foreach (glob($f) as $e) {
				$this->includeFile($e, $files);
			}
		}
	}

	# init meta and DB conn
	private function _initMeta()
	{
		$meta = getMetaFile();
		if (!$meta || !is_file($meta)) {
			throw new Exception("*** bad main meta file $meta");
		}
		prompt("=== load metafile\n");

		$baseDir = dirname($meta);
		$files = [$meta];
		for ($i=0; $i<count($files); ++$i) {
			$fi = new SplFileInfo($files[$i]);
			$file = $fi->getRealPath();

			//$file = iconv("utf-8", "gbk", $METAFILE); // for OS windows
			$fd = fopen($file, "r");
			if ($fd === false)
				throw new Exception("*** cannot read meta file $file");

			while (($s = fgets($fd)) !== false) {
				if (preg_match('/^@(\w+):\s+(\w.*?)\s*$/', $s, $ms)) {
					$tableName = $ms[1];
					foreach ($this->tableMeta as $e) {
						if ($e["name"] == $tableName) {
							logstr("!!! `@{$tableName}' is redefined in file `$file', previous defined in file `{$e['file']}'.\n");
							continue;
						}
					}
					$fields = preg_split('/\s*,\s*/', $ms[2]);
					// fieldsMeta在SQL_DIFF初始化后再设置.
					$this->tableMeta[] = ["name"=>$ms[1], "fields"=>$fields, "fieldsMeta"=>null, "file"=>$file, "tableDef"=>$s];
		# 			print "-- $_";
		# 			print genSql($tbl, $fields) . "\n";
				}
				elseif (preg_match('/^@include\s+(\S+)/', $s, $ms)) {
					$f = $baseDir . '/' . $ms[1];
					$this->includeFile($f, $files);
				}
				elseif (preg_match('/^@ver=(\d+)/', $s, $ms))
				{
					$this->ver = $ms[1];
				}
			}
			fclose($fd);

		}
	}

	private function _init()
	{
		$this->_initMeta();
		logstr("=== [" . date('c') . "] connect to $connstr\n", false);
		try {
		$this->dbh = dbconn();
		} catch (Exception $e) {
			echo $e->getMessage() . "\n";
			exit;
		}
		global $SQLDIFF;
		$SQLDIFF = SqlDiff::create($this->dbh);
		foreach ($this->tableMeta as &$e) {
			$fieldsMeta = array_map(function ($e) {
				return parseFieldDef($e);
			}, $e["fields"]);
			$e["fieldsMeta"] = $fieldsMeta;
		}

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
	function showTable($tbl = "*", $checkDb = false)
	{
		global $SQLDIFF;
		$found = false;
		foreach ($this->tableMeta as $meta) {
			if ($tbl !== null && ! fnmatch($tbl, $meta["name"], FNM_CASEFOLD))
				continue;

			$found = true;
			if ($checkDb && $SQLDIFF->tableExists($meta["name"])) {
				$this->alterTable($meta["name"], $meta);
				continue;
			}
			echo("-- {$meta['name']}: " . join(',', $meta['fields']) . "\n");
			$sql = genSql($meta);
			echo("$sql\n");
		}
		if (!$found) {
			logstr("!!! cannot find table $tbl\n");
		}
	}

	private function _addColByMeta($tableName, $fieldMeta)
	{
		global $SQLDIFF;
		$tableName = $SQLDIFF->safeName($tableName);
		$sql = "ALTER TABLE $tableName ADD " . genColSql($fieldMeta);
		logstr("-- $sql\n");
		$rv = $this->dbh->exec($sql);
	}

	// meta: {type, len, ...} 参考 FIELD_META_TYPE
	private function fieldEqual($meta, $dbType)
	{
		$len = 0;
		if (preg_match('/(\w+)\((.*?)\)/', $dbType, $ms)) {
			$dbType = $ms[1];
			$len = $ms[2];
		}

		switch($meta["type"]) {
		case "nvarchar":
			return $dbType == "varchar" && $len == $meta["len"];
		case "ntext":
			return $dbType == "text";
		case "int":
		case "id":
			return $dbType == "int";
		case "flag":
			return $dbType == "tinyint";
		case "decimal":
			return $dbType == "decimal" && $len == $meta["len"];
		case "real":
			return $dbType == "double";
		default:
			return $meta["type"] == $dbType;
		}
	}

	// 只输出SQL, 不直接改表.
	private function alterTable($table, $tableMeta)
	{
		global $DBTYPE;
		if ($DBTYPE != "mysql")
			throw new Exception("*** check table supports only mssql database!");

		global $SQLDIFF;
		$sth = $this->dbh->query("desc `$table`"); 
		$dbFields = $sth->fetchAll(\PDO::FETCH_ASSOC); // elem={Field, Type, Null, Key, ...}

		$tableName = $SQLDIFF->safeName($tableMeta["name"]);
		arrayCmp($tableMeta["fieldsMeta"], $dbFields, function ($meta, $dbField) {
			return $meta["name"] === $dbField["Field"];
		}, function ($meta, $dbField) use ($tableName) { // meta: {type, len, ...} 参考 FIELD_META_TYPE
			if ($meta === null) {
				$sql = "ALTER TABLE $tableName DROP " . $dbField["Field"];
				echo("$sql;\n");
			}
			else if ($dbField === null) {
				$sql = "ALTER TABLE $tableName ADD " . genColSql($meta);
				echo("$sql;\n");
			}
			else if (! $this->fieldEqual($meta, $dbField["Type"])) {
				echo(sprintf("-- %s: OLD=%s\n", $meta["dscr"], $dbField["Type"]));
				$sql = sprintf("ALTER TABLE $tableName MODIFY %s", genColSql($meta));
				echo("$sql;\n");
			}
		});
	}

	private function _addTableByMeta($tableMeta, $force = false)
	{
		$tbl = $tableMeta['name'];
		global $SQLDIFF;
		$tbl1 = $SQLDIFF->safeName($tbl);
		if ($SQLDIFF->tableExists($tbl))
		{
			if (!$force)
			{
				# check whether to add missing fields
				$rs = $this->execSql("SELECT * FROM (SELECT 1 AS id) t0 LEFT JOIN $tbl1 ON 1<>1", true);
				$row = $rs[0];
				$found = false;

				foreach ($tableMeta["fieldsMeta"] as $fieldMeta) {
					$fieldName = $fieldMeta["name"];
					if (! array_key_exists($fieldName, $row)) {
						$found = true;
						$this->_addColByMeta($tbl, $fieldMeta);
					}
				}
				return $found;
			}
			$this->execSql("DROP TABLE $tbl1");
		}
		logstr("-- {$tbl}: " . join(',', $tableMeta['fields']) . "\n");
		$sql = genSql($tableMeta);
		logstr("$sql\n");
		try {
			$this->dbh->exec($sql);
		}
		catch (Exception $e) {
			echo "*** Fail to create table `$tbl`. DO NOT use SQL keyword as the name of table or column.\n";
			throw $e;
		}
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
}
