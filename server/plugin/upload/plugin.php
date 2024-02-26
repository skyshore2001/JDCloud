<?php
/**
@module Upload

## 概述

后端服务接口参考DESIGN.md文档。主要包括upload, att接口。

类Upload为模块对外接口，包括配置项和公共方法。
（暂无：类UploadImp为模块内部扩展接口，通过回调实现应用专用逻辑，应继承类UploadImpBase。）

## 模块外部接口

各配置项及默认值如下。

- 定义允许上传的文件类型
上传文件时，如果文件扩展名不在列表中，则禁止上传。
如果未指定扩展名，则检查MIME类型是否在此表中；若不在列表，则尝试根据文件头自动猜测文件类型(目前支持JPG/PNG/GIF, 见guessFileType)；猜测失败则禁止上传该文件。
下载文件时(att接口)，将按该表返回文件MIME类型。

	Upload::$fileTypes = [
		'jpg'=>'image/jpeg',
		'jpeg'=>'image/jpeg',
		'png'=>'image/png',
		'gif'=>'image/gif',
		'txt'=>'text/plain',
		'pdf' => 'application/pdf',
		'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'doc' => 'application/msword',
		'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'xls' => 'application/vnd.ms-excel',
		'zip' => 'application/zip',
		'rar' => 'application/x-rar-compressed'
		'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'ppt' => 'application/vnd.ms-powerpoint',
		'mp3' => 'audio/mpeg',
		'm4a' => 'audio/mp4',
		'mp4' => 'video/mp4',
	];

增加上传类型示例：（一般在plugin/index.php中设置）

	Upload::$fileTypes += [
		'm4v' => 'video/mp4',
		'gz'  => 'application/gzip'
	];

如果允许上传所有文件类型(即不检查文件类型), 可以配置:

	Upload::$checkFileType = false;

- 定义文件分类及配置

	Upload::$categoryMap = [
		"default" => ["path"=>"%m/%r", "sameNameOverwrite"=>false, "w"=>360, "h"=>360]
	];

跟踪传入的category参数自动取配置, 取不到则使用default配置.
保存文件路径为 upload/{年月}/{文件}, 如果指定了category则保存到 upload/{category}/{年月}/{文件}

- path: 保存路径规则, 用%v/%{var}表示变量(变量名超过一个字段用花括号包起来), 特别地: %m-年月, %f-文件名(不含扩展名), %r-6位随机值, 其它从HTTP请求参数中获取.
- w,h: 缩略图尺寸
- sameNameOverwrite: 若有同名文件不覆盖, 而是加"-1", "-2"这样的后缀.

示例: 增加一个resource类别, 将文件存到 upload/resource/{resource参数}/{文件名}-{version参数}, 如果同名文件存在则覆盖:

	Upload::$categoryMap["resource"] = ["path"=>"%{resource}/%f-%{version}", "sameNameOverwrite"=>true];

注意：在windows上，如果路径中包含"%f"即原文件名，则原文件名有中文时会出现乱码，也可能操作失败。在Linux上无此问题。

- 服务器图片压缩选项
 调用upload接口时，超过maxPicKB的图片，会自动压缩到长宽不超过maxPicSize像素，除非接口参数autoResize设置为0。

	Upload::$maxPicKB = 500; // KB
	Upload::$maxPicSize = 1280;

- 导出zip文件

	$fname = "ORDR-17.zip"; // 导出的文件名，不用目录名
	// zip中子目录名，对应的附件编号列表
	$pics = [
		"TASK-1/T-1" => "51,53,55",
		"TASK-1/T-2" => "57",
		"TASK-2/T-3" => "59,61"
	];
	Upload::exportZip($fname, $pics);
	// 如果id列表为缩略图，应使用 Upload::exportZip($fname, $pics, true);

 */

class Upload
{
	static $fileTypes = [
		'jpg'=>'image/jpeg',
		'jpeg'=>'image/jpeg',
		'png'=>'image/png',
		'gif'=>'image/gif',
		'txt'=>'text/plain',
		'pdf' => 'application/pdf',
		'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'doc' => 'application/msword',
		'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'xls' => 'application/vnd.ms-excel',
		'zip' => 'application/zip',
		'rar' => 'application/x-rar-compressed',
		'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'ppt' => 'application/vnd.ms-powerpoint',
		'mp3' => 'audio/mpeg',
		'm4a' => 'audio/mp4',
		'mp4' => 'video/mp4',
	];
	static $checkFileType = true;

