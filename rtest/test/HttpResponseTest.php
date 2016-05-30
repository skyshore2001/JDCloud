<?php
require_once('../HttpResponse.php');

class HttpResponseTest extends PHPUnit_Framework_TestCase
{
	function testGeneral()
	{
		$str = <<<EOF
HTTP/1.1 500 Server error
Host: localhost:8080
X-Powered-By: PHP/5.4.31
bc-param1: hello, world
Content-Type: text/plain

Exception: exception 'PDOException'
EOF;
		
		$res = new HttpResponse($str);
		$this->assertEquals(500, $res->code);
		$this->assertEquals("Server error", $res->message);
		$this->assertEquals("localhost:8080", $res->headers["HOST"]);
		$this->assertEquals("Exception: exception 'PDOException'", $res->body);

		$this->assertEquals("hello, world", $res->getHeader("bc-param1"));
		$this->assertEquals("hello, world", $res->getBCParam("param1"));

		$this->assertNull($res->getHeader("bc-param2"));
		$this->assertNull($res->getBCParam("param2"));
		$this->assertEquals($str, $res->toString());
	}

	/**
     * @expectedException BadHttpReponseException
     * @expectedExceptionMessage response
     */
	function testInvalidResponse()
	{
		$str = "this is invalid http response";
		$res = new HttpResponse($str);
	}

	/**
     * @expectedException BadHttpReponseException
     * @expectedExceptionMessage header
     */
	function testInvalidHeader()
	{
		$str = <<<EOF
HTTP/1.1 500 Server error
Content-Type: text/plain
bc-param1=hello, world

Exception: exception 'PDOException'
EOF;
		$res = new HttpResponse($str);
	}
}
?>
