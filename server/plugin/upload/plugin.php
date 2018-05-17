<?php

// ====== config {{{
const HTTP_NOT_FOUND = "HTTP/1.1 404 Not Found";

# thumb size for upload type:
global $UploadType;
$UploadType = [
	"user" => ["w"=>128, "h"=>128],
	"store" => ["w"=>200, "h"=>150],
	"default" => ["w"=>360, "h"=>360],
];

// 如果扩展名未知，则使用MIME类型限制上传：
global $ALLOWED_MIME;
$ALLOWED_MIME = [
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
];

// 设置允许上传的文件类型。设置为空表示允许所有。
global $ALLOWED_EXTS;
$ALLOWED_EXTS = array_keys($ALLOWED_MIME);

//}}}

# generate image/jpeg output. if $out=null, output to stdout
function resizeImage($in, $w, $h, $out=null)
{
	if (! function_exists("imageJpeg")) 
		throw new MyException(E_SERVER, "Require GD library");

	list($srcw, $srch) = @getImageSize($in);
	if (is_null($srcw))
		throw new MyException(E_PARAM, "cannot get impage info: $in");

	// 保持宽高协调
	if ($srcw < $srch) {
		list($w, $h) = [$h, $w];
	}
	// 保持等比例, 不拉伸
	$h1 = $w * $srch / $srcw;
	if ($h1 > $h) {
		$w = $h * $srcw / $srch;
	}
	else {
		$h = $h1;
	}
	$ext = strtolower(pathinfo($in, PATHINFO_EXTENSION));
	if ($ext == "png")
		$source = @imageCreateFromPng($in);
	else if ($ext == "jpg" || $ext == "jpeg")
		$source = @imageCreateFromJpeg($in);
	else if ($ext == "gif")
		$source = @imageCreateFromGif($in);
	else
		throw new MyException(E_PARAM, "format `$ext` is not supported. Require jpg/png/gif", "不支持的图片格式. 请使用jpg/png/gif");

	if ($source === false)
		throw new MyException(E_PARAM, "cannot create image from: $in", "图片格式错误");

	// Load
	$thumb = imageCreateTrueColor($w, $h);
	
	// Resize
	imageCopyResized($thumb, $source, 0, 0, 0, 0, $w, $h, $srcw, $srch);

	// Output
	imageJpeg($thumb, $out);
}

function getUploadTypeInfo($type)
{
	global $UploadType;
	if (! isset($UploadType[$type]))
		$type = 'default';
	return $UploadType[$type];
}

function api_upload()
{
	checkAuth(AUTH_LOGIN);
	#$uid = $_SESSION["uid"];
	$fmt = param("fmt");
	if ($fmt === 'raw' || $fmt === 'raw_b64')
	{
		$fileName = mparam("f");
	}
	$type = param("type", 'default');
	$genThumb = param("genThumb/b");
	$autoResize = param("autoResize/b", 1);
	$exif = param("exif");

	if ($type != "user" && $type != "store" && $type != "default") {
		throw new MyException(E_PARAM, "bad type: $type");
	}

	$ret = [];
	$files = []; # elem: [$tmpname, $fname, $thumbName]

	chdir($GLOBALS["BASE_DIR"]);

	function handleOneFile($f, $genThumb, &$files)
	{
		if ($f["error"] === 1 || $f["error"] === 2)
			throw new MyException(E_PARAM, "large file (>upload_max_filesize or >MAX_FILE_SIZE)", "文件太大，禁止上传");
		elseif ($f["error"] === 3)
			throw new MyException(E_SERVER, "partial data got", "文件内容不完整");
// 1 : 上传的文件超过了 php.ini 中 upload_max_filesize 选项限制的值.
// 2 : 上传文件的大小超过了 HTML 表单中 MAX_FILE_SIZE 选项指定的值。
// 3 : 文件只有部分被上传
// 4 : 没有文件被上传

		if ($f["name"] != "" && $f["size"] > 0) {
			// 检查文件类型
			$mtype = $f["type"];
			$ext = strtolower(pathinfo($f["name"], PATHINFO_EXTENSION));
			$orgName = basename($f["name"]);
			global $ALLOWED_MIME, $ALLOWED_EXTS;
			if ($ext == "" && $mtype) {
				$ext = array_search($mtype, $ALLOWED_MIME);
				if ($ext === false)
					throw new MyException(E_PARAM, "MIME type not supported: `$mtype`", "文件类型`$mtype`不支持.");
			}
			if (count($ALLOWED_EXTS) > 0 && ($ext == "" || !in_array($ext, $ALLOWED_EXTS))) {
				throw new MyException(E_PARAM, "bad extention file name: `$orgName`", "文件扩展名`$ext`不支持");
			}

			if ($type) {
				$dir = "upload/$type/" . date('Ym');
			}
			else {
				$dir = "upload/" . date('Ym');
			}
			if (! is_dir($dir)) {
				if (mkdir($dir, 0777, true) === false)
					throw new MyException(E_SERVER, "fail to create folder: $dir");
			}
			do {
				$base = rand(100001,999999);
				$fname = "$dir/$base.$ext";
				if ($genThumb)
					$thumbName = "$dir/t$base.$ext";
			} while(is_file($fname));
			$rec = [$f["tmp_name"], $fname, $orgName];
			if ($genThumb)
				$rec[] = $thumbName;
			$files[] = $rec;
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
		handleOneFile($f1, $genThumb, $files);
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
					handleOneFile($f1, $genThumb, $files);
				}
			}
			else {
				handleOneFile($f, $genThumb, $files);
			}
		}
	}
	if (count($files) == 0) {
		$sz = (@$_SERVER["HTTP_CONTENT_LENGTH"]?:$_SERVER["CONTENT_LENGTH"]?:0);
		throw new MyException(E_PARAM, "no file uploaded. upload size=$sz", "没有文件上传或文件过大。");
		// return $ret;
	}

	# 2nd round: save file and add to DB
	global $DBH;
	$sql = "INSERT INTO Attachment (path, orgPicId, exif, tm, orgName) VALUES (?, ?, ?, now(), ?)";
	$sth = $DBH->prepare($sql);
	foreach ($files as $f) {
		# 0: tmpname; 1: fname; 2: orgName; 3: thumbName(optional)
		list($tmpname, $fname, $orgName, $thumbName) = $f;
		if (isset($tmpname)) {
			move_uploaded_file($tmpname, $fname);
		}
		else {
			// for upload raw/raw_b64
			$s = file_get_contents("php://input");
			if ($fmt === 'raw_b64') {
				$s = base64_decode($s);
			}
			file_put_contents($fname, $s);
		}
		if ($autoResize && preg_match('/\.(jpg|jpeg|png)$/', $fname) && filesize($fname) > 500*1024) {
			resizeImage($fname, 1920, 1080, $fname);
		}

		$sth->execute([$fname, null, null, $orgName]);
		$id = (int)$DBH->lastInsertId();
		$r = ["id"=>$id, "orgName"=>$orgName];

		if ($genThumb) {
			$info = getUploadTypeInfo($type);
			resizeImage($fname, $info["w"], $info["h"], $thumbName);
			#file_put_contents($thumbName, "THUMB");
			$sth->execute([$thumbName, $id, $exif, $orgName]);
			$thumbId = (int)$DBH->lastInsertId();
			$r["thumbId"] = $thumbId;
		}
		$ret[] = $r;
	}
	return $ret;
}