	static $categoryMap = [
		"default" => ["path"=>"%m/%r", "sameNameOverwrite"=>false, "w"=>360, "h"=>360]
	];
	// 默认调用upload时(autoResize参数为1)，超过maxPicKB的图片，会自动压缩到长宽不超过maxPicSize像素。
	static $maxPicKB = 500; // KB
	static $maxPicSize = 1280;
	// 对于大文件(>100M)，交给web server处理源文件。但这会导致大文件原始名字丢失，下载后是数字名字。设置值为-1表示总是由php处理。
	static $bigFileSize = 100000000;

	static function quote($s)
	{
		return '"' . str_replace('"', '\"', $s) . '"';
	}

	static function exportZip($zipname, $pics, $byThumbId=false)
	{
		session_commit();
		if (!$zipname || count($pics) == 0) {
			jdRet(null, "没有图片或附件!");
		}
		$zip = new ZipArchive;
		$tmpf = tempnam("/tmp", "zip");
		if (($rv=$zip->open($tmpf, ZipArchive::CREATE)) !== TRUE) {
			jdRet(E_SERVER, "zip error $rv");
		}
		foreach ($pics as $k=>$v) {
			if (!$v)
				continue;
			if (!$byThumbId)
				$sql = "SELECT id, path, orgName FROM Attachment WHERE id IN ($v)";
			else {
				# t0: original, a2: thumb
				$sql = "SELECT t0.id, t0.path, t0.orgName FROM Attachment t0 INNER JOIN Attachment a2 ON t0.id=a2.orgPicId WHERE a2.id IN ($v)";
			}
			$rows = queryAll($sql, true);
			foreach($rows as $row) { // {id, path, orgName}
				$ext = strtolower(pathinfo($row["orgName"], PATHINFO_EXTENSION));
				$fname = "$k/{$row['id']}.$ext";
				$realFile = $GLOBALS["conf_dataDir"] . '/' . $row["path"];
				if (!is_file($realFile)) {
					$fname = iconv("UTF-8", "GBK//IGNORE", "$fname.missing!"); // TODO: 支持中文
					$zip->addFromString($fname, "");
					continue;
				}
				else {
					$fname = iconv("UTF-8", "GBK//IGNORE", $fname); // TODO: 支持中文
					$zip->addFile($realFile, $fname);
				}
				//$zip->addFromString($fname, $realFile);
			}
		}
		$zip->close();
		logit("export zip: name=$zipname, file=$tmpf, size=" . filesize($tmpf));

		///Then download the zipped file.
		header('Content-Type: application/zip');
		header('Content-disposition: attachment; filename='.Upload::quote($zipname));
		header('Content-Length: ' . filesize($tmpf));
		readfile($tmpf);
		unlink($tmpf);
		jdRet();
	}
}
// ====== config {{{
const HTTP_NOT_FOUND = "HTTP/1.1 404 Not Found";

global $FILE_TAG; // tag => ext
$FILE_TAG = [
	// JPEG文件头: FFD8FF
	"\xff\xd8\xff" => "jpg",
	// PNG文件头: 89504E47
	"\x89PNG" => "png",
	// GIF文件头
	"GIF8" => "gif"
];
//}}}

