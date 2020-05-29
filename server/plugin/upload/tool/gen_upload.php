<?php

@list ($prog, $listFile,$batchCnt) = $argv;
if (!$listFile || !$batchCnt) {
	die("usage: php gen_upload.php <listFile> <batchCnt>\n");
}

$arr = file($listFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

$cnt = count($arr);
print(join("\n", ['#!/bin/sh',
'opt="-i"',
'uploadUrl="http://localhost/p/jdcloud/api.php/upload?autoResize=300&genThumb=1"',
'uploadPwd="1234"']));
print("\n\n");

for ($i=0, $batchId=0; $i<$cnt; ) {
	print("curl \$opt \\\n");
	for ($j=0; $j<$batchCnt && $i<$cnt; ++$j) {
		$e = $arr[$i];
		++$i;
		print(" -F file$i=\"@{$e}\" \\\n");
	}
	print(' "${uploadUrl}&batchId='. (++$batchId). '" -H "x-daca-simple: $uploadPwd"' . "\n\n");
}