# NOTE: this function does not conform to the interface standard, it return file data directly or HTTP 404 error
# please use "exit" instead of "return"
function api_att()
{
	// overwritten the default
	header("Cache-Control: private, max-age=99999999");
	//header("Cache-Control: private");
	header("Pragma: "); // session_start() set this one to "no-cache"

	#checkAuth(AUTH_LOGIN);
	#$uid = $_SESSION["uid"];
	$id = param("id");
	$thumbId = param("thumbId");

	if ((is_null($id) || $id<=0) && (is_null($thumbId) || $thumbId<=0))
	{
		header(HTTP_NOT_FOUND);
		exit;
	}
	// setup cache via etag.
	$etag = null;
	if (is_null($thumbId)) {
		$etag = "att-$id";
	}
	else {
		$etag = "att-t{$thumbId}";
	}
	@$etag1 = $_SERVER['HTTP_IF_NONE_MATCH'];
	if ($etag1 == $etag) {
		header("Etag: $etag", true, 304);
		exit();
	}
	if ($id !== null)
		$sql = "SELECT path, orgName FROM Attachment WHERE id=$id";
	else {
		# t0: original, a2: thumb
		$sql = "SELECT t0.path, t0.orgName FROM Attachment t0 INNER JOIN Attachment a2 ON t0.id=a2.orgPicId WHERE a2.id=$thumbId";
	}
	$row = queryOne($sql);
	if ($row === false)
	{
		header(HTTP_NOT_FOUND);
		exit;
	}
	list($file, $orgName) = $row;
	if (preg_match('/http:/', $file)) {
		header('Location: ' . $file);
		throw new DirectReturn();
	}

	chdir($GLOBALS["BASE_DIR"]);
	if (! is_file($file)) {
		header(HTTP_NOT_FOUND);
		exit;
	}

	# 对指定mime的直接返回，否则使用重定向。
	# TODO: 使用 apache x-sendfile module 解决性能和安全性问题。
	$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
	global $ALLOWED_MIME;
	//$mimeType = $ALLOWED_MIME[$ext] ?: 'application/octet-stream';
	$mimeType = $ALLOWED_MIME[$ext];
	if (@$mimeType) {
		header("Content-Type: $mimeType");
		header("Etag: $etag");
		#header("Expires: Thu, 3 Sep 2020 08:52:00 GMT");
		#header("Content-length: " . filesize($file));
		if (! isset($orgName))
			$orgName = basename($file);
		if ($ext == "jpg" || $ext == "png" || $ext == "gif") {
			header('Content-Disposition: filename='. $orgName);
		}
		else {
			header('Content-Disposition: attachment; filename='. $orgName);
		}
		readfile($file);
	}
	else {
		$baseUrl = getBaseUrl(false);
		$url = $baseUrl . $file;
		header('Location: ' . $url);
	}
	throw new DirectReturn();
}