// generate image/jpeg output. if $out=null, output to stdout
// 用于缩小图片. 使得宽高不超过$w和$h. 如果宽高本来就小, 则不做处理(除非$forceDo=true)
// return: false-未处理; true-处理了
function resizeImage($in, $w, $h, $out=null, $forceDo=false)
{
	if (! function_exists("imageJpeg")) 
		jdRet(E_SERVER, "Require GD library");

	list($srcw, $srch) = @getImageSize($in);
	if (is_null($srcw))
		jdRet(E_PARAM, "cannot get image info: $in");

	// 保持宽高协调
	if ($srcw < $srch) {
		list($w, $h) = [$h, $w];
	}

	// 如果图片很小, 就按原尺寸, 不要拉伸.
	if ($srcw < $w && $srch < $h) {
		if (!$forceDo)
			return false;
		$w = $srcw;
		$h = $srch;
	}
	else {
		// 保持等比例, 不拉伸
		$h1 = $w * $srch / $srcw;
		if ($h1 > $h) {
			$w = $h * $srcw / $srch;
		}
		else {
			$h = $h1;
		}
	}
	$ext = strtolower(pathinfo($in, PATHINFO_EXTENSION));
	if ($ext == "png")
		$source = @imageCreateFromPng($in);
	else if ($ext == "jpg" || $ext == "jpeg")
		$source = @imageCreateFromJpeg($in);
	else if ($ext == "gif")
		$source = @imageCreateFromGif($in);
	else
		jdRet(E_PARAM, "format `$ext` is not supported. Require jpg/png/gif", "不支持的图片格式. 请使用jpg/png/gif");

	if ($source === false)
		jdRet(E_PARAM, "cannot create image from: $in", "图片格式错误");

	// Load
	$thumb = imageCreateTrueColor($w, $h);
	
	// Resize
	// imageCopyResized($thumb, $source, 0, 0, 0, 0, $w, $h, $srcw, $srch);
	imageCopyResampled($thumb, $source, 0, 0, 0, 0, $w, $h, $srcw, $srch);

	// Output
	imageJpeg($thumb, $out);
	return true;
}

function getPath($orgName, $cate, $cateConf)
{
/*
	$onGetPath = @$_GET["onGetPath"];
	if ($onGetPath && is_callable($onGetPath)) {
		return $onGetPath($orgName);
	}
*/
	$pi = pathinfo($orgName);
	$f = $pi["filename"];
	$ext = strtolower($pi["extension"]);

	// 在categoryMap中path参数可以用%m,%{var}这些方式使用变量, 未定义的变量使用mparam从请求参数中来取.
	$vars = [
		"f" => $f, // 中文名在windows下有问题, 谨慎使用%f
		"m" => date("Ym"),
//			"t" => date("Ymd_His"), // 用时间做文件名增大了冲突可能
		"r" => rand(100001,999999)
	];
	$fname0 = preg_replace_callback('/%(\w)|%(\{(\w+)\})/', function ($ms) use ($vars) {
		// var_export($ms);
		$var = $ms[1] ?: $ms[3];
		if (array_key_exists($var, $vars))
			return $vars[$var];
		return mparam($var);
	}, $cateConf["path"]);
	$dir = $cate? ("upload/" . $cate): "upload";
	$fname0 = "$dir/$fname0";
	$fname = $ext? "$fname0.$ext": $fname0;
	
	if (! $cateConf["sameNameOverwrite"]) {
		$i = 1;
		// 如果文件"file.txt"存在, 则命名为"file-1.txt", "file-2.txt"依次类推
		while (is_file($fname)) {
			$fname = $ext? "$fname0-$i.$ext": "$fname0-$i";
			++ $i;
		}
//		touch($fname); // TODO: 一次上传多个文件或并发多请求在上传文件时，可能产生重名. 如果touch需要先创建文件夹.
	}

	return $fname;
}

