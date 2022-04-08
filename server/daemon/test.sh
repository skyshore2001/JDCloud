#!/bin/sh
#curl 'localhost/jdcloud/api/hello?id=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost/jdcloud/api/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/hello?a=1&b=2' -H "aa: bb" -d "c=a&d=bb" $@
#curl 'localhost:8081/hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/Test.hello?a=1&b=2' -H "content-type: application/json" -d '{"c":"a","d":["bb","cc"]}' $@
#curl 'localhost:8081/getUsers?app=app1'
#curl 'localhost:8081/push?app=app1&user=*' -d 'msg=hello'

#curl 'localhost:8081/setTimeout' -H 'content-type: application/json' \
#	-d '{"wait":3000, "url":"http://oliveche.com/echo.php?a=1&b=2", "headers": ["Content-Type: application/json"], "data": "[10,20]"}'

curl 'localhost:8081/getMsg?app=app1&user=store1&timeout=5'
