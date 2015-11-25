<?php

//====== global {{{
$opts = [
"srcDir" => null,
"outDir" => "output_web"
];

$g_handledFiles = []; // elem: $file => 1
$g_hash = []; // elem: $file => $hash

$COPY_EXCLUDE = [];
$HASH_INCLUDE = [];
//}}}

// ====== functions {{{
function getFileHash($basef, $f, $outDir)
{
	global $g_hash;
	global $g_handledFiles;
	$f0 = dirname($basef) . "/$f";
	$f1 = $outDir . "/" . $f0;
	$f2 = realpath($f1);
	if ($f2 === false || !array_key_exists(realpath($f0), $g_handledFiles))
		handleOne($f0, $outDir);
	$f2 = realpath($f1);
	if ($f2 === false)
		die("*** fail to find file `$f` base on `$basef` ($f2)\n");
	@$hash = $g_hash[$f2];
	if ($hash == null) {
		$hash = sha1_file($f2);
		$g_hash[$f2] = $hash;
// 		echo("### hash {$f2}\n");
	}
	else {
// 		echo("### reuse hash({$f2})\n");
	}
	return substr($hash, -6);
}

// <script src="main.js?__HASH__"></script>
function handleHash($f, $outDir)
{
	$s = file_get_contents($f);
	$s = preg_replace_callback('/"([^"]+)\?__HASH__"/', function ($ms) use ($f, $outDir){
		$hash = getFileHash($f, $ms[1], $outDir);
		return '"' . $ms[1] . '?v=' . $hash . '"';
	}, $s);
	$outf = $outDir . "/" . $f;
	@mkdir(dirname($outf), 0777, true);
// 	echo("=== hash $f\n");
	file_put_contents($outf, $s);
}

function handleCopy($f, $outDir)
{
	$outf = $outDir . "/" . $f;
	@mkdir(dirname($outf), 0777, true);
//	echo("=== copy $f\n");
	copy($f, $outf);
}

function handleOne($f, $outDir)
{
	global $COPY_EXCLUDE;
	global $HASH_INCLUDE;
	global $g_handledFiles;
	$g_handledFiles[realpath($f)] = 1;
	if (preg_match('/\.(html)$/', $f)) {
		$skip = true;
		foreach ($HASH_INCLUDE as $re) {
			if (preg_match($re, $f)) {
				$skip = false;
				break;
			}
		}
		if (! $skip)
		{
#			echo("=== hash $f\n");
			handleHash($f, $outDir);
			return;
		}
	}

	$skip = false;
	foreach ($COPY_EXCLUDE as $re) {
		if (preg_match($re, $f)) {
			$skip = true;
			break;
		}
	}
	if ($skip)
		return;
// 	echo("=== copy $f\n");
	handleCopy($f, $outDir);
}

//}}}

// ====== main {{{

// ==== parse args {{{
if (count($argv) < 2) {
	echo("Usage: webcc {srcDir} [-o {outDir}] [-rev {gitRevision}]\n");
	exit(1);
}

while ( ($opt = next($argv)) !== false) {
	if ($opt[0] === '-') {
		$opt = substr($opt, 1);

		if ($opt === 'o') {
			$v = next($argv);
			if ($v === false)
				die("*** require value for option `$opt`\n");
			$opts["outDir"] = $v;
		}
		else {
			die("*** unknonw option `$opt`.\n");
		}
		continue;
	}
	$opts["srcDir"] = $opt;
}

if (is_null($opts["srcDir"])) 
	die("*** require param srcDir.");
if (! is_dir($opts["srcDir"]))
	die("*** not a folder: `{$opts["srcDir"]}`\n");

// load config
$cfg = $opts["srcDir"] . "/webcc.conf.php";
if (is_file($cfg)) {
	echo("=== load config `$cfg`\n");
	require($cfg);
}

$COPY_EXCLUDE[] = '/webcc\.conf\.php/';
//}}}

@mkdir($opts["outDir"], 0777, true);
$outDir = realpath($opts["outDir"]);

chdir($opts["srcDir"]);
$fp = popen("git ls-files", "r");
while (($s=fgets($fp)) !== false) {
	$f = rtrim($s);
	handleOne($f, $outDir);
}
pclose($fp);

echo("=== output to `$outDir`\n");
//}}}
// vim: set foldmethod=marker :
?>