function api_upload($env)
{
	checkAuth(AUTH_LOGIN, ['simple']);
	session_commit(); // !!!释放session锁避免阻塞其它调用。注意此后要修改session应先调用session_start

	$fmt = param("fmt");
	if ($fmt === 'raw' || $fmt === 'raw_b64')
	{
		$fileName = mparam("f");
	}
	$genThumb = param("genThumb/b");
	$autoResize = param("autoResize/i", 1);
	$exif = param("exif");

	$cate = param("category");
	$cateConf = Upload::$categoryMap['default'];
	if ($cate && array_key_exists($cate, Upload::$categoryMap))
		$cateConf = Upload::$categoryMap[$cate] + $cateConf;

	$ret = [];
	$files = []; # elem: [$tmpname, $fname, $thumbName]

	chdir($GLOBALS["conf_dataDir"]);

	$handleOneFile = function ($f, $genThumb, &$files) use ($cate, $cateConf)
	{
		if ($f["error"]) {
			logit("fail to upload: " . jsonEncode($f));
			if ($f["error"] === 1 || $f["error"] === 2)
				jdRet(E_PARAM, "large file (>upload_max_filesize or >MAX_FILE_SIZE)", "文件太大，禁止上传");
			elseif ($f["error"] === 3)
				jdRet(E_SERVER, "partial data got", "文件内容不完整");
			elseif ($f["error"] === 7)
				jdRet(E_SERVER, "fail to write file or no disk space", "文件写入失败，请检查服务器权限或磁盘空间");

			jdRet(E_SERVER, "fail to upload file: " . jsonEncode($f), "上传失败：错误码为"  . $f["error"]);
		}
// 1 : 上传的文件超过了 php.ini 中 upload_max_filesize 选项限制的值.
// 2 : 上传文件的大小超过了 HTML 表单中 MAX_FILE_SIZE 选项指定的值。
// 3 : 文件只有部分被上传
// 4 : 没有文件被上传
// 6 : 找不到临时文件夹
// 7 : 文件写入失败

		if ($f["name"] != "" && $f["size"] > 0) {
			// 检查文件类型
			$orgName = basename($f["name"]);
			if (Upload::$checkFileType) {
				$ext = strtolower(pathinfo($orgName, PATHINFO_EXTENSION));
				$mtype = $f["type"];
				if ($ext == "" && $mtype) {
					$ext = array_search($mtype, Upload::$fileTypes);
					if ($ext === false) {
						// 猜测文件类型
						$ext = guessFileType($f["tmp_name"]);
						if ($ext === null)
							jdRet(E_PARAM, "MIME type not supported: `$mtype`", "文件类型`$mtype`不支持.");
					}
				}
				if ($ext == "" || !array_key_exists($ext, Upload::$fileTypes)) {
					jdRet(E_PARAM, "bad extension file name: `$orgName`", "文件扩展名`$ext`不支持");
				}
			}

			$fname = getPath($orgName, $cate, $cateConf);
			$dir = dirname($fname);
			if (! is_dir($dir)) {
				if (mkdir($dir, 0777, true) === false)
					jdRet(E_SERVER, "fail to create folder: $dir");
			}
			$rec = [$f["tmp_name"], $fname, $orgName];
			if ($genThumb) {
				$thumbName = preg_replace('/(\.\w+)?$/', "-thumb.jpg", $fname, 1);
				$rec[] = $thumbName;
			}
			$files[] = $rec;
		}
	};

	function guessFileType($f)
	{
		global $FILE_TAG;
		@$fp = fopen($f, "rb");
		if ($fp === false)
			return;
		$data = fread($fp, 8);
		fclose($fp);
		if ($data === false || strlen($data) < 8)
			return;
		foreach ($FILE_TAG as $ftag=>$ext) {
			if (strncmp($data, $ftag, strlen($ftag)) == 0) {
				return $ext;
			}
		}
	}

	# 1st round: just check and prepare data, not save file or add to DB.
	if ($fmt === 'raw' || $fmt === 'raw_b64') {
		$f1 = [
			"name" => $fileName,
			"type" => null,
			"tmp_name" => null,
			"error" => 0,
			"size" => 1,
			];
		$handleOneFile($f1, $genThumb, $files);
	}
	else {
		foreach ($_FILES as $f) {
			if (is_array($f["name"])) {
				$cnt = count($f["name"]);
				for ($i=0; $i<$cnt; ++$i) {
					$f1 = [
						"name" => $f["name"][$i],
						"type" => $f["type"][$i],
						"tmp_name" => $f["tmp_name"][$i],
						"error" => $f["error"][$i],
						"size" => $f["size"][$i],
					];
					$handleOneFile($f1, $genThumb, $files);
				}
			}
			else {
				$handleOneFile($f, $genThumb, $files);
			}
		}
	}
	if (count($files) == 0) {
		$sz = (@$_SERVER["HTTP_CONTENT_LENGTH"]?:$_SERVER["CONTENT_LENGTH"]?:0);
		jdRet(E_PARAM, "no file uploaded. upload size=$sz", "没有文件上传或文件过大。");
		// return $ret;
	}

	# 2nd round: save file and add to DB
	$blobStmt = null;
	if ($GLOBALS["conf_upload_storeInDb"]) {
		$blobStmt = $env->DBH->prepare("UPDATE Attachment SET data=? WHERE id=?");
	}
	foreach ($files as $f) {
		# 0: tmpname; 1: fname; 2: orgName; 3: thumbName(optional)
		list($tmpname, $fname, $orgName, $thumbName) = $f;
		$rv = null;
//		if (PHP_OS == "WINNT")
//			$fname = @iconv("utf-8", "gb2312", $fname) ?: $fname;
		if (isset($tmpname)) {
			$rv = move_uploaded_file($tmpname, $fname);
		}
		else {
			// for upload raw/raw_b64
			$s = getHttpInput($env);
			if ($fmt === 'raw_b64') {
				$s = base64_decode($s);
			}
			$rv = file_put_contents($fname, $s);
		}
		if ($rv === false) {
			jdRet(E_SERVER, "fail to create or write uploaded file", "写文件失败！");
		}
		if ($autoResize && preg_match('/\.(jpg|jpeg|png)$/', $fname)) {
			// 如果大于500K或是用autoResize指定了最大宽高, 则压缩.
			$forceDo = filesize($fname) > Upload::$maxPicKB*1024;
			$maxHW = $autoResize < 10? Upload::$maxPicSize: $autoResize;
			$rv = resizeImage($fname, $maxHW, $maxHW, $fname, $forceDo); // 1280x1280
		}

		$id = dbInsert("Attachment", [
			"path" => $fname,
			"orgName" => $orgName,
			"exif" => $exif,
			"tm" => date(FMT_DT),
		]);
		$r = ["id"=>$id, "orgName"=>$orgName, "size"=>filesize($fname), "path"=>$fname];
		if ($blobStmt) {
			$blobStmt->execute([file_get_contents($fname), $id]);
		}

		if ($genThumb) {
			$rv = resizeImage($fname, $cateConf["w"], $cateConf["h"], $thumbName);
			if ($rv) {
				#file_put_contents($thumbName, "THUMB");
				$thumbId = dbInsert("Attachment", [
					"path" => $thumbName,
					"orgPicId" => $id,
					"orgName" => $orgName,
					"tm" => date(FMT_DT),
				]);
				if ($blobStmt) {
					$blobStmt->execute([file_get_contents($thumbName), $thumbId]);
				}
				$r["thumbId"] = $thumbId;
				dbUpdate("Attachment", ["orgPicId"=>-$thumbId], $id);
			}
			else {
				dbUpdate("Attachment", ["orgPicId"=>$id], $id);
				$r["thumbId"] = $id;
			}
		}
		$ret[] = $r;
	}
	return $ret;
}

