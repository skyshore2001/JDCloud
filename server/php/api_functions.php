<?php

function api_sendSms()
{
	checkAuth(AUTH_EMP);

	$phone = mparam("phone");
	$content = mparam("content");
	$channel = param("channel", 0);

	sendSms($phone, $content, $channel, true);
}

// vi: foldmethod=marker
