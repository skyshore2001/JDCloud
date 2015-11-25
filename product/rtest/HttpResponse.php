<?php

class BadHttpReponseException extends LogicException 
{
	function __construct($message, $code=0) {
		parent::__construct($message, $code);
	}
}

class HttpResponse
{
	public $code;
	public $message;
	public $headers = array();
	public $bcParams;
	public $body;

	protected $msg;

	private function getLine($msg, &$p)
	{
		$p1 = strpos($msg, "\n", $p);
		if ($p1 === false) 
			return false;

		$sublen = $msg[$p1-1] == "\r"? $p1-$p-1: $p1-$p;
		$sub = substr($msg, $p, $sublen);
		$p = $p1 +1;
#		print "'$sublen', '$sub', '$p'\n";
		return $sub;
	}

	function __construct($msg) {
		$this->msg = $msg;
		# first line
		$p = 0;
		$row = $this->getLine($msg, $p);
		if (! preg_match('/^HTTP\/1.1\s*(\d+)\s*(.*?)\s*$/i', $row, $ms))
			throw new BadHttpReponseException("Bad HTTP response");
		$this->code = $ms[1];
		$this->message = $ms[2];

		# headers
		while (($row = $this->getLine($msg, $p)) !== false) {
			if (preg_match('/^\s*$/', $row))
				break;

			if (! preg_match('/^\s*(\S+)\s*:\s*(.*?)\s*$/', $row, $ms)) 
				throw new BadHttpReponseException("Bad HTTP header");

			$this->headers[strtoupper($ms[1])] = $ms[2];
		}

		# body
		if ($row !== false) {
			$this->body = substr($msg, $p);
		}
	}

	function toString()
	{
		return $this->msg;
	}

	function getHeader($name)
	{
		$k = strtoupper($name);
		return isset($this->headers[$k])? $this->headers[$k]: null;
	}
	function getBCParam($name)
	{
		return $this->getHeader("bc-$name");
	}
}
?>