# NOTE: this function does not conform to the interface standard, it return file data directly or HTTP 404 error
function api_att($env)
{
	// overwritten the default
	header("Cache-Control: max-age=99999999");
	//header("Cache-Control: private");
	header_remove("Pragma");
	header_remove("Expires");

	#checkAuth(AUTH_LOGIN);
	#$uid = $_SESSION["uid"];
	session_commit(); // !!!释放session锁避免阻塞其它调用。注意此后要修改session应先调用session_start

	$id = param("id");
	if ($id) {
		$doGetThumb = param("thumb/b");
	}
	$thumbId = param("thumbId");
	$doDown = param("down");

	if ((is_null($id) || $id<=0) && (is_null($thumbId) || $thumbId<=0))
	{
		header(HTTP_NOT_FOUND);
		jdRet();
	}
	// setup cache via etag.
	$etag = null;
	if (is_null($thumbId)) {
		$etag = "att-$id";
		if ($doGetThumb)
			$etag .= "-t";
	}
	else {
		$etag = "att-t{$thumbId}";
	}
	@$etag1 = $_SERVER['HTTP_IF_NONE_MATCH'];
	if ($etag1 == $etag) {
		header("Etag: $etag", true, 304);
		jdRet();
	}
	if ($id !== null) {
		if (!$doGetThumb) {
			$sql = "SELECT id, path, orgName FROM Attachment WHERE id=$id";
		}
		else {
			# t0: thumb, a2: original
			$sql = "SELECT t0.id, t0.path, t0.orgName FROM Attachment t0 INNER JOIN Attachment a2 ON t0.id=-a2.orgPicId WHERE a2.id=$id";
		}
	}
	else {
		# t0: original, a2: thumb
		$sql = "SELECT t0.id, t0.path, t0.orgName FROM Attachment t0 INNER JOIN Attachment a2 ON t0.id=a2.orgPicId WHERE a2.id=$thumbId";
	}
	$row = queryOne($sql);
	if ($row === false)
	{
		header(HTTP_NOT_FOUND);
		jdRet();
	}
	list($picId, $file, $orgName) = $row;
	if (preg_match('/(http:|https:)/', $file)) {
		header('Location: ' . $file);
		jdRet();
	}
	if ($GLOBALS["conf_upload_storeInDb"]) {
		$data = queryOne("SELECT data FROM Attachment WHERE id=" . $picId);
		$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
		$mimeType = Upload::$fileTypes[$ext] ?: 'application/octet-stream';
		if ($doDown === "0" || (!isset($doDown) && preg_match('/^(image|video|audio)/', $mimeType))) {
			header('Content-Disposition: filename='. Upload::quote($orgName));
		}
		else {
			header('Content-Disposition: attachment; filename='. Upload::quote($orgName));
		}
		ApiLog::$instance->updateLog = ["res"=>$file, "ressz" => strlen($data)];
		jdRet(null, $data);
	}

	chdir($GLOBALS["conf_dataDir"]);
	if (! is_file($file)) {
		header(HTTP_NOT_FOUND);
		jdRet();
	}

	# 对指定mime的直接返回，否则使用重定向。
	# TODO: 使用 apache x-sendfile module 解决性能和安全性问题。
	$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
	//$mimeType = 'application/octet-stream';
	$mimeType = Upload::$fileTypes[$ext] ?: 'application/octet-stream';
	$reqRange = array_key_exists("HTTP_RANGE", $_SERVER);
	// 对于大文件(>bigFileSize)或带range参数的请求，交给web server处理源文件。
	if (!($reqRange || (Upload::$bigFileSize > 0 && filesize($file) > Upload::$bigFileSize))) {
		header("Content-Type: $mimeType");
		header("Etag: $etag");
		#header("Expires: Thu, 3 Sep 2020 08:52:00 GMT");
		# 如果不指定length, 则会返回 Transfer-Encoding: chunked; 有些软件不兼容(如ios环境可能不支持播放mp4视频)
		header("Content-length: " . filesize($file));
		if (! isset($orgName))
			$orgName = basename($file);
		if ($doDown === "0" || (!isset($doDown) && preg_match('/^(image|video|audio)/', $mimeType))) {
			header('Content-Disposition: filename='. Upload::quote($orgName));
		}
		else {
			header('Content-Disposition: attachment; filename='. Upload::quote($orgName));
		}
		readfile($file);
	}
	else {
		$baseUrl = getBaseUrl(false);
		$url = $baseUrl . $file;
		header('Location: ' . $url);
	}
	ApiLog::$instance->updateLog = ["res"=>$file, "ressz" => filesize($file)];
	jdRet();
}

function api_pic()
{
	session_commit();
	header("Content-Type: text/html");
	$baseUrl = getBaseUrl();
	$n = 0;
	foreach ([param("id/i+"), param("thumbId/i+"), param("smallId/i+")] as $pics) {
		if ($pics) {
			if ($n == 0) {
				$doGetThumb = param("thumb/b");
			}
			foreach ($pics as $id) {
				$id = trim($id);
				if ($id) {
					if ($n == 0) {
						if (!$doGetThumb) {
							echo("<img src='{$baseUrl}api.php/att?id=$id'>\n");
						}
						else {
							echo("<a href='{$baseUrl}api.php/att?id=$id' target='_blank'><img src='{$baseUrl}api.php/att?id=$id&thumb=1'></a>\n");
						}
					}
					else if ($n == 1)
						echo("<img src='{$baseUrl}api.php/att?thumbId=$id'>\n");
					else if ($n == 2)
						echo("<a href='{$baseUrl}api.php/att?thumbId=$id' target='_blank'><img src='{$baseUrl}api.php/att?id=$id'></a>\n");
					echo("<br/>\n");
				}
			}
		}
		++ $n;
	}
	jdRet();
}

/*
export(fname, str, enc?)

- fname: 下载文件的默认文件名。
- str: 文件内容。
- enc: 要转换的编码，默认utf-8。最终以该编码输出。
*/
function api_export()
{
	session_commit();
	$fname = mparam("fname");
	$str = mparam("str");
	$enc = param("enc", "utf-8");
	header("Content-Type: text/plain; charset=" . $enc);
	header('Content-Disposition: attachment; filename='. Upload::quote($fname));

	$forexcel = param("forexcel/b", 1);
	if ($forexcel && stripos($fname, ".csv") !== false) {
		$str = preg_replace('/\b\d{11,}\b/', '="$0"', $str);
	}
	if ($enc != "utf-8")
		$str = iconv("utf-8", "$enc//IGNORE", $str);
	echo($str);
	jdRet();
}

